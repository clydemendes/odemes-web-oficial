// /api/plaid — bank sync through Plaid. Invite only (see assets/plaid-setup.sql).
//
// POST, called by the browser with the user's Supabase session:
//   Authorization: Bearer <supabase access_token>
//   { action: 'status' }                         → { invited, items }
//   { action: 'link_token', item_id? }           → { link_token }   (item_id = reconnect mode)
//   { action: 'exchange', public_token, institution }
//   { action: 'sync' }                           → { added, removed, items }
//   { action: 'disconnect', item_id }
//
// GET, called by the Vercel cron in vercel.json (Authorization: Bearer CRON_SECRET):
//   syncs every invited user's healthy banks.
//
// Env vars (Vercel → Settings → Environment Variables):
//   PLAID_CLIENT_ID            from dashboard.plaid.com → Developers → Keys
//   PLAID_SECRET               the secret for PLAID_ENV
//   PLAID_ENV                  sandbox | production   (default sandbox)
//   PLAID_COUNTRY_CODES        e.g. US  or  US,CA  or  GB,ES,FR,PT   (default US)
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Project Settings → API → service_role
//   CRON_SECRET                long random string; Vercel sends it to the cron automatically

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eitnotjnxdpojomqxcqm.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLAID_ENV = process.env.PLAID_ENV === 'production' ? 'production' : 'sandbox';
const PLAID_URL = `https://${PLAID_ENV}.plaid.com`;
const COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const PLAID_LANGS = ['en', 'es', 'pt', 'fr'];

// ── Supabase (service role, bypasses RLS — every query below filters by user_id) ──

async function db(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`db ${method} ${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function userFromRequest(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${m[1]}` },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? u : null;
}

async function isInvited(email) {
  if (!email) return false;
  const rows = await db(`bank_sync_invites?select=email&email=eq.${encodeURIComponent(email.toLowerCase())}`);
  return rows.length > 0;
}

// ── Plaid ──

class PlaidError extends Error {
  constructor(data) {
    super(`${data.error_code}: ${data.error_message}`);
    this.code = data.error_code;
    this.type = data.error_type;
  }
}

async function plaid(path, body) {
  const res = await fetch(PLAID_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new PlaidError(data);
  return data;
}

// Plaid's personal_finance_category → the plain category names people already use in Odemes.
const DETAILED = {
  INCOME_WAGES: 'Salary',
  INCOME_INTEREST_EARNED: 'Interest',
  INCOME_DIVIDENDS: 'Dividends',
  INCOME_TAX_REFUND: 'Tax refund',
  FOOD_AND_DRINK_GROCERIES: 'Groceries',
  FOOD_AND_DRINK_COFFEE: 'Coffee',
  RENT_AND_UTILITIES_RENT: 'Rent',
  RENT_AND_UTILITIES_TELEPHONE: 'Phone',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: 'Internet',
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: 'Electricity',
  GENERAL_MERCHANDISE_ELECTRONICS: 'Electronics',
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: 'Clothes',
  GENERAL_SERVICES_INSURANCE: 'Insurance',
  ENTERTAINMENT_TV_AND_MOVIES: 'Subscriptions',
  ENTERTAINMENT_MUSIC_AND_AUDIO: 'Subscriptions',
};
const PRIMARY = {
  INCOME: 'Income',
  FOOD_AND_DRINK: 'Dining',
  TRANSPORTATION: 'Transport',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Utilities',
  ENTERTAINMENT: 'Entertainment',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Home',
  MEDICAL: 'Health',
  PERSONAL_CARE: 'Personal care',
  GENERAL_SERVICES: 'Services',
  GOVERNMENT_AND_NON_PROFIT: 'Taxes & donations',
  BANK_FEES: 'Bank fees',
  LOAN_PAYMENTS: 'Loans',
};

// Money moving between the user's own accounts isn't income or spending. Counting it
// would double every credit-card bill and wreck the grade, so it's left out.
function isInternalMove(t) {
  const pfc = t.personal_finance_category || {};
  return pfc.primary === 'TRANSFER_IN'
    || pfc.primary === 'TRANSFER_OUT'
    || pfc.detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT';
}

function toRow(t, item, fallbackCurrency) {
  const pfc = t.personal_finance_category || {};
  // Plaid: positive = money out, negative = money in.
  const type = Number(t.amount) < 0 ? 'income' : 'expense';
  let category = DETAILED[pfc.detailed] || PRIMARY[pfc.primary] || 'Other';
  if (type === 'income' && pfc.primary !== 'INCOME') category = 'Refund';
  return {
    user_id: item.user_id,
    date: t.date,
    type,
    amount: Math.abs(Number(t.amount)),
    category,
    note: t.merchant_name || t.name || null,
    currency: t.iso_currency_code || t.unofficial_currency_code || fallbackCurrency,
    plaid_transaction_id: t.transaction_id,
    plaid_item_id: item.item_id,
  };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const quoteIds = ids => ids.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');

async function profileCurrency(userId) {
  const rows = await db(`profiles?select=currency&id=eq.${userId}`).catch(() => []);
  return (rows[0] && rows[0].currency) || 'USD';
}

// Pull everything new since the stored cursor and write it to transactions.
async function syncItem(item) {
  const startCursor = item.cursor || undefined;
  let added = [], modified = [], removed = [], cursor = startCursor;

  for (let attempt = 0; ; attempt++) {
    try {
      added = []; modified = []; removed = []; cursor = startCursor;
      let hasMore = true;
      while (hasMore) {
        const page = await plaid('/transactions/sync', { access_token: item.access_token, cursor, count: 500 });
        added.push(...page.added);
        modified.push(...page.modified);
        removed.push(...page.removed);
        hasMore = page.has_more;
        cursor = page.next_cursor;
      }
      break;
    } catch (e) {
      // Plaid asks for a restart from the original cursor if data changed mid-pagination.
      if (e.code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' && attempt < 2) continue;
      const loginNeeded = e.code === 'ITEM_LOGIN_REQUIRED' || e.code === 'PENDING_EXPIRATION';
      await db(`plaid_items?id=eq.${item.id}`, {
        method: 'PATCH',
        body: { status: loginNeeded ? 'login_required' : 'error', error_code: e.code || 'unknown' },
        prefer: 'return=minimal',
      });
      throw e;
    }
  }

  const fallbackCurrency = await profileCurrency(item.user_id);
  // Pending transactions get removed and re-added when they post, so only posted ones are stored.
  const keep = t => !t.pending && !isInternalMove(t);

  const newRows = added.filter(keep).map(t => toRow(t, item, fallbackCurrency));
  for (const part of chunk(newRows, 500)) {
    await db('transactions?on_conflict=plaid_transaction_id', {
      method: 'POST',
      body: part,
      prefer: 'resolution=ignore-duplicates,return=minimal',
    });
  }

  // For edits from the bank, only touch amount and date so the user's own category/note edits survive.
  for (const t of modified.filter(keep)) {
    const r = toRow(t, item, fallbackCurrency);
    await db(`transactions?user_id=eq.${item.user_id}&plaid_transaction_id=eq.${encodeURIComponent(t.transaction_id)}`, {
      method: 'PATCH',
      body: { amount: r.amount, date: r.date, type: r.type },
      prefer: 'return=minimal',
    });
  }

  const goneIds = [
    ...removed.map(r => r.transaction_id),
    ...modified.filter(t => !keep(t)).map(t => t.transaction_id),
  ];
  for (const part of chunk(goneIds, 100)) {
    await db(`transactions?user_id=eq.${item.user_id}&plaid_transaction_id=in.(${encodeURIComponent(quoteIds(part))})`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    });
  }

  await db(`plaid_items?id=eq.${item.id}`, {
    method: 'PATCH',
    body: { cursor, status: 'ok', error_code: null, last_synced_at: new Date().toISOString() },
    prefer: 'return=minimal',
  });

  return { added: newRows.length, removed: goneIds.length };
}

async function syncUser(userId) {
  const items = await db(`plaid_items?select=*&user_id=eq.${userId}`);
  let added = 0, removed = 0;
  for (const item of items) {
    try {
      const r = await syncItem(item);
      added += r.added; removed += r.removed;
    } catch (e) {
      console.error('plaid: sync failed', item.item_id, e.message);
    }
  }
  return { added, removed };
}

const publicItems = async userId =>
  db(`plaid_items?select=item_id,institution_name,status,error_code,last_synced_at&user_id=eq.${userId}&order=created_at.asc`);

// ── Handlers ──

async function handleCron(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const invites = await db('bank_sync_invites?select=email');
  const allowed = new Set(invites.map(i => i.email));
  const items = await db('plaid_items?select=*&status=eq.ok');
  let synced = 0, skipped = 0;
  for (const item of items) {
    // Map item → email to respect revoked invites.
    const u = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${item.user_id}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    }).then(r => (r.ok ? r.json() : null));
    if (!u || !allowed.has(String(u.email || '').toLowerCase())) { skipped++; continue; }
    try { await syncItem(item); synced++; } catch (e) { console.error('plaid cron:', item.item_id, e.message); }
  }
  console.log('plaid cron: synced', synced, 'skipped', skipped);
  return res.status(200).json({ synced, skipped });
}

module.exports = async function handler(req, res) {
  if (!SB_KEY || !process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    console.error('plaid: missing SUPABASE_SERVICE_ROLE_KEY / PLAID_CLIENT_ID / PLAID_SECRET');
    return res.status(500).json({ error: 'not_configured' });
  }

  try {
    if (req.method === 'GET') return await handleCron(req, res);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    const user = await userFromRequest(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const invited = await isInvited(user.email);

    if (body.action === 'status') {
      if (!invited) return res.status(200).json({ invited: false });
      return res.status(200).json({ invited: true, env: PLAID_ENV, items: await publicItems(user.id) });
    }

    // Everything past this point is invite only.
    if (!invited) return res.status(403).json({ error: 'not_invited' });

    if (body.action === 'link_token') {
      const lang = String(body.language || 'en').slice(0, 2);
      const linkReq = {
        client_name: 'Odemes',
        user: { client_user_id: user.id },
        country_codes: COUNTRY_CODES,
        language: PLAID_LANGS.includes(lang) ? lang : 'en',
      };
      if (body.item_id) {
        // Reconnect ("update mode") for a bank whose login expired.
        const rows = await db(`plaid_items?select=access_token&user_id=eq.${user.id}&item_id=eq.${encodeURIComponent(body.item_id)}`);
        if (!rows.length) return res.status(404).json({ error: 'not_found' });
        linkReq.access_token = rows[0].access_token;
      } else {
        linkReq.products = ['transactions'];
        linkReq.transactions = { days_requested: 90 };
      }
      const r = await plaid('/link/token/create', linkReq);
      return res.status(200).json({ link_token: r.link_token });
    }

    if (body.action === 'exchange') {
      if (!body.public_token) return res.status(400).json({ error: 'missing_public_token' });
      const ex = await plaid('/item/public_token/exchange', { public_token: body.public_token });
      const inst = body.institution || {};
      const [item] = await db('plaid_items', {
        method: 'POST',
        body: {
          user_id: user.id,
          item_id: ex.item_id,
          access_token: ex.access_token,
          institution_id: inst.institution_id || null,
          institution_name: inst.name || 'Bank',
        },
        prefer: 'return=representation',
      });
      // Plaid may still be fetching history; whatever isn't ready now arrives on the next sync.
      let result = { added: 0, removed: 0 };
      try { result = await syncItem(item); } catch (e) { console.warn('plaid: first sync', e.message); }
      return res.status(200).json({ ...result, items: await publicItems(user.id) });
    }

    if (body.action === 'reconnected') {
      // After update mode the item is healthy again; clear the flag and pull what was missed.
      const rows = await db(`plaid_items?select=*&user_id=eq.${user.id}&item_id=eq.${encodeURIComponent(body.item_id || '')}`);
      if (rows[0]) { try { await syncItem(rows[0]); } catch (e) { console.warn('plaid: resync', e.message); } }
      return res.status(200).json({ items: await publicItems(user.id) });
    }

    if (body.action === 'sync') {
      const r = await syncUser(user.id);
      return res.status(200).json({ ...r, items: await publicItems(user.id) });
    }

    if (body.action === 'disconnect') {
      const rows = await db(`plaid_items?select=id,access_token&user_id=eq.${user.id}&item_id=eq.${encodeURIComponent(body.item_id || '')}`);
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      try { await plaid('/item/remove', { access_token: rows[0].access_token }); }
      catch (e) { console.warn('plaid: item/remove', e.message); }
      await db(`plaid_items?id=eq.${rows[0].id}`, { method: 'DELETE', prefer: 'return=minimal' });
      // Imported transactions are kept — they're the user's history now.
      return res.status(200).json({ items: await publicItems(user.id) });
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (e) {
    console.error('plaid:', e.message);
    return res.status(e instanceof PlaidError ? 502 : 500).json({ error: e.code || 'server_error' });
  }
};
