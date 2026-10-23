// ui/analytics.js：統計與日曆。
import { getCards } from '../storage.js';
import { todayStr, toDateStr } from '../dates.js';

export function renderAnalytics() {
  const cards = getCards();
  const today = todayStr();
  const dueCards = cards.filter(c => c.nextReview <= today);
  const reviewedTodayCount = cards.filter(c => c.lastReviewed === today).length;
  
  const totalTarget = dueCards.length + reviewedTodayCount;
  const pct = totalTarget === 0 ? 100 : Math.round((reviewedTodayCount / totalTarget) * 100);

  document.getElementById('analytics-progress-pct').innerText = `${pct}%`;
  document.getElementById('analytics-progress-bar').style.width = `${pct}%`;
  document.getElementById('analytics-due-desc').innerText = `今日待複習：${dueCards.length} 張卡片`;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  document.getElementById('calendar-month-name').innerText = `${year} 年 ${month + 1} 月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += `<div class="h-10"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(new Date(year, month, d));
    const count = cards.filter(c => c.nextReview === dateStr).length;
    const isToday = (dateStr === today);

    let badgeStyle = "bg-transparent text-themeText";
    if (count > 0) badgeStyle = "bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 font-bold";
    if (isToday) badgeStyle = "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30";

    grid.innerHTML += `
      <button onclick="openCalDateModal('${dateStr}')" class="h-10 rounded-xl flex flex-col items-center justify-center text-xs ${badgeStyle} hover:border-indigo-500">
        <span>${d}</span>
        ${count > 0 ? `<span class="text-[9px] opacity-80">${count}張</span>` : ''}
      </button>
    `;
  }
}

export function openCalDateModal(dateStr) {
  const cards = getCards();
  const dateCards = cards.filter(c => c.nextReview === dateStr);
  document.getElementById('cal-modal-date-title').innerText = `📅 ${dateStr} 預定複習清單 (${dateCards.length} 張)`;
  
  const listEl = document.getElementById('cal-modal-card-list');
  if (dateCards.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-themeSub text-center py-4">本日尚無預定複習卡片。</p>`;
  } else {
    listEl.innerHTML = dateCards.map(c => `
      <div class="p-3 rounded-xl glass-subcard text-xs flex justify-between items-center">
        <div>
          <span class="text-[10px] text-indigo-500 font-bold">${c.c || ''}-${c.t || ''}-${c.p || ''}</span>
          <p class="font-bold mt-0.5">${c.front}</p>
        </div>
        <button onclick="speakText('${c.front.replace(/'/g, "\\'")}')" class="p-1 text-indigo-500">
          <i data-lucide="volume-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  }
  if (window.lucide) window.lucide.createIcons();
  document.getElementById('calendar-modal').classList.remove('hidden');
}

export function closeCalModal() {
  document.getElementById('calendar-modal').classList.add('hidden');
}
