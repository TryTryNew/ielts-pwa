// ui/database.js：卡片庫（搜尋、列表、刪除）。
import { getCards, saveCards } from '../storage.js';
import { subjectMap } from '../constants.js';
import { deleteCardFromCloud } from '../cloud.js';
import { renderHub } from './hub.js';

export function renderDatabase() {
  const cards = getCards();
  const search = document.getElementById('db-search-input').value.toLowerCase();
  const listEl = document.getElementById('db-card-list');

  const filtered = cards.filter(c => 
    c.front.toLowerCase().includes(search) || 
    c.back.toLowerCase().includes(search) ||
    `${c.c}-${c.t}-${c.p}`.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="text-center py-12 text-themeSub text-xs">沒有找到符合的卡片。</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => `
    <div class="glass-card p-4 rounded-2xl flex justify-between items-start gap-3">
      <div class="space-y-1 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-2 py-0.5 rounded ${subjectMap[c.subject]?.class || 'bg-gray-500/10'} font-bold">
            ${subjectMap[c.subject]?.name || c.subject}
          </span>
          <span class="text-[10px] text-themeSub font-mono">${c.c || ''}-${c.t || ''}-${c.p || ''}</span>
        </div>
        <h4 class="font-bold text-sm text-themeText flex items-center gap-2">
          ${c.front}
          <button onclick="speakText('${c.front.replace(/'/g, "\\'")}')" class="text-indigo-500 hover:text-indigo-600" title="朗讀">
            <i data-lucide="volume-2" class="w-4 h-4"></i>
          </button>
        </h4>
        <div class="text-xs text-themeSub whitespace-pre-wrap pt-1">${c.back}</div>
      </div>
      <button onclick="deleteCard('${c.id}')" class="text-rose-500 hover:text-rose-600 p-1" title="刪除">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

export function deleteCard(id) {
  if (confirm('確定要刪除這張卡片嗎？')) {
    const remaining = getCards().filter(c => String(c.id) !== String(id));
    saveCards(remaining);
    deleteCardFromCloud(id); // 🔥 同步從雲端刪除
    renderDatabase();
    renderHub();
  }
}
