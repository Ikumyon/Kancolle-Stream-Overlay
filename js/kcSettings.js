// kcSettings.js
// 設定スキーマ、検証、保存、旧形式からの移行を一元管理する。

(function initializeSettings(global) {
  const STORAGE_KEY = 'kcOverlaySettings';
  const LEGACY_LAYOUT_KEY = 'infoLayoutConfig';
  const CARD_TYPES = ['map', 'text', 'list', 'BGMtitle', 'senka'];

  const defaults = {
    scale: 1.0,
    fontSize: 36,
    bgColor: '#0a192d',
    bgOpacity: 0.65,
    blur: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowSize: 32,
    scrollSpeed: 50,
    timerMode: 'always',
    timerNotify: false,
    timerFrame: true,
    timerClickThrough: false,
    controlVisible: true,
    numpadEnabled: true,
    areaVisible: true,
    areaFrame: true,
    layoutConfig: {
      version: 2,
      rows: [{ columns: [{ items: [], flex: 1 }] }]
    },
    bgmHeader: '♪',
    bgmEnabled: false,
    bgmScrollMode: 'normal',
    freeText: '',
    freeTextScrollMode: 'normal',
    customTitle: '',
    customList: '',
    timerPresets: [10, 20, 30, null],
    portSupplyInterval: 15,
    portSupplyAmount: 2,
    cloudNotifyEnabled: false,
    cloudNotifyUrl: '',
    cloudNotifyToken: ''
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function numberInRange(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function stringValue(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function booleanValue(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function enumValue(value, values, fallback) {
    return values.includes(value) ? value : fallback;
  }

  function normalizeLayout(layout) {
    if (!layout || typeof layout !== 'object' || !Array.isArray(layout.rows)) {
      return clone(defaults.layoutConfig);
    }

    const rows = layout.rows.map((row) => {
      const sourceColumns = row && Array.isArray(row.columns) ? row.columns : [];
      const columns = sourceColumns.map((column) => {
        const sourceItems = column && Array.isArray(column.items) ? column.items : [];
        const items = sourceItems
          .filter((item) => item && CARD_TYPES.includes(item.type))
          .map((item) => ({
            type: item.type,
            flex: numberInRange(item.flex, 1, 0.1, 100)
          }))
          .slice(0, 1);

        return {
          items,
          flex: numberInRange(column && column.flex, 1, 0.1, 100),
          fitContent: column && column.fitContent === true
        };
      });

      return {
        columns: columns.length > 0
          ? columns
          : [{ items: [], flex: 1, fitContent: false }]
      };
    });

    return {
      version: 2,
      rows: rows.length > 0 ? rows : clone(defaults.layoutConfig.rows)
    };
  }

  function normalizePresets(value) {
    const source = Array.isArray(value) ? value : defaults.timerPresets;
    return Array.from({ length: 4 }, (_, index) => {
      const preset = source[index];
      if (preset === null || preset === '' || preset === undefined) return null;
      const parsed = Number.parseInt(preset, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    });
  }

  function normalize(input = {}, legacyLayout) {
    const source = input && typeof input === 'object' ? input : {};
    const layoutSource = source.layoutConfig || legacyLayout || defaults.layoutConfig;

    return {
      scale: numberInRange(source.scale, defaults.scale, 0.1, 2),
      fontSize: numberInRange(source.fontSize, defaults.fontSize, 20, 60),
      bgColor: /^#[0-9a-f]{6}$/i.test(source.bgColor) ? source.bgColor : defaults.bgColor,
      bgOpacity: numberInRange(source.bgOpacity, defaults.bgOpacity, 0, 1),
      blur: numberInRange(source.blur, defaults.blur, 0, 20),
      shadowColor: /^#[0-9a-f]{6}$/i.test(source.shadowColor) ? source.shadowColor : defaults.shadowColor,
      shadowOpacity: numberInRange(source.shadowOpacity, defaults.shadowOpacity, 0, 1),
      shadowSize: numberInRange(source.shadowSize, defaults.shadowSize, 0, 100),
      scrollSpeed: numberInRange(source.scrollSpeed, defaults.scrollSpeed, 1, 100),
      timerMode: enumValue(source.timerMode, ['always', 'auto'], defaults.timerMode),
      timerNotify: booleanValue(source.timerNotify, defaults.timerNotify),
      timerFrame: booleanValue(source.timerFrame, defaults.timerFrame),
      timerClickThrough: booleanValue(source.timerClickThrough, defaults.timerClickThrough),
      controlVisible: booleanValue(source.controlVisible, defaults.controlVisible),
      numpadEnabled: booleanValue(source.numpadEnabled, defaults.numpadEnabled),
      areaVisible: booleanValue(source.areaVisible, defaults.areaVisible),
      areaFrame: booleanValue(source.areaFrame, defaults.areaFrame),
      layoutConfig: normalizeLayout(layoutSource),
      bgmHeader: stringValue(source.bgmHeader, defaults.bgmHeader),
      bgmEnabled: booleanValue(source.bgmEnabled, defaults.bgmEnabled),
      bgmScrollMode: enumValue(source.bgmScrollMode, ['normal', 'circular'], defaults.bgmScrollMode),
      freeText: stringValue(source.freeText, defaults.freeText),
      freeTextScrollMode: enumValue(source.freeTextScrollMode, ['normal', 'circular'], defaults.freeTextScrollMode),
      customTitle: stringValue(source.customTitle, defaults.customTitle),
      customList: stringValue(source.customList, defaults.customList),
      timerPresets: normalizePresets(source.timerPresets),
      portSupplyInterval: numberInRange(source.portSupplyInterval, defaults.portSupplyInterval, 1, 60),
      portSupplyAmount: numberInRange(source.portSupplyAmount, defaults.portSupplyAmount, 1, 54),
      cloudNotifyEnabled: booleanValue(source.cloudNotifyEnabled, defaults.cloudNotifyEnabled),
      cloudNotifyUrl: stringValue(source.cloudNotifyUrl, defaults.cloudNotifyUrl).trim().replace(/\/+$/, ''),
      cloudNotifyToken: stringValue(source.cloudNotifyToken, defaults.cloudNotifyToken).trim()
    };
  }

  function load(callback) {
    if (!global.chrome?.storage?.local) {
      callback(normalize());
      return;
    }
    chrome.storage.local.get([STORAGE_KEY, LEGACY_LAYOUT_KEY], (result) => {
      const stored = result[STORAGE_KEY] || {};
      const usedLegacyLayout = !stored.layoutConfig && result[LEGACY_LAYOUT_KEY];
      const settings = normalize(stored, result[LEGACY_LAYOUT_KEY]);

      if (usedLegacyLayout) {
        chrome.storage.local.set({ [STORAGE_KEY]: settings });
      }
      callback(settings);
    });
  }

  function save(input, callback) {
    const settings = normalize(input);
    if (!global.chrome?.storage?.local) {
      if (typeof callback === 'function') callback(settings);
      return settings;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
      if (typeof callback === 'function') callback(settings);
    });
    return settings;
  }

  function update(patch, callback) {
    load((current) => save({ ...current, ...patch }, callback));
  }

  global.KcSettings = Object.freeze({
    STORAGE_KEY,
    LEGACY_LAYOUT_KEY,
    DEFAULTS: clone(defaults),
    clone,
    normalize,
    normalizeLayout,
    load,
    save,
    update
  });
  global.DEFAULT_SETTINGS = global.KcSettings.DEFAULTS;
})(globalThis);
