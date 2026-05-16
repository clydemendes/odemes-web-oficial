// Date utilities — data now lives in Supabase
const today = new Date(); today.setHours(0, 0, 0, 0);
const dayKey = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (s) => {
  const d = new Date(s);
  const locale = window._i18nLocale || 'en-US';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};
const relDate = (s) => {
  const d = new Date(s);
  const diff = Math.round((d - today) / 86400000);
  const _t = window.t || (k => k);
  if (diff === 0) return _t('today');
  if (diff === -1) return _t('yesterday');
  if (diff === 1) return _t('tomorrow');
  if (diff > 1 && diff <= 7) return _t('in_days', { n: diff });
  if (diff < -1 && diff >= -7) return _t('days_ago', { n: -diff });
  return fmtDate(s);
};

window.OdemesData = { today, dayKey, fmtDate, relDate };
