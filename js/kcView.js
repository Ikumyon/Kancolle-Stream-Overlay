// kcView.js
// DOM生成・描画処理

// -----------------------------------------------------
// パネル作成
// -----------------------------------------------------
function createTimerWindow() {
  const div = document.createElement('div');
  div.id = 'kc-win-timer';
  div.className = 'kc-display-window';
  div.innerHTML = `
    <div class="kc-header-transparent" id="kc-drag-timer"><span>:::タイマー:::</span></div>
    <div class="kc-timer-content" id="kc-timer-content">
      <div class="kc-timer-status" id="kc-disp-status">疲労抜き中</div>
      <div class="kc-timer-stack" id="kc-timer-stack">
        <div class="kc-end-time" id="kc-disp-end">--:--</div>
        <div class="kc-timer-val" id="kc-disp-countdown">00:00</div>
      </div>
    </div>
    <div class="kc-resize-handle-se" id="kc-resize-handle-timer"></div>
  `;
  document.body.appendChild(div);
  setupDrag(div, document.getElementById('kc-drag-timer'));

  if (typeof setupTimerResize === 'function') {
    setupTimerResize(div, document.getElementById('kc-resize-handle-timer'));
  }

  return div;
}

function createAreaWindow() {
  const div = document.createElement('div');
  div.id = 'kc-win-area';
  div.className = 'kc-display-window';
  div.innerHTML = `
    <div class="kc-region-body">
      <div class="kc-header-transparent" id="kc-drag-area"><span>:::情報:::</span></div>
      <div class="kc-area-content" id="kc-area-content"></div>
    </div>
    <div class="kc-resize-handle" id="kc-resize-handle-area"></div>
  `;
  document.body.appendChild(div);
  setupDrag(div, document.getElementById('kc-drag-area'));
  if (typeof setupResize === 'function') {
    setupResize(div, document.getElementById('kc-resize-handle-area'));
  }
  return div;
}

// -----------------------------------------------------
// コントロールパネル作成・その他
// -----------------------------------------------------
function createControlWindow() {
  const div = document.createElement('div');
  div.id = 'kc-win-control';
  div.innerHTML = `
    <div class="kc-ctrl-header" id="kc-drag-ctrl">
      <span>:::コントロールパネル:::</span>
    </div>
    <div class="kc-ctrl-body kc-ctrl-body-start">
      <div class="kc-section kc-section-timer">
        <div class="kc-label-side">タイマー設定</div>
        <div class="kc-content-side">
          <div class="kc-input-row">
             <input type="text" class="kc-input kc-numpad-trigger kc-timer-input-manual" id="kc-timer-manual" placeholder="分">
             <button class="kc-btn kc-timer-btn" id="kc-btn-manual-set">設定</button>
             <button class="kc-btn kc-btn-red kc-timer-btn-stop" id="kc-btn-stop">停止</button>
          </div>
          <div class="kc-btn-row" id="kc-timer-presets-row"></div>
          <div class="kc-cond-row">
            <label class="kc-check-label kc-cond-port-supply">
              給<input type="checkbox" id="kc-chk-port-supply">
            </label>
            <span class="kc-mini-label kc-label-cond">疲労度</span>
            <input type="text" id="kc-cond-curr" class="kc-input-short kc-numpad-trigger kc-input-cond" placeholder="現在">
            <span class="kc-arrow-cond">→</span>
            <input type="text" id="kc-cond-tgt" class="kc-input-short kc-numpad-trigger kc-input-cond" placeholder="目標" value="49">
            <button class="kc-btn kc-btn-cond-set" id="kc-btn-cond-set">設定</button>
          </div>
        </div>
      </div>
      <div class="kc-section kc-section-map">
        <div class="kc-label-side">海域情報設定</div>
        <div class="kc-content-side">
        <div class="kc-setting-row kc-mb-1">
            <label class="kc-check-label"><input type="checkbox" id="kc-chk-event"> 限定(E)</label>
            <input type="text" id="kc-map-major" class="kc-input-short kc-numpad-trigger" placeholder="1">
            <span class="kc-text-gray">-</span>
            <input type="text" id="kc-map-minor" class="kc-input-short kc-numpad-trigger" placeholder="1">
          </div>
          <div class="kc-setting-row kc-mb-1">
            <span class="kc-mini-label kc-label-map">難易度</span>
            <div class="kc-btn-group" id="kc-grp-diff">
              <button class="kc-btn-s" data-val="kou">甲</button>
              <button class="kc-btn-s" data-val="otsu">乙</button>
              <button class="kc-btn-s" data-val="hei">丙</button>
              <button class="kc-btn-s" data-val="tei">丁</button>
              <button class="kc-btn-s active" data-val="none">なし</button>
            </div>
          </div>
          <div class="kc-setting-row kc-mb-1">
            <span class="kc-mini-label kc-label-map">状態</span>
            <div class="kc-btn-group" id="kc-grp-status">
              <button class="kc-btn-s" data-val="gimmick">ギ</button>
              <button class="kc-btn-s" data-val="chip">削</button>
              <button class="kc-btn-s" data-val="last">ラ</button>
              <button class="kc-btn-s" data-val="farm">掘</button>
              <button class="kc-btn-s active" data-val="none">なし</button>
            </div>
          </div>
        </div>
        <div id="kc-numpad" class="kc-numpad">
          <div class="kc-numpad-row">
            <button class="kc-num-btn">7</button>
            <button class="kc-num-btn">8</button>
            <button class="kc-num-btn">9</button>
          </div>
          <div class="kc-numpad-row">
            <button class="kc-num-btn">4</button>
            <button class="kc-num-btn">5</button>
            <button class="kc-num-btn">6</button>
          </div>
          <div class="kc-numpad-row">
            <button class="kc-num-btn">1</button>
            <button class="kc-num-btn">2</button>
            <button class="kc-num-btn">3</button>
          </div>
          <div class="kc-numpad-row-bottom">
            <button class="kc-num-btn">0</button>
            <button class="kc-icon-btn" id="kc-num-bs" title="消去">⌫</button>
            <button class="kc-icon-btn" id="kc-num-close" title="閉じる">▼</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  setupDrag(div, document.getElementById('kc-drag-ctrl'));

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  renderTimerPresets();
  return div;
}

function updateTimerVisibility() {
  const el = document.getElementById('kc-win-timer');
  if (!el) return;

  if (currentTimerMode === 'auto') {
    el.style.display = isTimerRunning ? 'block' : 'none';
  } else {
    el.style.display = 'block';
  }
}

function renderTimerPresets() {
  const container = document.getElementById('kc-timer-presets-row');
  if (!container) return;
  container.replaceChildren();
  const validPresets = currentTimerPresets.filter(p => p !== null && !isNaN(p));

  validPresets.forEach(min => {
    const btn = document.createElement('button');
    btn.className = 'kc-btn';
    btn.textContent = min;
    btn.onclick = () => { if (startTimerFunc) startTimerFunc(min); };
    container.appendChild(btn);
  });
}

function updateWindowStatus(elementId, isVisible, hasFrame) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (elementId !== 'kc-win-timer') {
    el.style.display = (isVisible === false) ? 'none' : 'block';
  }
  if (hasFrame === false) el.classList.add('kc-no-frame');
  else el.classList.remove('kc-no-frame');
}
