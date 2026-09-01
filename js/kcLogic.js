// kcLogic.js
// ロジック制御、イベントリスナー、データ保存

function setupLogic() {
  // マップ更新
  const inpMajor = document.getElementById('kc-map-major');
  const inpMinor = document.getElementById('kc-map-minor');
  const chkEvent = document.getElementById('kc-chk-event');
  const chkBgm = document.getElementById('kc-chk-bgm');
  const inpTimerManual = document.getElementById('kc-timer-manual');
  const inpCondCurr = document.getElementById('kc-cond-curr');
  const inpCondTgt = document.getElementById('kc-cond-tgt');
  const chkPortSupply = document.getElementById('kc-chk-port-supply');
  const numpad = document.getElementById('kc-numpad');

  // マップ更新
  const updateMap = () => {
    currentIsEvent = chkEvent.checked;
    currentMapMajor = inpMajor.value;
    currentMapMinor = inpMinor.value;
    saveLocalData();
    renderInfoDisplay();
  };

  // テンキー制御
  const openNumpad = (targetId) => {
    if (!currentNumpadEnabled) return;

    activeInputId = targetId;
    numpad.style.display = 'block';

    const targetEl = document.getElementById(targetId);

    // Numpadの親要素とターゲット要素の絶対座標（画面座標）を取得し比較する
    const targetRect = targetEl.getBoundingClientRect();
    const parentRect = (numpad.offsetParent || document.body).getBoundingClientRect();

    // 画面座標同士の差分をとることで親からの正確な相対位置を算出
    const topPos = (targetRect.bottom - parentRect.top) + 5;

    // ターゲット中央への配置： ターゲットの左端(相対) + ターゲット幅半分 - テンキー幅(140)半分
    let leftPos = (targetRect.left - parentRect.left) + (targetRect.width / 2) - 70;

    // コントロールパネル自体の左端をはみ出さないための簡易なリミッター
    const ctrlRect = document.getElementById('kc-win-control').getBoundingClientRect();
    const minLeft = ctrlRect.left - parentRect.left + 5;
    if (leftPos < minLeft) leftPos = minLeft;

    numpad.style.top = topPos + 'px';
    numpad.style.left = leftPos + 'px';
  };

  const closeNumpad = () => {
    numpad.style.display = 'none';
    activeInputId = null;
  };

  const attachNumpad = (el) => {
    // クリックでNumpadを開く
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openNumpad(el.id);
    });

    // キーボードの直接入力対応 (inputイベント時のバリデーション等)
    el.addEventListener('input', () => {
      // 全角数字や余分な文字を削除し、半角数字のみに整形
      el.value = el.value.replace(/[^0-9]/g, '');

      // 長さ制限
      if (el.value.length > 3) {
        el.value = el.value.slice(0, 3);
      }

      if (el.id.includes('kc-map')) {
        updateMap();
        // kc-map-major で1文字(以上)入力されたら次へフォーカス＆Numpad表示
        if (el.id === 'kc-map-major' && el.value.length >= 1) {
          const minorInput = document.getElementById('kc-map-minor');
          if (minorInput) {
            minorInput.focus();
            openNumpad('kc-map-minor');
          }
        }
      } else if (el.id.includes('kc-cond')) {
        validateCondInputs();
      }
    });

    // Numpad非表示時でも機能する、各入力欄でのキー操作対応
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        closeNumpad(); // 開いていれば閉じる

        if (e.shiftKey) {
          if (el.id === 'kc-timer-manual') {
            const btn = document.getElementById('kc-btn-manual-set');
            if (btn) btn.click();
          } else if (el.id.includes('kc-cond')) {
            const btn = document.getElementById('kc-btn-cond-set');
            if (btn) btn.click();
          }
        }
      } else if (e.key === 'Tab') {
        // Tabキーでのフォーカス遷移＆Numpad表示（疲労度[現在]→[目標]）
        if (el.id === 'kc-cond-curr') {
          e.preventDefault();
          const tgtInput = document.getElementById('kc-cond-tgt');
          if (tgtInput) {
            tgtInput.focus();
            openNumpad('kc-cond-tgt');
          }
        }
      }
    });
  };

  attachNumpad(inpMajor);
  attachNumpad(inpMinor);
  attachNumpad(inpTimerManual);
  attachNumpad(inpCondCurr);
  attachNumpad(inpCondTgt);

  // 母港給糧艦システムトグルのイベント
  if (chkPortSupply) {
    chkPortSupply.onchange = () => {
      currentPortSupplyOn = chkPortSupply.checked;
      saveLocalData();
      validateCondInputs();
      if (inpCondCurr) {
        inpCondCurr.focus();
        openNumpad('kc-cond-curr');
      }
    };
  }

  // 疲労度入力値のクリップおよび自動フラグ処理
  const validateCondInputs = () => {
    let curr = parseInt(inpCondCurr.value);
    let tgt = parseInt(inpCondTgt.value);

    // 49超えなら自動でPortSupplyフラグをON
    if (!isNaN(curr) && curr > 49) {
      if (!currentPortSupplyOn) {
        currentPortSupplyOn = true;
        if (chkPortSupply) chkPortSupply.checked = true;
        saveLocalData();
      }
    }
    if (!isNaN(tgt) && tgt > 49) {
      if (!currentPortSupplyOn) {
        currentPortSupplyOn = true;
        if (chkPortSupply) chkPortSupply.checked = true;
        saveLocalData();
      }
    }

    const limit = currentPortSupplyOn ? 54 : 49;

    if (!isNaN(curr) && curr > limit) {
      curr = limit;
      inpCondCurr.value = curr;
    }
    if (!isNaN(tgt) && tgt > limit) {
      tgt = limit;
      inpCondTgt.value = tgt;
    }
  };

  chkEvent.onchange = () => {
    updateMap();
    if (chkEvent.checked) {
      if (inpMajor) {
        inpMajor.focus();
        openNumpad('kc-map-major');
      }
    }
  };

  document.querySelectorAll('.kc-num-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const num = btn.textContent;
      if (!activeInputId) return;
      const input = document.getElementById(activeInputId);
      if (activeInputId.includes('kc-map')) {
        input.value = num;
        updateMap();
        // Numpad操作時も自動遷移・ハイライト機能を入れる
        if (activeInputId === 'kc-map-major' && input.value.length >= 1) {
          const minorInput = document.getElementById('kc-map-minor');
          if (minorInput) {
            minorInput.focus();
            openNumpad('kc-map-minor');
          }
        }
      } else {
        if (input.value.length < 3) {
          input.value += num;
          if (activeInputId.includes('kc-cond')) {
            validateCondInputs();
          }
        }
      }
    };
  });

  document.getElementById('kc-num-bs').onclick = (e) => {
    e.stopPropagation();
    if (activeInputId) {
      const input = document.getElementById(activeInputId);
      input.value = input.value.slice(0, -1);
      if (activeInputId.includes('kc-map')) updateMap();
      if (activeInputId.includes('kc-cond')) validateCondInputs();
    }
  };

  document.getElementById('kc-num-close').onclick = (e) => {
    e.stopPropagation();
    closeNumpad();
  };

  document.getElementById('kc-win-control').onclick = () => closeNumpad();

  KcTimer.setup({
    manualInput: inpTimerManual,
    currentInput: inpCondCurr,
    targetInput: inpCondTgt
  });

  // ボタン設定
  const setupBtnGroup = (groupId) => {
    const group = document.getElementById(groupId);
    if (!group) return;
    const buttons = group.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.onclick = () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (groupId === 'kc-grp-diff') currentDifficulty = btn.dataset.val;
        if (groupId === 'kc-grp-status') currentStatus = btn.dataset.val;
        saveLocalData();
        renderInfoDisplay();
      };
    });
  };
  setupBtnGroup('kc-grp-diff');
  setupBtnGroup('kc-grp-status');

  restoreLocalData();
  renderTimerPresets();

  // BGM設定変更監視
  if (chkBgm) {
    chkBgm.onchange = () => {
      KcMedia.setEnabled(chkBgm.checked);
      KcSettings.update({ bgmEnabled: chkBgm.checked });
    };
  }
}

function handleTagClick(index) {
  let targetStr = currentCustomList;
  if (!targetStr) return;

  let items = [];
  try { items = targetStr.split(/(?<!\\)[,，]/); } catch (e) { items = targetStr.split(','); }

  if (index >= 0 && index < items.length) {
    const rawTag = items[index].trim();

    // Parse syntax: Name:+Value or Name:-Value or Name:+Value/Limit
    const match = rawTag.match(/^(.+?):([+-]?)(\d+)(?:\/(\d+))?/);

    if (match) {
      // Counter behavior
      const name = match[1];
      const sign = match[2];
      let val = parseInt(match[3], 10);
      const limitStr = match[4];

      if (sign === '+') {
        // Count Up
        val++;
        // Check Limit (if exists)
        if (limitStr !== undefined) {
          const max = parseInt(limitStr, 10);
          if (val >= max) {
            // Reached Limit -> Remove
            items.splice(index, 1);
            saveAndReflect(items);
            return;
          }
        }
      } else if (sign === '-') {
        // Count Down
        val--;
        // Check Limit (Default 0 if not specified)
        const min = (limitStr !== undefined) ? parseInt(limitStr, 10) : 0;
        if (val <= min) {
          // Reached Limit -> Remove
          items.splice(index, 1);
          saveAndReflect(items);
          return;
        }
      }

      // Reconstruct tag
      let newTag = `${name}:${sign}${val}`;
      if (limitStr !== undefined) {
        newTag += `/${limitStr}`;
      }
      items[index] = newTag;

    } else {
      // Default behavior: Remove
      items.splice(index, 1);
    }

    saveAndReflect(items);
  }
}

function saveAndReflect(items) {
  const cleanedItems = items.map(s => s.trim()).filter(s => s.length > 0);
  const newStr = cleanedItems.join(', ');

  currentCustomList = newStr;
  renderInfoDisplay();
  saveLocalData();

  KcSettings.update({ customList: currentCustomList });
}

