// /report — redesigned financial dashboard
const { Icons: RpI } = window;
const { today: rpToday } = window.OdemesData;

function filterByPeriod(txns, period) {
  const base = rpToday;
  if (period === 'year') return txns.filter(t => t.date.startsWith(String(base.getFullYear())));
  if (period === 'month') return txns.filter(t => t.date.startsWith(base.toISOString().slice(0, 7)));
  if (period === 'week') {
    const end = base.toISOString().slice(0, 10);
    const start = new Date(base); start.setDate(start.getDate() - 6);
    const from = start.toISOString().slice(0, 10);
    return txns.filter(t => t.date >= from && t.date <= end);
  }
  return txns;
}

function shortNum(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
  return Math.round(v).toString();
}

function smoothPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    d += ` C ${mx},${pts[i][1]} ${mx},${pts[i + 1][1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function TrendChart({ series }) {
  const W = 540, H = 210;
  const pad = { t: 20, r: 24, b: 36, l: 48 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const n = series.length;
  const maxVal = Math.max(...series.flatMap(s => [s.income, s.expenses]), 1);

  const px = i => pad.l + (n > 1 ? i * cW / (n - 1) : cW / 2);
  const py = v => pad.t + (1 - Math.min(v / maxVal, 1)) * cH;

  const incPts = series.map((s, i) => [px(i), py(s.income)]);
  const expPts = series.map((s, i) => [px(i), py(s.expenses)]);
  const incLine = smoothPath(incPts);
  const expLine = smoothPath(expPts);
  const bottom = pad.t + cH;

  const incArea = `${incLine} L ${incPts[incPts.length - 1][0]},${bottom} L ${incPts[0][0]},${bottom} Z`;
  const expArea = `${expLine} L ${expPts[expPts.length - 1][0]},${bottom} L ${expPts[0][0]},${bottom} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="rp-ig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1aae39" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1aae39" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rp-eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C62828" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#C62828" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Highlight current month column */}
      {n > 0 && (
        <rect x={px(n - 1) - cW / n / 2} y={pad.t} width={cW / n} height={cH}
          style={{ fill: 'var(--bg-warm)', opacity: 0.6 }} rx="6" />
      )}

      {/* Horizontal grid lines */}
      {ticks.map((frac, i) => {
        const y = pad.t + frac * cH;
        const val = maxVal * (1 - frac);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y}
              style={{ stroke: frac === 1 ? 'var(--border)' : 'var(--border-soft)' }}
              strokeWidth={frac === 1 ? 1.5 : 1} />
            <text x={pad.l - 8} y={y + 4} textAnchor="end"
              style={{ fontSize: 10, fill: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {frac === 1 ? '0' : shortNum(val)}
            </text>
          </g>
        );
      })}

      {/* Area fills */}
      <path d={incArea} fill="url(#rp-ig)" />
      <path d={expArea} fill="url(#rp-eg)" />

      {/* Lines */}
      <path d={incLine} fill="none" stroke="#1aae39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={expLine} fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data point dots */}
      {incPts.map(([x, y], i) => series[i].income > 0 && (
        <g key={`id${i}`}>
          <circle cx={x} cy={y} r="5" fill="#1aae39" style={{ stroke: 'var(--bg)' }} strokeWidth="2.5" />
        </g>
      ))}
      {expPts.map(([x, y], i) => series[i].expenses > 0 && (
        <g key={`ed${i}`}>
          <circle cx={x} cy={y} r="5" fill="#C62828" style={{ stroke: 'var(--bg)' }} strokeWidth="2.5" />
        </g>
      ))}

      {/* X-axis month labels */}
      {series.map((s, i) => (
        <text key={i} x={px(i)} y={H - 6} textAnchor="middle"
          style={{
            fontSize: 11, fontWeight: i === n - 1 ? 700 : 500,
            fill: i === n - 1 ? 'var(--text)' : 'var(--text-3)',
            fontFamily: 'var(--font)',
          }}>
          {s.month}
        </text>
      ))}
    </svg>
  );
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', color: color || 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function PageReport({ userId, currency = 'USD' }) {
  window.useLang();
  const [period, setPeriod] = React.useState('month');
  const [allTxns, setAllTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const locale = window._i18nLocale || 'en-US';

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
  }, [allTxns, locale]);

  const RT = React.useMemo(() => filterByPeriod(allTxns, period), [allTxns, period]);

  const incomeSum = RT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expSum    = RT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net       = incomeSum - expSum;
  const savings   = incomeSum > 0 ? (incomeSum - expSum) / incomeSum : 0;
  const savingsPct = Math.round(savings * 100);
  const grade     = savings >= 0.5 ? 'A' : savings >= 0.35 ? 'B' : savings >= 0.2 ? 'C' : savings >= 0.05 ? 'D' : 'F';
  const gradeColor = { A: 'var(--income)', B: 'var(--teal)', C: '#c8a015', D: 'var(--warn)', F: 'var(--expense)' }[grade];
  const gradeLabel = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'At Risk', F: 'Critical' }[grade];

  // Days in period
  const daysInPeriod = period === 'week' ? 7
    : period === 'year' ? 365
    : new Date(rpToday.getFullYear(), rpToday.getMonth() + 1, 0).getDate();
  const dailyAvg = daysInPeriod > 0 ? expSum / daysInPeriod : 0;

  // Category breakdown
  const catBreakdown = {};
  RT.filter(t => t.type === 'expense').forEach(t => { catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]);
  const totalExp = sortedCats.reduce((s, [, v]) => s + v, 0);

  const COLORS = ['var(--accent)', 'var(--teal)', '#5b8def', '#c8a015', '#9e62d8', 'var(--warn)', 'var(--income)', 'var(--text-3)'];

  const top7 = sortedCats.slice(0, 7);
  const otherVal = sortedCats.slice(7).reduce((s, [, v]) => s + v, 0);
  const pieData = otherVal > 0 ? [...top7, ['Other', otherVal]] : top7;
  let cum = 0;
  const segs = pieData.map(([cat, val], i) => {
    const start = cum / totalExp * 360;
    cum += val;
    const end = cum / totalExp * 360;
    return { cat, val, start, end, color: COLORS[i] || '#999' };
  });

  // Top 5 individual expenses
  const top5Exp = [...RT.filter(t => t.type === 'expense')].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Previous month comparison
  const prevPrefix = new Date(rpToday.getFullYear(), rpToday.getMonth() - 1, 1).toISOString().slice(0, 7);
  const prevMonthExp = allTxns.filter(t => t.date.startsWith(prevPrefix) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const momPct = prevMonthExp > 0 ? Math.round((expSum - prevMonthExp) / prevMonthExp * 100) : null;

  const periodLabel = {
    week: window.t('last_7_days'),
    month: rpToday.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    year: String(rpToday.getFullYear()),
  }[period];

  // Pie arc helper
  const R = 62, INNER = 38;
  const arc = (start, end) => {
    const a1 = (start - 90) * Math.PI / 180;
    const a2 = (end - 90) * Math.PI / 180;
    const x1 = Math.cos(a1) * R, y1 = Math.sin(a1) * R;
    const x2 = Math.cos(a2) * R, y2 = Math.sin(a2) * R;
    const x3 = Math.cos(a2) * INNER, y3 = Math.sin(a2) * INNER;
    const x4 = Math.cos(a1) * INNER, y4 = Math.sin(a1) * INNER;
    const lg = (end - start) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER} ${INNER} 0 ${lg} 0 ${x4} ${y4} Z`;
  };

  const gradeArcLen = Math.max(savings, 0.03) * 2 * Math.PI * 68;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>{window.t('financial_report')}</h2>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{periodLabel}</div>
        </div>
        <div className="seg">
          {[{ id: 'week', label: window.t('week') }, { id: 'month', label: window.t('month') }, { id: 'year', label: window.t('year') }].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={period === p.id ? 'active' : ''}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>{window.t('loading')}</div>}

      {!loading && (<>

        {/* ── KPI Strip ── */}
        <div className="rp-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <KpiCard label={window.t('income')} value={`+${window.fmtCurrency(incomeSum, currency, 0)}`} color="var(--income)"
            sub={`${RT.filter(t => t.type === 'income').length} transactions`} />
          <KpiCard label={window.t('expense')} value={`−${window.fmtCurrency(expSum, currency, 0)}`} color="var(--expense)"
            sub={`${RT.filter(t => t.type === 'expense').length} transactions`} />
          <KpiCard label={window.t('net')} value={(net >= 0 ? '+' : '−') + window.fmtCurrency(Math.abs(net), currency, 0)}
            color={net >= 0 ? 'var(--income)' : 'var(--expense)'}
            sub={net >= 0 ? 'Positive balance' : 'Over budget'} />
          <KpiCard label="Daily avg spend" value={window.fmtCurrency(dailyAvg, currency, 0)}
            sub={`over ${daysInPeriod} days`} />
        </div>

        {/* ── Grade + Trend ── */}
        <div className="rp-grade-trend" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 16 }}>

          {/* Grade card */}
          <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>{window.t('financial_grade')}</div>

            {/* Donut ring — grade letter sits cleanly inside */}
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" style={{ stroke: 'var(--bg-warm)' }} strokeWidth="10" />
                <circle cx="80" cy="80" r="68" fill="none" style={{ stroke: gradeColor }} strokeWidth="10"
                  strokeDasharray={`${gradeArcLen} 9999`} strokeLinecap="round"
                  transform="rotate(-90 80 80)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, lineHeight: 1, color: gradeColor }}>{grade}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>{gradeLabel}</span>
              </div>
            </div>

            <div className="mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 14, color: gradeColor, letterSpacing: '-0.02em' }}>{savingsPct}%</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{window.t('savings_rate')}</div>

            <div style={{ width: '100%', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{window.t('income')}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--income)', marginTop: 2 }}>+{window.fmtCurrency(incomeSum, currency, 0)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{window.t('expense')}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--expense)', marginTop: 2 }}>−{window.fmtCurrency(expSum, currency, 0)}</div>
              </div>
            </div>
          </div>

          {/* 6-month trend */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">{window.t('mo6_trend')}</div>
                <div className="card-sub">{window.t('income_vs_exp')}</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 24, height: 3, borderRadius: 99, background: 'var(--income)', display: 'inline-block' }} />
                  {window.t('income')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 24, height: 3, borderRadius: 99, background: 'var(--expense)', display: 'inline-block' }} />
                  {window.t('expense')}
                </span>
              </div>
            </div>
            <div style={{ padding: '4px 0 0' }}>
              <TrendChart series={SERIES} currency={currency} />
            </div>
          </div>
        </div>

        {/* ── Category breakdown + Top expenses ── */}
        <div className="rp-cat-top" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Category donut */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">{window.t('by_category')}</div>
              <div className="card-sub mono">{window.fmtCurrency(totalExp, currency, 0)} total</div>
            </div>
            {totalExp === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{window.t('no_expenses')}</div>
            ) : (
              <div className="rp-cat-donut" style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <svg width="160" height="160" viewBox="-80 -80 160 160">
                    {segs.map((s, i) => (
                      <path key={i} d={arc(s.start, s.end)} style={{ fill: s.color }} />
                    ))}
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{window.t('spent')}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{window.fmtCurrency(totalExp, currency, 0)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {segs.map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.cat}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'right' }}>{window.fmtCurrency(s.val, currency, 0)}</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 32, textAlign: 'right' }}>{Math.round(s.val / totalExp * 100)}%</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: 'var(--border-soft)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: s.color, width: `${Math.round(s.val / totalExp * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top 5 expenses */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Top Expenses</div>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Biggest transactions</span>
            </div>
            {top5Exp.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{window.t('no_expenses')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {top5Exp.map((t, i) => {
                  const barWidth = top5Exp[0] ? Math.round(t.amount / top5Exp[0].amount * 100) : 0;
                  const d = new Date(t.date + 'T00:00:00');
                  const dateStr = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
                  return (
                    <div key={t.id || i} style={{ padding: '10px 0', borderBottom: i < top5Exp.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--expense-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--expense)', fontFamily: 'var(--mono)' }}>#{i + 1}</span>
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.category}</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--expense)', flexShrink: 0 }}>−{window.fmtCurrency(t.amount, currency, 0)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'var(--border-soft)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: 'var(--expense)', width: `${barWidth}%`, opacity: 0.7 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, fontFamily: 'var(--mono)' }}>{dateStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Insights ── */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 14 }}>
            <div className="card-title">{window.t('insights')}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--income)', display: 'inline-block' }} />
              {window.t('auto_generated')}
            </span>
          </div>
          {incomeSum === 0 && expSum === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{window.t('add_for_insights')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {[
                incomeSum > 0 && {
                  ico: savings >= 0.5 ? '🏆' : savings >= 0.35 ? '✅' : savings >= 0.2 ? '📊' : '⚠️',
                  title: 'Savings Rate',
                  txt: <>Saving <b>{savingsPct}%</b> of income — grade <b style={{ color: gradeColor }}>{grade}</b> ({gradeLabel}).</>,
                },
                expSum > 0 && sortedCats[0] && {
                  ico: '💸',
                  title: 'Top Category',
                  txt: <><b>{sortedCats[0][0]}</b> is your biggest spend at <b>{window.fmtCurrency(sortedCats[0][1], currency, 0)}</b> ({Math.round(sortedCats[0][1] / totalExp * 100)}% of total).</>,
                },
                incomeSum > 0 && expSum > 0 && {
                  ico: net >= 0 ? '💰' : '📉',
                  title: 'Net Balance',
                  txt: <>{net >= 0 ? 'You\'re ahead by ' : 'You\'re over by '}<b style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>{window.fmtCurrency(Math.abs(net), currency, 0)}</b> this period.</>,
                },
                expSum > 0 && {
                  ico: '📅',
                  title: 'Daily Average',
                  txt: <>Spending an average of <b>{window.fmtCurrency(dailyAvg, currency, 0)}</b> per day ({daysInPeriod}-day period).</>,
                },
                period === 'month' && momPct !== null && {
                  ico: momPct <= 0 ? '📉' : '📈',
                  title: 'vs Last Month',
                  txt: <>Expenses are <b style={{ color: momPct <= 0 ? 'var(--income)' : 'var(--expense)' }}>{momPct <= 0 ? `${Math.abs(momPct)}% lower` : `${momPct}% higher`}</b> than last month.</>,
                },
                expSum > 0 && sortedCats.length > 1 && {
                  ico: '🔍',
                  title: 'Category Spread',
                  txt: <><b>{sortedCats.length}</b> spending categories. Top 3 account for <b>{Math.round(sortedCats.slice(0, 3).reduce((s, [, v]) => s + v, 0) / totalExp * 100)}%</b> of all spending.</>,
                },
              ].filter(Boolean).map((ins, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-warm)', border: '1px solid var(--border-soft)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--border-soft)', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>{ins.ico}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{ins.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>{ins.txt}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </>)}
    </div>
  );
}

window.PageReport = PageReport;
