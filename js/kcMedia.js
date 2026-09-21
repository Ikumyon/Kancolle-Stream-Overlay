// kcMedia.js
// バックグラウンドが受信したBGM情報、および外部プラグインから受信した戦果情報を表示状態へ反映する。

(function initializeMedia(global) {
  let started = false;
  let lastNowPlaying = null;

  function applyNowPlaying(data) {
    if (!currentBgmEnabled || !data || typeof data !== 'object') return;

    let needsRender = false;
    if (typeof data.title === 'string' && currentBgm !== data.title) {
      currentBgm = data.title;
      needsRender = true;
    }
    if (needsRender) renderInfoDisplay();
  }

  function handleSenkaEvent(event) {
    if (!event || !event.detail) return;
    const nextSenka = event.detail.senka !== undefined ? String(event.detail.senka) : null;
    if (nextSenka !== null && currentSenka !== nextSenka) {
      currentSenka = nextSenka;
      renderInfoDisplay();
    }
  }

  function handleSenkaMessage(event) {
    if (event.source !== global || event.origin !== global.location.origin) return;
    const message = event.data;
    if (message?.source !== 'kco-senka-reader' || message.type !== 'snapshot' || message.version !== 1) return;
    if (!Number.isFinite(message.senka) || message.senka < 0) return;
    // 受信したページの文字列やHTMLを挿入せず、検証済み数値から表示を組み立てる。
    handleSenkaEvent({ detail: { senka: message.senka.toFixed(2) } });
  }

  function setEnabled(enabled) {
    currentBgmEnabled = enabled === true;
    const checkbox = document.getElementById('kc-chk-bgm');
    if (checkbox) checkbox.checked = currentBgmEnabled;

    if (!currentBgmEnabled) {
      currentBgm = '連動機能無効';
      renderInfoDisplay();
      return;
    }

    currentBgm = '接続待機中...';
    renderInfoDisplay();
    if (lastNowPlaying) applyNowPlaying(lastNowPlaying);
  }

  function start() {
    if (started) return;
    started = true;

    chrome.storage.local.get(['nowplaying'], (result) => {
      lastNowPlaying = result.nowplaying || null;
      if (lastNowPlaying) applyNowPlaying(lastNowPlaying);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.nowplaying) return;
      lastNowPlaying = changes.nowplaying.newValue || null;
      applyNowPlaying(lastNowPlaying);
    });

    global.addEventListener('kco:update-senka', handleSenkaEvent);
    global.addEventListener('message', handleSenkaMessage);
    global.postMessage({ source: 'kco-overlay', type: 'senka-ready' }, global.location.origin);
  }

  global.KcMedia = Object.freeze({ start, setEnabled });
})(globalThis);
