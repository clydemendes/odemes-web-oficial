// /recurring
const { Icons: RI } = window;
const { relDate: rrd, today: rtoday } = window.OdemesData;

function dueBadge(next) {
  const days = Math.round((new Date(next) - rtoday) / 86400000);
  if (days <= 0) return { label: window.t?.('due_today') || 'Due today', cls: 'expense' };
  if (days <= 7) return { label: window.t?.('in_days', { n: days }) || `In ${days}d`, cls: 'warn' };
  return { label: rrd(next), cls: 'neutral' };
}

const normalize = r => ({ ...r, next: r.next_due_date, amount: parseFloat(r.amount) });

const EMPTY_FORM = { type: 'expense', amount: '', category: '', frequency: 'monthly', next: '', note: '' };

function RecurringModal({ initial, onClose, onSave, onDelete }) {
  window.useLang();
  const isNew = initial === 'new';
  const [form, setForm] = React.useState(() => isNew ? EMPTY_FORM : {
    type: initial.type,
    amount: String(initial.amount),
    category: initial.category,
    frequency: initial.frequency,
    next: initial.next,
    note: initial.note || '',
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.amount && parseFloat(form.amount) > 0 && form.category && form.next;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: 460, boxShadow: 'var(--shadow-deep)' }}>
        <div className="card-head">
          <div className="card-title">{isNew ? window.t('new_recurring_title') : window.t('edit_recurring_title')}</div>
          <button className="icon-btn" onClick={onClose}><RI.x size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            <button className={form.type === 'expense' ? 'active' : ''} style={{ color: form.type === 'expense' ? 'var(--expense)' : undefined }} onClick={() => set('type', 'expense')}>{window.t('expense')}</button>
            <button className={form.type === 'income' ? 'active' : ''} style={{ color: form.type === 'income' ? 'var(--income)' : undefined }} onClick={() => set('type', 'income')}>{window.t('income')}</button>
          </div>
          <div>
            <label className="label">{window.t('amount')}</label>
            <input className="input mono" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">{form.type === 'income' ? window.t('what_from') : window.t('what_for')}</label>
              <input className="input" placeholder="e.g. Spotify, Rent…" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
            <div>
              <label className="label">{window.t('frequency')}</label>
              <div className="seg" style={{ width: '100%' }}>
                <button className={form.frequency === 'monthly' ? 'active' : ''} style={{ flex: 1 }} onClick={() => set('frequency', 'monthly')}>{window.t('monthly')}</button>
                <button className={form.frequency === 'yearly' ? 'active' : ''} style={{ flex: 1 }} onClick={() => set('frequency', 'yearly')}>{window.t('yearly')}</button>
              </div>
            </div>
          </div>
          <div>
            <label className="label">{window.t('next_due')}</label>
            <window.DateButton value={form.next} onChange={v => set('next', v)} />
          </div>
          <div>
            <label className="label">{window.t('note')}</label>
            <input className="input" placeholder={window.t('optional')} value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {!isNew && <button className="btn btn-danger" disabled={saving} onClick={() => onDelete(initial.id)}><RI.trash size={14} /> {window.t('delete')}</button>}
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" onClick={onClose}>{window.t('cancel')}</button>
            <button className="btn btn-primary" disabled={!valid || saving} onClick={async () => { setSaving(true); await onSave(form, initial); setSaving(false); }}>
              {saving ? window.t('saving') : isNew ? window.t('add') : window.t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageRecurring({ onCountChange, userId, currency = 'USD' }) {
  window.useLang();
  const [items, setItems] = React.useState([]);
  const [modal, setModal] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);
    window.SupabaseClient
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('next_due_date', { ascending: true })
      .then(({ data }) => {
        if (data) setItems(data.map(normalize));
        setLoading(false);
      });
  }, [userId]);

  React.useEffect(() => { onCountChange && onCountChange(items.length); }, [items.length]);

  const monthlyOut = items.filter(r => r.type === 'expense' && r.frequency === 'monthly').reduce((s, r) => s + r.amount, 0);
  const monthlyIn  = items.filter(r => r.type === 'income'  && r.frequency === 'monthly').reduce((s, r) => s + r.amount, 0);

  const handleSave = async (form, original) => {
    const sb = window.SupabaseClient;
    const payload = {
      type: form.type,
      amount: parseFloat(form.amount),
      category: form.category,
      note: form.note || null,
      frequency: form.frequency,
      next_due_date: form.next,
      currency,
    };
    if (original === 'new') {
      const { data } = await sb.from('recurring_transactions').insert({ user_id: userId, ...payload, is_active: true }).select().single();
      if (data) setItems(prev => [...prev, normalize(data)].sort((a, b) => a.next.localeCompare(b.next)));
    } else {
      const { data } = await sb.from('recurring_transactions').update(payload).eq('id', original.id).select().single();
      if (data) setItems(prev => prev.map(r => r.id === original.id ? normalize(data) : r));
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    await window.SupabaseClient.from('recurring_transactions').delete().eq('id', id);
    setItems(prev => prev.filter(r => r.id !== id));
    setModal(null);
  };

  const confirmItem = async (id) => {
    const item = items.find(r => r.id === id);
    if (!item) return;
    const d = new Date(item.next);
    if (item.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    const next_due_date = d.toISOString().slice(0, 10);
    await window.SupabaseClient.from('recurring_transactions').update({ next_due_date, last_processed_date: item.next }).eq('id', id);
    setItems(prev => prev.map(r => r.id === id ? { ...r, next: next_due_date } : r));
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{window.t('nav_recurring')}</h2>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{window.t('recurring_sub')}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}><RI.plus size={14} /> {window.t('new_recurring')}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('monthly_out')}</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 6, color: 'var(--expense)' }}>−{window.fmtCurrency(monthlyOut, currency)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{items.filter(r => r.type === 'expense' && r.frequency === 'monthly').length} {window.t('active')}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('monthly_in')}</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 6, color: 'var(--income)' }}>+{window.fmtCurrency(monthlyIn, currency)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{items.filter(r => r.type === 'income' && r.frequency === 'monthly').length} {window.t('active')}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('net_per_month')}</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 6, color: (monthlyIn - monthlyOut) >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {(monthlyIn - monthlyOut) >= 0 ? '+' : '−'}{window.fmtCurrency(monthlyIn - monthlyOut, currency)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{window.t('after_fixed')}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-soft)' }}>
          <div className="card-title">{window.t('nav_recurring')} · {items.length}</div>
          <div className="card-sub mono">{window.t('sorted_by_due')}</div>
        </div>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{window.t('loading')}</div>}
        {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{window.t('no_recurring')}</div>}
        {items.slice().sort((a, b) => a.next.localeCompare(b.next)).map(r => {
          const b = dueBadge(r.next);
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 110px 120px 120px auto', gap: 14, alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: r.type === 'income' ? 'var(--income-tint)' : 'var(--bg-warm)', display: 'grid', placeItems: 'center', color: r.type === 'income' ? 'var(--income)' : 'var(--text-2)', fontWeight: 700, fontSize: 13 }}>
                {r.category[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.category}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.note}</div>
              </div>
              <div className="pill neutral">{r.frequency === 'monthly' ? window.t('monthly') : window.t('yearly')}</div>
              <span className={`pill ${b.cls}`}>{b.label}</span>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: r.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                {r.type === 'income' ? '+' : '−'}{window.fmtCurrency(r.amount, currency)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {b.cls === 'expense' && (
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => confirmItem(r.id)}>
                    <RI.check size={12} /> {window.t('confirm_btn')}
                  </button>
                )}
                <button className="icon-btn" onClick={() => setModal(r)}><RI.edit size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {modal !== null && (
        <RecurringModal initial={modal} onClose={() => setModal(null)} onSave={handleSave} onDelete={handleDelete} />
      )}
    </div>
  );
}

window.PageRecurring = PageRecurring;
