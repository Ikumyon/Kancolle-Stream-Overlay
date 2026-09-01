// kcMedia.js
// バックグラウンドが受信したBGM・戦果情報を表示状態へ反映する。

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
    if (data.senka !== undefined) {
      const nextSenka = String(data.senka);
      if (currentSenka !== nextSenka) {
        currentSenka = nextSenka;
        needsRender = true;
      }
    }
    if (needsRender) renderInfoDisplay();
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
  }

  global.KcMedia = Object.freeze({ start, setEnabled });
})(globalThis);
