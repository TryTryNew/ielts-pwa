// ui/hub.js：首頁（今日進度）與科目卡片庫。
import { getCards } from '../storage.js';
import { todayStr } from '../dates.js';
import { switchPage } from './nav.js';

export function renderHub() {
  const cards = getCards();
  const today = todayStr();
  const dueCards = cards.filter(c => c.nextReview <= today);
  const reviewedTodayCount = cards.filter(c => c.lastReviewed === today).length;

  const totalTarget = dueCards.length + reviewedTodayCount;
  const pct = totalTarget === 0 ? 100 : Math.round((reviewedTodayCount / totalTarget) * 100);

  document.getElementById('hub-progress-pct').innerText = `${pct}%`;
  document.getElementById('hub-progress-bar').style.width = `${pct}%`;
  document.getElementById('hub-due-count').innerText = dueCards.length;

  document.getElementById('stat-total').innerText = cards.length;
  document.getElementById('stat-mastered').innerText = cards.filter(c => (c.reviewCount || 0) >= 7).length;
  document.getElementById('stat-reviewed-today').innerText = reviewedTodayCount;
}

export function openSubjectView(subjectKey) {
  const cards = getCards();
  switchPage('subject-detail');
  const titleEl = document.getElementById('subj-detail-title');
  const container = document.getElementById('test-accordion-container');

  const titles = { listening: '🎧 聽力卡片庫', reading: '📖 閱讀卡片庫', writing: '✍️ 寫作卡片庫', speaking: '🗣️ 口語卡片庫' };
  titleEl.innerText = titles[subjectKey] || '科目卡片';

  let filtered = cards.filter(c => subjectKey === 'writing' ? (c.subject === 'writing_p1' || c.subject === 'writing_p2') : c.subject === subjectKey);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-themeSub text-xs">此科目尚無卡片，請點擊右上角 AI 匯入！</div>`;
    return;
  }

  const groupedByT = {};
  filtered.forEach(c => {
    const tKey = c.t || 'Test 1';
    if (!groupedByT[tKey]) groupedByT[tKey] = [];
    groupedByT[tKey].push(c);
  });

  container.innerHTML = Object.keys(groupedByT).map(tKey => `
    <div class="glass-card rounded-2xl overflow-hidden">
      <button onclick="toggleAccordion('${tKey}')" class="w-full px-5 py-4 flex justify-between items-center glass-subcard hover:bg-indigo-500/10 font-bold text-sm">
        <span class="flex items-center gap-2"><i data-lucide="folder" class="w-4 h-4 text-indigo-500"></i> ${tKey} (${groupedByT[tKey].length} 張卡片)</span>
        <i id="accordion-icon-${tKey}" data-lucide="chevron-down" class="w-4 h-4 text-themeSub transition-transform"></i>
      </button>

      <div id="accordion-content-${tKey}" class="p-4 space-y-3 hidden border-t border-gray-200 dark:border-gray-800">
        <button onclick="startReviewForList('${tKey}')" class="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20">
          <i data-lucide="play" class="w-3.5 h-3.5"></i> 開開啟此單元沉浸複習
        </button>
        <div class="space-y-2 pt-2">
          ${groupedByT[tKey].map((card) => `
            <div onclick="startReviewSingleCard('${card.id}')" class="p-3 rounded-xl glass-subcard flex justify-between items-center cursor-pointer hover:border-indigo-500/50 transition-all">
              <div class="flex-1">
                <span class="text-[10px] text-indigo-500 font-bold">${card.c || ''}-${card.t || ''}-${card.p || ''}</span>
                <h5 class="text-xs font-bold text-themeText mt-0.5">${card.front}</h5>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="event.stopPropagation(); speakText('${card.front.replace(/'/g, "\\'")}')" class="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-500" title="朗讀">
                  <i data-lucide="volume-2" class="w-4 h-4"></i>
                </button>
                <span class="text-[10px] text-themeSub">複習 ${card.reviewCount || 0} 次</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

export function toggleAccordion(tKey) {
  document.getElementById(`accordion-content-${tKey}`).classList.toggle('hidden');
  document.getElementById(`accordion-icon-${tKey}`).classList.toggle('rotate-180');
}
