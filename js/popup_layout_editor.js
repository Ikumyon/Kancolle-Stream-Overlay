// popup_layout_editor.js
// レイアウトの描画、カード選択、ドラッグ、キーボード操作を管理する。

const layoutModel = KcLayoutModel.create(DEFAULT_SETTINGS.layoutConfig);
let selectedCardType = null;

const CARD_DESCRIPTIONS = {
  map: '海域・難易度・進行状態の表示設定',
  text: '自由記述とスクロール方法を編集',
  list: 'タイトルとカウント対応リストを編集',
  BGMtitle: 'BGM連動と曲名表示を編集',
  senka: '受信した戦果情報を表示'
};

function initLayoutEditor() {
  renderPalette();
  renderDropzone();

  const dropzone = document.getElementById('layout-dropzone');
  dropzone.addEventListener('dragover', handleDragOver);
  dropzone.addEventListener('drop', handleDrop);
  dropzone.addEventListener('dragleave', handleDragLeave);

  const snapButton = document.getElementById('btn-snap-toggle');
  snapButton.addEventListener('click', () => {
    const active = snapButton.classList.toggle('active');
    snapButton.setAttribute('aria-pressed', String(active));
  });
}

function renderPalette() {
  const palette = document.getElementById('layout-palette');
  palette.replaceChildren();

  Object.entries(CARD_DEFINITIONS).forEach(([type, definition]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'layout-card-draggable';
    card.dataset.type = type;
    card.draggable = true;
    card.title = `${definition.label}カードを選択`;
    card.append(
      createEditorSpan('card-icon', definition.symbol),
      createEditorSpan('card-name', definition.label)
    );
    card.addEventListener('click', () => selectCardType(type));
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    palette.appendChild(card);
  });
}

function createEditorSpan(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function selectCardType(type) {
  selectedCardType = CARD_DEFINITIONS[type] ? type : null;
  document.querySelectorAll('.layout-card-draggable').forEach((card) => {
    card.classList.toggle('selected', card.dataset.type === selectedCardType);
  });
  document.querySelectorAll('.layout-item-placed').forEach((card) => {
    card.classList.toggle('selected', card.dataset.type === selectedCardType);
  });
  document.querySelectorAll('.empty-column-target').forEach((target) => {
    const label = selectedCardType
      ? `${CARD_DEFINITIONS[selectedCardType].label}カードをここに配置`
      : '空の列。先にカードを選択してください';
    target.title = label;
    target.setAttribute('aria-label', label);
  });
  showCardSettings(selectedCardType);
}

function showCardSettings(type) {
  const definition = CARD_DEFINITIONS[type];
  document.getElementById('cardInspectorTitle').textContent = definition
    ? `${definition.label}カード`
    : 'カード設定';
  document.getElementById('cardInspectorDescription').textContent = definition
    ? CARD_DESCRIPTIONS[type]
    : '編集するカードを選択してください。';

  document.querySelectorAll('.card-settings-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.cardSettings === (type || 'none'));
  });
}

function handleDragStart(event) {
  const type = event.currentTarget.dataset.type;
  selectCardType(type);
  event.dataTransfer.setData('cardType', type);
  event.currentTarget.classList.add('dragging');
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  clearDropHighlights();
}

function handleDragOver(event) {
  event.preventDefault();
  clearDropHighlights();
  const column = event.target.closest('.layout-column');
  if (!column) {
    event.dataTransfer.dropEffect = 'none';
    return;
  }
  column.classList.add('drag-over-column');
  event.dataTransfer.dropEffect = 'copy';
}

function handleDragLeave(event) {
  if (!event.relatedTarget || !event.relatedTarget.closest('#layout-dropzone')) {
    clearDropHighlights();
  }
}

function handleDrop(event) {
  event.preventDefault();
  const type = event.dataTransfer.getData('cardType');
  const column = event.target.closest('.layout-column');
  clearDropHighlights();
  if (!type || !column) return;
  placeCard(Number(column.dataset.rowIndex), Number(column.dataset.columnIndex), type);
}

function clearDropHighlights() {
  document.querySelectorAll('.layout-column').forEach((column) => {
    column.classList.remove('drag-over-column');
  });
}

function placeCard(rowIndex, columnIndex, type = selectedCardType) {
  if (!type || !layoutModel.setCard(rowIndex, columnIndex, type)) return;
  selectCardType(type);
  renderDropzone();
  announceLayoutChange();
}

function removeCard(rowIndex, columnIndex) {
  if (!layoutModel.removeCard(rowIndex, columnIndex)) return;
  renderDropzone();
  announceLayoutChange();
}

function addRow() {
  layoutModel.addRow();
  renderDropzone();
  announceLayoutChange();
}

function removeRow(rowIndex) {
  if (!layoutModel.removeRow(rowIndex)) return;
  renderDropzone();
  announceLayoutChange();
}

function addColumnAfter(rowIndex, columnIndex) {
  if (!layoutModel.addColumn(rowIndex, columnIndex)) return;
  renderDropzone();
  announceLayoutChange();
}

function removeColumn(rowIndex, columnIndex) {
  if (!layoutModel.removeColumn(rowIndex, columnIndex)) return;
  renderDropzone();
  announceLayoutChange();
}

function renderDropzone() {
  const dropzone = document.getElementById('layout-dropzone');
  if (!dropzone) return;
  dropzone.replaceChildren();

  const config = layoutModel.get();
  config.rows.forEach((row, rowIndex) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'layout-row';

    row.columns.forEach((column, columnIndex) => {
      const columnElement = document.createElement('div');
      columnElement.className = 'layout-column';
      columnElement.dataset.rowIndex = rowIndex;
      columnElement.dataset.columnIndex = columnIndex;
      columnElement.style.flex = column.flex || 1;

      if (column.items.length === 0) {
        columnElement.classList.add('layout-column-empty');
        const placementButton = createIconButton('empty-column-target', 'クリックで配置', selectedCardType
          ? `${CARD_DEFINITIONS[selectedCardType].label}カードをここに配置`
          : '空の列。先にカードを選択してください', () => {
          placeCard(rowIndex, columnIndex);
        });
        columnElement.appendChild(placementButton);
      } else {
        const item = column.items[0];
        columnElement.appendChild(createCardElement(item.type, rowIndex, columnIndex));
      }

      if (column.items.length === 0 && row.columns.length > 1) {
        columnElement.appendChild(createIconButton('region-remove-btn', '×', 'この列を削除', (event) => {
          event.stopPropagation();
          removeColumn(rowIndex, columnIndex);
        }));
      }

      const fitButton = createIconButton('region-fit-btn', '↔', '幅を内容に合わせる', (event) => {
        event.stopPropagation();
        if (layoutModel.toggleFitContent(rowIndex, columnIndex)) {
          renderDropzone();
          announceLayoutChange();
        }
      });
      fitButton.classList.toggle('active', column.fitContent);
      fitButton.setAttribute('aria-pressed', String(column.fitContent));
      columnElement.appendChild(fitButton);
      if (column.fitContent) columnElement.classList.add('layout-column-fit');

      rowElement.appendChild(columnElement);
      if (columnIndex < row.columns.length - 1) {
        rowElement.appendChild(createColumnResizer(rowIndex, columnIndex));
      }
    });

    if (row.columns.length === 1 && row.columns[0].items.length === 0 && config.rows.length > 1) {
      rowElement.appendChild(createIconButton('region-remove-btn', '×', 'この行を削除', () => removeRow(rowIndex)));
    }

    rowElement.appendChild(createIconButton('row-column-add-btn', '+', '列を追加', () => {
      addColumnAfter(rowIndex, row.columns.length - 1);
    }));
    dropzone.appendChild(rowElement);
  });

  dropzone.appendChild(createIconButton('add-region-btn', '+', '行を追加', addRow));
  selectCardType(selectedCardType);
}

function createCardElement(type, rowIndex, columnIndex) {
  const definition = CARD_DEFINITIONS[type];
  const card = document.createElement('div');
  card.className = 'layout-item-placed';
  card.dataset.type = type;
  const selectButton = document.createElement('button');
  selectButton.type = 'button';
  selectButton.className = 'layout-item-select';
  selectButton.setAttribute('aria-label', `${definition.label}カードを編集`);
  selectButton.append(
    createEditorSpan('card-icon', definition.symbol),
    createEditorSpan('card-name', definition.label)
  );
  selectButton.addEventListener('click', () => selectCardType(type));
  card.append(
    selectButton,
    createIconButton('layout-item-remove', '×', `${definition.label}カードを削除`, (event) => {
      event.stopPropagation();
      removeCard(rowIndex, columnIndex);
    })
  );
  return card;
}

function createIconButton(className, symbol, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = symbol;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

function createColumnResizer(rowIndex, leftColumnIndex) {
  const resizer = document.createElement('div');
  resizer.className = 'column-resizer';
  resizer.setAttribute('role', 'separator');
  resizer.setAttribute('aria-label', '列幅を調整');

  let startX = 0;
  let startLeftFlex = 1;
  let startRightFlex = 1;

  resizer.addEventListener('mousedown', (event) => {
    event.preventDefault();
    startX = event.clientX;
    const row = layoutModel.get().rows[rowIndex];
    startLeftFlex = row.columns[leftColumnIndex].flex || 1;
    startRightFlex = row.columns[leftColumnIndex + 1].flex || 1;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  function handleMouseMove(event) {
    const rowElement = resizer.parentElement;
    const totalFlex = startLeftFlex + startRightFlex;
    const deltaFlex = ((event.clientX - startX) / rowElement.offsetWidth) * totalFlex;
    let leftFlex = Math.max(0.2, startLeftFlex + deltaFlex);
    let rightFlex = Math.max(0.2, startRightFlex - deltaFlex);
    const snapped = getSnappedFlex(leftFlex, rightFlex);
    leftFlex = snapped.left;
    rightFlex = snapped.right;
    updateSnapIndicator(resizer, snapped.label);
    layoutModel.setColumnFlexes(rowIndex, leftColumnIndex, leftFlex, rightFlex);
    const columns = rowElement.querySelectorAll('.layout-column');
    columns[leftColumnIndex].style.flex = leftFlex;
    columns[leftColumnIndex + 1].style.flex = rightFlex;
  }

  function handleMouseUp() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    resizer.querySelector('.snap-indicator')?.remove();
    announceLayoutChange();
  }
  return resizer;
}

function getSnappedFlex(left, right) {
  const snapEnabled = document.getElementById('btn-snap-toggle').classList.contains('active');
  if (!snapEnabled) return { left, right, label: null };
  const total = left + right;
  const ratio = left / total;
  const snapPoints = [
    { value: 0.25, label: '1:3' }, { value: 1 / 3, label: '1:2' },
    { value: 0.5, label: '1:1' }, { value: 2 / 3, label: '2:1' },
    { value: 0.75, label: '3:1' }
  ];
  const point = snapPoints.find((candidate) => Math.abs(ratio - candidate.value) < 0.03);
  return point
    ? { left: total * point.value, right: total * (1 - point.value), label: point.label }
    : { left, right, label: null };
}

function updateSnapIndicator(resizer, label) {
  let indicator = resizer.querySelector('.snap-indicator');
  if (!label) {
    indicator?.remove();
    return;
  }
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'snap-indicator';
    resizer.appendChild(indicator);
  }
  indicator.textContent = label;
}

function announceLayoutChange() {
  document.dispatchEvent(new CustomEvent('kc-layout-change'));
}

function getLayoutConfig() {
  return layoutModel.get();
}

function setLayoutConfig(config) {
  layoutModel.set(config);
  renderDropzone();
}

document.addEventListener('DOMContentLoaded', initLayoutEditor);
