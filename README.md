# Wizard Chess 3D（巫師棋 3D）

互動式 3D 哥德式大教堂巫師棋：精雕石材棋子、電影級近戰吃子動畫、碎石物理特效，以及七階單人 AI 對弈。

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
