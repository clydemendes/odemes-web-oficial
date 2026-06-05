// /report — redesigned financial dashboard
const { Icons: RpI } = window;
const { today: rpToday } = window.OdemesData;

// Local-timezone date helpers (avoids UTC-conversion bugs)
const _rpad = n => String(n).padStart(2, '0');
const _rLocalStr = d => `${d.getFullYear()}-${_rpad(d.getMonth() + 1)}-${_rpad(d.getDate())}`;
const _rMonthPfx = d => `${d.getFullYear()}-${_rpad(d.getMonth() + 1)}`;
const _rTodayStr = _rLocalStr(rpToday);
const _rThisMonth = _rMonthPfx(rpToday);

function filterByPeriod(txns, period, customFrom, customTo) {
  if (period === 'overall') return txns;
  if (period === 'custom') {
    if (!customFrom && !customTo) return txns;
    return txns.filter(t => (!customFrom || t.date >= customFrom) && (!customTo || t.date <= customTo));
  }
  if (period === 'year') return txns.filter(t => t.date.startsWith(String(rpToday.getFullYear())));
  if (period === 'month') return txns.filter(t => t.date.startsWith(_rThisMonth));
  if (period === 'week') {
    const start = new Date(rpToday); start.setDate(start.getDate() - 6);
    const from = _rLocalStr(start);
    return txns.filter(t => t.date >= from && t.date <= _rTodayStr);
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
  const W = 540, H = 200;
  const pad = { t: 18, r: 20, b: 32, l: 42 };
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

  const incArea = incPts.length ? `${incLine} L ${incPts[incPts.length-1][0]},${bottom} L ${incPts[0][0]},${bottom} Z` : '';
  const expArea = expPts.length ? `${expLine} L ${expPts[expPts.length-1][0]},${bottom} L ${expPts[0][0]},${bottom} Z` : '';

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // Skip x-axis labels when dense
  const maxLabels = 10;
  const step = n > maxLabels ? Math.ceil(n / maxLabels) : 1;
  const showLabel = i => i % step === 0 || i === n - 1;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="rp-ig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1aae39" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#1aae39" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rp-eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C62828" stopOpacity="0.11" />
          <stop offset="100%" stopColor="#C62828" stopOpacity="0" />
        </linearGradient>
      </defs>

      {n > 0 && (
        <rect x={px(n - 1) - cW / n / 2} y={pad.t} width={cW / n} height={cH}
          style={{ fill: 'var(--bg-warm)', opacity: 0.5 }} rx="5" />
      )}

      {ticks.map((frac, i) => {
        const y = pad.t + frac * cH;
        const val = maxVal * (1 - frac);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y}
              style={{ stroke: frac === 1 ? 'var(--border)' : 'var(--border-soft)' }}
              strokeWidth={frac === 1 ? 1 : 0.7} />
            <text x={pad.l - 6} y={y + 4} textAnchor="end"
              style={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {frac === 1 ? '0' : shortNum(val)}
            </text>
          </g>
        );
      })}

      <path d={incArea} fill="url(#rp-ig)" />
      <path d={expArea} fill="url(#rp-eg)" />

      <path d={incLine} fill="none" stroke="#1aae39" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={expLine} fill="none" stroke="#C62828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {incPts.map(([x, y], i) => series[i].income > 0 && (
        <circle key={`id${i}`} cx={x} cy={y} r="3" fill="#1aae39" style={{ stroke: 'var(--bg)' }} strokeWidth="1.5" />
      ))}
      {expPts.map(([x, y], i) => series[i].expenses > 0 && (
        <circle key={`ed${i}`} cx={x} cy={y} r="3" fill="#C62828" style={{ stroke: 'var(--bg)' }} strokeWidth="1.5" />
      ))}

      {series.map((s, i) => showLabel(i) && (
        <text key={i} x={px(i)} y={H - 5} textAnchor="middle"
          style={{
            fontSize: 10, fontWeight: i === n - 1 ? 600 : 400,
            fill: i === n - 1 ? 'var(--text)' : 'var(--text-3)',
            fontFamily: 'var(--font)',
          }}>
          {s.month}
        </text>
      ))}
    </svg>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', color: color || 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DateRangePicker({ from, to, onFrom, onTo }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <window.DateButton value={from} onChange={onFrom} />
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>—</span>
      <window.DateButton value={to} onChange={onTo} />
    </div>
  );
}

function PageReport({ userId, currency = 'USD' }) {
  window.useLang();
  const [period, setPeriod] = React.useState('month');
  const [customFrom, setCustomFrom] = React.useState('');
  const [customTo, setCustomTo] = React.useState('');
  const [allTxns, setAllTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const locale = window._i18nLocale || 'en-US';

  React.useEffect(() => {
    if (!userId) return;
    window.SupabaseClient
      .from('transactions')
      .select('id, type, category, amount, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data) setAllTxns(data.map(t => ({ ...t, amount: parseFloat(t.amount) })));
        setLoading(false);
      });
  }, [userId]);

  const SERIES = React.useMemo(() => {
    const mkMonths = (count) => {
      const months = [];
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(rpToday.getFullYear(), rpToday.getMonth() - i, 1);
        const prefix = _rMonthPfx(d);
        const opts = { month: 'short' };
        if (d.getFullYear() !== rpToday.getFullYear()) opts.year = '2-digit';
        const label = d.toLocaleDateString(locale, opts);
        const mt = allTxns.filter(t => t.date.startsWith(prefix));
        months.push({
          month: label,
          income: mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        });
      }
      return months;
    };

    if (period === 'week') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(rpToday); d.setDate(d.getDate() - i);
        const dateStr = _rLocalStr(d);
        const label = d.toLocaleDateString(locale, { weekday: 'short' });
        const dt = allTxns.filter(t => t.date === dateStr);
        days.push({
          month: label,
          income: dt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: dt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        });
      }
      return days;
    }

    if (period === 'year') return mkMonths(12);

    if (period === 'overall') {
      if (allTxns.length === 0) return mkMonths(6);
      const oldest = allTxns.reduce((min, t) => t.date < min ? t.date : min, allTxns[0].date);
      const start = new Date(oldest.slice(0, 7) + '-01T00:00:00');
      const months = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const endM = new Date(rpToday.getFullYear(), rpToday.getMonth(), 1);
      while (cur <= endM) {
        const prefix = _rMonthPfx(cur);
        const opts = { month: 'short' };
        if (cur.getFullYear() !== rpToday.getFullYear()) opts.year = '2-digit';
        const label = cur.toLocaleDateString(locale, opts);
        const mt = allTxns.filter(t => t.date.startsWith(prefix));
        months.push({
          month: label,
          income: mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      return months;
    }

    if (period === 'custom' && customFrom && customTo && customFrom <= customTo) {
      const from = new Date(customFrom + 'T00:00:00');
      const to = new Date(customTo + 'T00:00:00');
      const diffDays = Math.round((to - from) / 86400000) + 1;

      if (diffDays <= 62) {
        const days = [];
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(from); d.setDate(d.getDate() + i);
          const dateStr = _rLocalStr(d);
          const label = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
          const dt = allTxns.filter(t => t.date === dateStr);
          days.push({
            month: label,
            income: dt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expenses: dt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
          });
        }
        return days;
      } else {
        const months = [];
        const cur = new Date(from.getFullYear(), from.getMonth(), 1);
        const end = new Date(to.getFullYear(), to.getMonth(), 1);
        while (cur <= end) {
          const prefix = _rMonthPfx(cur);
          const opts = { month: 'short' };
          if (cur.getFullYear() !== rpToday.getFullYear()) opts.year = '2-digit';
          const label = cur.toLocaleDateString(locale, opts);
          const mt = allTxns.filter(t => t.date.startsWith(prefix) && t.date >= customFrom && t.date <= customTo);
          months.push({
            month: label,
            income: mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expenses: mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
          });
          cur.setMonth(cur.getMonth() + 1);
        }
        return months;
      }
    }

    // Default: month → 6-month view
    return mkMonths(6);
  }, [allTxns, locale, period, customFrom, customTo]);

  const RT = React.useMemo(() => filterByPeriod(allTxns, period, customFrom, customTo), [allTxns, period, customFrom, customTo]);

  const incomeSum = RT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expSum    = RT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net       = incomeSum - expSum;
  const savings   = incomeSum > 0 ? (incomeSum - expSum) / incomeSum : 0;
  const savingsPct = Math.round(savings * 100);
  const grade     = savings >= 0.5 ? 'A' : savings >= 0.35 ? 'B' : savings >= 0.2 ? 'C' : savings >= 0.05 ? 'D' : 'F';
  const gradeColor = { A: 'var(--income)', B: 'var(--teal)', C: '#c8a015', D: 'var(--warn)', F: 'var(--expense)' }[grade];
  const gradeLabel = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'At Risk', F: 'Critical' }[grade];

  let daysInPeriod;
  if (period === 'week') daysInPeriod = 7;
  else if (period === 'year') daysInPeriod = 365;
  else if (period === 'custom') {
    daysInPeriod = customFrom && customTo
      ? Math.max(1, Math.round((new Date(customTo + 'T00:00:00') - new Date(customFrom + 'T00:00:00')) / 86400000) + 1)
      : 30;
  } else if (period === 'overall') {
    if (RT.length === 0) { daysInPeriod = 30; }
    else {
      const oldest = RT.reduce((min, t) => t.date < min ? t.date : min, RT[0].date);
      daysInPeriod = Math.max(1, Math.round((rpToday - new Date(oldest + 'T00:00:00')) / 86400000) + 1);
    }
  } else {
    daysInPeriod = new Date(rpToday.getFullYear(), rpToday.getMonth() + 1, 0).getDate();
  }
  const dailyAvg = daysInPeriod > 0 ? expSum / daysInPeriod : 0;

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
    const start = cum / totalExp * 360; cum += val;
    return { cat, val, start, end: cum / totalExp * 360, color: COLORS[i] || '#999' };
  });

  const top5Exp = [...RT.filter(t => t.type === 'expense')].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const prevM = new Date(rpToday.getFullYear(), rpToday.getMonth() - 1, 1);
  const prevPrefix = _rMonthPfx(prevM);
  const prevMonthExp = allTxns.filter(t => t.date.startsWith(prevPrefix) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const momPct = prevMonthExp > 0 ? Math.round((expSum - prevMonthExp) / prevMonthExp * 100) : null;

  const periodLabel = period === 'overall' ? window.t('all_time')
    : period === 'custom' ? (customFrom && customTo ? `${customFrom} – ${customTo}` : window.t('custom'))
    : period === 'week' ? window.t('last_7_days')
    : period === 'year' ? String(rpToday.getFullYear())
    : rpToday.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const trendTitle = period === 'week' ? window.t('last_7_days')
    : period === 'year' ? '12-month trend'
    : period === 'overall' ? 'All-time trend'
    : period === 'custom' ? (customFrom && customTo ? `${customFrom} – ${customTo}` : window.t('custom') + ' trend')
    : window.t('mo6_trend');

  const gradeArcLen = Math.max(savings, 0.03) * 2 * Math.PI * 68;

  const R = 62, INNER = 38;
  const arc = (start, end) => {
    const a1 = (start - 90) * Math.PI / 180, a2 = (end - 90) * Math.PI / 180;
    const x1 = Math.cos(a1)*R, y1 = Math.sin(a1)*R;
    const x2 = Math.cos(a2)*R, y2 = Math.sin(a2)*R;
    const x3 = Math.cos(a2)*INNER, y3 = Math.sin(a2)*INNER;
    const x4 = Math.cos(a1)*INNER, y4 = Math.sin(a1)*INNER;
    const lg = (end - start) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER} ${INNER} 0 ${lg} 0 ${x4} ${y4} Z`;
  };

  const PERIODS = [
    { id: 'week', label: window.t('week') },
    { id: 'month', label: window.t('month') },
    { id: 'year', label: window.t('year') },
    { id: 'overall', label: window.t('overall') },
    { id: 'custom', label: window.t('custom') },
  ];

  return (
    <div className="page">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: period === 'custom' ? 10 : 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>{window.t('financial_report')}</h2>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>{periodLabel}</div>
        </div>
        <div className="seg">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={period === p.id ? 'active' : ''}>{p.label}</button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div style={{ marginBottom: 20 }}>
          <DateRangePicker from={customFrom} to={customTo} onFrom={setCustomFrom} onTo={setCustomTo} />
        </div>
      )}

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
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" style={{ stroke: 'var(--bg-warm)' }} strokeWidth="10" />
                <circle cx="80" cy="80" r="68" fill="none" style={{ stroke: gradeColor }} strokeWidth="10"
                  strokeDasharray={`${gradeArcLen} 9999`} strokeLinecap="round"
                  transform="rotate(-90 80 80)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* Trend chart */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">{trendTitle}</div>
                <div className="card-sub">{window.t('income_vs_exp')}</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 18, height: 2, borderRadius: 99, background: 'var(--income)', display: 'inline-block' }} />
                  {window.t('income')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 18, height: 2, borderRadius: 99, background: 'var(--expense)', display: 'inline-block' }} />
                  {window.t('expense')}
                </span>
              </div>
            </div>
            <div style={{ padding: '2px 0 0' }}>
              <TrendChart series={SERIES} />
            </div>
          </div>
        </div>

        {/* ── Category breakdown + Top expenses ── */}
        <div className="rp-cat-top" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginBottom: 16 }}>

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
                    {segs.map((s, i) => <path key={i} d={arc(s.start, s.end)} style={{ fill: s.color }} />)}
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
