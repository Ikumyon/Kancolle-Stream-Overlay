// kcUtils.js
// ユーティリティ関数

// RGB変換
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 画面内への位置補正
function ensureOnScreen(el) {
  const rect = el.getBoundingClientRect();
  if (rect.left < 0) el.style.left = "10px";
  if (rect.top < 0) el.style.top = "10px";
}

// ドラッグ機能のセットアップ
function setupDrag(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
    // kcLogic.js で定義が必要 (kcUtils.js 単体では動かない可能性があるが、呼び出し元が kcLogic.js を含んでいる前提)
    if (typeof saveWindowLayout === 'function') {
      saveWindowLayout();
    }
  }
}

// リサイズ機能のセットアップ (横方向のみ)
function setupResize(element, handle) {
  let startX = 0;
  let startWidth = 0;
  let scale = 1.0;

  handle.onmousedown = resizeMouseDown;

  function resizeMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    const style = document.defaultView.getComputedStyle(element);
    startWidth = parseInt(style.width, 10);

    // スケール値(倍率)を取得
    const rootStyle = document.defaultView.getComputedStyle(document.documentElement);
    const scaleStr = rootStyle.getPropertyValue('--kc-scale').trim();
    scale = parseFloat(scaleStr) || 1.0;

    document.addEventListener('mouseup', closeResizeElement);
    document.addEventListener('mousemove', elementResize);

    document.body.style.cursor = 'ew-resize';
  }

  function elementResize(e) {
    // マウスの移動距離をスケールで割って、要素の内部幅への変化量を出す
    const deltaX = (e.clientX - startX) / scale;
    const width = startWidth + deltaX;
    if (width >= 100) { // 最小幅 100px
      element.style.width = width + "px";
    }
  }

  function closeResizeElement() {
    document.removeEventListener('mouseup', closeResizeElement);
    document.removeEventListener('mousemove', elementResize);
    document.body.style.cursor = '';

    if (typeof saveWindowLayout === 'function') {
      saveWindowLayout();
    }
  }
}

// タイマー用リサイズ機能のセットアップ (縦横 + 文字サイズ連動)
function setupTimerResize(element, handle) {
  let startX = 0, startY = 0;
  let startWidth = 0, startHeight = 0;
  let scale = 1.0;

  handle.onmousedown = resizeMouseDown;

  function resizeMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    const style = document.defaultView.getComputedStyle(element);
    startWidth = parseInt(style.width, 10);
    startHeight = parseInt(style.height, 10);

    // スケール値(倍率)を取得
    const rootStyle = document.defaultView.getComputedStyle(document.documentElement);
    const scaleStr = rootStyle.getPropertyValue('--kc-scale').trim();
    scale = parseFloat(scaleStr) || 1.0;

    document.addEventListener('mouseup', closeResizeElement);
    document.addEventListener('mousemove', elementResize);

    document.body.style.cursor = 'se-resize';
  }

  function elementResize(e) {
    e.preventDefault(); // 追加: ドラッグ中の副作用防止

    // スケール考慮
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;

    // 整数丸めを行って微細なズレを防ぐ
    const width = Math.round(startWidth + deltaX);
    const height = Math.round(startHeight + deltaY);

    if (width >= 120) { // 最小幅
      element.style.width = width + "px";

      // 文字サイズの自動調整 (基準: 幅240pxで36px -> 係数0.15)
      // 小さすぎないように制限 (min 12px)
      const newFontSize = Math.max(12, width * 0.15);
      element.style.setProperty('--kc-font-size', newFontSize + 'px');
    }

    if (height >= 80) { // 最小高さ
      element.style.height = height + "px";
    }
  }

  function closeResizeElement() {
    document.removeEventListener('mouseup', closeResizeElement);
    document.removeEventListener('mousemove', elementResize);
    document.body.style.cursor = '';

    if (typeof saveWindowLayout === 'function') {
      saveWindowLayout();
    }
  }
}

//// カード定義 (共通)
const CARD_DEFINITIONS = {
  map: { label: '海域', icon: 'fa-solid fa-map', className: 'kc-card-map-content' },
  text: { label: '自由記述', icon: 'fa-solid fa-pen-to-square', className: 'kc-card-text-content' },
  list: { label: 'リスト', icon: 'fa-solid fa-list-check', className: '' }, // 子要素に kc-card-list-container を持つ
  BGMtitle: { label: 'BGM', icon: 'fa-solid fa-music', className: 'kc-card-bgm-content' },
  senka: { label: '戦果', icon: 'fa-solid fa-trophy', className: 'kc-card-senka-content' }
};

// 共通デフォルト設定
const DEFAULT_SETTINGS = {
  // 共通スタイル
  scale: 1.0, fontSize: 36,
  // textColor removed
  bgColor: "#0a192d", bgOpacity: 0.65, blur: 10,
  shadowColor: "#000000", shadowOpacity: 0.5, shadowSize: 32,
  scrollSpeed: 50,

  // 個別設定
  timerMode: 'always',
  timerNotify: false,
  timerFrame: true,
  timerClickThrough: false,
  controlVisible: true,
  numpadEnabled: true,
  areaVisible: true, areaFrame: true,
  layoutConfig: { version: 2, rows: [{ columns: [{ items: [], flex: 1 }] }] }, // デフォルト: 空の列を持つ行1つ
  bgmHeader: "♪",

  // テキスト情報
  freeText: "",
  freeTextScroll: false,
  freeTextScrollMode: 'normal',
  targetList: "", // kcState側で使われているフィールド

  // カスタムモード用データ
  customTitle: "",
  customList: "",
  bgmScrollMode: 'normal',

  // タイマープリセット
  timerPresets: [10, 20, 30, null]
};