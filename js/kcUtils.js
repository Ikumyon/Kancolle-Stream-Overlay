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
  let activePointerId = null;
  handle.onpointerdown = dragPointerDown;

  function dragPointerDown(e) {
    e.preventDefault();
    activePointerId = e.pointerId;
    handle.setPointerCapture?.(activePointerId);
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('pointerup', closeDragElement);
    document.addEventListener('pointercancel', closeDragElement);
    document.addEventListener('pointermove', elementDrag);
  }

  function elementDrag(e) {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement(e) {
    if (activePointerId === null || (e && e.pointerId !== activePointerId)) return;
    document.removeEventListener('pointerup', closeDragElement);
    document.removeEventListener('pointercancel', closeDragElement);
    document.removeEventListener('pointermove', elementDrag);
    if (handle.hasPointerCapture?.(activePointerId)) {
      handle.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
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
  let activePointerId = null;

  handle.onpointerdown = resizePointerDown;

  function resizePointerDown(e) {
    e.preventDefault();
    activePointerId = e.pointerId;
    handle.setPointerCapture?.(activePointerId);
    startX = e.clientX;
    const style = document.defaultView.getComputedStyle(element);
    startWidth = parseInt(style.width, 10);

    // スケール値(倍率)を取得
    const rootStyle = document.defaultView.getComputedStyle(document.documentElement);
    const scaleStr = rootStyle.getPropertyValue('--kc-scale').trim();
    scale = parseFloat(scaleStr) || 1.0;

    document.addEventListener('pointerup', closeResizeElement);
    document.addEventListener('pointercancel', closeResizeElement);
    document.addEventListener('pointermove', elementResize);

    document.body.style.cursor = 'ew-resize';
  }

  function elementResize(e) {
    if (e.pointerId !== activePointerId) return;
    // マウスの移動距離をスケールで割って、要素の内部幅への変化量を出す
    const deltaX = (e.clientX - startX) / scale;
    const width = startWidth + deltaX;
    if (width >= 100) { // 最小幅 100px
      element.style.width = width + "px";
    }
  }

  function closeResizeElement(e) {
    if (activePointerId === null || (e && e.pointerId !== activePointerId)) return;
    document.removeEventListener('pointerup', closeResizeElement);
    document.removeEventListener('pointercancel', closeResizeElement);
    document.removeEventListener('pointermove', elementResize);
    if (handle.hasPointerCapture?.(activePointerId)) {
      handle.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
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
  let widthExtra = 0, heightExtra = 0;
  let scale = 1.0;
  let fitFrame = 0;
  let activePointerId = null;

  const content = element.querySelector('.kc-timer-content');
  const stack = element.querySelector('.kc-timer-stack');

  function fitTimerContent() {
    if (!element.style.width || !element.style.height) return;
    if (!content || !stack || content.clientWidth <= 0 || content.clientHeight <= 0) return;
    const contentRect = content.getBoundingClientRect();
    const contentStyle = document.defaultView.getComputedStyle(content);
    const scaleX = content.offsetWidth > 0 ? contentRect.width / content.offsetWidth : 1;
    const scaleY = content.offsetHeight > 0 ? contentRect.height / content.offsetHeight : 1;
    const horizontalPadding = (parseFloat(contentStyle.paddingLeft) + parseFloat(contentStyle.paddingRight)) * scaleX;
    const verticalPadding = (parseFloat(contentStyle.paddingTop) + parseFloat(contentStyle.paddingBottom)) * scaleY;
    const availableWidth = Math.max(1, contentRect.width - horizontalPadding);
    const availableHeight = Math.max(1, contentRect.height - verticalPadding);
    const referenceSize = 100;

    // 前回の文字サイズに依存せず、毎回同じ基準サイズの実寸から算出する。
    // これにより縮小後に拡大しても、小さい文字サイズが残らない。
    element.style.setProperty('--kc-font-size', `${referenceSize}px`);
    const referenceRect = stack.getBoundingClientRect();
    if (referenceRect.width <= 0 || referenceRect.height <= 0) return;

    const fittedSize = referenceSize * Math.min(
      availableWidth / referenceRect.width,
      availableHeight / referenceRect.height
    );
    const safeSize = Math.min(10000, Math.max(8, fittedSize));
    element.style.setProperty('--kc-font-size', `${Math.floor(safeSize * 10) / 10}px`);
  }

  function requestFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitTimerContent);
  }

  handle.onpointerdown = resizePointerDown;

  function resizePointerDown(e) {
    e.preventDefault();
    activePointerId = e.pointerId;
    handle.setPointerCapture?.(activePointerId);
    startX = e.clientX;
    startY = e.clientY;

    const style = document.defaultView.getComputedStyle(element);
    startOuterWidth = element.offsetWidth;
    startOuterHeight = element.offsetHeight;
    widthExtra = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    heightExtra = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    // スケール値(倍率)を取得
    const rootStyle = document.defaultView.getComputedStyle(document.documentElement);
    const scaleStr = rootStyle.getPropertyValue('--kc-scale').trim();
    scale = parseFloat(scaleStr) || 1.0;

    document.addEventListener('pointerup', closeResizeElement);
    document.addEventListener('pointercancel', closeResizeElement);
    document.addEventListener('pointermove', elementResize);

    document.body.style.cursor = 'nwse-resize';
  }

  function elementResize(e) {
    if (e.pointerId !== activePointerId) return;
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

  function closeResizeElement(e) {
    if (activePointerId === null || (e && e.pointerId !== activePointerId)) return;
    document.removeEventListener('pointerup', closeResizeElement);
    document.removeEventListener('pointercancel', closeResizeElement);
    document.removeEventListener('pointermove', elementResize);
    if (handle.hasPointerCapture?.(activePointerId)) {
      handle.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
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
  element._requestTimerFit = requestFit;
  element._timerResizeObserver = resizeObserver;
  element._timerMutationObserver = mutationObserver;
  requestFit();
}

//// カード定義 (共通)
const CARD_DEFINITIONS = {
  map: { label: '海域', symbol: '航', className: 'kc-card-map-content' },
  text: { label: '自由記述', symbol: '文', className: 'kc-card-text-content' },
  list: { label: 'リスト', symbol: '覧', className: '' },
  BGMtitle: { label: 'BGM', symbol: '♪', className: 'kc-card-bgm-content' },
  senka: { label: '戦果', symbol: '戦', className: 'kc-card-senka-content' }
};

