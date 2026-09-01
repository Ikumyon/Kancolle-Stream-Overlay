// popup_layout_model.js
// レイアウトエディタのデータ操作をDOMから分離する。

(function initializeLayoutModel(global) {
  function create(initialValue) {
    let value = KcSettings.normalizeLayout(initialValue);
    const get = () => KcSettings.clone(value);
    const set = (nextValue) => { value = KcSettings.normalizeLayout(nextValue); };
    const columnAt = (rowIndex, columnIndex) => value.rows[rowIndex]?.columns[columnIndex] || null;

    function setCard(rowIndex, columnIndex, type) {
      const column = columnAt(rowIndex, columnIndex);
      if (!column || !CARD_DEFINITIONS[type]) return false;
      column.items = [{ type, flex: 1 }];
      return true;
    }
    function removeCard(rowIndex, columnIndex) {
      const column = columnAt(rowIndex, columnIndex);
      if (!column) return false;
      column.items = [];
      return true;
    }
    function addRow() {
      value.rows.push({ columns: [{ items: [], flex: 1, fitContent: false }] });
    }
    function removeRow(rowIndex) {
      if (value.rows.length <= 1 || !value.rows[rowIndex]) return false;
      value.rows.splice(rowIndex, 1);
      return true;
    }
    function addColumn(rowIndex, afterColumnIndex) {
      const row = value.rows[rowIndex];
      if (!row) return false;
      row.columns.splice(afterColumnIndex + 1, 0, { items: [], flex: 1, fitContent: false });
      return true;
    }
    function removeColumn(rowIndex, columnIndex) {
      const row = value.rows[rowIndex];
      if (!row || row.columns.length <= 1 || !row.columns[columnIndex]) return false;
      row.columns.splice(columnIndex, 1);
      return true;
    }
    function toggleFitContent(rowIndex, columnIndex) {
      const column = columnAt(rowIndex, columnIndex);
      if (!column) return false;
      column.fitContent = !column.fitContent;
      return true;
    }
    function setColumnFlexes(rowIndex, leftColumnIndex, leftFlex, rightFlex) {
      const left = columnAt(rowIndex, leftColumnIndex);
      const right = columnAt(rowIndex, leftColumnIndex + 1);
      if (!left || !right) return false;
      left.flex = leftFlex;
      right.flex = rightFlex;
      return true;
    }

    return Object.freeze({ get, set, setCard, removeCard, addRow, removeRow, addColumn, removeColumn, toggleFitContent, setColumnFlexes });
  }
  global.KcLayoutModel = Object.freeze({ create });
})(globalThis);
