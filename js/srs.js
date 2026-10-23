// srs.js：間隔複習的「規則」。只做計算，不碰畫面、不碰儲存。
// 規則：複習第 n 次後，隔 2 的 (n-1) 次方天再複習，最多隔 30 天。
import { todayStr, addDaysStr } from './dates.js';

// 複習第 reviewCount 次之後，要隔幾天（純計算：給數字，回傳數字）
export function intervalDaysFor(reviewCount) {
  return Math.min(Math.pow(2, reviewCount - 1), 30);
}

// 記錄「剛複習完這張卡」：更新次數、最後複習日、下次複習日。
// 直接修改傳進來的 card（跟原本 nextReviewCard 裡的做法一樣），並回傳它。
export function applyReviewResult(card) {
  card.reviewCount = (card.reviewCount || 0) + 1;
  card.lastReviewed = todayStr();
  card.nextReview = addDaysStr(intervalDaysFor(card.reviewCount));
  return card;
}
