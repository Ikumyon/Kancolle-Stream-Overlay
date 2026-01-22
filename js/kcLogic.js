// kcLogic.js
// ロジック制御、イベントリスナー、データ保存

function setupLogic() {
  // マップ更新
  const inpMajor = document.getElementById('kc-map-major');
  const inpMinor = document.getElementById('kc-map-minor');
  const chkEvent = document.getElementById('kc-chk-event');
  const inpTimerManual = document.getElementById('kc-timer-manual');
  const inpCondCurr = document.getElementById('kc-cond-curr');
  const inpCondTgt = document.getElementById('kc-cond-tgt');
  const numpad = document.getElementById('kc-numpad');

  // マップ更新
  const updateMap = () => {
    currentIsEvent = chkEvent.checked;
    currentMapMajor = inpMajor.value;
    currentMapMinor = inpMinor.value;
    saveLocalData();
    renderInfoDisplay();
  };

  // テンキー制御
  const openNumpad = (targetId) => {
    activeInputId = targetId;
    numpad.style.display = 'block';
    const targetEl = document.getElementById(targetId);
    numpad.style.top = (targetEl.offsetTop + targetEl.offsetHeight + 5) + 'px';
    numpad.style.left = (targetEl.offsetLeft - 40) + 'px';
  };

  const closeNumpad = () => {
    numpad.style.display = 'none';
    activeInputId = null;
  };

  const attachNumpad = (el) => {
    el.onclick = (e) => { e.stopPropagation(); openNumpad(el.id); };
  };

  attachNumpad(inpMajor);
  attachNumpad(inpMinor);
  attachNumpad(inpTimerManual);
  attachNumpad(inpCondCurr);
  attachNumpad(inpCondTgt);

  chkEvent.onchange = () => {
    updateMap();
    if (chkEvent.checked) openNumpad('kc-map-major');
  };

  document.querySelectorAll('.kc-num-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const num = btn.textContent;
      if (!activeInputId) return;
      const input = document.getElementById(activeInputId);
      if (activeInputId.includes('kc-map')) {
        input.value = num;
        updateMap();
        if (activeInputId === 'kc-map-major') openNumpad('kc-map-minor');
        else if (activeInputId === 'kc-map-minor') closeNumpad();
      } else {
        if (input.value.length < 3) {
          input.value += num;
        }
      }
    };
  });

  document.getElementById('kc-num-bs').onclick = (e) => {
    e.stopPropagation();
    if (activeInputId) {
      const input = document.getElementById(activeInputId);
      input.value = input.value.slice(0, -1);
      if (activeInputId.includes('kc-map')) updateMap();
    }
  };

  document.getElementById('kc-num-close').onclick = (e) => {
    e.stopPropagation();
    closeNumpad();
  };

  document.getElementById('kc-win-control').onclick = () => closeNumpad();

  // タイマー機能
  const dispCount = document.getElementById('kc-disp-countdown');
  const dispEnd = document.getElementById('kc-disp-end');
  const dispStatus = document.getElementById('kc-disp-status');

  startTimerFunc = (minutes) => {
    if (isNaN(minutes) || minutes <= 0) return;
    clearInterval(timerInterval);
    isTimerRunning = true;
    updateTimerVisibility();

    const now = new Date();
    const endTime = new Date(now.getTime() + minutes * 60000);
    const h = endTime.getHours().toString().padStart(2, '0');
    const m = endTime.getMinutes().toString().padStart(2, '0');

    dispStatus.style.display = 'block';
    dispEnd.textContent = `終了時刻は ${h}:${m}`;
    dispEnd.style.color = "";

    const tick = () => {
      const diff = Math.ceil((endTime - new Date()) / 1000);
      if (diff <= 0) {
        clearInterval(timerInterval);
        if (currentTimerNotify) {
          chrome.runtime.sendMessage({ type: 'NOTIFY_TIMER_END' });
        }
        isTimerRunning = false;
        updateTimerVisibility();
        dispStatus.style.display = 'none';
        dispCount.innerHTML = "00:00";
        dispCount.style.color = "#ff4444";
        dispEnd.textContent = "回復完了";
        dispEnd.style.color = "#ff4444";
      } else {
        const mm = Math.floor(diff / 60).toString().padStart(2, '0');
        const ss = (diff % 60).toString().padStart(2, '0');
        dispCount.innerHTML = `<span class="kc-timer-prefix">終了まで</span>${mm}:${ss}`;
        dispCount.style.color = "";
      }
    };
    tick();
    timerInterval = setInterval(tick, 250);
  };

  stopTimerFunc = () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    updateTimerVisibility();
    dispStatus.style.display = 'none';
    dispCount.textContent = "00:00";
    dispCount.style.color = "";
    dispEnd.textContent = "--:--";
    dispEnd.style.color = "";
  };

  document.getElementById('kc-btn-manual-set').onclick = () => {
    const val = parseInt(inpTimerManual.value);
    if (val > 0) startTimerFunc(val);
  };

  document.getElementById('kc-btn-stop').onclick = () => {
    if (stopTimerFunc) stopTimerFunc();
  };

  document.getElementById('kc-btn-cond-set').onclick = () => {
    const curr = parseInt(inpCondCurr.value);
    const tgt = parseInt(inpCondTgt.value);
    if (!isNaN(curr) && !isNaN(tgt)) {
      let diff = tgt - curr;
      if (diff < 0) diff = 0;
      startTimerFunc(diff);
    }
  };

  // ボタン設定
  const setupBtnGroup = (groupId, currentValRef, saveKey) => {
    const group = document.getElementById(groupId);
    if (!group) return;
    const buttons = group.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.onclick = () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (groupId === 'kc-grp-diff') currentDifficulty = btn.dataset.val;
        if (groupId === 'kc-grp-status') currentStatus = btn.dataset.val;
        saveLocalData();
        renderInfoDisplay();
      };
    });
  };
  setupBtnGroup('kc-grp-diff', currentDifficulty, 'kc_diff');
  setupBtnGroup('kc-grp-status', currentStatus, 'kc_status');

  restoreLocalData();
  renderTimerPresets();

  // BGM更新監視 (Direct SSE Connection)
  const setupBgmSSE = () => {
    console.log('[KCO-Logic] Setting up direct SSE connection...');

    const SSE_URL = 'http://127.0.0.1:5001/sse';
    let eventSource = null;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      console.log('[KCO-Logic] Connecting to SSE:', SSE_URL);
      eventSource = new EventSource(SSE_URL);

      eventSource.onopen = () => {
        console.log('[KCO-Logic] SSE Connected');
      };

      eventSource.addEventListener('nowplaying', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[KCO-Logic] Received nowplaying:', data);

          if (data) {
            let needsRender = false;

            if (typeof data.title === 'string') {
              if (currentBgm !== data.title) {
                console.log('[KCO-Logic] Updating BGM from', currentBgm, 'to', data.title);
                currentBgm = data.title;
                needsRender = true;
              }
            }

            if (data.senka !== undefined) {
              const newSenka = String(data.senka);
              if (currentSenka !== newSenka) {
                console.log('[KCO-Logic] Updating Senka from', currentSenka, 'to', newSenka);
                currentSenka = newSenka;
                needsRender = true;
              }
            }

            if (needsRender) {
              renderInfoDisplay();
            } else {
              console.log('[KCO-Logic] Data unchanged, skipping render');
            }
          }
        } catch (e) {
          console.error('[KCO-Logic] JSON Parse Error:', e);
        }
      });

      eventSource.onerror = (err) => {
        console.warn('[KCO-Logic] SSE Error (will retry):', err);
        // 5秒後に再接続
        setTimeout(() => {
          console.log('[KCO-Logic] Reconnecting SSE...');
          connectSSE();
        }, 5000);
      };
    };

    connectSSE();
  };
  setupBgmSSE();

}

function handleTagClick(index) {
  let targetStr = currentCustomList;
  if (!targetStr) return;

  let items = [];
  try { items = targetStr.split(/(?<!\\)[,，]/); } catch (e) { items = targetStr.split(','); }

  if (index >= 0 && index < items.length) {
    const rawTag = items[index].trim();

    // Parse syntax: Name:+Value or Name:-Value or Name:+Value/Limit
    const match = rawTag.match(/^(.+?):([+-]?)(\d+)(?:\/(\d+))?/);

    if (match) {
      // Counter behavior
      const name = match[1];
      const sign = match[2];
      let val = parseInt(match[3], 10);
      const limitStr = match[4];

      if (sign === '+') {
        // Count Up
        val++;
        // Check Limit (if exists)
        if (limitStr !== undefined) {
          const max = parseInt(limitStr, 10);
          if (val >= max) {
            // Reached Limit -> Remove
            items.splice(index, 1);
            saveAndReflect(items);
            return;
          }
        }
      } else if (sign === '-') {
        // Count Down
        val--;
        // Check Limit (Default 0 if not specified)
        const min = (limitStr !== undefined) ? parseInt(limitStr, 10) : 0;
        if (val <= min) {
          // Reached Limit -> Remove
          items.splice(index, 1);
          saveAndReflect(items);
          return;
        }
      }

      // Reconstruct tag
      let newTag = `${name}:${sign}${val}`;
      if (limitStr !== undefined) {
        newTag += `/${limitStr}`;
      }
      items[index] = newTag;

    } else {
      // Default behavior: Remove
      items.splice(index, 1);
    }

    saveAndReflect(items);
  }
}

function saveAndReflect(items) {
  const cleanedItems = items.map(s => s.trim()).filter(s => s.length > 0);
  const newStr = cleanedItems.join(', ');

  currentCustomList = newStr;
  renderInfoDisplay();
  saveLocalData();

  chrome.storage.local.get(['kcOverlaySettings'], (result) => {
    const settings = result.kcOverlaySettings || {};
    settings.customList = currentCustomList;
    chrome.storage.local.set({ kcOverlaySettings: settings });
  });
}

function saveLocalData() {
  const data = {
    isEvent: currentIsEvent,
    major: currentMapMajor,
    minor: currentMapMinor,
    diff: currentDifficulty,
    status: currentStatus,
    customTitle: currentCustomTitle,
    customList: currentCustomList
  };
  localStorage.setItem('kc_map_settings', JSON.stringify(data));
}

function restoreLocalData() {
  const json = localStorage.getItem('kc_map_settings');
  if (json) {
    try {
      const d = JSON.parse(json);
      currentIsEvent = d.isEvent;
      currentMapMajor = d.major || "";
      currentMapMinor = d.minor || "";
      currentDifficulty = d.diff || "none";
      currentStatus = d.status || "none";

      currentCustomTitle = d.customTitle || d.manualTitle || "";
      currentCustomList = d.customList || d.manualText || "";

      document.getElementById('kc-chk-event').checked = currentIsEvent;
      document.getElementById('kc-map-major').value = currentMapMajor;
      document.getElementById('kc-map-minor').value = currentMapMinor;

      const setBtnActive = (grpId, val) => {
        const grp = document.getElementById(grpId);
        if (!grp) return;
        const btns = grp.querySelectorAll('button');
        btns.forEach(b => {
          if (b.dataset.val === val) b.classList.add('active');
          else b.classList.remove('active');
        });
      };
      setBtnActive('kc-grp-diff', currentDifficulty);
      setBtnActive('kc-grp-status', currentStatus);

      renderInfoDisplay();
    } catch (e) { }
  }
}

function saveWindowLayout() {
  const layout = {};
  ['kc-win-timer', 'kc-win-area', 'kc-win-control'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // 位置を保存
      layout[id] = {
        top: el.style.top,
        left: el.style.left
      };
      // 情報パネル・タイマーのみサイズも保存
      if (id === 'kc-win-area') {
        layout[id].width = el.style.width;
      }
      if (id === 'kc-win-timer') {
        layout[id].width = el.style.width;
        layout[id].height = el.style.height;
        // フォントサイズも保存 (inline styleにある場合)
        layout[id].fontSize = el.style.getPropertyValue('--kc-font-size');
      }
    }
  });
  localStorage.setItem('kc_window_layout', JSON.stringify(layout));
}

function restoreWindowLayout() {
  const json = localStorage.getItem('kc_window_layout');
  if (json) {
    try {
      const layout = JSON.parse(json);
      Object.keys(layout).forEach(id => {
        const el = document.getElementById(id);
        if (el && layout[id]) {
          // 位置を復元
          if (layout[id].top) el.style.top = layout[id].top;
          if (layout[id].left) el.style.left = layout[id].left;
          // 情報パネルのみ横幅も復元
          if (id === 'kc-win-area' && layout[id].width) {
            el.style.width = layout[id].width;
          }
          // タイマーパネルのサイズ・フォントサイズ復元
          if (id === 'kc-win-timer') {
            if (layout[id].width) el.style.width = layout[id].width;
            if (layout[id].height) el.style.height = layout[id].height;
            if (layout[id].fontSize) el.style.setProperty('--kc-font-size', layout[id].fontSize);
          }
        }
      });
    } catch (e) {
      console.error("Layout restore failed", e);
    }
  }
}

function applyStyles(s) {
  const root = document.documentElement;
  root.style.setProperty('--kc-scale', s.scale);
  root.style.setProperty('--kc-font-size', s.fontSize + 'px');
  // textColor removed
  root.style.setProperty('--kc-blur', s.blur + 'px');
  root.style.setProperty('--kc-shadow-size', s.shadowSize + 'px');

  if (s.scrollSpeed !== undefined) {
    currentScrollSpeed = s.scrollSpeed;
  }


  const bgRgba = hexToRgba(s.bgColor, s.bgOpacity);
  const shadowRgba = hexToRgba(s.shadowColor || "#000000", (s.shadowOpacity !== undefined ? s.shadowOpacity : 0.5));
  root.style.setProperty('--kc-bg-rgba', bgRgba);
  root.style.setProperty('--kc-shadow-rgba', shadowRgba);

  currentTimerMode = s.timerMode || 'always';
  currentTimerNotify = (s.timerNotify === true);

  updateTimerVisibility();
  updateWindowStatus('kc-win-timer', true, s.timerFrame);
  updateWindowStatus('kc-win-area', s.areaVisible, s.areaFrame);
  updateWindowStatus('kc-win-control', s.controlVisible, true);

  // レイアウト更新
  if (typeof updateLayout === 'function') {
    updateLayout(s.layoutConfig);
  }

  if (s.freeText !== undefined) currentFreeText = s.freeText;
  if (s.freeTextScroll !== undefined) currentFreeTextScroll = s.freeTextScroll;
  if (s.freeTextScrollMode !== undefined) currentFreeTextScrollMode = s.freeTextScrollMode;


  if (s.customTitle !== undefined) currentCustomTitle = s.customTitle;
  if (s.customList !== undefined) currentCustomList = s.customList;
  if (s.bgmHeader !== undefined) currentBgmHeader = s.bgmHeader;
  if (s.bgmScrollMode !== undefined) currentBgmScrollMode = s.bgmScrollMode;

  if (s.timerPresets && Array.isArray(s.timerPresets)) {
    currentTimerPresets = s.timerPresets;
  } else {
    // Only use defaults if completely missing (e.g. old settings)
    currentTimerPresets = [10, 20, 30, null];
  }
  renderTimerPresets();

  renderInfoDisplay();
}

function loadSettings() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['kcOverlaySettings', 'infoLayoutConfig'], (result) => {
      // デフォルト設定をベースコピー
      let settings = (typeof DEFAULT_SETTINGS !== 'undefined') ? JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) : {};

      // 保存された設定があればマージ（欠損プロパティ対策）
      if (result.kcOverlaySettings) {
        // ネストされたオブジェクト(layoutConfig等)は単純なassignだと消える可能性があるので注意が必要だが、
        // 現状の設定構造はフラットに近い。ただし layoutConfig はオブジェクト。
        // ここでは簡易的に Object.assign するが、layoutConfig は別途処理するのでOK。
        // timerPresets配列なども上書きされる。
        Object.assign(settings, result.kcOverlaySettings);
      }

      const layoutConfig = result.infoLayoutConfig;

      // 取得したレイアウト設定を統合（優先度高）
      if (layoutConfig) {
        settings.layoutConfig = layoutConfig;
      }

      // レイアウト設定が欠落している場合のフォールバック
      if (!settings.layoutConfig) {
        if (typeof DEFAULT_SETTINGS !== 'undefined' && DEFAULT_SETTINGS.layoutConfig) {
          settings.layoutConfig = DEFAULT_SETTINGS.layoutConfig;
        } else {
          settings.layoutConfig = { version: 2, rows: [] };
        }
      }

      // レガシーまたは不正なレイアウト設定を検知して自動削除・修復
      let isInvalidLayout = false;
      const lc = settings.layoutConfig;

      if (!lc || typeof lc !== 'object') {
        isInvalidLayout = true;
      } else if (lc.version !== 2 || !Array.isArray(lc.rows)) {
        isInvalidLayout = true;
      }

      let needsSave = false;
      if (isInvalidLayout) {
        console.log("Invalid or legacy layout config detected. Resetting to default.");
        if (typeof DEFAULT_SETTINGS !== 'undefined' && DEFAULT_SETTINGS.layoutConfig) {
          settings.layoutConfig = DEFAULT_SETTINGS.layoutConfig;
        } else {
          settings.layoutConfig = { version: 2, rows: [] };
        }
        // メモリ上の修復。保存は次回。
        chrome.storage.local.set({ infoLayoutConfig: settings.layoutConfig });
      }

      applyStyles(settings);
    });
  } else {
    // defaultStyle という変数は存在しない可能性が高いため DEFAULT_SETTINGS を使う
    const def = (typeof DEFAULT_SETTINGS !== 'undefined') ? DEFAULT_SETTINGS : {};
    applyStyles(def);
  }
}