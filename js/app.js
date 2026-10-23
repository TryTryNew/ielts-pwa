import { getCards, saveCards, exportData, STORAGE_KEY } from './storage.js';
import { speakText } from './speech.js';
import { todayStr, addDaysStr, toDateStr } from './dates.js';

// -------------------------------------------------------------
// 1. 引入 Firebase SDK 並初始化
// -------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEDhorQluZMJbE9KsApQja4MMW_K665CM",
  authDomain: "ielts-pwa.firebaseapp.com",
  projectId: "ielts-pwa",
  storageBucket: "ielts-pwa.firebasestorage.app",
  messagingSenderId: "378105720242",
  appId: "1:378105720242:web:ed712373f28d7ba8cf08ab",
  measurementId: "G-J6HRLGHLC1"
};

// 初始化 Firebase、Firestore 與 Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 初始化 Google 登入驗證器
const googleProvider = new GoogleAuthProvider();

// 監聽按鈕：點擊時跳出 Google 登入視窗
document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("🟢 成功登入 Google 帳號：", result.user.displayName);
  } catch (error) {
    console.error("🔴 Google 登入失敗：", error);
    alert("登入失敗：" + error.message);
  }
});

let currentUserUID = null;

// 自動驗證身份邏輯
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserUID = user.uid;
    console.log("🟢 登入成功！當前使用者 ID:", user.uid);
    fetchCardsFromCloud(); // 登入後自動加載該使用者的雲端卡片
  } else {
    // 檢查是否有儲存管理員帳號密碼
    const savedEmail = localStorage.getItem('admin_email');
    const savedPwd = localStorage.getItem('admin_pwd');

    if (savedEmail && savedPwd) {
      try {
        await signInWithEmailAndPassword(auth, savedEmail, savedPwd);
        console.log("🔑 管理員帳號自動登入成功（跨裝置同步中）");
      } catch (err) {
        console.warn("⚠️ 自動登入失敗，切換為訪客模式", err);
        await signInAnonymously(auth);
      }
    } else {
      // 訪客開啟時，自動以匿名訪客登入
      console.log("👤 訪客開啟，已建立獨立雲端空間");
      await signInAnonymously(auth);
    }
  }
});

// -------------------------------------------------------------
// 2. 全局狀態變數
// -------------------------------------------------------------
let cards = getCards();
let currentReviewList = [];
let reviewIndex = 0;
let isFlipped = false;
let reviewMode = 'test';
let cardOrder = 'sequential';

const subjectMap = {
  writing_p1: { name: '寫作 Task 1', class: 'bg-indigo-500/10 text-indigo-500' },
  writing_p2: { name: '寫作 Task 2', class: 'bg-purple-500/10 text-purple-500' },
  listening: { name: '聽力 Listening', class: 'bg-blue-500/10 text-blue-500' },
  reading: { name: '閱讀 Reading', class: 'bg-emerald-500/10 text-emerald-500' },
  speaking: { name: '口語 Speaking', class: 'bg-amber-500/10 text-amber-500' }
};

// -------------------------------------------------------------
// 3. Firestore 雲端同步 Helper 函式
// -------------------------------------------------------------

// 從 Firestore 載入所有卡片
async function fetchCardsFromCloud() {
  try {
    if (!currentUserUID) return;
    const cardsRef = collection(db, 'users', currentUserUID, 'cards');
    const querySnapshot = await getDocs(cardsRef);
    const cloudCards = [];
    querySnapshot.forEach((docSnap) => {
      cloudCards.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (cloudCards.length > 0) {
      cards = cloudCards;
      saveCards(cards); // 順便寫入 localStorage 做離線快取
      refreshCurrentPageUI();
      console.log(`☁️ 成功從雲端同步 ${cloudCards.length} 張卡片！`);
    } else if (cards.length > 0) {
      // 雲端是空的，但本地有卡片，自動批次上傳
      console.log('☁️ 雲端尚無資料，正將本地卡片同步至 Firestore...');
      await uploadAllCardsToCloud(cards);
    }
  } catch (err) {
    console.error('⚠️ 讀取 Firestore 失敗，切換為本地模式:', err);
  }
}

// 儲存/更新單張卡片至雲端
async function syncCardToCloud(card) {
  try {
    if (!currentUserUID) return;
    await setDoc(doc(db, 'users', currentUserUID, 'cards', String(card.id)), card, { merge: true });
  } catch (err) {
    console.error('⚠️ 儲存至 Firebase 失敗:', err);
  }
}

// 刪除雲端單張卡片
async function deleteCardFromCloud(cardId) {
  try {
    if (!currentUserUID) return;
    await deleteDoc(doc(db, 'users', currentUserUID, 'cards', String(cardId)));
    console.log(`☁️ 成功從雲端刪除卡片 ${cardId}`);
  } catch (err) {
    console.error('⚠️ 從 Firebase 刪除失敗:', err);
  }
}

// 批次上傳卡片 (用於 AI 匯入時)
async function uploadAllCardsToCloud(cardsList) {
  try {
    if (!currentUserUID) return;
    const batch = writeBatch(db);
    cardsList.forEach(c => {
      const cardRef = doc(db, 'users', currentUserUID, 'cards', String(c.id));
      batch.set(cardRef, c, { merge: true });
    });
    await batch.commit();
    console.log('☁️ 批次上傳完成！');
  } catch (err) {
    console.error('⚠️ 批次同步失敗:', err);
  }
}

// 重新整理當前顯示畫面
function refreshCurrentPageUI() {
  renderHub();
  renderAnalytics();
  renderDatabase();
}

// -------------------------------------------------------------
// 4. 初始化
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  cards = getCards();
  renderHub();
  renderAnalytics();
  renderDatabase();
  initCardGestures();
  if (window.lucide) window.lucide.createIcons();

  // 開始雲端同步
  fetchCardsFromCloud();
  
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

function speakCurrentCardFront() {
  if (currentReviewList[reviewIndex]) speakText(currentReviewList[reviewIndex].front);
}

function speakCurrentCardBack() {
  if (currentReviewList[reviewIndex]) speakText(currentReviewList[reviewIndex].back);
}

function switchPage(pageId) {
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

  if (pageId === 'hub') renderHub();
  if (pageId === 'analytics') renderAnalytics();
  if (pageId === 'database') renderDatabase();
}

function renderHub() {
  cards = getCards();
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

function openSubjectView(subjectKey) {
  cards = getCards();
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

function toggleAccordion(tKey) {
  document.getElementById(`accordion-content-${tKey}`).classList.toggle('hidden');
  document.getElementById(`accordion-icon-${tKey}`).classList.toggle('rotate-180');
}

function startReviewSingleCard(cardId) {
  cards = getCards();
  const targetCard = cards.find(c => c.id === cardId);
  if (!targetCard) return;

  let sameGroupCards = cards.filter(c => c.t === targetCard.t);

  if (cardOrder === 'random') {
    sameGroupCards = [...sameGroupCards].sort(() => Math.random() - 0.5);
  }

  currentReviewList = sameGroupCards;
  const targetIndex = currentReviewList.findIndex(c => c.id === cardId);
  reviewIndex = targetIndex !== -1 ? targetIndex : 0;

  switchPage('review');
  renderReviewCard();
}

function startReviewForList(tKey) {
  cards = getCards();
  let groupCards = cards.filter(c => c.t === tKey);
  if (groupCards.length === 0) return;

  if (cardOrder === 'random') {
    groupCards = [...groupCards].sort(() => Math.random() - 0.5);
  }

  currentReviewList = groupCards;
  reviewIndex = 0;
  switchPage('review');
  renderReviewCard();
}

function startReview(mode) {
  cards = getCards();
  const today = todayStr();
  let pool = mode === 'due' ? cards.filter(c => c.nextReview <= today) : [...cards];

  if (cardOrder === 'random') {
    pool = [...pool].sort(() => Math.random() - 0.5);
  }

  currentReviewList = pool;

  if (currentReviewList.length === 0) {
    alert('🎉 今日預定複習完成！太棒了！');
    return;
  }
  reviewIndex = 0;
  switchPage('review');
  renderReviewCard();
}

function toggleCardOrder() {
  cardOrder = (cardOrder === 'sequential') ? 'random' : 'sequential';
  renderOrderButton();

  if (currentReviewList.length > 0) {
    const currentCard = currentReviewList[reviewIndex];
    if (cardOrder === 'random') {
      const remaining = currentReviewList.slice(reviewIndex + 1).sort(() => Math.random() - 0.5);
      currentReviewList = [currentCard, ...remaining];
    } else {
      const remaining = currentReviewList.slice(reviewIndex + 1).sort((a,b) => String(a.id).localeCompare(String(b.id)));
      currentReviewList = [currentCard, ...remaining];
    }
    reviewIndex = 0;
  }
}

function renderOrderButton() {
  const btn = document.getElementById('review-order-btn');
  if (cardOrder === 'random') {
    btn.innerHTML = `<i data-lucide="shuffle" class="w-3.5 h-3.5 text-indigo-400"></i><span>隨機</span>`;
    btn.className = "px-2.5 py-1 rounded-lg border border-indigo-500/50 bg-indigo-500/20 text-indigo-400 text-[11px] font-bold flex items-center justify-center gap-1 hover:border-indigo-500 transition-all shadow-sm";
  } else {
    btn.innerHTML = `<i data-lucide="arrow-down-1-2" class="w-3.5 h-3.5"></i><span>順序</span>`;
    btn.className = "px-2.5 py-1 rounded-lg border border-gray-500/30 bg-gray-500/10 text-themeSub text-[11px] font-bold flex items-center justify-center gap-1 hover:border-indigo-500 transition-all";
  }
  if (window.lucide) window.lucide.createIcons();
}

function toggleReviewMode() {
  reviewMode = (reviewMode === 'test') ? 'browse' : 'test';
  const btn = document.getElementById('review-mode-btn');
  if (reviewMode === 'browse') {
    btn.innerHTML = `<i data-lucide="book-open" class="w-3.5 h-3.5"></i> 📖 刷題 (直觀速覽)`;
    btn.className = "px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-[11px] font-bold flex items-center gap-1 transition-all";
  } else {
    btn.innerHTML = `<i data-lucide="zap" class="w-3.5 h-3.5"></i> ⚡ 測驗 (點擊翻面)`;
    btn.className = "px-3 py-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-500 text-[11px] font-bold flex items-center gap-1 transition-all";
  }
  if (window.lucide) window.lucide.createIcons();
  renderReviewCard();
}

function renderReviewCard() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  if (reviewIndex >= currentReviewList.length) {
    alert('🎉 此回合卡片已全部複習完畢！');
    switchPage('hub');
    return;
  }
  if (reviewIndex < 0) reviewIndex = 0;

  const card = currentReviewList[reviewIndex];
  const innerCard = document.getElementById('review-card-inner');
  
  isFlipped = false;
  innerCard.classList.remove('rotate-y-180');

  const ctpTag = `${card.c || ''}-${card.t || ''}-${card.p || ''}`;
  document.getElementById('review-tag-badge').innerText = `${ctpTag} • ${subjectMap[card.subject]?.name || ''}`;
  document.getElementById('review-progress-text').innerText = `卡片 ${reviewIndex + 1} / ${currentReviewList.length}`;
  document.getElementById('review-front-text').innerText = card.front;
  document.getElementById('review-back-text').innerHTML = card.back;

  if (reviewMode === 'browse') {
    requestAnimationFrame(() => {
      innerCard.classList.add('rotate-y-180');
      isFlipped = true;
    });
    document.getElementById('review-back-tip').innerText = "👈 點左邊上一張 ｜ 點右邊下一張 👉";
  } else {
    document.getElementById('review-front-tip').innerText = "👈 點左邊上一張 ｜ 點右邊翻面 👉";
    document.getElementById('review-back-tip').innerText = "👈 點左邊上一張 ｜ 點右邊下一張 👉";
  }

  renderOrderButton();
}

function prevReviewCard() {
  if (reviewIndex > 0) {
    reviewIndex--;
    renderReviewCard();
  } else {
    alert('已經是第一張卡片囉！');
  }
}

function nextReviewCard() {
  const today = todayStr();
  const card = currentReviewList[reviewIndex];
  if (card) {
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.lastReviewed = today;
    const addDays = Math.min(Math.pow(2, card.reviewCount - 1), 30);
    card.nextReview = addDaysStr(addDays);
    
    cards = getCards();
    const idx = cards.findIndex(c => String(c.id) === String(card.id));
    if (idx !== -1) cards[idx] = card;
    
    saveCards(cards);
    syncCardToCloud(card); // 🔥 同步複習紀錄到雲端
  }

  reviewIndex++;
  renderReviewCard();
}

function initCardGestures() {
  const box = document.getElementById('review-card-box');
  if (!box) return;

  box.onclick = (e) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const rect = box.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width * 0.5;
    const inner = document.getElementById('review-card-inner');

    if (isLeftHalf) {
      if (isFlipped) {
        isFlipped = false;
        inner.classList.remove('rotate-y-180');
      } else {
        prevReviewCard();
      }
    } else {
      if (reviewMode === 'browse') {
        nextReviewCard();
      } else {
        if (!isFlipped) {
          isFlipped = true;
          inner.classList.add('rotate-y-180');
        } else {
          nextReviewCard();
        }
      }
    }
  };
}

function renderAnalytics() {
  cards = getCards();
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

function openCalDateModal(dateStr) {
  cards = getCards();
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

function closeCalModal() {
  document.getElementById('calendar-modal').classList.add('hidden');
}

function renderDatabase() {
  cards = getCards();
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

function deleteCard(id) {
  if (confirm('確定要刪除這張卡片嗎？')) {
    cards = getCards().filter(c => String(c.id) !== String(id));
    saveCards(cards);
    deleteCardFromCloud(id); // 🔥 同步從雲端刪除
    renderDatabase();
    renderHub();
  }
}

function openAIModal() { document.getElementById('ai-modal').classList.remove('hidden'); }
function closeAIModal() { document.getElementById('ai-modal').classList.add('hidden'); }
function openManualAddModal() { document.getElementById('add-modal').classList.remove('hidden'); }
function closeAddModal() { document.getElementById('add-modal').classList.add('hidden'); }

function copyAIPrompt() {
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

function processAIImport() {
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

    cards = [...getCards(), ...formatted];
    saveCards(cards);
    uploadAllCardsToCloud(formatted); // 🔥 批次上傳新卡片到雲端

    alert(`成功匯入 ${formatted.length} 張卡片並同步到雲端！`);
    closeAIModal();
    renderHub();
    renderDatabase();
  } catch (err) {
    alert('JSON 格式錯誤，請檢查輸入內容：' + err.message);
  }
}

function saveManualCard() {
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

  cards = getCards();
  cards.push(newCard);
  saveCards(cards);
  syncCardToCloud(newCard); // 🔥 新增卡片同步至雲端

  closeAddModal();
  renderHub();
  renderDatabase();
}