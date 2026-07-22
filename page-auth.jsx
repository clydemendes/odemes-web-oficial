// /auth — sign-in / sign-up with Supabase auth

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
  return (
    <select
      className="auth-lang"
      value={lang}
      onChange={e => window.setLang(e.target.value)}
    >
      <option value="en">🇬🇧 EN</option>
      <option value="es">🇪🇸 ES</option>
      <option value="pt">🇵🇹 PT</option>
      <option value="fr">🇫🇷 FR</option>
    </select>
  );
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/odemes/id6759557054';
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(APP_STORE_URL)}&margin=0&color=000000&bgcolor=ffffff`;

function AppStoreQRModal({ onClose }) {
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="auth-qr-overlay" onClick={onClose}>
      <div className="auth-qr-card" onClick={e => e.stopPropagation()}>
        <button className="auth-qr-close" onClick={onClose} aria-label="Close">×</button>
        <div className="auth-qr-eyebrow">Mobile App</div>
        <div className="auth-qr-title">Scan to download</div>
        <div className="auth-qr-sub">Point your camera at the code</div>
        <div className="auth-qr-img-wrap">
          <img src={QR_SRC} alt="QR code for Odemes on the App Store" />
        </div>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="auth-qr-badge">
          <AppleMark size={16} />
          Download on the App Store
        </a>
      </div>
    </div>
  );
}

function PageAuth() {
  const lang = window.useLang();
  const [loading, setLoading] = React.useState(null);
  const [error, setError] = React.useState('');
  const [showQR, setShowQR] = React.useState(false);

  const signIn = async (provider) => {
    setLoading(provider);
    setError('');
    const { error: err } = await window.SupabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.getAuthRedirectUrl() },
    });
    if (err) { setError(err.message); setLoading(null); }
  };

  return (
    <>
    <div className="auth-stage">
      {/* Interactive dot grid — sits behind everything, non-interactive */}
      <div className="auth-bg" aria-hidden="true">
        <window.DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="#F97316"
          gradientTo="rgba(244,98,42,0.42)"
          glowColor="rgba(255,138,74,0.22)"
        />
      </div>
      <div className="auth-veil" aria-hidden="true" />

      <header className="auth-topnav">
        <img src="assets/logo-white.png" alt="Odemes" className="auth-topnav-logo" />
        <LangSelect />
      </header>

      <main className="auth-body">
        {/* Left — the pitch */}
        <section className="auth-copy">
          <div className="auth-eyebrow">{window.t('auth_eyebrow')}</div>
          <h1 className="auth-headline">
            {window.t('auth_headline_1')}<br/>
            {window.t('auth_headline_2')}
          </h1>
          <p className="auth-lede">{window.t('auth_lede')}</p>

          <button className="auth-appstore-btn" onClick={() => setShowQR(true)}>
            <AppleMark size={20} />
            <div>
              <div className="auth-appstore-btn-label">Download on the</div>
              <div className="auth-appstore-btn-name">App Store</div>
            </div>
          </button>
        </section>

        {/* Right — sign-in */}
        <section className="auth-card">
          <div className="auth-card-head">
            <h2>{window.t('auth_welcome')}</h2>
            <p>{window.t('auth_sub')}</p>
          </div>

          <button className="auth-oauth auth-oauth-google" onClick={() => signIn('google')} disabled={loading !== null}>
            {loading === 'google' ? <span className="auth-spin" /> : <GoogleMark />}
            <span>{loading === 'google' ? window.t('connecting') : window.t('continue_google')}</span>
          </button>

          <button className="auth-oauth auth-oauth-apple" onClick={() => signIn('apple')} disabled={loading !== null}>
            {loading === 'apple' ? <span className="auth-spin auth-spin-light" /> : <AppleMark />}
            <span>{loading === 'apple' ? window.t('connecting') : window.t('continue_apple')}</span>
          </button>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-card-foot">
            <window.Icons.lock size={12} /> {window.t('ssl_badge')}
          </div>
        </section>
      </main>

      <footer className="auth-foot">
        <a href="privacy.html">{window.t('privacy_policy')}</a>
        <span className="auth-foot-dot">·</span>
        <a href="terms.html">{window.t('terms_of_service')}</a>
      </footer>
    </div>
    {showQR && <AppStoreQRModal onClose={() => setShowQR(false)} />}
    </>
  );
}

window.PageAuth = PageAuth;
