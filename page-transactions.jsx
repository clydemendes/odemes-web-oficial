// /transactions
const { Icons: TxI } = window;
const { fmtDate: tfd, relDate: trd, today: txToday } = window.OdemesData;

function getDateRange(period, offset, weekStart) {
  const base = new Date(txToday);
  if (period === 'overall') return null;
  if (period === 'day') {
    base.setDate(base.getDate() + offset);
    const d = base.toISOString().slice(0, 10);
    return { from: d, to: d };
  }
  if (period === 'week') {
    base.setDate(base.getDate() + offset * 7);
    const dayOfWeek = base.getDay();
    const startOffset = weekStart === 'monday' ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : -dayOfWeek;
    const start = new Date(base);
    start.setDate(start.getDate() + startOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }
  if (period === 'month') {
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: d.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }
  if (period === 'year') {
    const y = base.getFullYear() + offset;
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  return null;
}

function getPeriodLabel(period, offset, weekStart) {
  const base = new Date(txToday);
  const locale = window._i18nLocale || 'en-US';
  if (period === 'overall') return window.t?.('all_time') || 'All time';
  if (period === 'day') {
    base.setDate(base.getDate() + offset);
    return base.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (period === 'week') {
    base.setDate(base.getDate() + offset * 7);
    const dayOfWeek = base.getDay();
    const startOffset = weekStart === 'monday' ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : -dayOfWeek;
    const start = new Date(base);
    start.setDate(start.getDate() + startOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
  }
  if (period === 'month') {
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  if (period === 'year') return String(base.getFullYear() + offset);
  return '';
}

function TxModal({ tx, onClose, onSave, onDelete, allExpItems, allIncItems }) {
  window.useLang();
  const isNew = tx === 'new';
  const [form, setForm] = React.useState(() => isNew
    ? { type: 'expense', amount: '', category: '', note: '', date: txToday.toISOString().slice(0, 10) }
    : { type: tx.type, amount: String(tx.amount), category: tx.category, note: tx.note || '', date: tx.date }
  );
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.amount && parseFloat(form.amount) > 0 && form.category;
  const allItems = form.type === 'expense' ? allExpItems : allIncItems;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} className="card modal-card" style={{ width: 440, boxShadow: 'var(--shadow-deep)' }}>
        <div className="card-head">
          <div className="card-title">{isNew ? window.t('new_txn') : window.t('edit_txn')}</div>
          <button className="icon-btn" onClick={onClose}><TxI.x size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isNew && (
            <div className="seg" style={{ alignSelf: 'flex-start' }}>
              <button className={form.type === 'expense' ? 'active' : ''} style={{ color: form.type === 'expense' ? 'var(--expense)' : undefined }} onClick={() => set('type', 'expense')}>{window.t('expense')}</button>
              <button className={form.type === 'income' ? 'active' : ''} style={{ color: form.type === 'income' ? 'var(--income)' : undefined }} onClick={() => set('type', 'income')}>{window.t('income')}</button>
            </div>
          )}
          <div>
            <label className="label">{window.t('amount')}</label>
            <input className="input mono" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label">{form.type === 'income' ? window.t('what_from') : window.t('what_for')}</label>
            <window.DescriptionInput value={form.category} onChange={v => set('category', v)} allItems={allItems}
              placeholder={form.type === 'expense' ? 'e.g. Coffee, Rent, Groceries…' : 'e.g. Salary, Freelance, Gift…'} />
          </div>
          <div><label className="label">{window.t('note')}</label><input className="input" placeholder={window.t('optional')} value={form.note} onChange={e => set('note', e.target.value)} /></div>
          <div>
            <label className="label">{window.t('date')}</label>
            <window.DateButton value={form.date} onChange={v => set('date', v)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {!isNew && <button className="btn btn-danger" onClick={() => onDelete(tx.id)} disabled={saving}><TxI.trash size={14} /> {window.t('delete')}</button>}
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" onClick={onClose}>{window.t('cancel')}</button>
            <button className="btn btn-primary" disabled={!valid || saving} onClick={async () => { setSaving(true); await onSave(form, tx); setSaving(false); }}>
              {saving ? window.t('saving') : isNew ? window.t('add') : window.t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageTransactions({ onCountChange, userId, currency = 'USD' }) {
  window.useLang();
  const [period, setPeriod] = React.useState('month');
  const [offset, setOffset] = React.useState(0);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [modal, setModal] = React.useState(null);
  const [txns, setTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);
    window.SupabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('timestamp', { ascending: false })
      .then(({ data }) => {
        if (data) setTxns(data.map(t => ({ ...t, amount: parseFloat(t.amount) })));
        setLoading(false);
      });
  }, [userId]);

  React.useEffect(() => { onCountChange && onCountChange(txns.length); }, [txns.length]);

  const handlePeriodChange = p => { setPeriod(p); setOffset(0); };

  const range = getDateRange(period, offset, 'sunday');
  const label = getPeriodLabel(period, offset, 'sunday');

  const rows = txns.filter(t => {
    if (range && (t.date < range.from || t.date > range.to)) return false;
    if (filter !== 'all' && t.type !== filter) return false;
    if (search && !(t.category + ' ' + (t.note || '')).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const income   = rows.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = rows.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;

  const groups = {};
  rows.forEach(t => { (groups[t.date] = groups[t.date] || []).push(t); });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const allExpItems = React.useMemo(() => {
    const seen = new Set(); const result = [];
    for (const t of txns) { if (t.type === 'expense' && !seen.has(t.category)) { seen.add(t.category); result.push(t.category); } }
    return result;
  }, [txns]);

  const allIncItems = React.useMemo(() => {
    const seen = new Set(); const result = [];
    for (const t of txns) { if (t.type === 'income' && !seen.has(t.category)) { seen.add(t.category); result.push(t.category); } }
    return result;
  }, [txns]);

  const handleSave = async (form, original) => {
    const sb = window.SupabaseClient;
    const payload = { type: form.type, amount: parseFloat(form.amount) || 0, category: form.category, note: form.note || null, date: form.date, currency };
    if (original === 'new') {
      const { data } = await sb.from('transactions').insert({ user_id: userId, ...payload }).select().single();
      if (data) setTxns(prev => [{ ...data, amount: parseFloat(data.amount) }, ...prev]);
    } else {
      const { data } = await sb.from('transactions').update(payload).eq('id', original.id).select().single();
      if (data) setTxns(prev => prev.map(t => t.id === original.id ? { ...data, amount: parseFloat(data.amount) } : t));
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    await window.SupabaseClient.from('transactions').delete().eq('id', id);
    setTxns(prev => prev.filter(t => t.id !== id));
    setModal(null);
  };

  const periods = [
    { id: 'day', label: window.t('period_day') },
    { id: 'week', label: window.t('period_week') },
    { id: 'month', label: window.t('period_month') },
    { id: 'year', label: window.t('period_year') },
    { id: 'overall', label: window.t('period_overall') },
  ];

  const filters = [
    { id: 'all', label: window.t('all') },
    { id: 'income', label: window.t('income') },
    { id: 'expense', label: window.t('expense') },
  ];

  return (
    <div className="page">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h2 className="page-title" style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{window.t('nav_transactions')}</h2>
        <button className="btn btn-primary" onClick={() => setModal('new')}><TxI.plus size={14} /> {window.t('add')}</button>
      </div>

      <div className="card list-card" style={{ marginBottom: 16, padding: 0 }}>
        <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-cell" style={{ padding: 20, borderRight: '1px solid var(--border-soft)' }}>
            <div className="stat-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('income')}</div>
            <div className="mono stat-value" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 6, color: 'var(--income)' }}>+{window.fmtCurrency(income, currency)}</div>
          </div>
          <div className="stat-cell" style={{ padding: 20, borderRight: '1px solid var(--border-soft)' }}>
            <div className="stat-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('expense')}</div>
            <div className="mono stat-value" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 6, color: 'var(--expense)' }}>−{window.fmtCurrency(expenses, currency)}</div>
          </div>
          <div className="stat-cell" style={{ padding: 20 }}>
            <div className="stat-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('net')}</div>
            <div className="mono stat-value" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 6, color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
              {net >= 0 ? '+' : '−'}{window.fmtCurrency(net, currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="card filters-card" style={{ marginBottom: 16, padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="seg">
          {periods.map(p => (
            <button key={p.id} onClick={() => handlePeriodChange(p.id)} className={period === p.id ? 'active' : ''}>{p.label}</button>
          ))}
        </div>
        {period !== 'overall' && (
          <>
            <button className="btn btn-ghost" style={{ padding: '6px 8px', color: 'var(--text-2)' }} onClick={() => setOffset(o => o - 1)}><TxI.arrow_left size={14} /></button>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            <button className="btn btn-ghost" style={{ padding: '6px 8px', color: offset >= 0 ? 'var(--text-3)' : 'var(--text-2)' }} onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0}><TxI.arrow_right size={14} /></button>
          </>
        )}
        <div className="filters-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, width: '100%' }}>
          {period === 'overall' && <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{window.t('all_time')}</span>}
          <div className="filters-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{ padding: '6px 12px', borderRadius: 9999, background: filter === f.id ? 'var(--accent-tint)' : 'var(--bg-warm)', color: filter === f.id ? 'var(--accent-text)' : 'var(--text-2)', border: '1px solid ' + (filter === f.id ? 'transparent' : 'var(--border-soft)'), fontSize: 12, fontWeight: 600 }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="filters-search" style={{ position: 'relative' }}>
          <TxI.search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" placeholder={window.t('search_ph')} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, width: 200 }} />
        </div>
      </div>

      <div className="card list-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{window.t('loading')}</div>}
        {!loading && dates.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{window.t('no_txns_found')}</div>}
        {dates.map(d => {
          const list = groups[d];
          const dayTotal = list.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
          return (
            <div key={d}>
              <div className="txn-day-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'var(--bg-warm)', borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {trd(d)} <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>{tfd(d)}</span>
                </div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: dayTotal >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {dayTotal >= 0 ? '+' : '−'}{window.fmtCurrency(dayTotal, currency)}
                </div>
              </div>
              {list.map(t => (
                <div key={t.id} className="txn-item" onClick={() => setModal(t)}
                  style={{ display: 'grid', gridTemplateColumns: '32px 1fr 100px auto auto', gap: 14, alignItems: 'center', width: '100%', padding: '12px 20px', borderBottom: '1px solid var(--border-soft)', background: 'transparent', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-warm)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="txn-icon" style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: t.type === 'income' ? 'var(--income-tint)' : 'var(--expense-tint)', color: t.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                    {t.type === 'income' ? <TxI.arrow_down size={14} /> : <TxI.arrow_up size={14} />}
                  </div>
                  <div>
                    <div className="txn-cat" style={{ fontSize: 14, fontWeight: 500 }}>{t.category}</div>
                    <div className="txn-note" style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.note || '—'}</div>
                  </div>
                  <div className="txn-type" style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>{t.type === 'income' ? window.t('income') : window.t('expense')}</div>
                  <div className="mono txn-amt" style={{ fontSize: 14, fontWeight: 600, color: t.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                    {t.type === 'income' ? '+' : '−'}{window.fmtCurrency(t.amount, currency)}
                  </div>
                  <button className="icon-btn" onClick={e => { e.stopPropagation(); setModal(t); }}><TxI.edit size={14} /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {modal !== null && (
        <TxModal tx={modal} onClose={() => setModal(null)} onSave={handleSave} onDelete={handleDelete} allExpItems={allExpItems} allIncItems={allIncItems} />
      )}
    </div>
  );
}

window.PageTransactions = PageTransactions;
