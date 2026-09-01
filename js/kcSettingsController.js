// kcSettingsController.js
// 共通設定をオーバーレイの状態と見た目へ反映する。

function applyStyles(input) {
  const settings = KcSettings.normalize(input);
  const root = document.documentElement;
  root.style.setProperty('--kc-scale', settings.scale);
  root.style.setProperty('--kc-font-size', `${settings.fontSize}px`);
  root.style.setProperty('--kc-blur', `${settings.blur}px`);
  root.style.setProperty('--kc-shadow-size', `${settings.shadowSize}px`);
  root.style.setProperty('--kc-bg-rgba', hexToRgba(settings.bgColor, settings.bgOpacity));
  root.style.setProperty('--kc-shadow-rgba', hexToRgba(settings.shadowColor, settings.shadowOpacity));

  currentScrollSpeed = settings.scrollSpeed;
  currentTimerMode = settings.timerMode;
  currentTimerNotify = settings.timerNotify;
  currentNumpadEnabled = settings.numpadEnabled;
  currentFreeText = settings.freeText;
  currentFreeTextScrollMode = settings.freeTextScrollMode;
  currentCustomTitle = settings.customTitle;
  currentCustomList = settings.customList;
  currentBgmHeader = settings.bgmHeader;
  currentBgmScrollMode = settings.bgmScrollMode;
  currentTimerPresets = settings.timerPresets;
  currentPortSupplyInterval = settings.portSupplyInterval;
  currentPortSupplyAmount = settings.portSupplyAmount;

  updateTimerVisibility();
  updateWindowStatus('kc-win-timer', true, settings.timerFrame);
  updateWindowStatus('kc-win-area', settings.areaVisible, settings.areaFrame);
  updateWindowStatus('kc-win-control', settings.controlVisible, true);

  const timerWindow = document.getElementById('kc-win-timer');
  if (timerWindow) {
    timerWindow.classList.toggle('kc-click-through', settings.timerClickThrough);
    timerWindow._requestTimerFit?.();
  }
  const numpad = document.getElementById('kc-numpad');
  if (numpad && !currentNumpadEnabled) numpad.style.display = 'none';

  updateLayout(settings.layoutConfig);
  renderTimerPresets();
  KcMedia.setEnabled(settings.bgmEnabled);
  renderInfoDisplay();
}

function loadSettings() {
  KcSettings.load(applyStyles);
}
