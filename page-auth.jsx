// Signed-out experience: the landing page, the live demo, and sign-in (Supabase OAuth).
const { Icons: LI } = window;

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0012 23z"/>
      <path fill="#FBBC05" d="M5.85 14.11A6.6 6.6 0 015.5 12c0-.73.13-1.44.35-2.11V7.05H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.95l3.67-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}

function AppleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.85c.02-2.4 1.96-3.55 2.05-3.6-1.12-1.63-2.86-1.86-3.48-1.88-1.48-.15-2.9.87-3.65.87-.76 0-1.92-.85-3.16-.83-1.62.02-3.13.95-3.97 2.4-1.7 2.94-.43 7.27 1.21 9.65.81 1.16 1.76 2.46 3 2.42 1.21-.05 1.66-.78 3.13-.78 1.45 0 1.88.78 3.16.75 1.31-.02 2.13-1.18 2.93-2.34.93-1.34 1.31-2.65 1.33-2.72-.03-.01-2.55-.98-2.58-3.88zM14.16 5.42c.66-.81 1.11-1.92.99-3.04-.96.04-2.13.65-2.81 1.45-.61.71-1.15 1.85-1.01 2.94 1.07.08 2.16-.55 2.83-1.35z"/>
    </svg>
  );
}

function LangSelect() {
  const lang = window.useLang();
  const pick = value => {
    window.setLang(value);
    // The app reads its language from saved preferences on load, so keep those in step.
    try {
      const prefs = JSON.parse(localStorage.getItem('odemes-prefs') || '{}');
      localStorage.setItem('odemes-prefs', JSON.stringify({ ...prefs, language: value }));
    } catch (e) {}
  };
  return (
    <select
      className="lp-lang"
      value={lang}
      onChange={e => pick(e.target.value)}
      aria-label={window.t('language')}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="pt">Português</option>
      <option value="fr">Français</option>
    </select>
  );
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/odemes/id6759557054';
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=368x368&data=${encodeURIComponent(APP_STORE_URL)}&margin=0&color=000000&bgcolor=ffffff`;

// Shared dialog behaviour: Escape closes, focus moves in and stays in, focus returns on close.
function useLpDialog(onClose) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const focusables = () => node ? Array.from(node.querySelectorAll('button, a[href], select, input')).filter(el => !el.disabled) : [];
    const first = focusables().find(el => !el.classList.contains('lp-dialog-close')) || focusables()[0];
    first?.focus();
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const a = els[0], z = els[els.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, []);
  return ref;
}

function SignInButtons({ loading, signIn, block }) {
  const cls = block ? ' lp-btn-block' : '';
  return (
    <>
      <button className={'lp-btn lp-btn-ink' + cls} onClick={() => signIn('google')} disabled={loading !== null}>
        {loading === 'google' ? <span className="lp-spin" /> : <GoogleMark />}
        <span>{loading === 'google' ? window.t('connecting') : window.t('continue_google')}</span>
      </button>
      <button className={'lp-btn lp-btn-line' + cls} onClick={() => signIn('apple')} disabled={loading !== null}>
        {loading === 'apple' ? <span className="lp-spin" /> : <AppleMark />}
        <span>{loading === 'apple' ? window.t('connecting') : window.t('continue_apple')}</span>
      </button>
    </>
  );
}

function SignInDialog({ onClose, loading, error, signIn }) {
  const ref = useLpDialog(onClose);
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="lp-signin-title" onClick={e => e.stopPropagation()}>
        <button className="lp-dialog-close" onClick={onClose} aria-label={window.t('close')}><LI.x size={16} /></button>
        <img className="lp-dialog-mark" src="assets/apple-touch-icon.png" alt="" />
        <h2 id="lp-signin-title">{window.t('auth_welcome')}</h2>
        <p className="lp-dialog-sub">{window.t('auth_sub')}</p>
        <SignInButtons loading={loading} signIn={signIn} block />
        {error && <div className="lp-error" role="alert">{error}</div>}
        <div className="lp-dialog-foot"><LI.lock size={12} /> {window.t('ssl_badge')}</div>
      </div>
    </div>
  );
}

function AppStoreQRModal({ onClose }) {
  const ref = useLpDialog(onClose);
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="lp-qr-title" onClick={e => e.stopPropagation()}>
        <button className="lp-dialog-close" onClick={onClose} aria-label={window.t('close')}><LI.x size={16} /></button>
        <h2 id="lp-qr-title">{window.t('lp_qr_title')}</h2>
        <p className="lp-dialog-sub">{window.t('lp_qr_sub')}</p>
        <div className="lp-qr">
          <img src={QR_SRC} alt={window.t('lp_qr_alt')} />
        </div>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-ink lp-btn-block">
          <AppleMark size={17} />
          <span>{window.t('lp_qr_open')}</span>
        </a>
      </div>
    </div>
  );
}

// ───────────────────────── Live demo ─────────────────────────
// A working slice of the Home screen. Nothing is sent anywhere; it only lives in state.
const LP_SEED = [
  { id: 's1', type: 'expense', k: 'demo_coffee',    amount: 4.5,   d: 0 },
  { id: 's2', type: 'expense', k: 'demo_groceries', amount: 286.4, d: 1 },
  { id: 's3', type: 'expense', k: 'demo_dinner',    amount: 64,    d: 2 },
  { id: 's4', type: 'expense', k: 'demo_rent',      amount: 1600,  d: 4 },
  { id: 's5', type: 'income',  k: 'demo_salary',    amount: 4200,  d: 4 },
];
const LP_CHIPS = {
  expense: [['demo_coffee', 450], ['demo_groceries', 6420], ['demo_dinner', 4800], ['demo_flights', 32000]],
  income:  [['demo_freelance', 45000], ['demo_salary', 420000]],
};

function lpWhen(d) {
  if (d === 0) return window.t('today');
  if (d === 1) return window.t('yesterday');
  return window.t('days_ago', { n: d });
}

function LiveDemo() {
  const lang = window.useLang();
  const cur = lang === 'en' ? 'USD' : 'EUR';
  const locale = window._i18nLocale || 'en-US';
  const [type, setType] = React.useState('expense');
  const [digits, setDigits] = React.useState('');      // amount as a string of cents, like the real form
  const [what, setWhat] = React.useState('');
  const [chipFilled, setChipFilled] = React.useState(true);
  const [rows, setRows] = React.useState(LP_SEED);
  const [saved, setSaved] = React.useState(false);

  const amountDisplay = React.useMemo(() => {
    if (!digits) return '';
    const padded = digits.padStart(3, '0');
    return parseInt(padded.slice(0, -2), 10).toLocaleString(locale) + '.' + padded.slice(-2);
  }, [digits, locale]);

  const income = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const spent = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const rate = income > 0 ? (income - spent) / income : 0;
  const grade = window.gradeFor(rate);
  const ringC = 2 * Math.PI * 42;
  const max = Math.max(income, spent, 1);

  const pickType = t => { setType(t); setWhat(''); setDigits(''); setChipFilled(true); };
  const pickChip = (key, cents) => {
    setWhat(window.t(key));
    if (!digits || chipFilled) { setDigits(String(cents)); setChipFilled(true); }
  };
  const value = parseInt(digits || '0', 10) / 100;
  const canSave = value > 0 && what.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    setRows(prev => [
      { id: 'n' + Date.now(), type, label: what.trim(), amount: value, d: 0, fresh: true },
      ...prev.map(r => (r.fresh ? { ...r, fresh: false } : r)),
    ]);
    setDigits(''); setWhat(''); setChipFilled(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 1100);
  };
  const onEnter = e => { if (e.key === 'Enter') save(); };

  const nav = [['home', 'nav_home'], ['list', 'nav_transactions'], ['repeat', 'nav_recurring'], ['chart', 'nav_report']];

  return (
    <div className="lp-demo">
      <div className="lp-demo-side" aria-hidden="true">
        <img src="assets/logo-black.png" alt="" />
        {nav.map(([ico, key], i) => {
          const Ico = LI[ico];
          return <div key={key} className={'lp-demo-nav' + (i === 0 ? ' active' : '')}><Ico size={17} />{window.t(key)}</div>;
        })}
      </div>

      <div className="lp-demo-main">
        <div className="lp-demo-head">
          <div>
            <div className="lp-demo-title">{window.t('welcome_back')}</div>
            <div className="lp-demo-date">{new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
          <div className="lp-demo-badge"><i />{window.t('lp_demo_badge')}</div>
        </div>

        <div className="lp-demo-grid">
          {/* Entry */}
          <div className="lp-panel lp-entry">
            <div className="lp-panel-title">{window.t('new_txn')}</div>
            <div className="seg" style={{ width: '100%' }} role="group" aria-label={window.t('new_txn')}>
              <button type="button" onClick={() => pickType('expense')} className={type === 'expense' ? 'active' : ''} aria-pressed={type === 'expense'} style={{ flex: 1 }}>{window.t('expense')}</button>
              <button type="button" onClick={() => pickType('income')} className={type === 'income' ? 'active' : ''} aria-pressed={type === 'income'} style={{ flex: 1, color: type === 'income' ? 'var(--income)' : undefined }}>{window.t('income')}</button>
            </div>
            <div className="lp-amount">
              <span>{window.currencySymbol(cur)}</span>
              <input
                value={amountDisplay}
                onChange={e => { setDigits(e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, 9)); setChipFilled(false); }}
                onKeyDown={onEnter}
                placeholder="0.00" inputMode="numeric" autoComplete="off"
                aria-label={window.t('amount')}
              />
            </div>
            <div className="lp-field">
              <label className="label" htmlFor="lp-what">{type === 'income' ? window.t('what_from') : window.t('what_for')}</label>
              <input id="lp-what" className="input" value={what} onChange={e => setWhat(e.target.value)} onKeyDown={onEnter}
                placeholder={window.t('lp_demo_hint')} autoComplete="off" maxLength={32} />
              <div className="lp-chips">
                {LP_CHIPS[type].map(([key, cents]) => (
                  <button type="button" key={key} className={'lp-chip' + (what === window.t(key) ? ' on' : '')} onClick={() => pickChip(key, cents)}>{window.t(key)}</button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn-primary lp-save" onClick={save} disabled={!canSave && !saved}>
              <LI.check size={15} /> {saved ? window.t('saved') : window.t('save_txn')}
            </button>
          </div>

          {/* Result */}
          <div>
            <div className="lp-panel" aria-live="polite">
              <div className="lp-grade">
                <div className="lp-ring">
                  <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
                    <circle className="track" cx="48" cy="48" r="42" fill="none" strokeWidth="6" />
                    <circle className="fill" cx="48" cy="48" r="42" fill="none" strokeWidth="6" strokeLinecap="round"
                      style={{ stroke: window.gradeFill(grade) }}
                      strokeDasharray={`${Math.min(Math.max(rate, 0.02), 1) * ringC} ${ringC}`} />
                  </svg>
                  <div key={grade} className="lp-ring-letter" style={{ color: window.gradeColor(grade) }}>{grade}</div>
                </div>
                <div>
                  <div className="lp-grade-label">{window.t('savings_rate')}</div>
                  <div className="lp-grade-rate">{Math.round(rate * 100)}%</div>
                  <div className="lp-grade-word" style={{ color: window.gradeColor(grade) }}>{window.t('grade')} {grade} · {window.gradeLabel(grade)}</div>
                </div>
              </div>
              <div className="lp-flow">
                <div className="lp-flow-row">
                  <span>{window.t('income')}</span><b>{window.fmtCurrency(income, cur)}</b>
                  <div className="lp-flow-bar"><i style={{ width: `${income / max * 100}%`, background: 'var(--green)' }} /></div>
                </div>
                <div className="lp-flow-row">
                  <span>{window.t('lp_demo_spent')}</span><b>{window.fmtCurrency(spent, cur)}</b>
                  <div className="lp-flow-bar"><i style={{ width: `${spent / max * 100}%`, background: '#000' }} /></div>
                </div>
              </div>
            </div>

            <div className="lp-panel">
              <div className="lp-panel-title">{window.t('recent_activity')}</div>
              <div className="lp-rows">
                {rows.slice(0, 3).map(r => (
                  <div key={r.id} className={'lp-row' + (r.fresh ? ' is-new' : '')}>
                    <div className={'lp-row-ico' + (r.type === 'income' ? ' in' : '')}>
                      {r.type === 'income' ? <LI.arrow_down size={14} /> : <LI.arrow_up size={14} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="lp-row-name">{r.k ? window.t(r.k) : r.label}</div>
                      <div className="lp-row-when">{lpWhen(r.d)}</div>
                    </div>
                    <div className={'lp-row-amt' + (r.type === 'income' ? ' in' : '')}>
                      {r.type === 'income' ? '+' : '−'}{window.fmtCurrency(r.amount, cur)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Feature illustrations (static) ─────────────────────────
function MockQuickAdd({ cur }) {
  return (
    <div className="lp-phone" aria-hidden="true" inert="">
      <div className="lp-phone-screen">
        <div className="lp-phone-notch" />
        <div className="seg" style={{ width: '100%' }}>
          <button className="active" style={{ flex: 1 }} tabIndex={-1}>{window.t('expense')}</button>
          <button style={{ flex: 1 }} tabIndex={-1}>{window.t('income')}</button>
        </div>
        <div className="lp-phone-amount"><span>{window.currencySymbol(cur)}</span>{(12.8).toLocaleString(window._i18nLocale || 'en-US', { minimumFractionDigits: 2 })}</div>
        <div className="lp-phone-input">{window.t('demo_lunch')}</div>
        <div className="lp-chips" style={{ marginTop: 0 }}>
          <span className="lp-chip on">{window.t('demo_lunch')}</span>
          <span className="lp-chip">{window.t('demo_coffee')}</span>
          <span className="lp-chip">{window.t('demo_groceries')}</span>
        </div>
        <div className="lp-phone-save">{window.t('save_txn')}</div>
      </div>
    </div>
  );
}

function MockRecurring({ cur }) {
  const locale = window._i18nLocale || 'en-US';
  const later = new Date(); later.setDate(later.getDate() + 19);
  const bills = [
    { k: 'demo_rent',   amount: 1600, type: 'expense', due: window.t('due_today'), cls: 'expense', confirm: true },
    { k: 'demo_phone',  amount: 45,   type: 'expense', due: window.t('in_days', { n: 3 }), cls: 'warn' },
    { k: 'demo_salary', amount: 4200, type: 'income',  due: window.t('in_days', { n: 6 }), cls: 'warn' },
    { k: 'demo_gym',    amount: 39,   type: 'expense', due: later.toLocaleDateString(locale, { month: 'short', day: 'numeric' }), cls: 'neutral' },
  ];
  return (
    <div className="lp-mock" aria-hidden="true" inert="">
      <div className="lp-mock-head" style={{ marginBottom: 4 }}>
        <div className="lp-mock-title">{window.t('nav_recurring')}</div>
        <div className="lp-mock-note">{window.t('sorted_by_due')}</div>
      </div>
      {bills.map((b, i) => {
        const name = window.t(b.k);
        return (
          <div key={b.k} className="lp-bill" style={i === 0 ? { borderTop: 0 } : undefined}>
            <div className={'lp-bill-ico' + (b.type === 'income' ? ' in' : '')}>{name[0]}</div>
            <div>
              <div className="lp-bill-name">{name}</div>
              <div className="lp-bill-meta"><span className={'pill ' + b.cls}>{b.due}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={'lp-bill-amt' + (b.type === 'income' ? ' in' : '')}>{b.type === 'income' ? '+' : '−'}{window.fmtCurrency(b.amount, cur)}</div>
              {b.confirm && <div className="lp-bill-confirm"><LI.check size={11} /> {window.t('confirm_btn')}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MockReport({ cur }) {
  const locale = window._i18nLocale || 'en-US';
  const inc = [3900, 4200, 4200, 4350, 4200, 4200];
  const exp = [2900, 2650, 2480, 2700, 2210, 2243];
  const W = 376, H = 132, padB = 22, padT = 8;
  const x = i => 4 + i * (W - 8) / 5;
  const y = v => padT + (1 - (v - 1200) / (4600 - 1200)) * (H - padT - padB);
  const line = arr => arr.map((v, i) => {
    if (i === 0) return `M ${x(0)},${y(v)}`;
    const mx = (x(i - 1) + x(i)) / 2;
    return `C ${mx},${y(arr[i - 1])} ${mx},${y(v)} ${x(i)},${y(v)}`;
  }).join(' ');
  const months = inc.map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString(locale, { month: 'short' });
  });
  const cats = [['demo_rent', 1600], ['demo_groceries', 412], ['demo_dinner', 186], ['demo_phone', 45]];
  return (
    <div className="lp-mock" aria-hidden="true" inert="">
      <div className="lp-mock-head">
        <div className="lp-mock-title">{window.t('income_vs_exp')}</div>
        <div className="lp-legend">
          <span><i style={{ background: 'var(--green)' }} />{window.t('income')}</span>
          <span><i style={{ background: '#000' }} />{window.t('expense')}</span>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[0, 1, 2].map(i => <line key={i} x1="0" x2={W} y1={padT + i * (H - padT - padB) / 2} y2={padT + i * (H - padT - padB) / 2} stroke="rgba(0,0,0,0.07)" />)}
        <path d={line(inc)} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
        <path d={line(exp)} fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        <circle cx={x(5)} cy={y(inc[5])} r="3.5" fill="var(--green)" stroke="#fff" strokeWidth="2" />
        <circle cx={x(5)} cy={y(exp[5])} r="3.5" fill="#000" stroke="#fff" strokeWidth="2" />
        {months.map((m, i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === 5 ? 'end' : 'middle'} style={{ fontSize: 11, fill: '#737373', fontFamily: 'var(--font)' }}>{m}</text>
        ))}
      </svg>
      <div className="lp-mock-title" style={{ marginTop: 18 }}>{window.t('by_category')}</div>
      {cats.map(([k, v]) => (
        <div key={k} className="lp-cat">
          <b>{window.t(k)}</b><span>{window.fmtCurrency(v, cur, 0)}</span>
          <div className="meter"><i style={{ width: `${v / 1600 * 100}%`, background: '#000' }} /></div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────
function PageAuth() {
  const lang = window.useLang();
  const [loading, setLoading] = React.useState(null);
  const [error, setError] = React.useState('');
  const [showQR, setShowQR] = React.useState(false);
  const [showSignIn, setShowSignIn] = React.useState(false);
  const [stuck, setStuck] = React.useState(false);
  const cur = lang === 'en' ? 'USD' : 'EUR';

  React.useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const signIn = async (provider) => {
    setLoading(provider);
    setError('');
    const { error: err } = await window.SupabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.getAuthRedirectUrl() },
    });
    if (err) { setError(err.message); setLoading(null); }
  };

  const jump = id => e => {
    e.preventDefault();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  };

  const scale = [
    ['A', window.t('lp_range_a'), '#0f8528'],
    ['B', '35–49%', '#000'],
    ['C', '20–34%', '#525252'],
    ['D', '5–19%', '#7a7a7a'],
    ['F', window.t('lp_range_f'), '#949494'],
  ];
  const faqs = [1, 2, 3, 4, 5];

  return (
    <div className="lp auth-stage">
      <header className={'lp-nav' + (stuck ? ' is-stuck' : '')}>
        <div className="lp-wrap lp-nav-inner">
          <a href="/" className="lp-logo" aria-label="Odemes"><img src="assets/logo-black.png" alt="Odemes" /></a>
          <nav className="lp-nav-links" aria-label={window.t('lp_nav_label')}>
            <a href="#grade" onClick={jump('grade')}>{window.t('lp_nav_grade')}</a>
            <a href="#features" onClick={jump('features')}>{window.t('lp_nav_features')}</a>
            <a href="#faq" onClick={jump('faq')}>{window.t('lp_nav_faq')}</a>
          </nav>
          <div className="lp-nav-right">
            <LangSelect />
            <button className="lp-btn lp-btn-ink lp-btn-sm" onClick={() => setShowSignIn(true)}>{window.t('sign_in')}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap">
            <h1 className="lp-h1 lp-rise">
              {window.t('auth_headline_1')}<br />
              {window.t('auth_headline_2')}
            </h1>
            <p className="lp-lede lp-rise">{window.t('auth_lede')}</p>
            <div className="lp-actions lp-rise">
              <SignInButtons loading={loading} signIn={signIn} />
            </div>
            <div className="lp-rise">
              <button className="lp-textlink" onClick={() => setShowQR(true)}>
                <AppleMark size={15} /><span>{window.t('lp_get_app')}</span>
              </button>
              {error && !showSignIn && <div className="lp-error" role="alert">{error}</div>}
            </div>
            <div className="lp-demo-shell">
              <LiveDemo />
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-wrap lp-anchor lp-center" id="grade">
            <h2 className="lp-h2">{window.t('lp_grade_title')}</h2>
            <p className="lp-sub">{window.t('lp_grade_sub')}</p>
            <div className="lp-scale">
              {scale.map(([letter, range, color]) => (
                <div key={letter} className="lp-scale-step">
                  <div className="lp-scale-letter" style={{ color }}>{letter}</div>
                  <div className="lp-scale-range">{range}</div>
                  <div className="lp-scale-word">{window.gradeLabel(letter)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-wrap lp-anchor lp-features" id="features">
            <div className="lp-feature">
              <div className="lp-feature-copy">
                <h3 className="lp-h3">{window.t('lp_f1_title')}</h3>
                <p>{window.t('lp_f1_body')}</p>
              </div>
              <div className="lp-feature-media"><MockQuickAdd cur={cur} /></div>
            </div>
            <div className="lp-feature">
              <div className="lp-feature-copy">
                <h3 className="lp-h3">{window.t('lp_f2_title')}</h3>
                <p>{window.t('lp_f2_body')}</p>
              </div>
              <div className="lp-feature-media"><MockRecurring cur={cur} /></div>
            </div>
            <div className="lp-feature">
              <div className="lp-feature-copy">
                <h3 className="lp-h3">{window.t('lp_f3_title')}</h3>
                <p>{window.t('lp_f3_body')}</p>
              </div>
              <div className="lp-feature-media"><MockReport cur={cur} /></div>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-wrap">
            <p className="lp-facts">{window.t('lp_facts')}</p>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-wrap lp-anchor lp-faq" id="faq">
            <h2 className="lp-h2">{window.t('lp_faq_title')}</h2>
            <div className="lp-faq-list">
              {faqs.map(n => (
                <details key={n} className="lp-faq-item">
                  <summary>{window.t('lp_q' + n)}<LI.plus size={18} /></summary>
                  <p>
                    {window.t('lp_a' + n)}
                    {n === 5 && <> <a href="privacy.html">{window.t('privacy_policy')}</a>.</>}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="lp-dark">
        <div className="lp-dark-bg" aria-hidden="true">
          <window.DotField
            dotRadius={1.5}
            dotSpacing={16}
            bulgeStrength={46}
            glowRadius={200}
            sparkle={false}
            waveAmplitude={0}
            gradientFrom="rgba(255,255,255,0.55)"
            gradientTo="rgba(255,255,255,0.3)"
            glowColor="rgba(26,174,57,0.28)"
          />
        </div>
        <section className="lp-close">
          <div className="lp-wrap">
            <h2 className="lp-h2">{window.t('lp_close_title')}</h2>
            <p className="lp-sub">{window.t('lp_close_sub')}</p>
            <div className="lp-actions">
              <SignInButtons loading={loading} signIn={signIn} />
            </div>
          </div>
        </section>
        <footer className="lp-wrap lp-foot">
          <div className="lp-foot-brand">
            <img src="assets/logo-white.png" alt="Odemes" />
            <span>© {new Date().getFullYear()} Odemes</span>
          </div>
          <div className="lp-foot-links">
            <button onClick={() => setShowQR(true)}>{window.t('lp_get_app')}</button>
            <a href="privacy.html">{window.t('privacy_policy')}</a>
            <a href="terms.html">{window.t('terms_of_service')}</a>
          </div>
        </footer>
      </div>

      {showSignIn && <SignInDialog onClose={() => setShowSignIn(false)} loading={loading} error={error} signIn={signIn} />}
      {showQR && <AppStoreQRModal onClose={() => setShowQR(false)} />}
    </div>
  );
}

window.PageAuth = PageAuth;
