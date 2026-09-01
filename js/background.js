// background.js
// Electron環境向け: Service WorkerでSSE接続を一元管理

importScripts('kcSettings.js');

const SSE_URL = 'http://127.0.0.1:5001/sse';
let eventSource = null;
let reconnectTimer = null;

function connectSSE() {
  KcSettings.load((settings) => {
    const isEnabled = settings.bgmEnabled;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (!isEnabled) {
      console.log('[KCO-Background] SSE Disabled');
      return;
    }

    console.log('[KCO-Background] Connecting to SSE:', SSE_URL);
    eventSource = new EventSource(SSE_URL);

    eventSource.onopen = () => {
      console.log('[KCO-Background] SSE Connected');
    };

    eventSource.addEventListener('nowplaying', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[KCO-Background] Received nowplaying:', data);
        chrome.storage.local.set({ nowplaying: data });
      } catch (e) {
        console.error('[KCO-Background] JSON Parse Error:', e);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[KCO-Background] SSE Error (will retry):', err);
      // 再接続のために一定時間後に再試行 (設定がONのままか確認するため再帰呼び出し)
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectSSE();
      }, 5000);
    };
  });
}

// 起動時に接続
connectSSE();

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NOTIFY_TIMER_END') {
    const iconPath = chrome.runtime.getURL('icon.png');

    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconPath,
      title: '艦これオーバーレイ',
      message: 'タイマーが終了しました（回復完了）',
      priority: 2
    });
  }
});

// 設定変更時に接続状態を同期する。
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[KcSettings.STORAGE_KEY]) return;
  const change = changes[KcSettings.STORAGE_KEY];
  const wasEnabled = change.oldValue?.bgmEnabled === true;
  const isEnabled = change.newValue?.bgmEnabled === true;
  if (wasEnabled !== isEnabled) connectSSE();
});
