// POST /api/welcome-email — sends the welcome email to a brand-new signup.
//
// Called by the Postgres trigger on auth.users (see assets/welcome-email-trigger.sql),
// not by the browser. Requests must carry the shared secret header.
//
// Env vars (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY        re_...            from resend.com/api-keys
//   WELCOME_EMAIL_SECRET  long random string, must match the trigger's secret
//   WELCOME_EMAIL_FROM    'Odemes <hello@odemes.com>'  (optional, has a default)

const crypto = require('crypto');

const FROM = process.env.WELCOME_EMAIL_FROM || 'Odemes <hello@odemes.com>';
const APP_URL = 'https://www.odemes.com';

const COPY = {
  en: {
    subject: 'Welcome to Odemes',
    preheader: 'Your money, scored A to F. Here is how to start.',
    greeting: name => (name ? `Hi ${name},` : 'Hi,'),
    lede: 'Thanks for signing up. Odemes turns your income and expenses into a single monthly grade — A to F — so you always know where you stand without spreadsheets, categories, or guilt.',
    stepsTitle: 'Three minutes to your first grade',
    steps: [
      'Log a couple of expenses and your income for this month.',
      'Add your recurring bills once — rent, phone, subscriptions.',
      'Open the report to see your grade and where the money went.',
    ],
    cta: 'Open Odemes',
    outro: 'Reply to this email if anything is confusing. A real person reads it.',
    signoff: '— The Odemes team',
  },
  es: {
    subject: 'Bienvenido a Odemes',
    preheader: 'Tu dinero, puntuado de A a F. Así puedes empezar.',
    greeting: name => (name ? `Hola ${name}:` : 'Hola:'),
    lede: 'Gracias por registrarte. Odemes convierte tus ingresos y gastos en una sola nota mensual — de A a F — para que siempre sepas dónde estás, sin hojas de cálculo, categorías ni culpa.',
    stepsTitle: 'Tres minutos hasta tu primera nota',
    steps: [
      'Registra un par de gastos y tus ingresos de este mes.',
      'Añade tus pagos recurrentes una vez: alquiler, móvil, suscripciones.',
      'Abre el informe para ver tu nota y adónde fue el dinero.',
    ],
    cta: 'Abrir Odemes',
    outro: 'Responde a este correo si algo no queda claro. Lo lee una persona real.',
    signoff: '— El equipo de Odemes',
  },
  pt: {
    subject: 'Bem-vindo ao Odemes',
    preheader: 'O seu dinheiro, classificado de A a F. Comece assim.',
    greeting: name => (name ? `Olá ${name},` : 'Olá,'),
    lede: 'Obrigado por se registar. O Odemes transforma as suas receitas e despesas numa única nota mensal — de A a F — para que saiba sempre onde está, sem folhas de cálculo, categorias ou culpa.',
    stepsTitle: 'Três minutos até à sua primeira nota',
    steps: [
      'Registe algumas despesas e as receitas deste mês.',
      'Adicione as suas contas recorrentes uma vez: renda, telemóvel, subscrições.',
      'Abra o relatório para ver a sua nota e para onde foi o dinheiro.',
    ],
    cta: 'Abrir o Odemes',
    outro: 'Responda a este email se algo não for claro. É lido por uma pessoa real.',
    signoff: '— A equipa Odemes',
  },
  fr: {
    subject: 'Bienvenue sur Odemes',
    preheader: 'Votre argent, noté de A à F. Voici comment démarrer.',
    greeting: name => (name ? `Bonjour ${name},` : 'Bonjour,'),
    lede: "Merci de votre inscription. Odemes transforme vos revenus et dépenses en une seule note mensuelle — de A à F — pour que vous sachiez toujours où vous en êtes, sans tableurs, catégories ni culpabilité.",
    stepsTitle: 'Trois minutes avant votre première note',
    steps: [
      'Enregistrez quelques dépenses et vos revenus du mois.',
      'Ajoutez vos factures récurrentes une fois : loyer, téléphone, abonnements.',
      'Ouvrez le rapport pour voir votre note et où est parti l’argent.',
    ],
    cta: 'Ouvrir Odemes',
    outro: 'Répondez à cet email si quelque chose n’est pas clair. Une vraie personne le lit.',
    signoff: '— L’équipe Odemes',
  },
};

// Google/Apple hand us things like 'pt-BR' or 'en_US'; we only speak four languages.
function pickLang(locale) {
  const base = String(locale || '').toLowerCase().replace('_', '-').split('-')[0];
  return COPY[base] ? base : 'en';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Constant-time compare so the secret can't be guessed byte by byte.
function secretMatches(provided, expected) {
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function renderHtml(c, name) {
  const steps = c.steps
    .map((s, i) => `
          <tr>
            <td style="padding:0 0 14px 0;vertical-align:top;width:28px">
              <div style="width:22px;height:22px;border-radius:11px;background:#FFF1E7;color:#C2410C;font:600 12px/22px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-align:center">${i + 1}</div>
            </td>
            <td style="padding:0 0 14px 0;color:#3F3F46;font:400 15px/22px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${escapeHtml(s)}</td>
          </tr>`)
    .join('');

  return `<!doctype html>
<html lang="${c.lang}">
<body style="margin:0;padding:0;background:#FAFAF9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF9;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E7E5E4;border-radius:16px">
          <tr>
            <td style="padding:32px 32px 0 32px">
              <div style="font:700 20px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181B;letter-spacing:-0.02em">Odemes</div>
              <div style="height:3px;width:34px;background:#F97316;border-radius:2px;margin-top:10px"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 0 32px">
              <p style="margin:0 0 14px 0;color:#18181B;font:600 17px/24px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${escapeHtml(c.greeting(name))}</p>
              <p style="margin:0;color:#52525B;font:400 15px/23px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${escapeHtml(c.lede)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 0 32px">
              <p style="margin:0 0 14px 0;color:#18181B;font:600 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.06em">${escapeHtml(c.stepsTitle)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${steps}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 0 32px">
              <a href="${APP_URL}" style="display:inline-block;background:#F97316;color:#FFFFFF;text-decoration:none;padding:13px 24px;border-radius:10px;font:600 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${escapeHtml(c.cta)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 32px 32px">
              <p style="margin:0 0 6px 0;color:#71717A;font:400 14px/21px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${escapeHtml(c.outro)}</p>
              <p style="margin:0;color:#71717A;font:400 14px/21px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${escapeHtml(c.signoff)}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
          <tr>
            <td align="center" style="padding:18px 8px 0 8px;color:#A1A1AA;font:400 12px/18px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
              <a href="${APP_URL}/privacy.html" style="color:#A1A1AA">Privacy</a> ·
              <a href="${APP_URL}/terms.html" style="color:#A1A1AA">Terms</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(c, name) {
  return [
    c.greeting(name),
    '',
    c.lede,
    '',
    c.stepsTitle,
    ...c.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `${c.cta}: ${APP_URL}`,
    '',
    c.outro,
    c.signoff,
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const secret = process.env.WELCOME_EMAIL_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) {
    console.error('welcome-email: missing WELCOME_EMAIL_SECRET or RESEND_API_KEY');
    return res.status(500).json({ error: 'not_configured' });
  }
  if (!secretMatches(req.headers['x-welcome-secret'], secret)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  // Only the first word — "Hi Clyde," reads better than "Hi Clyde Mendes,".
  const name = String(body.name || '').trim().split(/\s+/)[0] || '';
  const lang = pickLang(body.locale);
  const c = { ...COPY[lang], lang };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: c.subject,
      html: renderHtml(c, name),
      text: renderText(c, name),
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    console.error('welcome-email: resend failed', resp.status, detail);
    return res.status(502).json({ error: 'send_failed' });
  }

  const sent = await resp.json();
  console.log('welcome-email: sent', sent.id, 'lang', lang);
  return res.status(200).json({ ok: true, id: sent.id });
};
