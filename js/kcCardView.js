// kcCardView.js
// 各情報カードのDOM生成と内容更新を担当する。

function initCardContent(type, element) {
  if (type === 'BGMtitle') {
    element.append(
      createSpan('kc-bgm-label'),
      createSpan('kc-bgm-text')
    );
  } else if (type === 'senka') {
    element.append(
      createSpan('kc-senka-label', '戦果'),
      createSpan('kc-senka-text')
    );
  } else if (type === 'list') {
    const tags = document.createElement('div');
    tags.className = 'kc-card-list-container';
    element.appendChild(tags);
  }
}

function createSpan(className, text = '') {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

const RENDER_HANDLERS = {
  map: renderMapCard,
  text: renderTextCard,
  list: renderListCard,
  bgmtitle: renderBgmCard,
  senka: renderSenkaCard
};

function renderInfoDisplay() {
  Object.keys(CARD_DEFINITIONS).forEach((type) => {
    const handler = RENDER_HANDLERS[type.toLowerCase()];
    if (!handler) return;
    document.querySelectorAll(`.kc-card-${type.toLowerCase()}`).forEach(handler);
  });
}

function renderMapCard(element) {
  element.replaceChildren();
  if (currentMapMajor) {
    const prefix = currentIsEvent ? 'E' : '';
    const minor = currentMapMinor ? `-${currentMapMinor}` : '';
    element.appendChild(createBadge(`${prefix}${currentMapMajor}${minor}`, 'kc-bg-map'));
  }

  const difficulties = { kou: '甲', otsu: '乙', hei: '丙', tei: '丁' };
  if (difficulties[currentDifficulty]) {
    element.appendChild(createBadge(difficulties[currentDifficulty], `kc-diff-${currentDifficulty}`));
  }

  const statuses = { gimmick: 'ギミック', chip: '削り', last: 'ラスダン', farm: '掘り' };
  if (statuses[currentStatus]) {
    element.appendChild(createBadge(statuses[currentStatus], 'kc-bg-status'));
  }
}

function createBadge(text, modifier) {
  const badge = createSpan(`kc-badge ${modifier}`, text);
  return badge;
}

function renderTextCard(element) {
  checkAndApplyScroll(element, currentFreeText || '', currentFreeTextScrollMode);
}

function renderListCard(element) {
  const container = element.querySelector('.kc-card-list-container');
  if (!container) return;
  const previousScrollLeft = container.scrollLeft;
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'kc-card-list-items';

  if (currentCustomTitle) {
    itemsContainer.appendChild(createSpan('kc-info-title', `${currentCustomTitle}:`));
  }
  if (currentCustomList) {
    const items = currentCustomList
      .split(/(?<!\\)[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    items.forEach((text, index) => {
      itemsContainer.appendChild(createListTag(text.replace(/\\,/g, ','), index));
    });
  }
  container.replaceChildren(itemsContainer);
  container.scrollLeft = previousScrollLeft;
  setupListHorizontalScroll(container);
}

function setupListHorizontalScroll(container) {
  if (container.dataset.horizontalScrollReady === 'true') return;
  container.dataset.horizontalScrollReady = 'true';

  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;
  let suppressClick = false;
  const dragThreshold = 5;

  container.addEventListener('wheel', (event) => {
    if (container.scrollWidth <= container.clientWidth) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    container.scrollLeft += delta;
    event.preventDefault();
  }, { passive: false });

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || container.scrollWidth <= container.clientWidth) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = container.scrollLeft;
    dragged = false;
    container.setPointerCapture?.(pointerId);
  });

  container.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const delta = event.clientX - startX;
    if (!dragged && Math.abs(delta) < dragThreshold) return;
    dragged = true;
    container.classList.add('kc-is-dragging');
    container.scrollLeft = startScrollLeft - delta;
    event.preventDefault();
  });

  const finishDrag = (event) => {
    if (event.pointerId !== pointerId) return;
    suppressClick = dragged;
    container.classList.remove('kc-is-dragging');
    container.releasePointerCapture?.(pointerId);
    pointerId = null;
    dragged = false;
  };
  container.addEventListener('pointerup', finishDrag);
  container.addEventListener('pointercancel', finishDrag);
  container.addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

function createListTag(text, index) {
  const tag = createSpan('kc-tag', text);
  const match = text.match(/^(.+?):([+-]?)(\d+)(?:\/(\d+))?/);
  if (match) {
    tag.textContent = `${match[1]}: ${match[3]}`;
    tag.classList.add('kc-tag-counter');
    tag.title = match[2] === '+'
      ? 'クリックでカウントアップ'
      : match[2] === '-'
        ? 'クリックでカウントダウン'
        : '数値表示';
  } else {
    tag.classList.add('kc-tag-delete');
    tag.title = 'クリックで削除';
  }

  tag.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleTagClick(index);
  });
  return tag;
}

function renderBgmCard(element) {
  const header = element.querySelector('.kc-bgm-label');
  const text = element.querySelector('.kc-bgm-text');
  if (header) header.textContent = currentBgmHeader || '♪';
  if (text) checkAndApplyScroll(text, currentBgm || '', currentBgmScrollMode);
}

function renderSenkaCard(element) {
  const label = element.querySelector('.kc-senka-label');
  const text = element.querySelector('.kc-senka-text');
  if (label) label.textContent = '戦果';
  if (text) text.textContent = currentSenka || '--';
  element.title = `戦果: ${currentSenka || '--'}`;
}

function checkAndApplyScroll(element, text, mode) {
  if (element._resizeObserver) element._resizeObserver.disconnect();
  element.textContent = text;
  element.title = text;
  if (!text) return;

  const checkOverflow = () => {
    element.textContent = text;
    if (element.scrollWidth <= element.clientWidth) return;

    const factor = currentScrollSpeed <= 50
      ? 10 - (currentScrollSpeed - 1) * (9 / 49)
      : 1 - (currentScrollSpeed - 50) * (0.9 / 50);

    if (mode === 'circular') {
      const wrapper = document.createElement('div');
      wrapper.className = 'kc-scroll-infinite-wrap';
      const inner = document.createElement('div');
      inner.className = 'kc-scroll-infinite-inner';
      inner.style.animationDuration = `${Math.max(5, text.length * 0.4 + 2) * factor}s`;
      inner.append(createSpan('kc-scroll-item', text), createSpan('kc-scroll-item', text));
      wrapper.appendChild(inner);
      element.replaceChildren(wrapper);
    } else {
      const marquee = createSpan('kc-text-marquee', text);
      marquee.style.animationDuration = `${15 * factor}s`;
      element.replaceChildren(marquee);
    }
  };

  checkOverflow();
  let resizeTimer;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkOverflow, 200);
  });
  observer.observe(element);
  element._resizeObserver = observer;
}
