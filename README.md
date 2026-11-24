# Wizard Chess 3D（巫師棋 3D）

互動式 3D 哥德式大教堂巫師棋：精雕石材棋子、電影級近戰吃子動畫、碎石物理特效，以及 11 階 AI 對弈。

功能：單人／雙人對弈、雙 AI 觀戰（可分別設定兩側棋力與觀戰步速）、城堡／星空雙場景、七檔畫質、四語介面。

技術棧：React 19 + Vite 8 + Three.js 0.170。

## 多語言

內建四語介面，預設依瀏覽器語言偵測，可在畫面左上角切換：

- 简体中文（zh-CN）
- 繁體中文（zh-TW）
- English（en）
- 日本語（ja）

語言選擇會寫入 `localStorage`（key：`wizardchess.lang`）。

## 本地開發

先安裝依賴：

```bash
npm install
```

開發模式：

```bash
npm run dev
```

型別檢查：

```bash
npm run lint
```

執行測試：

```bash
npm test
```

生產建置：

```bash
npm run build
```

預覽建置產物：

```bash
npm run preview
```

## 部署

建置產物位於 `dist/`，使用相對路徑（`vite.config.ts` 中 `base: './'`），可直接部署至 GitHub Pages 專案子路徑。

`main` 分支存放原始碼；`gh-pages` 根目錄存放建置產物（含 `.nojekyll`）。部署時將 `dist/` 內容複製至 `gh-pages` 並推送，Pages 約一分鐘內生效。

## 公開 API

引擎掛載於 `window.wizardChess`，常用介面：

- 對局：`setAutoPlayMode`、`getAutoPlayState`、`setSideAIDifficulty`、`setAutoSpeed`、`setAutoPaused`、`setAIDifficulty`、`getAIDifficulty`
- 外觀：`setSceneMode`、`getSceneMode`、`setQualityLevel`、`getQualityLevel`、`setEffectsEnabled`、`getEffectsEnabled`
- 歷史：`getMoveHistory`、`inspectHistoryMove`、`exitHistoryReview`、`analyzeHistoryMove`

狀態變更會廣播 `wizardchess:autoplaychange`、`effectschange`、`aidifficultychange`、`historychange`、`scenemodechange`、`qualitychange`、`languagechange` 事件。

## 觀戰模式細節

- 觀戰暫停（`setAutoPaused` 或按鈕／快捷鍵 `P`）僅作用於當前連線階段，不寫入 localStorage；重新載入後自動恢復觀戰。
- 分頁隱藏時 AI 停止排程（節省電量），回到前景自動續走；已在進行中的走棋動畫會正常完成。
- 快捷鍵：`H` 隱藏介面、`P` 觀戰暫停／繼續（僅觀戰模式）、`WASD + R/F` 自由飛行視角。
