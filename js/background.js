// background.js
// Electron環境向け: Service Workerで直接SSE接続

const SSE_URL = 'http://127.0.0.1:5001/sse';
let eventSource = null;


// 設定読み込み用
function getBgmEnabled(callback) {
  // logic側は localStorage 'kc_map_settings' に保存しているが、
  // backgroundからは localStorage はアクセスできない可能性がある(MV3 Service Worker)。
  // しかし、同じオリジンなら読めるかもしれないが、Extensionのbackgroundは別コンテキスト。
  // そのため、logic側で chrome.storage.local にも保存するか、
  // あるいは logic側 から message を送る必要がある。

  // kcLogic.js の saveLocalData は localStorage しか使っていないように見える。
  // 修正計画: kcLogic.js で bgmEnabled を chrome.storage.local にも保存するように修正する必要があるが、
  // 最小限の変更で済ませるなら、kcLogic.js で saveLocalData 内で chrome.storage.local にも保存させる。

  // 今は chrome.storage.local 'kcOverlaySettings' を確認する。
  // ...いや、kcLogic.js の saveAndReflect は kcOverlaySettings を使っているが、
  // saveLocalData は localStorage 'kc_map_settings' を使っている。
  // 両方同期されていない可能性がある。

  // 確実なのは chrome.storage.local に保存すること。
  chrome.storage.local.get(['bgmEnabled'], (res) => {
    callback(res.bgmEnabled === true);
  });
}

function connectSSE() {
  getBgmEnabled((isEnabled) => {
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
      setTimeout(() => {
        connectSSE();
      }, 5000);
    };
  });
}

// 起動時に接続
connectSSE();

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RECONNECT_SSE') {
    // 設定変更通知を受け取ったら再接続フローへ
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

// ストレージ変更監視 (bgmEnabled変更時)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.bgmEnabled) {
    console.log('[KCO-Background] bgmEnabled changed:', changes.bgmEnabled.newValue);
    connectSSE();
  }
});
