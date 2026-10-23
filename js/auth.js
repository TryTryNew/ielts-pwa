// auth.js：登入。這個檔案是 currentUserUID 的「主人」：
// 只有這裡能改它，別的檔案要知道目前是誰，只能呼叫 getCurrentUID()。
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from './firebase.js';

// 初始化 Google 登入驗證器
const googleProvider = new GoogleAuthProvider();

let currentUserUID = null;

// 給別的檔案讀取目前使用者的 uid（唯讀窗口）
export function getCurrentUID() {
  return currentUserUID;
}

// 啟動登入：綁定 Google 登入按鈕、監聽登入狀態。
// onLogin 是一個「回呼函式」：登入成功後由 main.js 決定要做什麼（例如載入雲端卡片），
// 這樣 auth.js 就不用認識 cloud.js，避免兩個檔案互相需要。
export function initAuth(onLogin) {
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

  // 自動驗證身份邏輯
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserUID = user.uid;
      console.log("🟢 登入成功！當前使用者 ID:", user.uid);
      onLogin(); // 登入後自動加載該使用者的雲端卡片
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
}
