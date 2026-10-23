// ui/modals.js：彈出視窗（AI 匯入、手動新增）。
import { getCards, saveCards } from '../storage.js';
import { todayStr } from '../dates.js';
import { syncCardToCloud, uploadAllCardsToCloud } from '../cloud.js';
import { renderHub } from './hub.js';
import { renderDatabase } from './database.js';

export function openAIModal() { document.getElementById('ai-modal').classList.remove('hidden'); }
export function closeAIModal() { document.getElementById('ai-modal').classList.add('hidden'); }
export function openManualAddModal() { document.getElementById('add-modal').classList.remove('hidden'); }
export function closeAddModal() { document.getElementById('add-modal').classList.add('hidden'); }

export function copyAIPrompt() {
  const prompt = `請幫我將雅思錯題/同義替換整理成以下 JSON 格式：
[
  {
    "subject": "writing_p1",
    "c": "C18",
    "t": "T1",
    "p": "P1",
    "front": "題目/詞彙",
    "back": "解析/同義替換 (可用 HTML span 標籤如 <span class=\\"hl-blue\\">重點</span> 高亮)"
  }
]`;
  navigator.clipboard.writeText(prompt);
  alert('已複製 AI Prompt 範本！');
}

export function processAIImport() {
  const input = document.getElementById('ai-json-input').value;
  try {
    const imported = JSON.parse(input);
    if (!Array.isArray(imported)) throw new Error('必須是 Array 陣列格式');
    
    const today = todayStr();
    const formatted = imported.map((item, idx) => ({
      id: String(Date.now() + '_' + idx),
      subject: item.subject || 'reading',
      c: item.c || 'C18',
      t: item.t || 'T1',
      p: item.p || 'P1',
      front: item.front || '',
      back: item.back || '',
      interval: 1,
      nextReview: today,
      reviewCount: 0
    }));

    saveCards([...getCards(), ...formatted]);
    uploadAllCardsToCloud(formatted); // 🔥 批次上傳新卡片到雲端

    alert(`成功匯入 ${formatted.length} 張卡片並同步到雲端！`);
    closeAIModal();
    renderHub();
    renderDatabase();
  } catch (err) {
    alert('JSON 格式錯誤，請檢查輸入內容：' + err.message);
  }
}

export function saveManualCard() {
  const today = todayStr();
  const newCard = {
    id: String(Date.now()),
    subject: document.getElementById('add-subject').value,
    c: document.getElementById('add-c').value || 'C18',
    t: document.getElementById('add-t').value || 'T1',
    p: document.getElementById('add-p').value || 'P1',
    front: document.getElementById('add-front').value,
    back: document.getElementById('add-back').value,
    interval: 1,
    nextReview: today,
    reviewCount: 0
  };

  if (!newCard.front || !newCard.back) {
    alert('請填寫正面與背面內容！');
    return;
  }

  const cards = getCards();
  cards.push(newCard);
  saveCards(cards);
  syncCardToCloud(newCard); // 🔥 新增卡片同步至雲端

  closeAddModal();
  renderHub();
  renderDatabase();
}
