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

    function resetDisplay() {
      status.style.display = 'none';
      countdown.textContent = '00:00';
      endDisplay.textContent = '--:--';
      timerWindow.classList.remove('kc-timer-complete');
    }

    startTimerFunc = (minutes) => {
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      clearInterval(timerInterval);
      timerWindow.classList.remove('kc-timer-complete');
      isTimerRunning = true;
      updateTimerVisibility();

      const endTime = new Date(Date.now() + minutes * 60000);
      const hours = endTime.getHours().toString().padStart(2, '0');
      const mins = endTime.getMinutes().toString().padStart(2, '0');
      status.style.display = 'block';
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
          endDisplay.textContent = '回復完了';
          timerWindow.classList.add('kc-timer-complete');
          return;
        }

        const minutesPart = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
        const secondsPart = (remainingSeconds % 60).toString().padStart(2, '0');
        countdown.replaceChildren();
        const prefix = document.createElement('span');
        prefix.className = 'kc-timer-prefix';
        prefix.textContent = '終了まで';
        countdown.append(prefix, `${minutesPart}:${secondsPart}`);
      };

      tick();
      timerInterval = setInterval(tick, 250);
    };

    stopTimerFunc = () => {
      clearInterval(timerInterval);
      timerInterval = null;
      isTimerRunning = false;
      updateTimerVisibility();
      resetDisplay();
    };

    document.getElementById('kc-btn-manual-set').onclick = () => {
      startTimerFunc(Number.parseInt(manualInput.value, 10));
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
      if (minutes > 0) startTimerFunc(minutes);
    };
  }

  global.KcTimer = Object.freeze({ calculateRecoveryMinutes, setup });
})(globalThis);
