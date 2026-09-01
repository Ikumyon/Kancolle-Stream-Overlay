// kcPersistence.js
// ページ固有の状態とウィンドウ配置をlocalStorageへ保存する。

const KC_PAGE_STATE_KEY = 'kc_map_settings';
const KC_WINDOW_LAYOUT_KEY = 'kc_window_layout';

function saveLocalData() {
  const data = {
    isEvent: currentIsEvent,
    major: currentMapMajor,
    minor: currentMapMinor,
    diff: currentDifficulty,
    status: currentStatus,
    portSupplyOn: currentPortSupplyOn
  };
  localStorage.setItem(KC_PAGE_STATE_KEY, JSON.stringify(data));
}

function restoreLocalData() {
  const json = localStorage.getItem(KC_PAGE_STATE_KEY);
  if (!json) return;

  try {
    const data = JSON.parse(json);
    currentIsEvent = data.isEvent === true;
    currentMapMajor = data.major || '';
    currentMapMinor = data.minor || '';
    currentDifficulty = data.diff || 'none';
    currentStatus = data.status || 'none';
    currentPortSupplyOn = data.portSupplyOn === true;

    document.getElementById('kc-chk-event').checked = currentIsEvent;
    const portSupply = document.getElementById('kc-chk-port-supply');
    if (portSupply) portSupply.checked = currentPortSupplyOn;
    document.getElementById('kc-map-major').value = currentMapMajor;
    document.getElementById('kc-map-minor').value = currentMapMinor;

    setActiveButton('kc-grp-diff', currentDifficulty);
    setActiveButton('kc-grp-status', currentStatus);
    renderInfoDisplay();
  } catch (error) {
    console.warn('[KCO] Page state restore failed:', error);
  }
}

function setActiveButton(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.val === value);
  });
}

function saveWindowLayout() {
  const layout = {};
  ['kc-win-timer', 'kc-win-area', 'kc-win-control'].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;

    layout[id] = { top: element.style.top, left: element.style.left };
    if (id === 'kc-win-area') layout[id].width = element.style.width;
    if (id === 'kc-win-timer') {
      layout[id].width = element.style.width;
      layout[id].height = element.style.height;
      layout[id].fontSize = element.style.getPropertyValue('--kc-font-size');
    }
  });
  localStorage.setItem(KC_WINDOW_LAYOUT_KEY, JSON.stringify(layout));
}

function restoreWindowLayout() {
  const json = localStorage.getItem(KC_WINDOW_LAYOUT_KEY);
  if (!json) return;

  try {
    const layout = JSON.parse(json);
    Object.entries(layout).forEach(([id, saved]) => {
      const element = document.getElementById(id);
      if (!element || !saved) return;
      if (saved.top) element.style.top = saved.top;
      if (saved.left) element.style.left = saved.left;
      if (id === 'kc-win-area' && saved.width) element.style.width = saved.width;
      if (id === 'kc-win-timer') {
        if (saved.width) element.style.width = saved.width;
        if (saved.height) element.style.height = saved.height;
        if (saved.fontSize) element.style.setProperty('--kc-font-size', saved.fontSize);
      }
    });
  } catch (error) {
    console.warn('[KCO] Window layout restore failed:', error);
  }
}
