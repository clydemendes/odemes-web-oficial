// /home — three layout variations
const { Icons: HI } = window;
const { relDate: hrd, today: htoday } = window.OdemesData;

const TODAY_KEY = htoday.toISOString().slice(0, 10);

function deriveAll(type, txns) {
  const seen = new Set();
  const result = [];
  for (const t of txns) {
    if (t.type === type && !seen.has(t.category)) {
      seen.add(t.category);
      result.push(t.category);
    }
  }
  return result;
}

function loadRecent(type) {
  try {
    const stored = JSON.parse(localStorage.getItem(`odemes-recent-${type}`));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (e) {}
  return [];
}

function saveRecent(type, list) {
  try { localStorage.setItem(`odemes-recent-${type}`, JSON.stringify(list)); } catch (e) {}
}

function pushRecent(description, prev) {
  return [description, ...prev.filter(c => c !== description)].slice(0, 16);
}

function DescriptionInput({ value, onChange, allItems, placeholder }) {
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef(null);

  const trimmed = value.trim();
  const suggestions = trimmed.length >= 2
    ? allItems.filter(s => s.toLowerCase().startsWith(trimmed.toLowerCase()) && s.toLowerCase() !== trimmed.toLowerCase())
    : [];

  const showDropdown = focused && suggestions.length > 0;
  const chips = allItems.slice(0, 8).filter(s => s !== value);

  const pick = s => { onChange(s); setFocused(false); };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder || 'e.g. Coffee, Spotify, Rent…'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        autoComplete="off"
      />
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 10, zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
          {suggestions.slice(0, 6).map(s => (
            <button key={s} onMouseDown={e => { e.preventDefault(); pick(s); }}
              style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', fontSize: 13, color: 'var(--text)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-warm)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 700 }}>{s.slice(0, trimmed.length)}</span>
              <span style={{ color: 'var(--text-2)' }}>{s.slice(trimmed.length)}</span>
            </button>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {chips.map(s => (
            <button key={s} onMouseDown={e => { e.preventDefault(); pick(s); }}
              style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: 'var(--bg-warm)', color: 'var(--text-2)', border: '1px solid var(--border-soft)' }}
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
window.DescriptionInput = DescriptionInput;

function DateButton({ value, onChange }) {
  window.useLang();
  const ref = React.useRef(null);
  const locale = window._i18nLocale || 'en-US';
  const d = value ? new Date(value + 'T00:00:00') : null;
  const label = d ? d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }) : (window.t?.('pick_date') || 'Pick date');
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" onClick={() => ref.current?.showPicker?.()}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-warm)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap' }}
      >
        <HI.calendar size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        {label}
      </button>
      <input ref={ref} type="date" value={value} onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', width: '100%' }} tabIndex={-1} />
    </div>
  );
}
window.DateButton = DateButton;

function EntryFormSplit({ shared }) {
  window.useLang();
  const { type, setType, amount, setAmount, category, setCategory, note, setNote, date, setDate, saving, saved, handleSave, allExpItems, allIncItems, currency = 'USD' } = shared;
  const allItems = type === 'expense' ? allExpItems : allIncItems;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div className="card-title">{window.t('new_txn')}</div>
        <span className="card-sub mono">{hrd(TODAY_KEY)}</span>
      </div>
      <div className="seg" style={{ width: '100%', alignSelf: 'stretch' }}>
        <button onClick={() => setType('expense')} className={type === 'expense' ? 'active' : ''} style={{ flex: 1, color: type === 'expense' ? 'var(--expense)' : undefined }}>{window.t('expense')}</button>
        <button onClick={() => setType('income')} className={type === 'income' ? 'active' : ''} style={{ flex: 1, color: type === 'income' ? 'var(--income)' : undefined }}>{window.t('income')}</button>
      </div>
      <div style={{ border: `1.5px solid ${type === 'income' ? 'var(--income)' : 'var(--expense)'}`, borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'baseline', gap: 4, background: 'var(--bg)' }}>
        <span className="mono" style={{ fontSize: 22, color: 'var(--text-3)', fontWeight: 500 }}>{window.currencySymbol(currency)}</span>
        <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="mono"
          style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', padding: 0 }} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{currency}</span>
      </div>
      <div>
        <label className="label">{type === 'income' ? window.t('what_from') : window.t('what_for')}</label>
        <DescriptionInput value={category} onChange={setCategory} allItems={allItems}
          placeholder={type === 'expense' ? 'e.g. Coffee, Groceries, Rent…' : 'e.g. Salary, Freelance, Gift…'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label className="label">{window.t('note')}</label>
          <input className="input" placeholder={window.t('optional')} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div>
          <label className="label">{window.t('date')}</label>
          <DateButton value={date} onChange={setDate} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ alignSelf: 'stretch' }} onClick={() => handleSave()} disabled={!amount || !category || saving || saved}>
        <HI.check size={14} /> {saving ? window.t('saving') : saved ? window.t('saved') : window.t('save_txn')}
      </button>
    </div>
  );
}

function HomeSplit({ shared }) {
  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(360px, 1.05fr) minmax(320px, 1fr)' }}>
      <EntryFormSplit shared={shared} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <SummaryStrip stats={shared.stats} currency={shared.currency} />
        <RecentMini setPage={shared.setPage} txns={shared.liveTxns} currency={shared.currency} />
      </div>
    </div>
  );
}

function HomeHero({ shared }) {
  window.useLang();
  const { type, setType, amount, setAmount, category, setCategory, note, setNote, saving, saved, handleSave, allExpItems, allIncItems, currency = 'USD' } = shared;
  const allItems = type === 'expense' ? allExpItems : allIncItems;
  const locale = window._i18nLocale || 'en-US';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div className="seg">
          <button onClick={() => setType('expense')} className={type === 'expense' ? 'active' : ''} style={{ color: type === 'expense' ? 'var(--expense)' : undefined }}>{window.t('expense')}</button>
          <button onClick={() => setType('income')} className={type === 'income' ? 'active' : ''} style={{ color: type === 'income' ? 'var(--income)' : undefined }}>{window.t('income')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, justifyContent: 'center' }}>
          <span className="mono" style={{ fontSize: 72, color: type === 'income' ? 'var(--income)' : 'var(--text-3)', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.04em', fontFamily: 'Inter' }}>{window.currencySymbol(currency)}</span>
          <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="mono"
            style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 96, fontWeight: 700, letterSpacing: '-0.04em', color: type === 'income' ? 'var(--income)' : 'var(--text)', width: `${Math.max(4, (amount || '0.00').length)}ch`, maxWidth: '60vw', textAlign: 'left', padding: 0, lineHeight: 1 }} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }} className="mono">
          {currency} · {htoday.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <div style={{ width: 'min(420px, 90%)' }}>
          <DescriptionInput value={category} onChange={setCategory} allItems={allItems}
            placeholder={type === 'expense' ? 'e.g. Coffee, Groceries, Rent…' : 'e.g. Salary, Freelance, Gift…'} />
        </div>
        <div style={{ display: 'flex', gap: 10, width: 'min(420px, 90%)' }}>
          <input className="input" placeholder={window.t('optional')} style={{ flex: 1 }} value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn btn-primary btn-lg" onClick={() => handleSave()} disabled={!amount || !category || saving || saved}>
            <HI.check size={14} /> {saving ? window.t('saving') : saved ? window.t('saved') : window.t('save')}
          </button>
        </div>
      </div>
      <SummaryStrip stats={shared.stats} currency={shared.currency} />
      <RecentMini setPage={shared.setPage} txns={shared.liveTxns} currency={shared.currency} />
    </div>
  );
}

function HomeCalc({ shared }) {
  window.useLang();
  const { type, setType, amount, setAmount, category, setCategory, note, setNote, date, setDate, saving, saved, handleSave, allExpItems, allIncItems, currency = 'USD' } = shared;
  const allItems = type === 'expense' ? allExpItems : allIncItems;
  const press = k => {
    if (k === '⌫') { setAmount(a => a.slice(0, -1)); return; }
    if (k === '.' && amount.includes('.')) return;
    setAmount(a => a + k);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="seg" style={{ alignSelf: 'stretch', width: '100%' }}>
          <button onClick={() => setType('expense')} className={type === 'expense' ? 'active' : ''} style={{ flex: 1, color: type === 'expense' ? 'var(--expense)' : undefined }}>{window.t('expense')}</button>
          <button onClick={() => setType('income')} className={type === 'income' ? 'active' : ''} style={{ flex: 1, color: type === 'income' ? 'var(--income)' : undefined }}>{window.t('income')}</button>
        </div>
        <div style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '18px 20px', textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('amount')}</div>
          <div className="mono" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', color: type === 'income' ? 'var(--income)' : 'var(--expense)' }}>{window.currencySymbol(currency)}{amount || '0.00'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {keys.map(k => (
            <button key={k} onClick={() => press(k)} style={{ padding: '14px 0', borderRadius: 10, background: 'var(--bg-warm)', border: '1px solid var(--border-soft)', fontSize: 18, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{k}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => handleSave()} disabled={!amount || !category || saving || saved}>
          <HI.check size={14} /> {saving ? window.t('saving') : saved ? window.t('saved') : window.t('save_txn')}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <label className="label">{type === 'income' ? window.t('what_from') : window.t('what_for')}</label>
          <DescriptionInput value={category} onChange={setCategory} allItems={allItems}
            placeholder={type === 'expense' ? 'e.g. Coffee, Groceries, Rent…' : 'e.g. Salary, Freelance, Gift…'} />
        </div>
        <div className="card">
          <label className="label">{window.t('note')}</label>
          <input className="input" placeholder={window.t('optional')} value={note} onChange={e => setNote(e.target.value)} />
          <div style={{ height: 12 }} />
          <label className="label">{window.t('date')}</label>
          <DateButton value={date} onChange={setDate} />
        </div>
        <SummaryStrip compact stats={shared.stats} />
      </div>
    </div>
  );
}

function SummaryStrip({ compact, stats = {}, currency = 'USD' }) {
  window.useLang();
  const { todayNet = 0, todayCount = 0, monthExp = 0, savingsRate = 0, grade = '—' } = stats;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      <div className="card" style={{ padding: compact ? 14 : 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('todays_net')}</div>
        <div className="mono" style={{ fontSize: compact ? 22 : 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 4, color: todayNet >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {todayNet >= 0 ? '+' : '−'}{window.fmtCurrency(todayNet, currency)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{todayCount} {todayCount === 1 ? window.t('entry') : window.t('entries')}</div>
      </div>
      <div className="card" style={{ padding: compact ? 14 : 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('this_month')}</div>
        <div className="mono" style={{ fontSize: compact ? 22 : 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 4 }}>{window.fmtCurrency(monthExp, currency)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{window.t('total_expenses')}</div>
      </div>
      <div className="card" style={{ padding: compact ? 14 : 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('savings_rate')}</div>
        <div className="mono" style={{ fontSize: compact ? 22 : 28, fontWeight: 700, letterSpacing: '-0.025em', marginTop: 4 }}>{savingsRate}%</div>
        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>{window.t('grade')} {grade}</div>
      </div>
    </div>
  );
}

function RecentMini({ setPage, txns = [], currency = 'USD' }) {
  window.useLang();
  const list = txns.slice(0, 5);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{window.t('recent_activity')}</div>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setPage && setPage('transactions')}>
          {window.t('view_all')} <HI.arrow_right size={13} />
        </button>
      </div>
      {list.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{window.t('no_txns_yet')}</div>
      )}
      {list.map(t => (
        <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: t.type === 'income' ? 'var(--income-tint)' : 'var(--expense-tint)', color: t.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
            {t.type === 'income' ? <HI.arrow_down size={14} /> : <HI.arrow_up size={14} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.category}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.note || '—'} · {hrd(t.date)}</div>
          </div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: t.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
            {t.type === 'income' ? '+' : '−'}{window.fmtCurrency(t.amount, currency)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PageHome({ variation, setPage, userId, currency = 'USD' }) {
  window.useLang();
  const [type, setType] = React.useState('expense');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [note, setNote] = React.useState('');
  const [date, setDate] = React.useState(TODAY_KEY);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [liveTxns, setLiveTxns] = React.useState([]);

  const [recentExp, setRecentExp] = React.useState(() => loadRecent('expense'));
  const [recentInc, setRecentInc] = React.useState(() => loadRecent('income'));

  React.useEffect(() => { saveRecent('expense', recentExp); }, [recentExp]);
  React.useEffect(() => { saveRecent('income', recentInc); }, [recentInc]);

  React.useEffect(() => {
    if (!userId) return;
    const monthStart = htoday.toISOString().slice(0, 7) + '-01';
    window.SupabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .order('date', { ascending: false })
      .order('timestamp', { ascending: false })
      .then(({ data }) => {
        if (data) setLiveTxns(data.map(t => ({ ...t, amount: parseFloat(t.amount) })));
      });
  }, [userId]);

  const allExpItems = React.useMemo(() => [...new Set([...recentExp, ...deriveAll('expense', liveTxns)])], [recentExp, liveTxns]);
  const allIncItems = React.useMemo(() => [...new Set([...recentInc, ...deriveAll('income', liveTxns)])], [recentInc, liveTxns]);

  const stats = React.useMemo(() => {
    const todayTxns = liveTxns.filter(t => t.date === TODAY_KEY);
    const todayNet = todayTxns.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const monthIncome = liveTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExp = liveTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savingsRate = monthIncome > 0 ? Math.round((monthIncome - monthExp) / monthIncome * 100) : 0;
    const grade = savingsRate >= 50 ? 'A' : savingsRate >= 35 ? 'B' : savingsRate >= 20 ? 'C' : savingsRate >= 5 ? 'D' : 'F';
    return { todayNet, todayCount: todayTxns.length, monthExp, savingsRate, grade };
  }, [liveTxns]);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0 || !category || !userId || saving) return;
    setSaving(true);

    const { data } = await window.SupabaseClient
      .from('transactions')
      .insert({ user_id: userId, amount: parseFloat(amount), type, category, note: note || null, date, currency })
      .select()
      .single();

    setSaving(false);
    if (data) {
      const t = { ...data, amount: parseFloat(data.amount) };
      setLiveTxns(prev => [t, ...prev]);
      if (type === 'expense') setRecentExp(prev => pushRecent(category, prev));
      else setRecentInc(prev => pushRecent(category, prev));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setAmount('');
        setNote('');
        setCategory('');
        setDate(TODAY_KEY);
      }, 1200);
    }
  };

  const shared = {
    type, setType, amount, setAmount, category, setCategory,
    note, setNote, date, setDate, saving, saved, handleSave,
    allExpItems, allIncItems, liveTxns, stats, setPage, currency,
  };

  const locale = window._i18nLocale || 'en-US';

  return (
    <div className="page">
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{window.t('welcome_back')}</h2>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
          {htoday.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
          {stats.grade !== '—' && window.t('grade_this_month', { grade: stats.grade })}
        </div>
      </div>

      {variation === 'split' && <HomeSplit shared={shared} />}
      {variation === 'hero'  && <HomeHero  shared={shared} />}
      {variation === 'calc'  && <HomeCalc  shared={shared} />}
    </div>
  );
}

window.PageHome = PageHome;
