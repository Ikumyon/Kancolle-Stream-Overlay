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
  let startOuterWidth = 0, startOuterHeight = 0;
  let startContentWidth = 0, startContentHeight = 0;
  let widthExtra = 0, heightExtra = 0;
  let scale = 1.0;
  let fitFrame = 0;

  const content = element.querySelector('.kc-timer-content');
  const stack = element.querySelector('.kc-timer-stack');

  function fitTimerContent() {
    if (!element.style.width || !element.style.height) return;
    if (!content || !stack || content.clientWidth <= 0 || content.clientHeight <= 0) return;
    let lower = 12;
    let upper = Math.max(content.clientWidth, content.clientHeight) * 1.25;

    for (let index = 0; index < 10; index += 1) {
      const candidate = (lower + upper) / 2;
      element.style.setProperty('--kc-font-size', `${candidate}px`);
      if (stack.scrollWidth <= content.clientWidth && stack.scrollHeight <= content.clientHeight) {
        lower = candidate;
      } else {
        upper = candidate;
      }
    }
    element.style.setProperty('--kc-font-size', `${Math.round(lower * 10) / 10}px`);
  }

  function requestFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitTimerContent);
  }

  handle.onmousedown = resizeMouseDown;

  function resizeMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    const style = document.defaultView.getComputedStyle(element);
    startOuterWidth = element.offsetWidth;
    startOuterHeight = element.offsetHeight;
    widthExtra = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    heightExtra = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    startContentWidth = Math.max(1, startOuterWidth - widthExtra);
    startContentHeight = Math.max(1, startOuterHeight - heightExtra);
    // スケール値(倍率)を取得
    const rootStyle = document.defaultView.getComputedStyle(document.documentElement);
    const scaleStr = rootStyle.getPropertyValue('--kc-scale').trim();
    scale = parseFloat(scaleStr) || 1.0;

    document.addEventListener('mouseup', closeResizeElement);
    document.addEventListener('mousemove', elementResize);

    document.body.style.cursor = 'nwse-resize';
  }

  function elementResize(e) {
    e.preventDefault(); // 追加: ドラッグ中の副作用防止

    // スケール考慮
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;
    const diagonalLengthSquared = startOuterWidth ** 2 + startOuterHeight ** 2;
    const projectedScale = 1 + (
      deltaX * startOuterWidth + deltaY * startOuterHeight
    ) / diagonalLengthSquared;
    const minimumScale = Math.max(120 / startOuterWidth, 80 / startOuterHeight);
    const resizeScale = Math.max(minimumScale, projectedScale);
    const outerWidth = Math.round(startOuterWidth * resizeScale);
    const outerHeight = Math.round(startOuterHeight * resizeScale);
    const contentWidth = Math.max(1, outerWidth - widthExtra);
    const contentHeight = Math.max(1, outerHeight - heightExtra);
    element.style.width = `${contentWidth}px`;
    element.style.height = `${contentHeight}px`;
    requestFit();
  }

  function closeResizeElement() {
    document.removeEventListener('mouseup', closeResizeElement);
    document.removeEventListener('mousemove', elementResize);
    document.body.style.cursor = '';
    cancelAnimationFrame(fitFrame);
    fitTimerContent();

    if (typeof saveWindowLayout === 'function') {
      saveWindowLayout();
    }
  }

  const resizeObserver = new ResizeObserver(requestFit);
  resizeObserver.observe(content);
  const mutationObserver = new MutationObserver(requestFit);
  mutationObserver.observe(stack, { childList: true, characterData: true, subtree: true });
  element._timerResizeObserver = resizeObserver;
  element._timerMutationObserver = mutationObserver;
}

//// カード定義 (共通)
const CARD_DEFINITIONS = {
  map: { label: '海域', symbol: '航', className: 'kc-card-map-content' },
  text: { label: '自由記述', symbol: '文', className: 'kc-card-text-content' },
  list: { label: 'リスト', symbol: '覧', className: '' },
  BGMtitle: { label: 'BGM', symbol: '♪', className: 'kc-card-bgm-content' },
  senka: { label: '戦果', symbol: '戦', className: 'kc-card-senka-content' }
};

