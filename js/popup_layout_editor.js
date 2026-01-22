// ============================================================
// レイアウトエディタのロジック（行内列対応版）
// ============================================================

let layoutConfig = { rows: [] };

// ============================================================
// 初期化
// ============================================================

function initLayoutEditor() {
    const dropzone = document.getElementById('layout-dropzone');
    const palette = document.getElementById('layout-palette');

    // パレット動的生成
    if (palette && typeof CARD_DEFINITIONS !== 'undefined') {
        palette.innerHTML = '';
        Object.keys(CARD_DEFINITIONS).forEach(type => {
            const def = CARD_DEFINITIONS[type];
            const card = document.createElement('div');
            card.className = 'layout-card-draggable';
            card.dataset.type = type;
            card.draggable = true;
            card.innerHTML = `
                <span class="card-icon"><i class="${def.icon}"></i></span>
                <span class="card-name">${def.label}</span>
            `;
            palette.appendChild(card);
        });
    }

    const draggables = document.querySelectorAll('.layout-card-draggable');
    if (!dropzone) return;

    // ドラッグイベントの設定
    draggables.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('drop', handleDrop);
    dropzone.addEventListener('dragleave', handleDragLeave);

    const btnSnap = document.getElementById('btn-snap-toggle');
    if (btnSnap) {
        btnSnap.onclick = (e) => {
            e.preventDefault(); // Labelクリック時の挙動防止
            btnSnap.classList.toggle('active');
        };
    }

    loadLayoutConfig();
}

// ============================================================
// ドラッグ&ドロップ処理
// ============================================================

function handleDragStart(e) {
    e.dataTransfer.setData('cardType', e.currentTarget.dataset.type);
    e.currentTarget.style.opacity = '0.5';
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
}

function handleDragOver(e) {
    e.preventDefault();
    const col = e.target.closest('.layout-column');

    // 全ての列からハイライトを削除（ちらつき防止のため）
    document.querySelectorAll('.layout-column').forEach(c => c.classList.remove('drag-over-column'));

    if (col) {
        col.classList.add('drag-over-column');
        e.dataTransfer.dropEffect = 'copy';
    } else {
        e.dataTransfer.dropEffect = 'none';
    }
}

function handleDragLeave(e) {
    // 関連するターゲットがドロップゾーン外の場合のみ削除するなど工夫が必要だが、
    // 単純化のため、ここでは何もしないか、あるいは特定条件下で削除
    // handleDragOverで毎回リセットしているので、ここでは明示的に消さなくてもよいが、
    // ドロップゾーンから完全に出た場合のために削除処理を入れる
    if (!e.relatedTarget || !e.relatedTarget.closest('#layout-dropzone')) {
        document.querySelectorAll('.layout-column').forEach(c => c.classList.remove('drag-over-column'));
    }
}

function handleDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.layout-column').forEach(c => c.classList.remove('drag-over-column'));

    const cardType = e.dataTransfer.getData('cardType');
    if (!cardType) return;

    const colElement = e.target.closest('.layout-column');
    if (!colElement) return;

    const rowElement = colElement.closest('.layout-row');
    if (!rowElement) return;

    const dropzone = document.getElementById('layout-dropzone');
    const allRows = Array.from(dropzone.querySelectorAll('.layout-row'));
    const rowIndex = allRows.indexOf(rowElement);

    const allCols = Array.from(rowElement.querySelectorAll('.layout-column'));
    const colIndex = allCols.indexOf(colElement);

    if (rowIndex !== -1 && colIndex !== -1) {
        addCardToColumn(rowIndex, colIndex, cardType);
    }
}

// ============================================================
// カード配置・削除
// ============================================================

function addCardToColumn(rowIndex, colIndex, type) {
    if (rowIndex >= 0 && rowIndex < layoutConfig.rows.length) {
        const row = layoutConfig.rows[rowIndex];
        if (colIndex >= 0 && colIndex < row.columns.length) {
            row.columns[colIndex].items = [{ type, flex: 1 }];
            renderDropzone();
        }
    }
}

function removeCard(cardElement) {
    const colElement = cardElement.closest('.layout-column');
    const rowElement = cardElement.closest('.layout-row');
    if (!rowElement || !colElement) return;

    const dropzone = document.getElementById('layout-dropzone');
    const allRows = Array.from(dropzone.querySelectorAll('.layout-row'));
    const rowIndex = allRows.indexOf(rowElement);

    const allCols = Array.from(rowElement.querySelectorAll('.layout-column'));
    const colIndex = allCols.indexOf(colElement);

    if (rowIndex !== -1 && colIndex !== -1) {
        layoutConfig.rows[rowIndex].columns[colIndex].items = [];
        renderDropzone();
    }
}

// ============================================================
// 行・列の追加・削除
// ============================================================

function addRow() {
    layoutConfig.rows.push({ columns: [{ items: [], flex: 1 }] });
    renderDropzone();
}

function removeRow(rowIndex) {
    if (layoutConfig.rows.length <= 1) return;
    if (rowIndex >= 0 && rowIndex < layoutConfig.rows.length) {
        layoutConfig.rows.splice(rowIndex, 1);
        renderDropzone();
    }
}

function addColumnAfter(rowIndex, colIndex) {
    if (rowIndex >= 0 && rowIndex < layoutConfig.rows.length) {
        layoutConfig.rows[rowIndex].columns.splice(colIndex + 1, 0, {
            items: [],
            flex: 1
        });
        renderDropzone();
    }
}

function removeColumn(rowIndex, colIndex) {
    if (rowIndex >= 0 && rowIndex < layoutConfig.rows.length) {
        const row = layoutConfig.rows[rowIndex];
        if (row.columns.length > 1) {
            row.columns.splice(colIndex, 1);
            renderDropzone();
        }
    }
}

// ============================================================
// UI描画
// ============================================================

function renderDropzone() {
    const dropzone = document.getElementById('layout-dropzone');
    if (!dropzone) return;

    dropzone.innerHTML = '';

    layoutConfig.rows.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'layout-row';
        rowDiv.style.display = 'flex';
        rowDiv.style.flexDirection = 'row';
        rowDiv.style.gap = '0';
        rowDiv.style.alignItems = 'stretch';
        rowDiv.style.marginBottom = '4px';
        rowDiv.style.minHeight = '60px';
        rowDiv.style.background = '#222';
        rowDiv.style.border = '1px dashed #444';
        rowDiv.style.position = 'relative';

        // 行内の各列を描画
        row.columns.forEach((column, colIndex) => {
            const colDiv = document.createElement('div');
            colDiv.className = 'layout-column';
            colDiv.style.flex = column.flex || 1;
            colDiv.style.display = 'flex';
            colDiv.style.flexDirection = 'column';
            colDiv.style.alignItems = 'stretch';
            colDiv.style.position = 'relative';

            // カードを配置
            if (column.items.length > 0) {
                const item = column.items[0];
                const card = createCardElement(item.type, item.flex);
                colDiv.appendChild(card);
            }

            // 空の列の削除ボタン
            if (column.items.length === 0 && row.columns.length > 1) {
                const removeBtn = document.createElement('div');
                removeBtn.className = 'region-remove-btn';
                removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                removeBtn.title = 'この列を削除';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    removeColumn(rowIndex, colIndex);
                };
                removeBtn.onmouseenter = () => {
                    colDiv.classList.add('region-delete-target');
                };
                removeBtn.onmouseleave = () => {
                    colDiv.classList.remove('region-delete-target');
                };
                colDiv.appendChild(removeBtn);
            }

            // Fit Content ボタン (常に表示、あるいは条件付き)
            const fitBtn = document.createElement('div');
            fitBtn.className = 'region-fit-btn';
            if (column.fitContent) fitBtn.classList.add('active');
            fitBtn.innerHTML = '<i class="fa-solid fa-left-right"></i>';
            fitBtn.title = '幅を中身に合わせる (自動)';
            fitBtn.onclick = (e) => {
                e.stopPropagation();
                // Toggle
                column.fitContent = !column.fitContent;
                // fitContent有効なら flexは無視されるが、データとしては残しておいても良い
                renderDropzone();
            };
            colDiv.appendChild(fitBtn);

            // Editor上での見た目調整: fitContentなら flex表示ではなく auto にする
            if (column.fitContent) {
                colDiv.style.flex = '0 0 auto';
                colDiv.style.width = 'auto';
                colDiv.style.borderStyle = 'dotted'; // 視覚的区別
            } else {
                colDiv.style.borderStyle = 'none';
            }

            rowDiv.appendChild(colDiv);

            // リサイザーを追加（最後の列以外）
            if (colIndex < row.columns.length - 1) {
                const resizer = createColumnResizer(rowIndex, colIndex);
                rowDiv.appendChild(resizer);
            }
        });

        // 空の行の削除ボタン（行全体が空の場合のみ）
        if (row.columns.length === 1 && row.columns[0].items.length === 0 && layoutConfig.rows.length > 1) {
            const rowRemoveBtn = document.createElement('div');
            rowRemoveBtn.className = 'region-remove-btn';
            rowRemoveBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            rowRemoveBtn.title = 'この行を削除';
            rowRemoveBtn.onclick = (e) => {
                e.stopPropagation();
                removeRow(rowIndex);
            };
            rowRemoveBtn.onmouseenter = () => {
                rowDiv.classList.add('region-delete-target');
            };
            rowRemoveBtn.onmouseleave = () => {
                rowDiv.classList.remove('region-delete-target');
            };
            rowDiv.appendChild(rowRemoveBtn);
        }

        // 列追加ボタン（行の右端中央）
        const addColBtn = document.createElement('div');
        addColBtn.className = 'row-column-add-btn';
        addColBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addColBtn.title = '列を追加';
        addColBtn.onclick = (e) => {
            e.stopPropagation();
            addColumnAfter(rowIndex, row.columns.length - 1);
        };
        rowDiv.appendChild(addColBtn);

        dropzone.appendChild(rowDiv);
    });

    // 行追加ボタン
    const addBtn = document.createElement('div');
    addBtn.className = 'add-region-btn';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBtn.title = '行を追加';
    addBtn.onclick = addRow;
    dropzone.appendChild(addBtn);
}

function createCardElement(type, flex) {
    const card = document.createElement('div');
    card.className = 'layout-item-placed';
    card.dataset.type = type;
    card.style.flex = flex;

    let icon = '?';
    let label = type;

    if (typeof CARD_DEFINITIONS !== 'undefined' && CARD_DEFINITIONS[type]) {
        icon = CARD_DEFINITIONS[type].icon;
        label = CARD_DEFINITIONS[type].label;
    }

    card.innerHTML = `
        <span class="card-icon"><i class="${icon}"></i></span>
        <span class="card-name">${label}</span>
        <div class="layout-item-remove" title="削除">×</div>
    `;

    card.querySelector('.layout-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeCard(card);
    });

    return card;
}

function createColumnResizer(rowIndex, leftColIndex) {
    const resizer = document.createElement('div');
    resizer.className = 'column-resizer';

    let startX, startLeftFlex, startRightFlex;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;

        const row = layoutConfig.rows[rowIndex];
        startLeftFlex = row.columns[leftColIndex].flex || 1;
        startRightFlex = row.columns[leftColIndex + 1].flex || 1;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    function handleMouseMove(e) {
        const deltaX = e.clientX - startX;
        const row = layoutConfig.rows[rowIndex];

        const rowElement = resizer.parentElement;
        const containerWidth = rowElement.offsetWidth;
        // 現在の合計Flex値
        const totalFlex = startLeftFlex + startRightFlex;
        const deltaFlex = (deltaX / containerWidth) * totalFlex;

        let newLeftFlex = Math.max(0.2, startLeftFlex + deltaFlex);
        let newRightFlex = Math.max(0.2, startRightFlex - deltaFlex);

        // --- Snapping Logic ---
        const btnSnap = document.getElementById('btn-snap-toggle');
        const isSnapEnabled = btnSnap ? btnSnap.classList.contains('active') : false;
        let snapText = null;

        if (isSnapEnabled) {
            const sumFlex = newLeftFlex + newRightFlex;
            const rawRatio = newLeftFlex / sumFlex;

            // Snap targets
            const snapPoints = [
                { val: 0.25, label: "1:3 (25%)" },
                { val: 0.3333, label: "1:2 (33%)" },
                { val: 0.5, label: "1:1 (50%)" },
                { val: 0.6666, label: "2:1 (67%)" },
                { val: 0.75, label: "3:1 (75%)" }
            ];
            const tolerance = 0.03;

            for (let p of snapPoints) {
                if (Math.abs(rawRatio - p.val) < tolerance) {
                    // Snap!
                    const snappedLeft = sumFlex * p.val;
                    const snappedRight = sumFlex - snappedLeft;
                    newLeftFlex = snappedLeft;
                    newRightFlex = snappedRight;
                    snapText = p.label;
                    break;
                }
            }
        }

        // Indicator Update
        let indicator = document.getElementById('snap-indicator-tooltip');
        if (snapText) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'snap-indicator-tooltip';
                indicator.className = 'snap-indicator';
                // リサイザー自体の子要素にするか、body直下にするか。
                // リサイザーと一緒に動くならリサイザーの子が良いが、overflowの問題があるかも。
                // ここでは dropzone 内あるいは resizer の近くに配置。
                // 座標計算が面倒なので resizer に append するのが楽。
                resizer.appendChild(indicator);
            }
            indicator.textContent = snapText;
            indicator.style.display = 'block';
        } else {
            if (indicator) indicator.style.display = 'none';
        }

        row.columns[leftColIndex].flex = newLeftFlex;
        row.columns[leftColIndex + 1].flex = newRightFlex;

        const cols = rowElement.querySelectorAll('.layout-column');
        if (cols[leftColIndex]) cols[leftColIndex].style.flex = newLeftFlex;
        if (cols[leftColIndex + 1]) cols[leftColIndex + 1].style.flex = newRightFlex;
    }

    function handleMouseUp() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // Remove Indicator
        const indicator = document.getElementById('snap-indicator-tooltip');
        if (indicator) indicator.remove();
        // 保存はmousemove中にはしないが、mouseupでしたほうが良い場合の処理があればここに
        // 現状は layoutConfig を直接いじっているので、そのまま保存されるタイミング（明示的な保存ボタン）でOK
    }

    return resizer;
}

// ============================================================
// 設定の読み込み・保存
// ============================================================

function getLayoutConfig() {
    return layoutConfig;
}

function setLayoutConfig(config) {
    if (config) {
        layoutConfig = config;
    } else {
        layoutConfig = { rows: [{ columns: [{ items: [], flex: 1 }] }] };
    }
    renderDropzone();
}

function loadLayoutConfig() {
    chrome.storage.local.get(['infoLayoutConfig'], (result) => {
        if (result.infoLayoutConfig) {
            layoutConfig = result.infoLayoutConfig;
        } else {
            layoutConfig = {
                rows: [{ columns: [{ items: [], flex: 1 }] }]
            };
        }
        renderDropzone();
    });
}

// ============================================================
// イベントリスナー登録
// ============================================================

document.addEventListener('DOMContentLoaded', initLayoutEditor);
