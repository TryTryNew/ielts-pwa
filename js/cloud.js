// cloud.js：雲端（Firestore）的讀、寫、刪。只跟資料庫說話，不碰畫面、不改本機卡片。
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase.js';
import { getCurrentUID } from './auth.js';

// 從 Firestore 載入所有卡片。
// 只負責「讀回來並交出去」：成功回傳卡片陣列（可能是空的），失敗或沒登入回傳 null。
// 要不要存進本機、要不要重畫畫面，由上層（main.js）決定。
export async function fetchCardsFromCloud() {
  try {
    const uid = getCurrentUID();
    if (!uid) return null;
    const cardsRef = collection(db, 'users', uid, 'cards');
    const querySnapshot = await getDocs(cardsRef);
    const cloudCards = [];
    querySnapshot.forEach((docSnap) => {
      cloudCards.push({ id: docSnap.id, ...docSnap.data() });
    });
    return cloudCards;
  } catch (err) {
    console.error('⚠️ 讀取 Firestore 失敗，切換為本地模式:', err);
    return null;
  }
}

// 儲存/更新單張卡片至雲端
export async function syncCardToCloud(card) {
  try {
    const uid = getCurrentUID();
    if (!uid) return;
    await setDoc(doc(db, 'users', uid, 'cards', String(card.id)), card, { merge: true });
  } catch (err) {
    console.error('⚠️ 儲存至 Firebase 失敗:', err);
  }
}

// 刪除雲端單張卡片
export async function deleteCardFromCloud(cardId) {
  try {
    const uid = getCurrentUID();
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'cards', String(cardId)));
    console.log(`☁️ 成功從雲端刪除卡片 ${cardId}`);
  } catch (err) {
    console.error('⚠️ 從 Firebase 刪除失敗:', err);
  }
}

// 批次上傳卡片 (用於 AI 匯入時)
export async function uploadAllCardsToCloud(cardsList) {
  try {
    const uid = getCurrentUID();
    if (!uid) return;
    const batch = writeBatch(db);
    cardsList.forEach(c => {
      const cardRef = doc(db, 'users', uid, 'cards', String(c.id));
      batch.set(cardRef, c, { merge: true });
    });
    await batch.commit();
    console.log('☁️ 批次上傳完成！');
  } catch (err) {
    console.error('⚠️ 批次同步失敗:', err);
  }
}
