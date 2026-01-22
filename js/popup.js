// デフォルト設定 (kcUtils.js参照)
const defaultSettings = DEFAULT_SETTINGS;

document.addEventListener('DOMContentLoaded', () => {
  // 1. タブ切り替え
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.content-area');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // 3. 設定読み込み
  chrome.storage.local.get(['kcOverlaySettings', 'infoLayoutConfig'], (result) => {
    const settings = result.kcOverlaySettings || DEFAULT_SETTINGS;
    applyToInputs(settings);

    // レイアウトエディタにも設定を適用
    if (typeof setLayoutConfig === 'function') {
      const layoutCfg = result.infoLayoutConfig || DEFAULT_SETTINGS.layoutConfig;
      setLayoutConfig(layoutCfg);
    }
  });

  // 4. イベントリスナー
  document.getElementById('saveBtn').addEventListener('click', saveAndSend);
  document.getElementById('resetBtn').addEventListener('click', () => {
    applyToInputs(defaultSettings);
    // レイアウトエディタもデフォルトにリセット
    if (typeof setLayoutConfig === 'function') {
      setLayoutConfig(defaultSettings.layoutConfig);
    }
    saveAndSend();
  });

  // 位置リセット
  const centerBtn = document.getElementById('centerBtn');
  if (centerBtn) {
    centerBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'RESET_POSITION' });
        }
      });
    });
  }

  const inputs = document.querySelectorAll('input[type="range"]');
  inputs.forEach(input => input.addEventListener('input', updateLabels));

  // スクロール速度の同期処理 (スライダー <-> 数値入力)
  const rangeSpeed = document.getElementById('scrollSpeed');
  const numSpeed = document.getElementById('val-scrollSpeed');

  if (rangeSpeed && numSpeed) {
    rangeSpeed.addEventListener('input', () => {
      numSpeed.value = rangeSpeed.value;
    });
    numSpeed.addEventListener('input', () => {
      let val = parseInt(numSpeed.value);
      if (isNaN(val)) val = 50;
      if (val < 1) val = 1;
      if (val > 100) val = 100;
      rangeSpeed.value = val;
    });
    // input type="number" の changeイベでも値を正規化
    numSpeed.addEventListener('change', () => {
      let val = parseInt(numSpeed.value);
      if (isNaN(val)) val = 50;
      if (val < 1) val = 1;
      if (val > 100) val = 100;
      numSpeed.value = val;
      rangeSpeed.value = val;
    });
  }
});

function saveAndSend() {
  const p1 = document.getElementById('pre1').value;
  const p2 = document.getElementById('pre2').value;
  const p3 = document.getElementById('pre3').value;
  const p4 = document.getElementById('pre4').value;

  const presets = [
    p1 ? parseInt(p1) : null,
    p2 ? parseInt(p2) : null,
    p3 ? parseInt(p3) : null,
    p4 ? parseInt(p4) : null
  ];

  const timerModeVal = document.querySelector('input[name="timerMode"]:checked').value;

  const settings = {
    scale: parseFloat(document.getElementById('scale').value),
    fontSize: parseInt(document.getElementById('fontSize').value),
    fontSize: parseInt(document.getElementById('fontSize').value),
    // textColor: removed
    bgColor: document.getElementById('bgColor').value,
    bgOpacity: parseFloat(document.getElementById('bgOpacity').value),
    blur: parseInt(document.getElementById('blur').value),
    shadowSize: parseInt(document.getElementById('shadowSize').value),
    shadowColor: defaultSettings.shadowColor,
    shadowOpacity: defaultSettings.shadowOpacity,

    scrollSpeed: parseInt(document.getElementById('scrollSpeed').value),

    timerMode: timerModeVal,
    timerNotify: document.getElementById('timerNotify').checked,
    timerFrame: document.getElementById('timerFrame').checked,
    controlVisible: document.getElementById('controlVisible').checked,
    areaVisible: document.getElementById('areaVisible').checked,
    areaFrame: document.getElementById('areaFrame').checked,

    freeText: document.getElementById('infoFreeText').value,
    freeTextScrollMode: document.querySelector('input[name="freeTextScrollMode"]:checked').value,

    // カスタムモードデータ
    customTitle: document.getElementById('infoCustomTitle').value,
    customList: document.getElementById('infoCustomList').value,
    bgmHeader: document.getElementById('bgmHeader').value,
    bgmScrollMode: document.querySelector('input[name="bgmScrollMode"]:checked').value,

    timerPresets: presets
  };

  chrome.storage.local.set({ kcOverlaySettings: settings });

  // レイアウト設定を別途保存（新形式JSON）し、settingsにも統合して送信
  if (typeof getLayoutConfig === 'function') {
    const layoutCfg = getLayoutConfig();
    chrome.storage.local.set({ infoLayoutConfig: layoutCfg });
    settings.layoutConfig = layoutCfg;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_STYLE', settings: settings });
    }
  });
}

function applyToInputs(s) {
  document.getElementById('scale').value = s.scale || 1.0;
  document.getElementById('fontSize').value = s.fontSize || 36;
  document.getElementById('fontSize').value = s.fontSize || 36;
  // textColor removed
  document.getElementById('bgColor').value = s.bgColor || "#0a192d";
  document.getElementById('bgOpacity').value = (s.bgOpacity !== undefined) ? s.bgOpacity : 0.65;
  document.getElementById('blur').value = (s.blur !== undefined) ? s.blur : 10;
  document.getElementById('shadowSize').value = (s.shadowSize !== undefined) ? s.shadowSize : 32;

  const sp = (s.scrollSpeed !== undefined) ? s.scrollSpeed : 50;
  document.getElementById('scrollSpeed').value = sp;
  document.getElementById('val-scrollSpeed').value = sp;

  const tMode = s.timerMode || 'always';
  const tRadios = document.getElementsByName('timerMode');
  for (const r of tRadios) {
    if (r.value === tMode) r.checked = true;
  }

  document.getElementById('timerNotify').checked = (s.timerNotify === true);
  document.getElementById('timerFrame').checked = (s.timerFrame !== false);
  document.getElementById('controlVisible').checked = (s.controlVisible !== false);
  document.getElementById('areaVisible').checked = (s.areaVisible !== false);
  document.getElementById('areaFrame').checked = (s.areaFrame !== false);

  document.getElementById('infoFreeText').value = s.freeText || "";

  const ftMode = s.freeTextScrollMode || 'normal';
  const ftRadios = document.getElementsByName('freeTextScrollMode');
  for (const r of ftRadios) {
    if (r.value === ftMode) r.checked = true;
  }

  document.getElementById('infoCustomTitle').value = s.customTitle || "";
  document.getElementById('infoCustomList').value = s.customList || "";

  document.getElementById('bgmHeader').value = s.bgmHeader || "♪";

  const bgmMode = s.bgmScrollMode || 'normal';
  const bgmRadios = document.getElementsByName('bgmScrollMode');
  for (const r of bgmRadios) {
    if (r.value === bgmMode) r.checked = true;
  }

  const ps = s.timerPresets || [10, 20, 30, null];
  document.getElementById('pre1').value = ps[0] || "";
  document.getElementById('pre2').value = ps[1] || "";
  document.getElementById('pre3').value = ps[2] || "";
  document.getElementById('pre4').value = ps[3] || "";

  updateLabels();
}

function updateLabels() {
  document.getElementById('val-scale').textContent = document.getElementById('scale').value;
  document.getElementById('val-fsize').textContent = document.getElementById('fontSize').value + 'px';
  // val-scrollSpeed is now an input, handled by sync logic and applyToInputs
}