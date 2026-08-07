// 預設示範卡片資料
export const defaultCards = [
  {
    id: '1',
    subject: 'writing_p1',
    c: 'C16', t: 'T1', p: 'P1',
    front: '雅思 Task 1 標準文章結構',
    back: '1. <span class="hl-blue">Introduction</span>: 改寫題目 (Paraphrase)\n2. <span class="hl-green">Overview</span>: 總結 2-3 個核心趨勢/極值\n3. <span class="hl-amber">Body Paragraph 1</span>: 第一組細節數據數據分析\n4. <span class="hl-purple">Body Paragraph 2</span>: 第二組細節數據數據比較',
    interval: 1, nextReview: new Date().toISOString().split('T')[0], reviewCount: 17
  },
  {
    id: '2',
    subject: 'writing_p1',
    c: 'C16', t: 'T1', p: 'P1',
    front: '雅思 Task 1 的三大核心痛點',
    back: '1. <span class="hl-amber">缺乏 Overview</span>：無整體趨勢總結導致無法拿 6 分以上\n2. <span class="hl-blue">流水帳列舉數據</span>：沒有進行類比或歸類\n3. <span class="hl-green">時態錯用</span>：未注意圖表數據對應的歷史年份或未來預測',
    interval: 1, nextReview: new Date().toISOString().split('T')[0], reviewCount: 16
  },
  {
    id: '3',
    subject: 'writing_p1',
    c: 'C18', t: 'T1', p: 'P1',
    front: 'delineate (描繪、詳細說明)',
    back: 'The line charts delineate <span class="hl-blue">[主題 A]</span> alongside <span class="hl-green">[主題 B]</span> in [地點] over a [時間] period.\n\n<span class="hl-amber">Key Note:</span> delineates 可替代 shows/illustrates。',
    interval: 1, nextReview: new Date().toISOString().split('T')[0], reviewCount: 17
  }
];

export const STORAGE_KEY = 'IELTS_CARDS_FINAL';

// 取得最新卡片資料
export function getCards() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultCards;
}

// 儲存卡片資料
export function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// 匯出 JSON 備份檔
export function exportData() {
  const cards = getCards();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `IELTS_Flashcards_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}