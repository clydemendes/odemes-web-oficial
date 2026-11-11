// /settings — sidebar-tabbed layout
const { Icons: SI } = window;

function Row({ title, sub, control }) {
  return (
    <div className="settings-row" style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid var(--border-soft)',
    }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3, maxWidth: 420 }}>{sub}</div>}
      </div>
      <div>{control}</div>
    </div>
  );
}

function SectionHead({ title, desc }) {
  return (
    <div className="section-head" style={{ paddingBottom: 14, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{title}</div>
      {desc && <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 5 }}>{desc}</div>}
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Bank sync (Plaid, invite only) ──────────────────────────────────────────
// The server decides who's invited; non-invited users get { invited: false } and
// the section renders nothing, so the feature is invisible to them.

async function bankApi(action, extra) {
  const { data: { session } } = await window.SupabaseClient.auth.getSession();
  if (!session) throw new Error('signed_out');
  const res = await fetch('/api/plaid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'request_failed');
  return data;
}

let plaidScript = null;
function loadPlaidLink() {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  if (!plaidScript) {
    plaidScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      s.onload = () => resolve(window.Plaid);
      s.onerror = () => { plaidScript = null; reject(new Error('plaid_script')); };
      document.head.appendChild(s);
    });
  }
  return plaidScript;
}

// Background sync on app open, at most every 6 hours per browser. Used by app.jsx.
window.bankSyncInBackground = async function(userId) {
  const key = 'odemes-bank-sync-' + userId;
  try {
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 6 * 3600 * 1000) return null;
    localStorage.setItem(key, String(Date.now()));
  } catch (e) {}
  try {
    const status = await bankApi('status');
    if (!status.invited || !status.items?.length) return null;
    return await bankApi('sync');
  } catch (e) { return null; }
};

function BankSyncSection({ language }) {
  const [state, setState] = React.useState({ loading: true, invited: false, items: [] });
  const [busy, setBusy] = React.useState(null); // 'connect' | 'sync' | item_id
  const [message, setMessage] = React.useState(null); // { ok, text }

  React.useEffect(() => {
    let alive = true;
    bankApi('status')
      .then(d => alive && setState({ loading: false, invited: !!d.invited, items: d.items || [], env: d.env }))
      .catch(() => alive && setState({ loading: false, invited: false, items: [] }));
    return () => { alive = false; };
  }, []);

  if (state.loading || !state.invited) return null;

  const setItems = items => setState(s => ({ ...s, items }));
  const fail = () => setMessage({ ok: false, text: window.t('bank_error') });

  const openLink = async (itemId) => {
    setMessage(null);
    setBusy(itemId || 'connect');
    try {
      const [{ link_token }, Plaid] = await Promise.all([
        bankApi('link_token', { item_id: itemId, language }),
        loadPlaidLink(),
      ]);
      const handler = Plaid.create({
        token: link_token,
        onSuccess: async (public_token, metadata) => {
          try {
            const d = itemId
              ? await bankApi('reconnected', { item_id: itemId })
              : await bankApi('exchange', { public_token, institution: metadata.institution });
            setItems(d.items);
            if (!itemId) setMessage({ ok: true, text: window.t('bank_connected', { n: d.added || 0 }) });
          } catch (e) { fail(); }
          setBusy(null);
          handler.destroy();
        },
        onExit: (err) => {
          if (err) fail();
          setBusy(null);
          handler.destroy();
        },
      });
      handler.open();
    } catch (e) { fail(); setBusy(null); }
  };

  const syncNow = async () => {
    setMessage(null);
    setBusy('sync');
    try {
      const d = await bankApi('sync');
      setItems(d.items);
      setMessage({ ok: true, text: window.t('bank_sync_result', { n: d.added }) });
    } catch (e) { fail(); }
    setBusy(null);
  };

  const disconnect = async (item) => {
    if (!confirm(window.t('bank_disconnect_confirm', { bank: item.institution_name }))) return;
    setBusy(item.item_id);
    try { setItems((await bankApi('disconnect', { item_id: item.item_id })).items); } catch (e) { fail(); }
    setBusy(null);
  };

  const lastSynced = (iso) => iso
    ? window.t('bank_last_sync', { when: new Date(iso).toLocaleString(window._i18nLocale || 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) })
    : window.t('bank_never');

  return (
    <>
      <Row
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {window.t('bank_sync')}
            <span className="pill neutral" style={{ fontSize: 11 }}>{window.t('bank_beta')}{state.env === 'sandbox' ? ' · sandbox' : ''}</span>
          </span>
        }
        sub={
          message
            ? <span style={{ color: message.ok ? 'var(--income)' : 'var(--danger)' }}>{message.text}</span>
            : window.t('bank_sync_sub')
        }
        control={
          <div style={{ display: 'flex', gap: 8 }}>
            {state.items.length > 0 && (
              <button className="btn btn-secondary" onClick={syncNow} disabled={!!busy}>
                <SI.repeat size={14} /> {busy === 'sync' ? window.t('bank_syncing') : window.t('bank_sync_now')}
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => openLink()} disabled={!!busy}>
              <SI.plus size={14} /> {busy === 'connect' ? '…' : window.t('bank_connect')}
            </button>
          </div>
        }
      />
      {state.items.map(item => (
        <Row
          key={item.item_id}
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <SI.wallet size={15} style={{ color: 'var(--text-3)' }} />
              {item.institution_name}
            </span>
          }
          sub={
            item.status === 'login_required'
              ? <span style={{ color: 'var(--danger)' }}>{window.t('bank_needs_login')}</span>
              : item.status === 'error'
                ? <span style={{ color: 'var(--danger)' }}>{window.t('bank_error')}</span>
                : lastSynced(item.last_synced_at)
          }
          control={
            <div style={{ display: 'flex', gap: 8 }}>
              {item.status !== 'ok' && (
                <button className="btn btn-secondary" onClick={() => openLink(item.item_id)} disabled={!!busy}>
                  {window.t('bank_reconnect')}
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => disconnect(item)} disabled={!!busy}>
                {busy === item.item_id ? '…' : window.t('bank_disconnect')}
              </button>
            </div>
          }
        />
      ))}
    </>
  );
}

function PageSettings({ tweaks, setTweak, onSignOut, userId, user, pwaInstallable, onPwaInstall }) {
  window.useLang();
  const [tab, setTab] = React.useState('account');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('');
  const [nameSaving, setNameSaving] = React.useState(false);
  const [nameError, setNameError] = React.useState('');
  const [importState, setImportState] = React.useState('idle'); // idle | importing
  const [importResult, setImportResult] = React.useState(null); // { count } | { error }
  const importInputRef = React.useRef(null);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const email = user?.email || '';
  const initials = getInitials(displayName || email.split('@')[0]);
  const locale = window._i18nLocale || 'en-US';
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : '';
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setNameSaving(true);
    setNameError('');
    const { error } = await window.SupabaseClient.auth.updateUser({ data: { full_name: trimmed } });
    if (error) {
      setNameError(error.message);
    } else {
      if (userId) window.SupabaseClient.from('profiles').update({ full_name: trimmed }).eq('id', userId);
      setEditingName(false);
    }
    setNameSaving(false);
  };

  const syncTweak = (key, value) => {
    setTweak(key, value);
    // For language: also write directly to the i18n key so it survives refresh
    // immediately, independently of React state or Supabase.
    if (key === 'language') {
      try { localStorage.setItem('odemes-lang', value); } catch(e) {}
      window.setLang?.(value);
    }
    if (!userId) return;
    const sb = window.SupabaseClient;
    if (key === 'currency') sb.from('profiles').update({ currency: value }).eq('id', userId);
    if (key === 'language') sb.from('profiles').update({ language: value }).eq('id', userId);
    if (key === 'theme')    sb.from('profiles').update({ dark_mode: value === 'dark' }).eq('id', userId);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!userId || !file) return;
    setImportResult(null);
    setImportState('importing');
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
      if (lines.length < 2) { setImportResult({ error: 'No data rows found.' }); setImportState('idle'); return; }
      const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
      const dateIdx = headers.indexOf('date');
      const typeIdx = headers.indexOf('type');
      const catIdx  = headers.indexOf('category');
      const noteIdx = headers.indexOf('note');
      const amtIdx  = headers.indexOf('amount');
      if (dateIdx === -1 || typeIdx === -1 || amtIdx === -1) {
        setImportResult({ error: 'Invalid CSV. Expected columns: Date, Type, Category, Note, Amount.' });
        setImportState('idle'); return;
      }
      const currency = tweaks.currency || 'USD';
      const rows = lines.slice(1).map(line => {
        const cols = parseCSVRow(line);
        const amount = parseFloat(cols[amtIdx]);
        const type = (cols[typeIdx] || '').trim().toLowerCase();
        return { user_id: userId, date: cols[dateIdx], type, category: cols[catIdx] || '', note: cols[noteIdx] || null, amount, currency };
      }).filter(r => r.date && (r.type === 'income' || r.type === 'expense') && !isNaN(r.amount));
      if (!rows.length) { setImportResult({ error: 'No valid rows to import.' }); setImportState('idle'); return; }
      const { error } = await window.SupabaseClient.from('transactions').insert(rows);
      if (error) setImportResult({ error: error.message });
      else setImportResult({ count: rows.length });
    } catch (err) {
      setImportResult({ error: err.message });
    }
    setImportState('idle');
  };

  const exportCSV = async () => {
    if (!userId) return;
    const { data } = await window.SupabaseClient
      .from('transactions')
      .select('date, type, category, note, amount')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (!data) return;
    const header = 'Date,Type,Category,Note,Amount';
    const rows = data.map(t =>
      [t.date, t.type, t.category, `"${(t.note || '').replace(/"/g, '""')}"`, parseFloat(t.amount).toFixed(2)].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odemes-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'account',    label: window.t('s_account'),    ico: 'settings' },
    { id: 'appearance', label: window.t('s_appearance'), ico: 'sun' },
    { id: 'data',       label: window.t('s_data'),       ico: 'download' },
    { id: 'security',   label: window.t('s_security'),   ico: 'shield' },
  ];

  return (
    <div className="page">
      <div className="page-intro" style={{ marginBottom: 32 }}>
        <h2 className="page-title">{window.t('settings_title')}</h2>
        <div className="page-sub">{window.t('settings_sub')}</div>
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'start' }}>
        {/* Tab nav */}
        <nav className="settings-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 24 }}>
          {tabs.map(t => {
            const Ico = SI[t.ico];
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9,
                  fontSize: 14.5, fontWeight: tab === t.id ? 500 : 450,
                  textAlign: 'left', width: '100%',
                  background: tab === t.id ? 'var(--bg-warm)' : 'transparent',
                  color: tab === t.id ? 'var(--text)' : 'var(--text-2)',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                <Ico size={16} style={{ color: tab === t.id ? 'var(--accent)' : 'var(--text-3)' }} />
                {t.label}
              </button>
            );
          })}
          <div className="settings-version" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border-soft)', fontSize: 11, color: 'var(--text-3)', padding: '16px 12px 0' }}>
            {window.t('version_label')}<br />
            {window.t('build_label')}
          </div>
        </nav>

        {/* Content */}
        <div className="settings-content" style={{ maxWidth: 640 }}>

          {tab === 'account' && (
            <div>
              <SectionHead title={window.t('s_account')} desc={window.t('s_account_desc')} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div className="avatar-lg">{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingName ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          placeholder="Your name"
                          autoFocus
                          style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" onClick={saveName} disabled={nameSaving || !nameInput.trim()} style={{ whiteSpace: 'nowrap' }}>
                          {nameSaving ? '…' : window.t('save')}
                        </button>
                        <button className="btn btn-ghost" onClick={() => { setEditingName(false); setNameError(''); }}>
                          {window.t('cancel')}
                        </button>
                      </div>
                      {nameError && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{nameError}</div>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 500, fontSize: 16 }}>{displayName}</div>
                      <button className="icon-btn" title="Edit name" onClick={() => { setNameInput(displayName); setEditingName(true); }}>
                        <SI.edit size={13} />
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{email}</div>
                  {joinedDate && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Joined {joinedDate}</div>}
                </div>
              </div>
              <Row title={window.t('currency')} sub={window.t('currency_sub')} control={
                <select
                  className="input"
                  value={tweaks.currency || 'USD'}
                  onChange={e => syncTweak('currency', e.target.value)}
                  style={{ width: 160 }}
                >
                  <option value="USD">🇺🇸  USD — US Dollar</option>
                  <option value="EUR">🇪🇺  EUR — Euro</option>
                  <option value="GBP">🇬🇧  GBP — British Pound</option>
                  <option value="JPY">🇯🇵  JPY — Japanese Yen</option>
                  <option value="CHF">🇨🇭  CHF — Swiss Franc</option>
                  <option value="CAD">🇨🇦  CAD — Canadian Dollar</option>
                  <option value="AUD">🇦🇺  AUD — Australian Dollar</option>
                  <option value="CVE">🇨🇻  CVE — Cape Verdean Escudo</option>
                </select>
              } />
              <Row title={window.t('language')} sub={window.t('language_sub')} control={
                <select
                  className="input"
                  value={tweaks.language || 'en'}
                  onChange={e => syncTweak('language', e.target.value)}
                  style={{ width: 140 }}
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="pt">🇵🇹 Português</option>
                  <option value="fr">🇫🇷 Français</option>
                </select>
              } />
              <Row title={window.t('week_starts')} control={
                <div className="seg">
                  <button
                    className={(tweaks.weekStart || 'sunday') === 'sunday' ? 'active' : ''}
                    onClick={() => setTweak('weekStart', 'sunday')}
                  >{window.t('sunday')}</button>
                  <button
                    className={(tweaks.weekStart || 'sunday') === 'monday' ? 'active' : ''}
                    onClick={() => setTweak('weekStart', 'monday')}
                  >{window.t('monday')}</button>
                </div>
              } />
              {window.AppShell.isIPhone() && !window.AppShell.isStandalone() && (
                <div style={{ padding: '20px 0 4px' }}>
                  <a
                    href="https://apps.apple.com/us/app/odemes/id6759557054"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <img src="assets/apple-touch-icon.png" style={{ width: 20, height: 20, borderRadius: 5 }} alt="" />
                    {window.t?.('mobile_app_title') || 'Get the Odemes app'}
                  </a>
                </div>
              )}
              {pwaInstallable && (
                <div style={{ padding: '20px 0 4px' }}>
                  <button className="btn btn-secondary" onClick={onPwaInstall} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <img src="assets/icon-192.png" style={{ width: 20, height: 20, borderRadius: 5 }} alt="" />
                    {window.t?.('pwa_install_title') || 'Install Odemes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'appearance' && (
            <div>
              <SectionHead title={window.t('s_appearance')} desc={window.t('s_appearance_desc')} />
              <Row title={window.t('theme')} sub={window.t('theme_sub')} control={
                <div className="seg">
                  <button className={tweaks.theme === 'light' ? 'active' : ''} onClick={() => syncTweak('theme', 'light')}>{window.t('light')}</button>
                  <button className={tweaks.theme === 'dark' ? 'active' : ''} onClick={() => syncTweak('theme', 'dark')}>{window.t('dark')}</button>
                </div>
              } />
              <Row title={window.t('accent')} sub={window.t('accent_sub')} control={
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#1aae39', '#0075de', '#00ACC1', '#7c3aed', '#F4622A'].map(c => (
                    <button key={c} onClick={() => setTweak('accent', c)} aria-label={c}
                      style={{
                        width: 24, height: 24, borderRadius: 99, background: c, cursor: 'pointer',
                        border: '3px solid var(--bg)',
                        boxShadow: (tweaks.accent || '').toLowerCase() === c.toLowerCase() ? '0 0 0 1.5px var(--text)' : '0 0 0 1px var(--border)',
                      }} />
                  ))}
                </div>
              } />
            </div>
          )}

          {tab === 'data' && (
            <div>
              <SectionHead title={window.t('s_data')} desc={window.t('s_data_desc')} />
              <BankSyncSection language={tweaks.language} />
              <Row
                title={window.t('export_csv')}
                sub={window.t('export_csv_sub')}
                control={
                  <button className="btn btn-secondary" onClick={exportCSV}>
                    <SI.download size={14} /> {window.t('export_btn')}
                  </button>
                }
              />
              <Row
                title={window.t('import_csv')}
                sub={
                  importResult
                    ? importResult.error
                      ? <span style={{ color: 'var(--danger)' }}>{importResult.error}</span>
                      : <span style={{ color: 'var(--income)' }}>{window.t('import_success').replace('{n}', importResult.count)}</span>
                    : window.t('import_csv_sub')
                }
                control={
                  <>
                    <input ref={importInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
                    <button className="btn btn-secondary" onClick={() => { setImportResult(null); importInputRef.current?.click(); }} disabled={importState === 'importing'}>
                      <SI.upload size={14} /> {importState === 'importing' ? '…' : window.t('import_btn')}
                    </button>
                  </>
                }
              />
              <Row
                title={window.t('cloud_backup')}
                sub={window.t('cloud_backup_sub')}
                control={<span className="pill income"><SI.check size={11} /> On</span>}
              />
              <Row
                title={window.t('delete_data')}
                sub={window.t('delete_data_sub')}
                control={
                  <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                    <SI.trash size={14} /> {window.t('delete')}
                  </button>
                }
              />
            </div>
          )}

          {tab === 'security' && (
            <div>
              <SectionHead title={window.t('s_security')} desc={window.t('s_security_desc')} />
              <Row title={window.t('email_label')} control={<span style={{ fontSize: 13, color: 'var(--text-2)' }} className="mono">{email}</span>} />
              <Row title={window.t('sign_method')} sub={lastSignIn ? `Last sign-in ${lastSignIn}` : undefined} control={<span className="pill neutral">{({ google: 'Google', apple: 'Apple' })[user?.app_metadata?.provider] || 'Google'}</span>} />
              <Row
                title={window.t('sign_out')}
                sub={window.t('sign_out_sub')}
                control={
                  <button className="btn btn-secondary" onClick={onSignOut}>
                    <SI.logout size={14} /> {window.t('sign_out')}
                  </button>
                }
              />
            </div>
          )}

        </div>
      </div>

      {/* Legal footer */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-soft)', display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="privacy.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >{window.t('privacy_policy')}</a>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>·</span>
        <a href="terms.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >{window.t('terms_of_service')}</a>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200 }}
        >
          <div onClick={e => e.stopPropagation()} className="card modal-card" style={{ width: 400, boxShadow: 'var(--shadow-deep)' }}>
            <div className="card-head">
              <div className="card-title">{window.t('delete_confirm_title')}</div>
              <button className="icon-btn" onClick={() => setShowDeleteConfirm(false)}><SI.x size={14} /></button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 20px' }}>
              {window.t('delete_confirm_body')}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>{window.t('cancel')}</button>
              <button className="btn btn-danger" onClick={async () => {
                if (userId) {
                  await window.SupabaseClient.from('transactions').delete().eq('user_id', userId);
                  await window.SupabaseClient.from('recurring_transactions').delete().eq('user_id', userId);
                }
                setShowDeleteConfirm(false);
              }}>
                <SI.trash size={14} /> {window.t('delete_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.PageSettings = PageSettings;
