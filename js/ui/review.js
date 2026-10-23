// ui/review.js：複習畫面。複習用的狀態變數只有這個檔案用，所以放在這裡當私有變數。
import { getCards, saveCards } from '../storage.js';
import { speakText } from '../speech.js';
import { todayStr } from '../dates.js';
import { subjectMap } from '../constants.js';
import { applyReviewResult } from '../srs.js';
import { syncCardToCloud } from '../cloud.js';
import { switchPage } from './nav.js';

let currentReviewList = [];
let reviewIndex = 0;
let isFlipped = false;
let reviewMode = 'test';
let cardOrder = 'sequential';

export function speakCurrentCardFront() {
  if (currentReviewList[reviewIndex]) speakText(currentReviewList[reviewIndex].front);
}

export function speakCurrentCardBack() {
  if (currentReviewList[reviewIndex]) speakText(currentReviewList[reviewIndex].back);
}

export function startReviewSingleCard(cardId) {
  const cards = getCards();
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

export function startReviewForList(tKey) {
  const cards = getCards();
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

export function startReview(mode) {
  const cards = getCards();
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

export function toggleCardOrder() {
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

export function toggleReviewMode() {
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
  const card = currentReviewList[reviewIndex];
  if (card) {
    applyReviewResult(card); // 更新次數與下次日期（規則在 srs.js）

    const cards = getCards();
    const idx = cards.findIndex(c => String(c.id) === String(card.id));
    if (idx !== -1) cards[idx] = card;
    
    saveCards(cards);
    syncCardToCloud(card); // 🔥 同步複習紀錄到雲端
  }

  reviewIndex++;
  renderReviewCard();
}

export function initCardGestures() {
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
