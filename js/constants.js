// constants.js：不會改變、而且多個畫面都要用的常數。
// 放在最底層，誰都可以 import，它自己不 import 任何人。

export const subjectMap = {
  writing_p1: { name: '寫作 Task 1', class: 'bg-indigo-500/10 text-indigo-500' },
  writing_p2: { name: '寫作 Task 2', class: 'bg-purple-500/10 text-purple-500' },
  listening: { name: '聽力 Listening', class: 'bg-blue-500/10 text-blue-500' },
  reading: { name: '閱讀 Reading', class: 'bg-emerald-500/10 text-emerald-500' },
  speaking: { name: '口語 Speaking', class: 'bg-amber-500/10 text-amber-500' }
};
