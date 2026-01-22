// background.js
// Electron環境向け: Service Workerで直接SSE接続

const SSE_URL = 'http://127.0.0.1:5001/sse';
let eventSource = null;

function connectSSE() {
  if (eventSource) {
    eventSource.close();
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

      // ストレージに保存
      chrome.storage.local.set({ nowplaying: data });

    } catch (e) {
      console.error('[KCO-Background] JSON Parse Error:', e);
    }
  });

  eventSource.onerror = (err) => {
    console.warn('[KCO-Background] SSE Error (will retry):', err);
    // 再接続のために一定時間後に再試行
    setTimeout(() => {
      console.log('[KCO-Background] Reconnecting...');
      connectSSE();
    }, 5000);
  };
}

// 起動時に接続
connectSSE();

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RECONNECT_SSE') {
    connectSSE();
  }

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
