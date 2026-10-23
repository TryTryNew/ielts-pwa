// firebase.js：只負責「把 Firebase 接起來」，不做任何業務邏輯。
// 其他檔案要用資料庫或登入，就從這裡 import db 和 auth。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
