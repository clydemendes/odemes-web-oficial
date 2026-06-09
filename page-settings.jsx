// /settings — sidebar-tabbed layout
const { Icons: SI } = window;

function Row({ title, sub, control }) {
  return (
    <div className="settings-row" style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid var(--border-soft)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, maxWidth: 420 }}>{sub}</div>}
      </div>
      <div>{control}</div>
    </div>
  );
}

function SectionHead({ title, desc }) {
  return (
    <div className="section-head" style={{ paddingBottom: 14, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }}>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.011em' }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{desc}</div>}
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
      <div className="page-intro" style={{ marginBottom: 24 }}>
        <h2 className="page-title" style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{window.t('settings_title')}</h2>
        <div className="page-sub" style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{window.t('settings_sub')}</div>
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'start' }}>
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
                  padding: '9px 12px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500,
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
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', color: '#fff', fontWeight: 700, fontSize: 18, display: 'grid', placeItems: 'center' }}>{initials}</div>
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
                      {nameError && <div style={{ fontSize: 12, color: 'var(--expense)' }}>{nameError}</div>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{displayName}</div>
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
                    className="btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <img src="assets/apple-touch-icon.png" style={{ width: 20, height: 20, borderRadius: 5 }} alt="" />
                    {window.t?.('mobile_app_title') || 'Get the Odemes app'}
                  </a>
                </div>
              )}
              {pwaInstallable && (
                <div style={{ padding: '20px 0 4px' }}>
                  <button className="btn" onClick={onPwaInstall} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
                  {['#F4622A', '#0075de', '#00ACC1', '#7c3aed', '#16a34a', '#111111'].map(c => (
                    <button key={c} onClick={() => setTweak('accent', c)} aria-label={c}
                      style={{
                        width: 22, height: 22, borderRadius: 99, background: c,
                        border: tweaks.accent.toLowerCase() === c.toLowerCase() ? '2px solid var(--text)' : '2px solid transparent',
                        boxShadow: '0 0 0 1px var(--border)', cursor: 'pointer',
                      }} />
                  ))}
                </div>
              } />
            </div>
          )}

          {tab === 'data' && (
            <div>
              <SectionHead title={window.t('s_data')} desc={window.t('s_data_desc')} />
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
                      ? <span style={{ color: 'var(--expense)' }}>{importResult.error}</span>
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
              <Row title={window.t('sign_method')} sub={lastSignIn ? `Last sign-in ${lastSignIn}` : undefined} control={<span className="pill"><span className="dot" /> Google</span>} />
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 200 }}
        >
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: 400, boxShadow: 'var(--shadow-deep)' }}>
            <div className="card-head">
              <div className="card-title" style={{ color: 'var(--expense)' }}>{window.t('delete_confirm_title')}</div>
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
