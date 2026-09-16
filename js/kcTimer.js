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
      if (!currentCloudNotifyEnabled || !currentCloudNotifyUrl) return null;
      const url = `${currentCloudNotifyUrl}${path}`;
      const headers = { 'Content-Type': 'application/json' };
      if (currentCloudNotifyToken) {
        headers['Authorization'] = `Bearer ${currentCloudNotifyToken}`;
      }
      try {
        const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
        if (!res.ok) {
          console.warn('[KCO-Cloud] HTTP Error:', res.status, res.statusText);
          return null;
        }
        return await res.json();
      } catch (err) {
        console.warn('[KCO-Cloud] Request failed:', err);
        return null;
      }
    }

    function getTimerLabel(t) {
      const remainingSec = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
      const m = Math.floor(remainingSec / 60);
      const s = (remainingSec % 60).toString().padStart(2, '0');
      const timeStr = m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}:${s}`;

      if (t.kind === 'expedition') return `[遠征] ${t.name || '第' + (t.slot || '') + '艦隊'} (${timeStr})`;
      if (t.kind === 'repair') return `[入渠] ${t.name || '第' + (t.slot || '') + 'ドック'} (${timeStr})`;
      if (t.kind === 'akashi') return `[泊地] ${t.name || '泊地修理'} (${timeStr})`;
      if (t.kind === 'build') return `[建造] ${t.name || '建造'} (${timeStr})`;
      if (t.kind === 'fatigue') return `[疲労] ${t.name || '疲労回復'} (${timeStr})`;
      if (t.kind === 'manual') return `[手動] ${t.name || 'タイマー'} (${timeStr})`;
      return `[他] ${t.name || 'タイマー'} (${timeStr})`;
    }

    function getTimerTitle(t) {
      if (t.kind === 'expedition') return t.name ? `遠征: ${t.name}` : '遠征中';
      if (t.kind === 'repair') return t.name ? `入渠: ${t.name}` : '入渠中';
      if (t.kind === 'akashi') return '泊地修理中';
      if (t.kind === 'build') return '建造中';
      if (t.kind === 'fatigue') return '疲労回復中';
      return t.name || '疲労抜き中';
    }

    async function fetchCloudTimers(selectRequestId = null) {
      if (!currentCloudNotifyEnabled || !currentCloudNotifyUrl) return;
      const badge = document.getElementById('kc-cloud-icon-badge');
      if (badge) badge.classList.add('loading');

      try {
        const data = await cloudRequest('/api/status');
        if (!data || !Array.isArray(data.timers)) return;

        const now = Date.now();
        cachedCloudTimers = data.timers.filter(t => t.state === 'active' && Number.isSafeInteger(t.endAt) && t.endAt > now);
        cachedCloudTimers.sort((a, b) => a.endAt - b.endAt);

        const select = document.getElementById('kc-select-cloud-timer');
        if (!select) return;

        const previousValue = select.value;
        select.replaceChildren();

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '(ローカル / 解除)';
        select.appendChild(defaultOpt);

        cachedCloudTimers.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = getTimerLabel(t);
          select.appendChild(opt);
        });

        if (selectRequestId) {
          const targetId = 'manual:' + selectRequestId;
          const found = cachedCloudTimers.find(t => t.id === targetId);
          if (found) {
            select.value = targetId;
          }
        } else if (previousValue && cachedCloudTimers.some(t => t.id === previousValue)) {
          select.value = previousValue;
        }

        if (badge) badge.classList.toggle('active', !!currentSelectedCloudTimer || !!select.value);
      } finally {
        if (badge) badge.classList.remove('loading');
      }
    }

    function updateCloudTimerUI() {
      const wrap = document.getElementById('kc-cloud-select-wrap');
      if (!wrap) return;
      if (currentCloudNotifyEnabled && currentCloudNotifyUrl) {
        wrap.style.display = 'inline-flex';
        fetchCloudTimers();
      } else {
        wrap.style.display = 'none';
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
          const select = document.getElementById('kc-select-cloud-timer');
          if (select) select.value = '';
          const badge = document.getElementById('kc-cloud-icon-badge');
          if (badge) badge.classList.remove('active');
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
        }).then(() => {
          fetchCloudTimers(requestId);
        });
      } else {
        currentSelectedCloudTimer = null;
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
          cloudRequest('/api/manual/' + currentSelectedCloudTimer.requestId, { method: 'DELETE' }).then(() => {
            fetchCloudTimers();
          });
        }
        currentSelectedCloudTimer = null;
      }

      const select = document.getElementById('kc-select-cloud-timer');
      if (select) select.value = '';
      const badge = document.getElementById('kc-cloud-icon-badge');
      if (badge) badge.classList.remove('active');
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

    const cloudSelect = document.getElementById('kc-select-cloud-timer');
    if (cloudSelect) {
      // 押した（クリック/タップした）瞬間に Cloudflare から最新一覧をリクエスト
      const requestCloudTimersOnInteraction = () => {
        fetchCloudTimers();
      };
      cloudSelect.onmousedown = requestCloudTimersOnInteraction;
      cloudSelect.ontouchstart = requestCloudTimersOnInteraction;
      cloudSelect.onfocus = () => {
        if (!cachedCloudTimers.length) fetchCloudTimers();
      };

      cloudSelect.onchange = () => {
        const badge = document.getElementById('kc-cloud-icon-badge');
        const selectedId = cloudSelect.value;
        if (!selectedId) {
          // ローカルに戻す（表示解除）
          clearInterval(timerInterval);
          timerInterval = null;
          isTimerRunning = false;
          updateTimerVisibility();
          resetDisplay();
          currentSelectedCloudTimer = null;
          if (badge) badge.classList.remove('active');
          return;
        }

        const timer = cachedCloudTimers.find(t => t.id === selectedId);
        if (timer) {
          currentSelectedCloudTimer = timer;
          if (timer.kind === 'manual' && !timer.requestId && timer.id.startsWith('manual:')) {
            currentSelectedCloudTimer.requestId = timer.id.replace('manual:', '');
          }
          const endTime = new Date(timer.endAt);
          const title = getTimerTitle(timer);
          const completeMsg = timer.kind === 'fatigue' || timer.kind === 'manual' ? '回復完了' : '完了';
          startTimerWithEndTime(endTime, title, completeMsg);
          if (badge) badge.classList.add('active');
        }
      };
    }

    // 初回初期化
    updateCloudTimerUI();
  }

  global.KcTimer = Object.freeze({ calculateRecoveryMinutes, setup });
})(globalThis);
