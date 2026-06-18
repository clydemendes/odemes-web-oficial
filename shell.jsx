// Browser frame + sidebar shell.
const { Icons } = window;

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function BrowserChrome() {
  return (
    <div className="b-chrome">
      <div className="b-lights"><span /><span /><span /></div>
      <div className="b-tabs">
        <div className="b-tab">
          <img src="assets/logo-black.png" alt="" className="logo-light" />
          <img src="assets/logo-white.png" alt="" className="logo-dark" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Odemes — Personal Finance</span>
          <Icons.x size={11} />
        </div>
      </div>
      <div className="b-url">
        <Icons.lock size={11} />
        <span>app.odemes.com/<span style={{ color: 'var(--text)' }}>home</span></span>
      </div>
      <div className="b-actions">
        <Icons.download size={14} />
        <Icons.more size={14} />
      </div>
    </div>);

}

function Sidebar({ page, setPage, collapsed, onToggleCollapse, counts = {}, user }) {
  window.useLang?.();
  const items = [
  { id: 'home', label: window.t?.('nav_home') || 'Home', ico: 'home' },
  { id: 'transactions', label: window.t?.('nav_transactions') || 'Transactions', ico: 'list', pill: counts.transactions },
  { id: 'recurring', label: window.t?.('nav_recurring') || 'Recurring', ico: 'repeat', pill: counts.recurring },
  { id: 'report', label: window.t?.('nav_report') || 'Report', ico: 'chart' }];

  return (
    <aside className="side">
      <div className="side-brand">
        <div className="side-brand-logo">
          <img src="assets/logo-black.png" alt="Odemes" className="logo-light" />
          <img src="assets/logo-white.png" alt="Odemes" className="logo-dark" />
        </div>
        <button
          className="side-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Icons.panel_right size={16} /> : <Icons.panel_left size={16} />}
        </button>
      </div>

      <div className="side-section">{window.t?.('nav_workspace') || 'Workspace'}</div>
      {items.map((it) => {
        const Ico = Icons[it.ico];
        return (
          <button key={it.id} className={`side-item ${page === it.id ? 'active' : ''}`} onClick={() => setPage(it.id)}>
            <Ico className="ico" />
            <span>{it.label}</span>
            {it.pill > 0 && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{it.pill}</span>}
          </button>);

      })}

      <div className="side-spacer" />

      <div className="side-user-wrap">
      <button className={`side-user ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')} title={window.t?.('nav_settings') || 'Settings'}>
        <div className="av">{user ? getInitials(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '') : '?'}</div>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div className="nm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''}</div>
          <div className="em" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
        </div>
      </button>
      </div>

      <div className="side-legal">
        <a href="privacy.html" target="_blank" rel="noopener noreferrer">{window.t?.('privacy_policy') || 'Privacy'}</a>
        <span>·</span>
        <a href="terms.html" target="_blank" rel="noopener noreferrer">{window.t?.('terms_of_service') || 'Terms'}</a>
      </div>
    </aside>);

}

function TopBar({ title, sub, right }) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="topbar-right">{right}</div>
    </div>);

}

// Theme + dark logo swap
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyAccent(hex) {
  // derive deep + tint
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  // Simple deep: darken via mixing with black 18%
  const deep = mixHex(hex, '#000000', 0.18);
  root.style.setProperty('--accent-deep', deep);
  // tint = mix with white
  root.style.setProperty('--accent-tint', mixHex(hex, '#ffffff', 0.88));
  root.style.setProperty('--accent-text', mixHex(hex, '#000000', 0.28));
}
function hexToRgb(h) {h = h.replace('#', '');return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));}
function rgbToHex(r, g, b) {return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');}
function mixHex(a, b, w) {
  const [r1, g1, b1] = hexToRgb(a),[r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    Math.round(r1 * (1 - w) + r2 * w),
    Math.round(g1 * (1 - w) + g2 * w),
    Math.round(b1 * (1 - w) + b2 * w)
  );
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/odemes/id6759557054';

function isIPhone() {
  return typeof navigator !== 'undefined' && /iPhone/.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigator.standalone === true
  );
}

function AppStoreBanner({ onDismiss }) {
  window.useLang?.();
  if (!isIPhone() || isStandalone()) return null;
  return (
    <div className="app-store-banner" role="region" aria-label="Download Odemes app">
      <div className="app-store-banner-inner">
        <img className="app-store-banner-icon" src="assets/apple-touch-icon.png" alt="" />
        <div className="app-store-banner-text">
          <strong>{window.t?.('mobile_app_title') || 'Get the Odemes app'}</strong>
          <span>{window.t?.('mobile_app_sub') || 'Track money faster on iPhone'}</span>
        </div>
        <a className="app-store-banner-btn" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
          {window.t?.('mobile_app_get') || 'Get'}
        </a>
        <button type="button" className="app-store-banner-close" onClick={onDismiss} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}

function MobileTabBar({ page, setPage, counts = {}, onAddTransaction }) {
  window.useLang?.();
  const leftItems = [
    { id: 'home', ico: 'home', label: window.t?.('nav_home') || 'Home' },
    { id: 'transactions', ico: 'list', label: window.t?.('nav_transactions') || 'Activity', pill: counts.transactions },
  ];
  const rightItems = [
    { id: 'recurring', ico: 'repeat', label: window.t?.('nav_recurring') || 'Recurring', pill: counts.recurring },
    { id: 'report', ico: 'chart', label: window.t?.('nav_report') || 'Report' },
  ];
  const TabItem = ({ it }) => {
    const Ico = Icons[it.ico];
    const active = page === it.id;
    return (
      <button
        key={it.id}
        type="button"
        className={`mobile-tab-bar-item ${active ? 'active' : ''}`}
        onClick={() => setPage(it.id)}
        aria-current={active ? 'page' : undefined}
      >
        <Ico className="ico" />
        <span>{it.label}</span>
        {it.pill > 0 && <span className="mobile-tab-bar-pill">{it.pill > 99 ? '99+' : it.pill}</span>}
      </button>
    );
  };
  return (
    <nav className="mobile-tab-bar" aria-label="Main navigation">
      {leftItems.map((it) => <TabItem key={it.id} it={it} />)}
      <button
        type="button"
        className="mobile-tab-bar-fab"
        onClick={onAddTransaction}
        aria-label="Add transaction"
      >
        <Icons.plus size={22} />
      </button>
      {rightItems.map((it) => <TabItem key={it.id} it={it} />)}
    </nav>
  );
}

function MobileHeader({ user, setPage }) {
  return (
    <div className="mobile-header">
      <img src="assets/logo-black.png" alt="Odemes" className="mobile-header-logo logo-light" />
      <img src="assets/logo-white.png" alt="Odemes" className="mobile-header-logo logo-dark" />
      <button
        type="button"
        className="mobile-header-avatar"
        onClick={() => setPage('settings')}
        aria-label="Settings"
      >
        {user ? getInitials(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '') : '?'}
      </button>
    </div>
  );
}

function PWAInstallBanner({ prompt, onInstall, onDismiss }) {
  if (!prompt) return null;
  return (
    <div className="pwa-install-banner" role="region" aria-label="Install Odemes">
      <div className="app-store-banner-inner">
        <img className="app-store-banner-icon" src="assets/apple-touch-icon.png" alt="" />
        <div className="app-store-banner-text">
          <strong>{window.t?.('pwa_install_title') || 'Install Odemes'}</strong>
          <span>{window.t?.('pwa_install_sub') || 'Add to home screen for the best experience'}</span>
        </div>
        <button className="app-store-banner-btn" onClick={onInstall}>
          {window.t?.('pwa_install_btn') || 'Install'}
        </button>
        <button type="button" className="app-store-banner-close" onClick={onDismiss} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}

window.AppShell = { BrowserChrome, Sidebar, TopBar, AppStoreBanner, MobileTabBar, MobileHeader, PWAInstallBanner, applyTheme, applyAccent, isIPhone, isStandalone };