// kcLayoutView.js
// 情報パネルの行・列・カード配置を描画する。

function updateLayout(config) {
  const contentArea = document.getElementById('kc-area-content');
  if (!contentArea) return;
  updateLayoutV2(KcSettings.normalizeLayout(config));
}

function updateLayoutV2(config) {
  const contentArea = document.getElementById('kc-area-content');
  contentArea.replaceChildren();

  config.rows.forEach((row) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'kc-layout-row';

    row.columns.forEach((column) => {
      const columnElement = document.createElement('div');
      columnElement.className = 'kc-layout-column';
      if (column.fitContent) {
        columnElement.classList.add('kc-layout-column-fit');
      } else {
        columnElement.style.flexGrow = column.flex;
      }

      column.items.forEach((item) => {
        const card = createLayoutElement(item.type);
        if (!card) return;
        card.classList.add('kc-layout-item');
        card.style.flexGrow = item.flex;
        columnElement.appendChild(card);
      });
      rowElement.appendChild(columnElement);
    });
    contentArea.appendChild(rowElement);
  });

  renderInfoDisplay();
}

function createLayoutElement(type) {
  const definition = CARD_DEFINITIONS[type];
  if (!definition) return null;

  const element = document.createElement('div');
  element.className = [definition.className, `kc-card-${type.toLowerCase()}`]
    .filter(Boolean)
    .join(' ');
  initCardContent(type, element);
  return element;
}
