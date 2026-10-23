// ui/nav.js：換頁。這是「十字路口」：每個頁面都會叫它換頁，它也要在換到某頁時叫那頁重畫。
// 為了不讓它 import 各個頁面（會變成互相 import），改成「登記制」：
// 各頁面由 main.js 先來登記「我的重畫函式是哪個」，這裡只負責呼叫登記過的。
const pageRenderers = {};

export function registerPageRenderer(pageId, renderFn) {
  pageRenderers[pageId] = renderFn;
}

export function switchPage(pageId) {
  ['hub', 'subject-detail', 'review', 'analytics', 'database'].forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.add('hidden');
  });
  document.getElementById(`page-${pageId}`).classList.remove('hidden');

  ['hub', 'review', 'analytics', 'database'].forEach(nav => {
    const btn = document.getElementById(`bnav-${nav}`);
    if (btn) {
      btn.className = (nav === pageId) 
        ? 'flex flex-col items-center gap-1 text-indigo-500 font-bold'
        : 'flex flex-col items-center gap-1 text-themeSub hover:text-themeText font-bold';
    }
  });

  pageRenderers[pageId]?.();
}

// 重新整理當前顯示畫面
export function refreshCurrentPageUI() {
  ['hub', 'analytics', 'database'].forEach(id => pageRenderers[id]?.());
}
