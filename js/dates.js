// 日期工具：所有「今天／幾號」都用這裡，確保用的是使用者所在時區的日期
// （原本的 new Date().toISOString() 是 UTC 時間，台灣凌晨 0～8 點會算成「昨天」）

// 把 Date 轉成 'YYYY-MM-DD'（本地時區）
export function toDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 今天
export function todayStr() {
  return toDateStr(new Date());
}

// 今天往後 N 天
export function addDaysStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}
