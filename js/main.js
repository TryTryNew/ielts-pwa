// main.js：整個 App 的入口（index.html 只載入這一個檔案）。
// 它不做業務邏輯，只做「接線」：啟動、把各檔案串起來、把按鈕接到函式。
import { getCards, saveCards, exportData } from './storage.js';
import { speakText } from './speech.js';
import { initAuth } from './auth.js';
import { fetchCardsFromCloud, uploadAllCardsToCloud } from './cloud.js';
import { registerPageRenderer, switchPage, refreshCurrentPageUI } from './ui/nav.js';
import { renderHub, openSubjectView, toggleAccordion } from './ui/hub.js';
import {
  startReviewSingleCard, startReviewForList, startReview,
  toggleCardOrder, toggleReviewMode, initCardGestures,
  speakCurrentCardFront, speakCurrentCardBack
} from './ui/review.js';
import { renderAnalytics, openCalDateModal, closeCalModal } from './ui/analytics.js';
import { renderDatabase, deleteCard } from './ui/database.js';
import {
  openAIModal, closeAIModal, openManualAddModal, closeAddModal,
  copyAIPrompt, processAIImport, saveManualCard
} from './ui/modals.js';

// 登記各頁面的重畫函式（換頁、重新整理時，nav.js 會用到）
registerPageRenderer('hub', renderHub);
registerPageRenderer('analytics', renderAnalytics);
registerPageRenderer('database', renderDatabase);

// 雲端同步：雲端有資料就存到本機並重畫；雲端是空的但本機有卡片，就把本機的上傳。
// （原本寫在 fetchCardsFromCloud 裡，現在由這裡統籌：cloud.js 只負責讀、寫、刪。）
async function syncFromCloud() {
  try {
    const cloudCards = await fetchCardsFromCloud();
    if (cloudCards === null) return;

    if (cloudCards.length > 0) {
      saveCards(cloudCards); // 順便寫入 localStorage 做離線快取
      refreshCurrentPageUI();
      console.log(`☁️ 成功從雲端同步 ${cloudCards.length} 張卡片！`);
    } else {
      const localCards = getCards();
      if (localCards.length > 0) {
        // 雲端是空的，但本地有卡片，自動批次上傳
        console.log('☁️ 雲端尚無資料，正將本地卡片同步至 Firestore...');
        await uploadAllCardsToCloud(localCards);
      }
    }
  } catch (err) {
    console.error('⚠️ 讀取 Firestore 失敗，切換為本地模式:', err);
  }
}

// 啟動登入（登入成功後，去雲端載入卡片）
initAuth(syncFromCloud);

window.addEventListener('DOMContentLoaded', () => {
  renderHub();
  renderAnalytics();
  renderDatabase();
  initCardGestures();
  if (window.lucide) window.lucide.createIcons();

  // 開始雲端同步
  syncFromCloud();

  // 綁定全域 window 供 HTML 事件調用
  window.switchPage = switchPage;
  window.toggleTheme = toggleTheme;
  window.startReview = startReview;
  window.openSubjectView = openSubjectView;
  window.toggleAccordion = toggleAccordion;
  window.startReviewSingleCard = startReviewSingleCard;
  window.startReviewForList = startReviewForList;
  window.toggleCardOrder = toggleCardOrder;
  window.toggleReviewMode = toggleReviewMode;
  window.openCalDateModal = openCalDateModal;
  window.closeCalModal = closeCalModal;
  window.renderDatabase = renderDatabase;
  window.deleteCard = deleteCard;
  window.openAIModal = openAIModal;
  window.closeAIModal = closeAIModal;
  window.openManualAddModal = openManualAddModal;
  window.closeAddModal = closeAddModal;
  window.copyAIPrompt = copyAIPrompt;
  window.processAIImport = processAIImport;
  window.saveManualCard = saveManualCard;
  window.exportData = exportData;
  window.speakText = speakText;
  window.speakCurrentCardFront = speakCurrentCardFront;
  window.speakCurrentCardBack = speakCurrentCardBack;
});

function toggleTheme() {
  document.documentElement.classList.toggle('theme-dark');
  document.documentElement.classList.toggle('theme-pastel');
}
