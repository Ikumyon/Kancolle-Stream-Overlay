// kcState.js
// 状態管理・グローバル変数定義

// タイマー制御関数用（Logicで代入）
let startTimerFunc = null;
let stopTimerFunc = null;

// テキスト表示設定
let currentFreeText = "";
let currentFreeTextScroll = false;
let currentFreeTextScrollMode = "normal";
let currentScrollSpeed = 50;

// 情報表示モード ('unowned', 'farming', 'custom')
let currentInfoMode = 'unowned';
let currentTargetList = ""; // 未所持リスト
let currentFarmingList = ""; // 掘りリスト

// カスタムモード用
let currentCustomTitle = "";
let currentCustomList = "";

// BGM情報
let currentBgm = "";
let currentBgmHeader = "♪";
let currentBgmScrollMode = "normal";

// 戦果情報
let currentSenka = "--";

// タイマー設定
let currentTimerPresets = [10, 20, 30, null];
let currentTimerMode = 'always';
let currentTimerNotify = false;
let isTimerRunning = false;
let timerInterval = null; // タイマーID

// 海域・イベント設定
let currentIsEvent = false;
let currentMapMajor = "";
let currentMapMinor = "";
let currentDifficulty = "none";
let currentStatus = "none";

// UI制御用
let activeInputId = null;

// デフォルトスタイル設定 (kcUtils.jsのDEFAULT_SETTINGSを参照)
const defaultStyle = DEFAULT_SETTINGS;