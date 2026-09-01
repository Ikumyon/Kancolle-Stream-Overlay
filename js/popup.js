// popup.js
// 設定画面のナビゲーション、プレビュー、保存状態を管理する。

let popupReady = false;

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupActions();
  setupRangeValueSync();
  setupFormFeedback();
  setupRecoveryPreview();

  KcSettings.load((settings) => {
    KcPopupForm.apply(settings);
    setLayoutConfig(settings.layoutConfig);
    updateAllPreviews();
    setSaveState('saved');
    popupReady = true;
  });
});

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll('.tab-btn'));
  const panels = Array.from(document.querySelectorAll('.content-area'));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });

  function activateTab(activeTab) {
    tabs.forEach((tab) => {
      const active = tab === activeTab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.id === activeTab.dataset.target;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  }
}

function setupActions() {
  document.getElementById('saveBtn').addEventListener('click', saveAndSend);
  document.getElementById('resetBtn').addEventListener('click', () => {
    const defaults = KcSettings.clone(DEFAULT_SETTINGS);
    KcPopupForm.apply(defaults);
    setLayoutConfig(defaults.layoutConfig);
    showCardSettings(null);
    updateAllPreviews();
    setSaveState('dirty');
  });
  document.getElementById('centerBtn').addEventListener('click', () => {
    sendToActiveTab({ type: 'RESET_POSITION' });
  });
}

function setupFormFeedback() {
  document.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('input', handleFormChange);
    input.addEventListener('change', handleFormChange);
  });
  document.addEventListener('kc-layout-change', () => {
    if (popupReady) setSaveState('dirty');
  });
}

function setupRangeValueSync() {
  const fields = [
    { rangeId: 'scale', inputId: 'val-scale' },
    { rangeId: 'fontSize', inputId: 'val-fsize' },
    { rangeId: 'bgOpacity', inputId: 'val-bgOpacity', toRange: (value) => value / 100, toInput: (value) => Math.round(value * 100) },
    { rangeId: 'blur', inputId: 'val-blur' },
    { rangeId: 'shadowSize', inputId: 'val-shadowSize' },
    { rangeId: 'scrollSpeed', inputId: 'val-scrollSpeed' }
  ];

  fields.forEach(({ rangeId, inputId, toRange = Number, toInput = Number }) => {
    const range = document.getElementById(rangeId);
    const numberInput = document.getElementById(inputId);
    const minimum = Number(range.min);
    const maximum = Number(range.max);
    const syncInput = () => { numberInput.value = String(toInput(Number(range.value))); };

    range.addEventListener('input', syncInput);
    numberInput.addEventListener('input', () => {
      const value = toRange(Number(numberInput.value));
      if (!Number.isFinite(value)) return;
      range.value = String(Math.min(maximum, Math.max(minimum, value)));
    });
    numberInput.addEventListener('change', syncInput);
  });
}

function handleFormChange() {
  if (!popupReady) return;
  updateAllPreviews();
  setSaveState('dirty');
}

function setupRecoveryPreview() {
  ['recoveryCurrent', 'recoveryTarget', 'portSupplyInterval', 'portSupplyAmount'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updateRecoveryPreview);
  });
}

function updateAllPreviews() {
  KcPopupForm.updateLabels();
  updateRecoveryPreview();
  updatePanelStates();
  updateBgmState();
  updateDesignPreview();
}

function updateRecoveryPreview() {
  const current = Number.parseInt(document.getElementById('recoveryCurrent').value, 10);
  const target = Number.parseInt(document.getElementById('recoveryTarget').value, 10);
  const result = document.getElementById('recoveryResult');
  if (!Number.isFinite(current) || !Number.isFinite(target)) {
    result.textContent = '値を入力';
    return;
  }
  if (target <= current) {
    result.textContent = '回復済み';
    return;
  }

  const usesPortSupply = target > 49;
  const minutes = KcTimer.calculateRecoveryMinutes(current, target, {
    portSupplyOn: usesPortSupply,
    interval: Number(document.getElementById('portSupplyInterval').value),
    amount: Number(document.getElementById('portSupplyAmount').value)
  });
  result.textContent = minutes > 0
    ? `${minutes}分${usesPortSupply ? '・給糧艦込み' : ''}`
    : '到達不可';
}

function updatePanelStates() {
  const timerMode = document.querySelector('input[name="timerMode"]:checked')?.value;
  setPanelState('timerPanelState', timerMode === 'auto' ? '自動' : '表示', true);
  const areaVisible = document.getElementById('areaVisible').checked;
  setPanelState('areaPanelState', areaVisible ? '表示' : '非表示', areaVisible);
  const controlVisible = document.getElementById('controlVisible').checked;
  setPanelState('controlPanelState', controlVisible ? '表示' : '非表示', controlVisible);
}

function setPanelState(id, label, visible) {
  const element = document.getElementById(id);
  element.textContent = label;
  element.dataset.state = visible ? 'visible' : 'hidden';
}

function updateBgmState() {
  const enabled = document.getElementById('kc-chk-bgm').checked;
  const status = document.getElementById('bgmConnectionPreview');
  status.dataset.state = enabled ? 'enabled' : 'disabled';
  status.lastElementChild.textContent = enabled
    ? '保存後、BGMデータへの接続を開始します'
    : 'BGM連動は無効です';
}

function updateDesignPreview() {
  const preview = document.getElementById('designPreview');
  const color = document.getElementById('bgColor').value;
  const opacity = Number(document.getElementById('bgOpacity').value);
  const blur = Number(document.getElementById('blur').value);
  const shadow = Number(document.getElementById('shadowSize').value);
  const scale = Number(document.getElementById('scale').value);
  const fontSize = Number(document.getElementById('fontSize').value);

  preview.style.setProperty('--preview-bg', hexToRgba(color, opacity));
  preview.style.setProperty('--preview-blur', `${blur}px`);
  preview.style.setProperty('--preview-shadow', `${Math.min(shadow, 48)}px`);
  preview.style.fontSize = `${Math.max(10, fontSize * 0.38)}px`;
  preview.style.transform = `scale(${0.9 + scale * 0.1})`;
  document.getElementById('val-bgColor').textContent = color.toUpperCase();
}

function setSaveState(state) {
  const status = document.getElementById('saveStatus');
  const saveButton = document.getElementById('saveBtn');
  const labels = { saved: '保存済み', dirty: '未保存の変更', saving: '保存中…' };
  status.dataset.state = state;
  status.lastElementChild.textContent = labels[state];
  saveButton.classList.toggle('dirty', state === 'dirty');
  saveButton.disabled = state === 'saving';
}

function saveAndSend() {
  setSaveState('saving');
  const settings = KcPopupForm.read(getLayoutConfig());
  KcSettings.save(settings, (savedSettings) => {
    sendToActiveTab({ type: 'UPDATE_STYLE', settings: savedSettings });
    setSaveState('saved');
  });
}

function sendToActiveTab(message) {
  if (!globalThis.chrome?.tabs) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, message);
  });
}
