// kcTimer.js
// タイマーの計算とDOMイベントを管理する。

(function initializeTimer(global) {
  function calculateRecoveryMinutes(current, target, options = {}) {
    if (!Number.isFinite(current) || !Number.isFinite(target) || target <= current) return 0;

    const portSupplyOn = options.portSupplyOn === true;
    const interval = Number(options.interval) || 15;
    const amount = Number(options.amount) || 2;
    let minutes = 0;
    let value = current;

    while (value < target && minutes < 60) {
      minutes += 3;
      if (value < 49) value = Math.min(value + 3, 49);
      if (portSupplyOn && minutes % interval === 0) {
        value = Math.min(value + amount, 54);
      }
    }
    return value >= target ? minutes : 0;
  }

  function setup({ manualInput, currentInput, targetInput }) {
    const countdown = document.getElementById('kc-disp-countdown');
    const endDisplay = document.getElementById('kc-disp-end');
    const status = document.getElementById('kc-disp-status');
    const timerWindow = document.getElementById('kc-win-timer');

    let cachedCloudTimers = [];

    async function cloudRequest(path, options = {}) {
      if (!currentCloudNotifyEnabled) return { ok: false, error: 'クラウド連携が無効' };
      if (!currentCloudNotifyUrl) return { ok: false, error: 'URL未設定' };

      const cleanUrl = currentCloudNotifyUrl.trim().replace(/\/+$/, '');
      const url = `${cleanUrl}${path}`;
      const headers = { 'Content-Type': 'application/json' };
      if (currentCloudNotifyToken) {
        headers['Authorization'] = `Bearer ${currentCloudNotifyToken.trim()}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const fetchOptions = {
          method: options.method || 'GET',
          headers: { ...headers, ...options.headers },
          signal: controller.signal
        };
        if (options.body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
          fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        const res = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        if (!res.ok) {
          if (res.status === 401) {
            return { ok: false, status: 401, error: '認証エラー (HTTP 401: トークン確認)' };
          }
          if (res.status === 404) {
            return { ok: false, status: 404, error: '未検出 (HTTP 404: URL確認)' };
          }
          return { ok: false, status: res.status, error: `HTTP ${res.status} (${res.statusText || 'エラー'})` };
        }
        const data = await res.json();
        return { ok: true, data };
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          return { ok: false, error: 'タイムアウト (6秒)' };
        }
        return { ok: false, error: `通信エラー (${err.message || '接続失敗'})` };
      }
    }

    let cloudMenuInterval = null;

    function stopCloudMenuTimer() {
      if (cloudMenuInterval) {
        clearInterval(cloudMenuInterval);
        cloudMenuInterval = null;
      }
    }

    function updateCloudMenuTimes() {
      if (!menuList) return;
      const items = menuList.querySelectorAll('.kc-cloud-menu-item');
      items.forEach(btn => {
        if (btn._timerData) {
          const label = getTimerLabel(btn._timerData);
          btn.textContent = label;
          btn.title = label;
        }
      });
    }

    function getTimerLabel(t) {
      const targetTime = Number.isSafeInteger(t.notifyAt) ? t.notifyAt : t.endAt;
      const remainingSec = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));

      const endD = new Date(targetTime);
      const hours = endD.getHours().toString().padStart(2, '0');
      const mins = endD.getMinutes().toString().padStart(2, '0');
      const endTimeStr = `${hours}:${mins}`;

      let remainingStr = '';
      if (remainingSec >= 3600) {
        const h = Math.floor(remainingSec / 3600);
        const m = Math.floor((remainingSec % 3600) / 60);
        remainingStr = `残り${h}時間${m}分`;
      } else {
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        remainingStr = `残り${m}分${s}秒`;
      }

      let kindPrefix = '[他]';
      let nameStr = t.name || 'タイマー';
      if (t.kind === 'expedition') {
        kindPrefix = '[遠征]';
        nameStr = t.name || ('第' + (t.slot || '') + '艦隊');
      } else if (t.kind === 'repair') {
        kindPrefix = '[入渠]';
        nameStr = t.name || ('第' + (t.slot || '') + 'ドック');
      } else if (t.kind === 'akashi') {
        kindPrefix = '[泊地]';
        nameStr = t.name || '泊地修理';
      } else if (t.kind === 'build') {
        kindPrefix = '[建造]';
        nameStr = t.name || '建造';
      } else if (t.kind === 'fatigue') {
        kindPrefix = '[疲労]';
        nameStr = t.name || '疲労回復';
      } else if (t.kind === 'manual') {
        kindPrefix = '[指定]';
        nameStr = t.name || 'タイマー';
      }

      return `${kindPrefix} ${nameStr} ${endTimeStr} (${remainingStr})`;
    }

    function getTimerTitle(t) {
      if (t.kind === 'expedition') return t.name ? `遠征: ${t.name}` : '遠征中';
      if (t.kind === 'repair') return t.name ? `入渠: ${t.name}` : '入渠中';
      if (t.kind === 'akashi') return '泊地修理中';
      if (t.kind === 'build') return '建造中';
      if (t.kind === 'fatigue') return '疲労回復中';
      return t.name || '疲労抜き中';
    }

    const cloudBtn = document.getElementById('kc-btn-cloud');
    const cloudMenu = document.getElementById('kc-cloud-menu');
    const menuStatus = document.getElementById('kc-cloud-menu-status');
    const menuList = document.getElementById('kc-cloud-menu-list');

    function closeCloudMenu() {
      stopCloudMenuTimer();
      if (cloudMenu) cloudMenu.style.display = 'none';
    }

    function updateCloudBtnState() {
      if (cloudBtn) {
        cloudBtn.classList.toggle('active', !!currentSelectedCloudTimer);
      }
    }

    async function handleCloudBtnClick(e) {
      e.stopPropagation();
      if (!cloudMenu || !cloudBtn) return;

      if (cloudMenu.style.display === 'block') {
        closeCloudMenu();
        return;
      }

      stopCloudMenuTimer();
      cloudMenu.style.display = 'block';
      if (menuStatus) {
        menuStatus.style.display = 'block';
        menuStatus.textContent = '取得中...';
      }
      if (menuList) menuList.replaceChildren();
      cloudBtn.classList.add('loading');

      try {
        const result = await cloudRequest('/api/status');
        cloudBtn.classList.remove('loading');

        if (!result.ok) {
          if (menuStatus) menuStatus.textContent = result.error || '取得失敗';
          return;
        }

        const data = result.data;
        if (!data || !Array.isArray(data.timers)) {
          if (menuStatus) menuStatus.textContent = 'データ形式不正';
          return;
        }

        const now = Date.now();
        cachedCloudTimers = data.timers.filter(t => {
          const target = Number.isSafeInteger(t.notifyAt) ? t.notifyAt : t.endAt;
          return t.state === 'active' && Number.isSafeInteger(target) && target > now;
        });
        cachedCloudTimers.sort((a, b) => {
          const targetA = Number.isSafeInteger(a.notifyAt) ? a.notifyAt : a.endAt;
          const targetB = Number.isSafeInteger(b.notifyAt) ? b.notifyAt : b.endAt;
          return targetA - targetB;
        });

        if (cachedCloudTimers.length === 0) {
          if (menuStatus) menuStatus.textContent = 'タイマーなし';
          return;
        }

        if (menuStatus) menuStatus.style.display = 'none';
        if (menuList) {
          menuList.replaceChildren();
          cachedCloudTimers.forEach(t => {
            const itemBtn = document.createElement('button');
            itemBtn.type = 'button';
            itemBtn.className = 'kc-cloud-menu-item';
            itemBtn._timerData = t;
            if (currentSelectedCloudTimer && currentSelectedCloudTimer.id === t.id) {
              itemBtn.classList.add('active');
            }
            const label = getTimerLabel(t);
            itemBtn.textContent = label;
            itemBtn.title = label;

            itemBtn.onclick = (ev) => {
              ev.stopPropagation();
              currentSelectedCloudTimer = t;
              if (t.kind === 'manual' && !t.requestId && t.id.startsWith('manual:')) {
                currentSelectedCloudTimer.requestId = t.id.replace('manual:', '');
              }
              const targetTime = Number.isSafeInteger(t.notifyAt) ? t.notifyAt : t.endAt;
              const endTime = new Date(targetTime);
              const title = getTimerTitle(t);
              const completeMsg = t.kind === 'fatigue' || t.kind === 'manual' ? '回復完了' : '完了';
              startTimerWithEndTime(endTime, title, completeMsg);
              updateCloudBtnState();
              closeCloudMenu();
            };

            menuList.appendChild(itemBtn);
          });

          stopCloudMenuTimer();
          cloudMenuInterval = setInterval(updateCloudMenuTimes, 1000);
        }
      } catch (err) {
        console.warn('[KCO-Cloud] Menu fetch error:', err);
        cloudBtn.classList.remove('loading');
        if (menuStatus) menuStatus.textContent = `例外エラー (${err.message || '不明'})`;
      }
    }


    function updateCloudTimerUI() {
      const wrap = document.getElementById('kc-cloud-wrap');
      if (!wrap) return;
      if (currentCloudNotifyEnabled && currentCloudNotifyUrl) {
        wrap.style.display = 'inline-flex';
      } else {
        wrap.style.display = 'none';
        closeCloudMenu();
      }
    }
    global.updateCloudTimerUI = updateCloudTimerUI;

    function resetDisplay() {
      status.style.display = 'none';
      countdown.textContent = '00:00';
      endDisplay.textContent = '--:--';
      timerWindow.classList.remove('kc-timer-complete');
    }

    function startTimerWithEndTime(endTime, labelText = '疲労抜き中', completeText = '回復完了') {
      clearInterval(timerInterval);
      timerWindow.classList.remove('kc-timer-complete');
      isTimerRunning = true;
      updateTimerVisibility();

      const hours = endTime.getHours().toString().padStart(2, '0');
      const mins = endTime.getMinutes().toString().padStart(2, '0');
      status.style.display = 'block';
      status.textContent = labelText;
      endDisplay.textContent = `終了時刻は ${hours}:${mins}`;

      const tick = () => {
        const remainingSeconds = Math.ceil((endTime - new Date()) / 1000);
        if (remainingSeconds <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          if (currentTimerNotify) chrome.runtime.sendMessage({ type: 'NOTIFY_TIMER_END' });
          isTimerRunning = false;
          updateTimerVisibility();
          status.style.display = 'none';
          countdown.textContent = '00:00';
          endDisplay.textContent = completeText;
          timerWindow.classList.add('kc-timer-complete');
          currentSelectedCloudTimer = null;
          updateCloudBtnState();
          return;
        }

        const totalMinutes = Math.floor(remainingSeconds / 60);
        const secondsPart = (remainingSeconds % 60).toString().padStart(2, '0');
        let timeFormatted = '';
        if (totalMinutes >= 60) {
          const hoursPart = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
          const minutesPart = (totalMinutes % 60).toString().padStart(2, '0');
          timeFormatted = `${hoursPart}:${minutesPart}:${secondsPart}`;
        } else {
          const minutesPart = totalMinutes.toString().padStart(2, '0');
          timeFormatted = `${minutesPart}:${secondsPart}`;
        }

        countdown.replaceChildren();
        const prefix = document.createElement('span');
        prefix.className = 'kc-timer-prefix';
        prefix.textContent = '終了まで';
        countdown.append(prefix, timeFormatted);
      };

      tick();
      timerInterval = setInterval(tick, 250);
    }

    startTimerFunc = (minutes, label = '疲労回復') => {
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      const endAt = Date.now() + minutes * 60000;
      const endTime = new Date(endAt);

      startTimerWithEndTime(endTime, label, '回復完了');

      // 同時に Cloudflare に終了時間を送信
      if (currentCloudNotifyEnabled && currentCloudNotifyUrl) {
        const requestId = 'overlay-' + Date.now();
        currentSelectedCloudTimer = {
          id: 'manual:' + requestId,
          requestId,
          kind: 'manual',
          name: label,
          endAt
        };
        cloudRequest('/api/manual', {
          method: 'POST',
          body: JSON.stringify({ requestId, name: label, endAt })
        });
        updateCloudBtnState();
      } else {
        currentSelectedCloudTimer = null;
        updateCloudBtnState();
      }
    };

    stopTimerFunc = () => {
      clearInterval(timerInterval);
      timerInterval = null;
      isTimerRunning = false;
      updateTimerVisibility();
      resetDisplay();

      // 停止時の分岐: 手動タイマーなら Cloudflare も削除、遠征・入渠ならローカル表示解除のみ
      if (currentSelectedCloudTimer) {
        if (currentSelectedCloudTimer.kind === 'manual' && currentSelectedCloudTimer.requestId) {
          cloudRequest('/api/manual/' + currentSelectedCloudTimer.requestId, { method: 'DELETE' });
        }
        currentSelectedCloudTimer = null;
      }

      updateCloudBtnState();
      closeCloudMenu();
    };

    document.getElementById('kc-btn-manual-set').onclick = () => {
      startTimerFunc(Number.parseInt(manualInput.value, 10), '指定タイマー');
    };
    document.getElementById('kc-btn-stop').onclick = () => stopTimerFunc();
    document.getElementById('kc-btn-cond-set').onclick = () => {
      const current = Number.parseInt(currentInput.value, 10);
      const target = Number.parseInt(targetInput.value, 10);
      const minutes = calculateRecoveryMinutes(current, target, {
        portSupplyOn: currentPortSupplyOn,
        interval: currentPortSupplyInterval,
        amount: currentPortSupplyAmount
      });
      if (minutes > 0) startTimerFunc(minutes, '疲労回復');
    };

    if (cloudBtn) {
      cloudBtn.onclick = handleCloudBtnClick;
    }

    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('kc-cloud-wrap');
      if (wrap && !wrap.contains(e.target)) {
        closeCloudMenu();
      }
    });

    // 初回初期化
    updateCloudTimerUI();
  }

  global.KcTimer = Object.freeze({ calculateRecoveryMinutes, setup });
})(globalThis);
