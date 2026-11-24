import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const AUTO_I18N_KEYS = [
  'status.modeAuto',
  'actions.modeAuto',
  'actions.modeSingle',
  'ai.autoSub',
  'ai.sideWhiteAi',
  'ai.sideBlackAi',
  'ai.speed',
  'ai.speedSlow',
  'ai.speedNormal',
  'ai.speedFast'
];

test('Engine exposes AI-vs-Auto spectator mode API and state', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  // Public API surface
  for (const api of ['setAutoPlayMode', 'getAutoPlayState', 'setSideAIDifficulty', 'setAutoSpeed']) {
    assert.ok(engine.includes(api), `wizardChess API ${api} missing`);
  }

  // Auto mode branch and per-side difficulty state
  assert.ok(engine.includes("gameMode === 'auto'"), 'auto mode branch missing');
  assert.ok(engine.includes('whiteAiId'), 'white AI difficulty state missing');
  assert.ok(engine.includes('blackAiId'), 'black AI difficulty state missing');

  // Auto-play change event dispatched to the React shell
  assert.ok(engine.includes('wizardchess:autoplaychange'), 'autoplaychange event missing');

  // getState exposes per-side difficulty ids
  const stateMatch = engine.match(/getState:\s*\(\)\s*=>\s*\(\{([\s\S]*?)\n\s*\}\)/);
  assert.ok(stateMatch, 'getState not found');
  assert.ok(stateMatch[1].includes('whiteAiId'), 'getState missing whiteAiId');
  assert.ok(stateMatch[1].includes('blackAiId'), 'getState missing blackAiId');
  assert.ok(stateMatch[1].includes('autoSpeed'), 'getState missing autoSpeed');

  // Spectator-only: manual piece selection blocked in auto mode
  assert.ok(engine.includes("if (gameMode === 'auto') return;"), 'auto mode click guard missing');
});

test('React shell wires mode toggle and per-side AI selectors', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  assert.ok(appTsx.includes('id="btn-mode-toggle"'), 'mode toggle button missing');
  assert.ok(appTsx.includes('setAutoPlayMode'), 'setAutoPlayMode handler missing');
  assert.ok(appTsx.includes('setSideAIDifficulty'), 'setSideAIDifficulty handler missing');
  assert.ok(appTsx.includes('setAutoSpeed'), 'setAutoSpeed handler missing');
  assert.ok(appTsx.includes('whiteAiId'), 'white side state missing');
  assert.ok(appTsx.includes('blackAiId'), 'black side state missing');
  assert.ok(appTsx.includes('autoSpeed'), 'speed state missing');
  assert.ok(appTsx.includes('wizardchess:autoplaychange'), 'autoplaychange listener missing');
});

test('Every AI-vs-Auto label exists in all four languages', () => {
  const i18n = fs.readFileSync(path.join(ROOT, 'src/i18n.js'), 'utf-8');
  for (const key of AUTO_I18N_KEYS) {
    const count = i18n.split(`'${key}'`).length - 1;
    assert.equal(count, 4, `i18n key ${key} appears ${count} times, expected 4`);
  }
});

test('Auto preference and per-side levels persist across reloads', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  for (const key of ['wizardchess.autoplay', 'wizardchess.autoWhite', 'wizardchess.autoBlack', 'wizardchess.autoSpeed']) {
    assert.ok(engine.includes(key), `persisted storage key ${key} missing`);
  }
  // Startup restores the saved auto mode
  assert.ok(engine.includes('startAutoPlay'), 'startup auto restore flag missing');
});

test('Per-side difficulty does not clobber the single-player AI level', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const fnMatch = engine.match(/function setSideAIDifficulty\(color, id\) \{([\s\S]*?)\n    \}/);
  assert.ok(fnMatch, 'setSideAIDifficulty not found');
  const body = fnMatch[1];
  assert.ok(!/aiDifficultyId\s*=/.test(body), 'side difficulty must not assign aiDifficultyId');
});
