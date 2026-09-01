// popup_form.js
// 設定フォームと設定オブジェクト間の変換を管理する。

(function initializePopupForm(global) {
  const byId = (id) => document.getElementById(id);
  const selected = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
  const number = (id) => Number(byId(id).value);

  function read(layoutConfig) {
    return KcSettings.normalize({
      scale: number('scale'), fontSize: number('fontSize'),
      bgColor: byId('bgColor').value, bgOpacity: number('bgOpacity'),
      blur: number('blur'), shadowSize: number('shadowSize'),
      shadowColor: DEFAULT_SETTINGS.shadowColor,
      shadowOpacity: DEFAULT_SETTINGS.shadowOpacity,
      scrollSpeed: number('scrollSpeed'),
      portSupplyInterval: number('portSupplyInterval'),
      portSupplyAmount: number('portSupplyAmount'),
      timerMode: selected('timerMode'),
      timerNotify: byId('timerNotify').checked,
      timerFrame: byId('timerFrame').checked,
      timerClickThrough: selected('timerClickThrough') === 'true',
      controlVisible: byId('controlVisible').checked,
      numpadEnabled: byId('numpadEnabled').checked,
      areaVisible: byId('areaVisible').checked,
      areaFrame: byId('areaFrame').checked,
      freeText: byId('infoFreeText').value,
      freeTextScrollMode: selected('freeTextScrollMode'),
      customTitle: byId('infoCustomTitle').value,
      customList: byId('infoCustomList').value,
      bgmHeader: byId('bgmHeader').value,
      bgmScrollMode: selected('bgmScrollMode'),
      bgmEnabled: byId('kc-chk-bgm').checked,
      timerPresets: ['pre1', 'pre2', 'pre3', 'pre4'].map((id) => byId(id).value || null),
      layoutConfig
    });
  }

  function setRadio(name, value) {
    document.getElementsByName(name).forEach((radio) => {
      radio.checked = radio.value === String(value);
    });
  }

  function apply(input) {
    const settings = KcSettings.normalize(input);
    byId('scale').value = settings.scale;
    byId('fontSize').value = settings.fontSize;
    byId('bgColor').value = settings.bgColor;
    byId('bgOpacity').value = settings.bgOpacity;
    byId('blur').value = settings.blur;
    byId('shadowSize').value = settings.shadowSize;
    byId('scrollSpeed').value = settings.scrollSpeed;
    byId('val-scrollSpeed').value = settings.scrollSpeed;
    byId('portSupplyInterval').value = settings.portSupplyInterval;
    byId('portSupplyAmount').value = settings.portSupplyAmount;
    setRadio('timerMode', settings.timerMode);
    byId('timerNotify').checked = settings.timerNotify;
    byId('timerFrame').checked = settings.timerFrame;
    setRadio('timerClickThrough', settings.timerClickThrough);
    byId('controlVisible').checked = settings.controlVisible;
    byId('numpadEnabled').checked = settings.numpadEnabled;
    byId('areaVisible').checked = settings.areaVisible;
    byId('areaFrame').checked = settings.areaFrame;
    byId('infoFreeText').value = settings.freeText;
    setRadio('freeTextScrollMode', settings.freeTextScrollMode);
    byId('infoCustomTitle').value = settings.customTitle;
    byId('infoCustomList').value = settings.customList;
    byId('bgmHeader').value = settings.bgmHeader;
    setRadio('bgmScrollMode', settings.bgmScrollMode);
    byId('kc-chk-bgm').checked = settings.bgmEnabled;
    settings.timerPresets.forEach((preset, index) => {
      byId(`pre${index + 1}`).value = preset ?? '';
    });
    updateLabels();
  }

  function updateLabels() {
    byId('val-scale').textContent = byId('scale').value;
    byId('val-fsize').textContent = `${byId('fontSize').value}px`;
  }

  global.KcPopupForm = Object.freeze({ read, apply, updateLabels });
})(globalThis);
