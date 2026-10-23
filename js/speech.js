// 核心語音發音函式
export function speakText(text) {
  if (!('speechSynthesis' in window)) {
    alert('您的瀏覽器不支援語音朗讀功能');
    return;
  }
  window.speechSynthesis.cancel();

  // 清除 HTML 標籤與特殊字元
  const tempDom = document.createElement("div");
  tempDom.innerHTML = text;
  let cleanText = tempDom.textContent || tempDom.innerText || "";
  cleanText = cleanText.replace(/^\s*\d+[\.\)]\s*/gm, '');
  cleanText = cleanText.replace(/[★【】]/g, '');

  if (!cleanText.trim()) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const hasEnglish = /[a-zA-Z]/.test(cleanText);
  utterance.lang = hasEnglish ? 'en-US' : 'zh-TW';
  utterance.rate = 0.95;

  window.speechSynthesis.speak(utterance);
}