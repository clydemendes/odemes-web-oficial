// /report — financial grade + charts + insights
const { Icons: RpI } = window;
const { today: rpToday } = window.OdemesData;

function filterByPeriod(txns, period) {
  const base = rpToday;
  if (period === 'year') {
    const y = base.getFullYear();
    return txns.filter(t => t.date.startsWith(String(y)));
  }
  if (period === 'month') {
    const prefix = base.toISOString().slice(0, 7);
    return txns.filter(t => t.date.startsWith(prefix));
  }
  if (period === 'week') {
    const end = base.toISOString().slice(0, 10);
    const start = new Date(base);
    start.setDate(start.getDate() - 6);
    const from = start.toISOString().slice(0, 10);
    return txns.filter(t => t.date >= from && t.date <= end);
  }
  return txns;
}

function PageReport({ userId, currency = 'USD' }) {
  const lang = window.useLang();
  const [period, setPeriod] = React.useState('month');
  const [allTxns, setAllTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) return;
    const sixMonthsAgo = new Date(rpToday);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const from = sixMonthsAgo.toISOString().slice(0, 10);
    window.SupabaseClient
      .from('transactions')
      .select('id, type, category, amount, date')
      .eq('user_id', userId)
      .gte('date', from)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data) setAllTxns(data.map(t => ({ ...t, amount: parseFloat(t.amount) })));
        setLoading(false);
      });
  }, [userId]);

  const locale = window._i18nLocale || 'en-US';

  const SERIES = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(rpToday.getFullYear(), rpToday.getMonth() - i, 1);
      const prefix = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString(locale, { month: 'short' });
      const mt = allTxns.filter(t => t.date.startsWith(prefix));
      const income   = mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      months.push({ month: label, income, expenses });
    }
    return months;
  }, [allTxns, lang]);

  const RT = filterByPeriod(allTxns, period);

  const incomeSum = RT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expSum    = RT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings   = incomeSum > 0 ? (incomeSum - expSum) / incomeSum : 0;
  const grade     = savings >= 0.5 ? 'A' : savings >= 0.35 ? 'B' : savings >= 0.2 ? 'C' : savings >= 0.05 ? 'D' : 'F';
  const gradeColor = { A: 'var(--income)', B: 'var(--teal)', C: '#c8a015', D: 'var(--warn)', F: 'var(--expense)' }[grade];

  const catBreakdown = {};
  RT.filter(t => t.type === 'expense').forEach(t => { catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]);
  const totalExp = sortedCats.reduce((s, [, v]) => s + v, 0);

  const COLORS = ['var(--accent)', 'var(--teal)', '#5b8def', '#c8a015', '#9e62d8', 'var(--warn)', 'var(--income)', '#666'];

  const radius = 64, inner = 40;
  let cum = 0;
  const top7 = sortedCats.slice(0, 7);
  const otherVal = sortedCats.slice(7).reduce((s, [, v]) => s + v, 0);
  const pieData = otherVal > 0 ? [...top7, ['Other', otherVal]] : top7;
  const segs = pieData.map(([cat, val], i) => {
    const start = cum / totalExp * 360;
    cum += val;
    const end = cum / totalExp * 360;
    return { cat, val, start, end, color: COLORS[i] || '#999' };
  });

  const maxVal = Math.max(...SERIES.map(s => Math.max(s.income, s.expenses)), 1);

  const periodLabel = {
    week: window.t('last_7_days'),
    month: rpToday.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    year: String(rpToday.getFullYear()),
  }[period];

  const periodButtons = [
    { id: 'week', label: window.t('week') },
    { id: 'month', label: window.t('month') },
    { id: 'year', label: window.t('year') },
  ];

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{window.t('financial_report')}</h2>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{window.t('where_money')} · {periodLabel}</div>
        </div>
        <div className="seg">
          {periodButtons.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={period === p.id ? 'active' : ''}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>{window.t('loading')}</div>}

      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{window.t('financial_grade')}</div>
              <div style={{ position: 'relative', width: 180, height: 180, margin: '16px auto 8px' }}>
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="90" cy="90" r="76" fill="none" stroke="var(--bg-warm)" strokeWidth="14" />
                  <circle cx="90" cy="90" r="76" fill="none" stroke={gradeColor} strokeWidth="14"
                    strokeDasharray={`${Math.max(savings, 0.03) * 2 * Math.PI * 76} 999`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', color: gradeColor }}>{grade}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{Math.round(savings * 100)}% {window.t('savings_rate').toLowerCase()}</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8 }}>
                {incomeSum > 0
                  ? window.t('saving_pct', { pct: Math.round(savings * 100) })
                  : <span style={{ color: 'var(--text-3)' }}>{window.t('no_income_recorded')}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{window.t('income')}</div><div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--income)' }}>+{window.fmtCurrency(incomeSum, currency, 0)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{window.t('expense')}</div><div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--expense)' }}>−{window.fmtCurrency(expSum, currency, 0)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{window.t('net')}</div><div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{window.fmtCurrency(incomeSum - expSum, currency, 0)}</div></div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div><div className="card-title">{window.t('mo6_trend')}</div><div className="card-sub">{window.t('income_vs_exp')}</div></div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--income)' }} /> {window.t('income')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--expense)' }} /> {window.t('expense')}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SERIES.length}, 1fr)`, gap: 14, height: 220, alignItems: 'end', padding: '12px 4px 0' }}>
                {SERIES.map((s, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ flex: 1, background: 'var(--income)', borderRadius: '4px 4px 0 0', height: `${s.income / maxVal * 100}%`, minHeight: s.income > 0 ? 2 : 0, opacity: i === SERIES.length - 1 ? 1 : 0.85 }} />
                      <div style={{ flex: 1, background: 'var(--expense)', borderRadius: '4px 4px 0 0', height: `${s.expenses / maxVal * 100}%`, minHeight: s.expenses > 0 ? 2 : 0, opacity: i === SERIES.length - 1 ? 1 : 0.85 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{s.month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">{window.t('by_category')}</div>
                <div className="card-sub mono">{window.fmtCurrency(totalExp, currency)} total</div>
              </div>
              {totalExp === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)' }}>{window.t('no_expenses')}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 22, alignItems: 'center' }}>
                  <svg width="180" height="180" viewBox="-90 -90 180 180">
                    {segs.map((s, i) => {
                      const a1 = s.start * Math.PI / 180 - Math.PI / 2;
                      const a2 = s.end   * Math.PI / 180 - Math.PI / 2;
                      const x1 = Math.cos(a1) * radius, y1 = Math.sin(a1) * radius;
                      const x2 = Math.cos(a2) * radius, y2 = Math.sin(a2) * radius;
                      const x3 = Math.cos(a2) * inner,  y3 = Math.sin(a2) * inner;
                      const x4 = Math.cos(a1) * inner,  y4 = Math.sin(a1) * inner;
                      const large = (s.end - s.start) > 180 ? 1 : 0;
                      return <path key={i} d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`} fill={s.color} />;
                    })}
                    <text x="0" y="-4" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-3)', fontWeight: 600, letterSpacing: 1 }}>{window.t('spent')}</text>
                    <text x="0" y="14" textAnchor="middle" style={{ fontSize: 18, fill: 'var(--text)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{window.fmtCurrency(totalExp, currency, 0)}</text>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {segs.map((s, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto auto', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s.cat}</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 50, textAlign: 'right' }}>{window.fmtCurrency(s.val, currency, 0)}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 36, textAlign: 'right' }}>{Math.round(s.val / totalExp * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">{window.t('insights')}</div>
                <span className="pill"><span className="dot" /> {window.t('auto_generated')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {incomeSum === 0 && expSum === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{window.t('add_for_insights')}</div>
                ) : [
                  incomeSum > 0 && { ico: savings >= 0.5 ? '🎉' : savings >= 0.2 ? '📊' : '⚠️', txt: <>{window.t('insight_sr_label')}: <b>{Math.round(savings * 100)}%</b> — {window.t('grade')} <b>{grade}</b>.</> },
                  expSum > 0 && sortedCats[0] && { ico: '💸', txt: <>{window.t('insight_top_exp')}: <b>{sortedCats[0][0]}</b> — <b>{window.fmtCurrency(sortedCats[0][1], currency, 0)}</b>.</> },
                  incomeSum > 0 && expSum > 0 && { ico: '💡', txt: <>{window.t('insight_net')}: <b style={{ color: (incomeSum - expSum) >= 0 ? 'var(--income)' : 'var(--expense)' }}>{(incomeSum - expSum) >= 0 ? '+' : '−'}{window.fmtCurrency(Math.abs(incomeSum - expSum), currency, 0)}</b>.</> },
                ].filter(Boolean).map((ins, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, alignItems: 'start', padding: 12, borderRadius: 10, background: 'var(--bg-warm)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border-soft)', display: 'grid', placeItems: 'center', fontSize: 14 }}>{ins.ico}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{ins.txt}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

window.PageReport = PageReport;
