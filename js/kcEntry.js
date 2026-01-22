// kcEntry.js
// エントリーポイント

if (window.self !== window.top) {
  // iframe内では実行しない
} else {
  console.log("Kancolle Overlay: 起動しました (Split Mode)");
  initOverlay();
}

function initOverlay() {
  if (document.getElementById('kc-win-control')) return;

  // kcView.js の関数呼び出し
  const winTimer = createTimerWindow();
  const winArea = createAreaWindow();
  const winControl = createControlWindow();

  // イベントリスナー登録 (Window保存)
  [winTimer, winArea, winControl].forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('mouseup', () => {
      saveWindowLayout();
    });
  });

  restoreWindowLayout();
  ensureOnScreen(winTimer);
  ensureOnScreen(winArea);
  ensureOnScreen(winControl);

  setupLogic(); // kcLogic.js
  loadSettings(); // kcLogic.js
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_STYLE') {
    applyStyles(message.settings);
  }
  if (message.type === 'RESET_POSITION') {
    localStorage.removeItem('kc_window_layout');
    const targetIds = ['kc-win-timer', 'kc-win-area', 'kc-win-control'];
    let offsetStep = 0;
    targetIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.width = "";
        el.style.height = "";
        const rect = el.getBoundingClientRect();
        const top = (window.innerHeight - rect.height) / 2 + (offsetStep * 40);
        const left = (window.innerWidth - rect.width) / 2 + (offsetStep * 20);
        el.style.top = Math.max(0, top) + "px";
        el.style.left = Math.max(0, left) + "px";
        offsetStep++;
      }
    });
    saveWindowLayout();
  }
});