// Date utilities — data now lives in Supabase
const today = new Date(); today.setHours(0, 0, 0, 0);
const dayKey = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
// 'YYYY-MM-DD' must be read as a local day. new Date('2026-11-10') is UTC midnight,
// which shows as the previous day anywhere west of Greenwich.
const parseDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) ? new Date(s + 'T00:00:00') : new Date(s);
const fmtDate = (s) => {
  const d = parseDay(s);
  const locale = window._i18nLocale || 'en-US';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};
const relDate = (s) => {
  const d = parseDay(s);
  const diff = Math.round((d - today) / 86400000);
  const _t = window.t || (k => k);
  if (diff === 0) return _t('today');
  if (diff === -1) return _t('yesterday');
  if (diff === 1) return _t('tomorrow');
  if (diff > 1 && diff <= 7) return _t('in_days', { n: diff });
  if (diff < -1 && diff >= -7) return _t('days_ago', { n: -diff });
  return fmtDate(s);
};

// Grade = savings rate. One definition, used by Home, Report and the landing demo.
window.gradeFor = (rate) => rate >= 0.5 ? 'A' : rate >= 0.35 ? 'B' : rate >= 0.2 ? 'C' : rate >= 0.05 ? 'D' : 'F';
// Text colour and fill colour for a grade: green is good, ink is neutral, red is a warning.
window.gradeColor = (g) => ({ A: 'var(--income)', B: 'var(--income)', C: 'var(--text)', D: 'var(--danger)', F: 'var(--danger)' }[g] || 'var(--text-3)');
window.gradeFill = (g) => ({ A: 'var(--green)', B: 'var(--green)', C: 'var(--text)', D: 'var(--danger)', F: 'var(--danger)' }[g] || 'var(--text-3)');
window.gradeLabel = (g) => {
  const key = { A: 'grade_excellent', B: 'grade_good', C: 'grade_fair', D: 'grade_risk', F: 'grade_critical' }[g];
  return key ? (window.t ? window.t(key) : key) : '';
};

window.OdemesData = { today, dayKey, fmtDate, relDate };
