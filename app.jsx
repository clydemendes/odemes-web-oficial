// Top-level app — routing, session, theme/accent
const { Sidebar, AppStoreBanner, MobileTabBar, applyTheme, applyAccent, isIPhone } = window.AppShell;
const { useTweaks } = window;

// Format a number as currency. Uses Intl so symbol, grouping and decimals are locale-correct.
window.fmtCurrency = function(amount, currency, fractionDigits) {
  const fd = fractionDigits !== undefined ? fractionDigits : 2;
  return new Intl.NumberFormat(window._i18nLocale || 'en-US', {
    style: 'currency', currency: currency || 'USD',
    minimumFractionDigits: fd, maximumFractionDigits: fd,
  }).format(Math.abs(amount));
};

// Returns just the currency symbol (e.g. "$", "€", "£").
window.currencySymbol = function(currency) {
  const parts = new Intl.NumberFormat(window._i18nLocale || 'en-US', {
    style: 'currency', currency: currency || 'USD',
  }).formatToParts(0);
  return (parts.find(p => p.type === 'currency') || {}).value || (currency || 'USD');
};

const DEFAULTS = {
  theme: 'dark',
  accent: '#F4622A',
  homeVariation: 'split',
  density: 'comfortable',
  currency: 'USD',
  language: 'en',
  weekStart: 'sunday',
};

function App() {
  const [tweaks, setTweak] = useTweaks(DEFAULTS);
  const [page, setPage] = React.useState('auth');
  const [user, setUser] = React.useState(null);
  const [booting, setBooting] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState(false);
  const [txnCount, setTxnCount] = React.useState(0);
  const [recurCount, setRecurCount] = React.useState(0);
  const [bannerDismissed, setBannerDismissed] = React.useState(() => {
    try { return localStorage.getItem('odemes_app_banner_dismissed') === '1'; } catch { return false; }
  });

  const dismissAppBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem('odemes_app_banner_dismissed', '1'); } catch {}
  };

  React.useEffect(() => {
    if (isIPhone()) document.documentElement.classList.add('is-iphone');
    const mq = window.matchMedia('(max-width: 720px)');
    const syncMobile = () => document.documentElement.classList.toggle('is-mobile', mq.matches);
    syncMobile();
    mq.addEventListener('change', syncMobile);
    return () => mq.removeEventListener('change', syncMobile);
  }, []);

  React.useEffect(() => {
    const show = isIPhone() && !bannerDismissed;
    document.documentElement.classList.toggle('has-app-banner', show);
    return () => document.documentElement.classList.remove('has-app-banner');
  }, [bannerDismissed]);

  React.useEffect(() => { applyTheme(tweaks.theme); }, [tweaks.theme]);
  React.useEffect(() => { applyAccent(tweaks.accent); }, [tweaks.accent]);
  React.useEffect(() => { document.documentElement.setAttribute('data-density', tweaks.density); }, [tweaks.density]);
  React.useEffect(() => { window.setLang?.(tweaks.language || 'en'); }, [tweaks.language]);

  const loadProfile = async (userId) => {
    const { data } = await window.SupabaseClient
      .from('profiles')
      .select('currency, dark_mode')
      .eq('id', userId)
      .single();
    if (data) {
      if (data.currency) setTweak('currency', data.currency);
      // Language is intentionally NOT loaded from Supabase.
      // It is stored in both 'odemes-lang' (i18n) and 'odemes-prefs' (tweaks) locally,
      // and loading from Supabase overwrites the user's chosen language on every refresh.
      if (data.dark_mode !== null && data.dark_mode !== undefined) {
        setTweak('theme', data.dark_mode ? 'dark' : 'light');
      }
    }
  };

  const loadCounts = async (userId) => {
    const [{ count: tc }, { count: rc }] = await Promise.all([
      window.SupabaseClient.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      window.SupabaseClient.from('recurring_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    setTxnCount(tc || 0);
    setRecurCount(rc || 0);
  };

  React.useEffect(() => {
    const sb = window.SupabaseClient;
    let bootDone = false;
    const finishBoot = () => {
      if (bootDone) return;
      bootDone = true;
      setBooting(false);
    };

    const applySession = (session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
        loadCounts(session.user.id);
        setPage('home');
      } else {
        setUser(null);
        setPage('auth');
      }
    };

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        applySession(session);
      } else if (event === 'USER_UPDATED') {
        // Refresh user object so updated metadata (e.g. full_name) is reflected immediately
        if (session?.user) setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        applySession(null);
      }
      if (event === 'INITIAL_SESSION') finishBoot();
    });

    sb.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      if (session?.user) loadCounts(session.user.id);
      finishBoot();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await window.SupabaseClient.auth.signOut();
    setUser(null);
    setPage('auth');
  };

  if (booting) {
    return (
      <div className="stage">
        <div className="browser" style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="stage">
        <div className="browser">
          {!bannerDismissed && <AppStoreBanner onDismiss={dismissAppBanner} />}
          <window.PageAuth />
        </div>
      </div>
    );
  }

  let content = null;
  if (page === 'home')         content = <window.PageHome variation={tweaks.homeVariation} setPage={setPage} userId={user.id} currency={tweaks.currency} />;
  if (page === 'transactions') content = <window.PageTransactions onCountChange={setTxnCount} userId={user.id} currency={tweaks.currency} />;
  if (page === 'recurring')    content = <window.PageRecurring onCountChange={setRecurCount} userId={user.id} currency={tweaks.currency} />;
  if (page === 'report')       content = <window.PageReport userId={user.id} currency={tweaks.currency} />;
  if (page === 'settings')     content = <window.PageSettings tweaks={tweaks} setTweak={setTweak} onSignOut={handleSignOut} userId={user.id} user={user} />;

  return (
    <div className="stage">
      <div className="browser">
        {!bannerDismissed && <AppStoreBanner onDismiss={dismissAppBanner} />}
        <div className="app" data-collapsed={collapsed ? '1' : '0'}>
          <Sidebar page={page} setPage={setPage} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} counts={{ transactions: txnCount, recurring: recurCount }} user={user} />
          <main className="app-main" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>{content}</div>
          </main>
        </div>
        <MobileTabBar page={page} setPage={setPage} counts={{ transactions: txnCount, recurring: recurCount }} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
