// kcView.js
// DOM生成・描画処理

// -----------------------------------------------------
// パネル作成
// -----------------------------------------------------
function createTimerWindow() {
  const div = document.createElement('div');
  div.id = 'kc-win-timer';
  div.className = 'kc-display-window';
  div.innerHTML = `
    <div class="kc-header-transparent" id="kc-drag-timer"><span>:::タイマー:::</span></div>
    <div class="kc-timer-status" id="kc-disp-status">疲労抜き中</div>
    <div class="kc-end-time" id="kc-disp-end">--:--</div>
    <div class="kc-timer-val" id="kc-disp-countdown">00:00</div>
    <div class="kc-resize-handle-se" id="kc-resize-handle-timer"></div>
  `;
  document.body.appendChild(div);
  setupDrag(div, document.getElementById('kc-drag-timer'));

  if (typeof setupTimerResize === 'function') {
    setupTimerResize(div, document.getElementById('kc-resize-handle-timer'));
  }

  return div;
}

function createAreaWindow() {
  const div = document.createElement('div');
  div.id = 'kc-win-area';
  div.className = 'kc-display-window';
  div.innerHTML = `
    <div class="kc-region-body">
      <div class="kc-header-transparent" id="kc-drag-area"><span>:::情報:::</span></div>
      <div class="kc-area-content" id="kc-area-content"></div>
    </div>
    <div class="kc-resize-handle" id="kc-resize-handle-area"></div>
  `;
  document.body.appendChild(div);
  setupDrag(div, document.getElementById('kc-drag-area'));
  if (typeof setupResize === 'function') {
    setupResize(div, document.getElementById('kc-resize-handle-area'));
  }
  return div;
}

// レイアウト更新関数
function updateLayout(config) {
  const contentArea = document.getElementById('kc-area-content');
  if (!contentArea) return;

  // 有効な新形式（version 2）のJSONか判定
  if (config && typeof config === 'object' && config.version === 2 && (config.items || config.rows)) {
    updateLayoutV2(config);
  } else {
    // 旧形式(文字列)や不正なデータは警告を出してデフォルトを使用（互換変換はしない）
    console.warn("Legacy or invalid layout config format ignored. Using default settings.");

    if (typeof DEFAULT_SETTINGS !== 'undefined' && DEFAULT_SETTINGS.layoutConfig) {
      updateLayoutV2(DEFAULT_SETTINGS.layoutConfig);
    } else {
      // 安全策: 空のリスト
      updateLayoutV2({ version: 2, rows: [] });
    }
  }
}

// 新形式（version 2）のレイアウト処理
function updateLayoutV2(config) {
  const contentArea = document.getElementById('kc-area-content');
  contentArea.innerHTML = '';

  let rows = config.rows || [];

  // もし items 直下指定のような旧形式が渡ってきても、rows配列に正規化されていることを期待するか、
  // ここでは新しい columns 構造のみを対象とする。
  // config.rows が存在しない場合は何もしない（あるいは空配列）

  rows.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.style.display = 'flex';
    // 行間の隙間はCSSやデータ構造で制御してもよいが、一旦既存踏襲または0にする
    // 既存のエディタ側CSSでは gap: 0, margin-bottom: 4px なのでそれに合わせる
    rowDiv.style.gap = '8px'; // カード間ではなく列間のギャップとして機能する可能性があるが、列コンテナでpadding制御するほうが綺麗
    // 実装計画通り、行自体のスタイル設定
    rowDiv.style.marginBottom = '4px';
    rowDiv.style.alignItems = 'stretch'; // 列の高さを揃える
    rowDiv.style.width = '100%'; // 行は親幅いっぱい
    rowDiv.style.minHeight = '30px'; // 行の高さを最低限確保

    // Columns の処理
    if (row.columns && Array.isArray(row.columns)) {
      // 隙間調整: 列間はここでgapを定義するか、各colにpaddingを持たせる
      // ここでは仕様通り rowDiv に gap=8px を入れているので列間に隙間ができる

      row.columns.forEach(col => {
        const colDiv = document.createElement('div');
        // 相対幅の設定
        if (col.fitContent) {
          colDiv.style.flex = '0 0 auto';
          colDiv.style.width = 'auto';
        } else {
          const flexVal = (col.flex !== undefined && col.flex !== null) ? col.flex : 1;
          colDiv.style.flex = flexVal;
        }

        // 安全対策: Flex子要素の最小幅制約解除 & はみ出し防止
        colDiv.style.minWidth = '0';
        colDiv.style.overflow = 'hidden';

        // 内部のカード配置用スタイル
        colDiv.style.display = 'flex';
        colDiv.style.flexDirection = 'column';
        colDiv.style.gap = '4px'; // カード間の隙間

        // アイテム配置
        if (col.items && Array.isArray(col.items)) {
          col.items.forEach(item => {
            const element = createLayoutElement(item.type);
            if (element) {
              // カード自体の flex 設定は、縦方向の伸縮に効く
              // 通常は auto または stretch
              if (item.flex > 0) {
                element.style.flex = item.flex;
              } else {
                element.style.flex = '0 0 auto';
              }
              // 横幅は親(colDiv)に従うため width: 100% あるいは auto
              element.style.width = '100%';
              colDiv.appendChild(element);
            }
          });
        }

        rowDiv.appendChild(colDiv);
      });

    } else if (row.items) {
      // 旧仕様互換（念のため残す場合、あるいは完全に削除する場合）
      // ユーザー指示「互換コードは考えない」に従い、ここは処理しない、
      // または rows -> columns への移行を促す必要があるが、
      // 今回は columns がない場合は「空の行」となる。
    }

    contentArea.appendChild(rowDiv);
  });

  if (typeof renderInfoDisplay === 'function') {
    renderInfoDisplay();
  }
}

// レイアウト要素を作成
function createLayoutElement(type) {
  if (typeof CARD_DEFINITIONS === 'undefined') return null;

  const def = CARD_DEFINITIONS[type];
  if (!def) return null;

  // IDではなくクラスで識別するように変更 (複数配置対応)
  // 常に新規作成する
  const el = document.createElement('div');
  // 識別用クラス: kc-card-{type}
  const typeClass = `kc-card-${type.toLowerCase()}`;

  if (def.className) {
    el.className = `${def.className} ${typeClass}`;
  } else {
    el.className = typeClass;
  }

  // カードタイプ別の初期化
  initCardContent(type, el);

  return el;
}

// （getOrCreateElement は不要になったので削除または createLayoutElement に統合）

// カードタイプ別の初期化処理
function initCardContent(type, el) {
  switch (type) {
    case 'BGMtitle':
      el.innerHTML = '<span class="kc-bgm-label"></span><span class="kc-bgm-text"></span>';
      break;
    case 'senka':
      el.innerHTML = '<span class="kc-senka-label">戦果</span><span class="kc-senka-text"></span>';
      break;
    case 'list':
      const tags = document.createElement('div');
      tags.className = 'kc-card-list-container';
      el.appendChild(tags);
      break;
    default:
      break;
  }
}

// -----------------------------------------------------
// 描画ハンドラ
// -----------------------------------------------------
const RENDER_HANDLERS = {
  map: renderMapCard,
  text: renderTextCard,
  list: renderListCard,
  bgmtitle: renderBgmCard,
  senka: renderSenkaCard
};

function renderInfoDisplay() {
  if (typeof CARD_DEFINITIONS === 'undefined') return;

  Object.keys(CARD_DEFINITIONS).forEach(type => {
    // クラス名で検索して全て更新
    const typeClass = `kc-card-${type.toLowerCase()}`;
    const elements = document.getElementsByClassName(typeClass);

    // HTMLCollection なので Array.from または for of で回す
    // ※要素が無い場合は何もしない
    Array.from(elements).forEach(el => {
      const handler = RENDER_HANDLERS[type.toLowerCase()];
      if (handler) {
        handler(el);
      }
    });
  });
}

function renderMapCard(el) {
  let badgesHtml = '';
  if (currentMapMajor) {
    const prefix = currentIsEvent ? 'E' : '';
    const minor = currentMapMinor ? `-${currentMapMinor}` : '';
    badgesHtml += `<span class="kc-badge kc-bg-map">${prefix}${currentMapMajor}${minor}</span>`;
  }
  const diffMap = { 'kou': '甲', 'otsu': '乙', 'hei': '丙', 'tei': '丁' };
  if (currentDifficulty !== 'none' && diffMap[currentDifficulty]) {
    badgesHtml += `<span class="kc-badge kc-diff-${currentDifficulty}">${diffMap[currentDifficulty]}</span>`;
  }
  const statusMap = { 'gimmick': 'ギミック', 'chip': '削り', 'last': 'ラスダン', 'farm': '掘り' };
  if (currentStatus !== 'none' && statusMap[currentStatus]) {
    badgesHtml += `<span class="kc-badge kc-bg-status">${statusMap[currentStatus]}</span>`;
  }
  el.innerHTML = badgesHtml;
}

function renderTextCard(el) {
  checkAndApplyScroll(el, currentFreeText || "", currentFreeTextScrollMode || 'normal');
}

function renderListCard(el) {
  const container = el.querySelector('.kc-card-list-container');
  if (!container) return;

  container.innerHTML = '';
  const infoContainer = document.createElement('div');
  infoContainer.className = 'kc-card-list-items';

  // Title
  if (currentCustomTitle) {
    const titleSpan = document.createElement('span');
    titleSpan.className = 'kc-info-title';
    titleSpan.style.fontWeight = 'bold';
    titleSpan.style.marginRight = '4px';
    titleSpan.style.color = '#ddd';
    titleSpan.textContent = currentCustomTitle + ":";
    infoContainer.appendChild(titleSpan);
  }

  // Tags
  if (currentCustomList) {
    let items = currentCustomList.split(/(?<!\\)[,，]/).map(s => s.trim()).filter(s => s);
    items.forEach((text, idx) => {
      infoContainer.appendChild(createListTag(text.replace(/\\,/g, ','), idx));
    });
  }

  container.appendChild(infoContainer);
}

function createListTag(text, index) {
  const span = document.createElement('span');
  span.className = 'kc-tag';

  const match = text.match(/^(.+?):([+-]?)(\d+)(?:\/(\d+))?/);
  if (match) {
    const name = match[1];
    const sign = match[2];
    const val = match[3];

    let disp = `${name}: ${val}`;
    span.textContent = disp;
    span.classList.add('kc-tag-counter');

    if (sign === '+') {
      span.title = "クリックでカウントアップ";
    } else if (sign === '-') {
      span.title = "クリックでカウントダウン";
    } else {
      span.title = "数値表示";
    }
  } else {
    span.textContent = text;
    span.classList.add('kc-tag-delete');
    span.title = "クリックで削除";
  }

  span.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (typeof handleTagClick === 'function') {
      handleTagClick(index);
    }
  };
  return span;
}

function renderBgmCard(el) {
  const elBgmHeader = el.querySelector('.kc-bgm-label');
  const elBgmText = el.querySelector('.kc-bgm-text');

  if (elBgmHeader) {
    elBgmHeader.textContent = currentBgmHeader || "♪";
  }

  if (elBgmText) {
    checkAndApplyScroll(elBgmText, currentBgm || "", currentBgmScrollMode || 'normal');
  }
}

function renderSenkaCard(el) {
  // BGM-style text display
  const elLabel = el.querySelector('.kc-senka-label'); // initCardContentで作成済み
  const elText = el.querySelector('.kc-senka-text');

  if (elLabel) {
    elLabel.textContent = "戦果";
  }
  if (elText) {
    elText.textContent = currentSenka || "--";
    el.title = "戦果: " + (currentSenka || "--");
  }
}

// 共通スクロール判定＆適用関数
function checkAndApplyScroll(el, text, mode) {
  // Observerリセット
  if (el._resizeObserver) {
    el._resizeObserver.disconnect();
    delete el._resizeObserver;
  }

  el.textContent = text;
  el.title = text;

  if (!text) return;

  const checkOverflow = () => {
    // 既存のスクロール構造があれば解除して判定
    const marqueeNormal = el.querySelector('.kc-text-marquee');
    const marqueeInfinite = el.querySelector('.kc-scroll-infinite-wrap');

    // 構造リセット判定
    let needsReset = false;
    if (marqueeNormal || marqueeInfinite) {
      // 幅判定のために一時的に戻したいが、チラつき防止のため
      // 内部コンテンツ幅を推測するか、強制リセットするか。
      // ここでは簡易的に、常にスクロール解除して再判定する（高頻度でなければOK）
      // 頻度が高い場合はDOMを保持したまま計測する工夫が必要。
      // リサイズ終了後(debounce後)の呼び出しが主なので、一旦リセットで対応。
      el.textContent = text;
    }

    if (el.scrollWidth > el.clientWidth) {
      // Overflow -> Apply Scroll based on mode

      // 速度係数計算 (1:Slow(10.0x) <-> 50:Normal(1.0x) <-> 100:Fast(0.1x))
      let factor = 1.0;
      if (currentScrollSpeed <= 50) {
        // 1(Slow) -> 50(Normal) : 10.0 -> 1.0
        // diff: 9.0 / 49
        factor = 10.0 - (currentScrollSpeed - 1) * (9.0 / 49);
      } else {
        // 50(Normal) -> 100(Fast) : 1.0 -> 0.1
        // diff: 0.9 / 50
        factor = 1.0 - (currentScrollSpeed - 50) * (0.9 / 50);
      }

      if (mode === 'circular') {
        // 無限スクロール
        // Base: 1文字0.4s + 2s (min 5s)
        const baseDuration = Math.max(5, text.length * 0.4 + 2);
        const duration = (baseDuration * factor) + 's';

        el.innerHTML = `
                <div class="kc-scroll-infinite-wrap">
                    <div class="kc-scroll-infinite-inner" style="animation-duration: ${duration};">
                        <span class="kc-scroll-item">${text}</span>
                        <span class="kc-scroll-item">${text}</span>
                    </div>
                </div>`;
      } else {
        // 環状シフト (Normal)
        // Base: CSS default 15s. Adjusting this by factor.
        const baseDuration = 15;
        const duration = (baseDuration * factor) + 's';
        el.innerHTML = `<div class="kc-text-marquee" style="animation-duration: ${duration};">${text}</div>`;
      }
    } else {
      // Not overflow -> Plain text (already set)
    }
  };

  // 初回
  checkOverflow();

  // ResizeObserver
  let resizeTimer;
  const observer = new ResizeObserver(entries => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(checkOverflow, 200);
  });
  observer.observe(el);
  el._resizeObserver = observer;
}

// -----------------------------------------------------
// コントロールパネル作成・その他
// -----------------------------------------------------
function createControlWindow() {
  const div = document.createElement('div');
  div.id = 'kc-win-control';
  div.innerHTML = `
    <div class="kc-ctrl-header" id="kc-drag-ctrl">
      <span>:::コントロールパネル:::</span>
    </div>
    <div class="kc-ctrl-body kc-ctrl-body-start">
      <div class="kc-section kc-section-timer">
        <div class="kc-label-side">タイマー設定</div>
        <div class="kc-content-side">
          <div class="kc-input-row">
             <input type="text" class="kc-input kc-numpad-trigger kc-timer-input-manual" id="kc-timer-manual" placeholder="分">
             <button class="kc-btn kc-timer-btn" id="kc-btn-manual-set">設定</button>
             <button class="kc-btn kc-btn-red kc-timer-btn-stop" id="kc-btn-stop">停止</button>
          </div>
          <div class="kc-btn-row" id="kc-timer-presets-row"></div>
          <div class="kc-cond-row">
            <label class="kc-check-label kc-cond-port-supply">
              給<input type="checkbox" id="kc-chk-port-supply">
            </label>
            <span class="kc-mini-label kc-label-cond">疲労度</span>
            <input type="text" id="kc-cond-curr" class="kc-input-short kc-numpad-trigger kc-input-cond" placeholder="現在">
            <span class="kc-arrow-cond">→</span>
            <input type="text" id="kc-cond-tgt" class="kc-input-short kc-numpad-trigger kc-input-cond" placeholder="目標" value="49">
            <button class="kc-btn kc-btn-cond-set" id="kc-btn-cond-set">設定</button>
          </div>
        </div>
      </div>
      <div class="kc-section kc-section-map">
        <div class="kc-label-side">海域情報設定</div>
        <div class="kc-content-side">
        <div class="kc-setting-row kc-mb-1">
            <label class="kc-check-label"><input type="checkbox" id="kc-chk-event"> 限定(E)</label>
            <input type="text" id="kc-map-major" class="kc-input-short kc-numpad-trigger" placeholder="1">
            <span class="kc-text-gray">-</span>
            <input type="text" id="kc-map-minor" class="kc-input-short kc-numpad-trigger" placeholder="1">
          </div>
          <div class="kc-setting-row kc-mb-1">
            <span class="kc-mini-label kc-label-map">難易度</span>
            <div class="kc-btn-group" id="kc-grp-diff">
              <button class="kc-btn-s" data-val="kou">甲</button>
              <button class="kc-btn-s" data-val="otsu">乙</button>
              <button class="kc-btn-s" data-val="hei">丙</button>
              <button class="kc-btn-s" data-val="tei">丁</button>
              <button class="kc-btn-s active" data-val="none">なし</button>
            </div>
          </div>
          <div class="kc-setting-row kc-mb-1">
            <span class="kc-mini-label kc-label-map">状態</span>
            <div class="kc-btn-group" id="kc-grp-status">
              <button class="kc-btn-s" data-val="gimmick">ギ</button>
              <button class="kc-btn-s" data-val="chip">削</button>
              <button class="kc-btn-s" data-val="last">ラ</button>
              <button class="kc-btn-s" data-val="farm">掘</button>
              <button class="kc-btn-s active" data-val="none">なし</button>
            </div>
          </div>
        </div>
        <div id="kc-numpad" class="kc-numpad">
          <div class="kc-numpad-row">
            <button class="kc-num-btn">7</button>
            <button class="kc-num-btn">8</button>
            <button class="kc-num-btn">9</button>
          </div>
          <div class="kc-numpad-row">
            <button class="kc-num-btn">4</button>
            <button class="kc-num-btn">5</button>
            <button class="kc-num-btn">6</button>
          </div>
          <div class="kc-numpad-row">
            <button class="kc-num-btn">1</button>
            <button class="kc-num-btn">2</button>
            <button class="kc-num-btn">3</button>
          </div>
          <div class="kc-numpad-row-bottom">
            <button class="kc-num-btn">0</button>
            <button class="kc-icon-btn" id="kc-num-bs" title="消去">⌫</button>
            <button class="kc-icon-btn" id="kc-num-close" title="閉じる">▼</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  setupDrag(div, document.getElementById('kc-drag-ctrl'));

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  renderTimerPresets();
  return div;
}

function updateTimerVisibility() {
  const el = document.getElementById('kc-win-timer');
  if (!el) return;

  if (currentTimerMode === 'auto') {
    el.style.display = isTimerRunning ? 'block' : 'none';
  } else {
    el.style.display = 'block';
  }
}

function renderTimerPresets() {
  const container = document.getElementById('kc-timer-presets-row');
  if (!container) return;
  container.innerHTML = '';
  const validPresets = currentTimerPresets.filter(p => p !== null && !isNaN(p));

  validPresets.forEach(min => {
    const btn = document.createElement('button');
    btn.className = 'kc-btn';
    btn.textContent = min;
    btn.onclick = () => { if (startTimerFunc) startTimerFunc(min); };
    container.appendChild(btn);
  });
}

function updateWindowStatus(elementId, isVisible, hasFrame) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (elementId !== 'kc-win-timer') {
    el.style.display = (isVisible === false) ? 'none' : 'block';
  }
  if (hasFrame === false) el.classList.add('kc-no-frame');
  else el.classList.remove('kc-no-frame');
}
