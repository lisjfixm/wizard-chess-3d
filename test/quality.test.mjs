import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LEVELS = ['ultra-low', 'low', 'medium-low', 'medium', 'medium-high', 'high', 'ultra'];

test('Quality tiers are consistent across engine, React options and i18n', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const i18n = fs.readFileSync(path.join(ROOT, 'src/i18n.js'), 'utf-8');

  // Engine declares the seven levels in QUALITY_LEVELS
  const levelsMatch = engine.match(/QUALITY_LEVELS\s*=\s*\[([^\]]+)\]/);
  assert.ok(levelsMatch, 'QUALITY_LEVELS array not found');
  const engineLevels = [...levelsMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(engineLevels, LEVELS);

  // React select options match the engine list
  const optMatch = appTsx.match(/QUALITY_OPTIONS\s*=\s*\[([^\]]+)\]/);
  assert.ok(optMatch, 'QUALITY_OPTIONS not found');
  const appLevels = [...optMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(appLevels, LEVELS);

  // Every tier label exists in all four languages (key appears 4 times)
  for (const level of LEVELS) {
    const key = `'quality.${level}'`;
    const count = i18n.split(key).length - 1;
    assert.equal(count, 4, `i18n key ${key} appears ${count} times, expected 4`);
  }

  // Engine exposes the quality API on window.wizardChess
  for (const api of ['setQualityLevel', 'getQualityLevel', 'QUALITY_LEVELS']) {
    assert.ok(engine.includes(api), `wizardChess API ${api} missing`);
  }
});

test('getState exposes the key HUD-facing state fields', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const stateMatch = engine.match(/getState:\s*\(\)\s*=>\s*\(\{([\s\S]*?)\n\s*\}\)/);
  assert.ok(stateMatch, 'getState not found');
  const stateBody = stateMatch[1];
  for (const field of [
    'gameMode', 'whiteAiId', 'blackAiId', 'autoSpeed', 'playerColor',
    'currentTurn', 'gameOver', 'effectsEnabled', 'sceneMode', 'quality'
  ]) {
    assert.ok(stateBody.includes(field), `getState missing field ${field}`);
  }
});

test('Core public API surface is registered on window.wizardChess', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  for (const api of [
    'setAutoPlayMode', 'getAutoPlayState', 'setSideAIDifficulty', 'setAutoSpeed',
    'setEffectsEnabled', 'getEffectsEnabled', 'setQualityLevel', 'getQualityLevel'
  ]) {
    assert.ok(engine.includes(api), `wizardChess API ${api} missing`);
  }
});

test('AI tier/elo metadata matches between engine and React shell', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  const engineMeta = [...engine.matchAll(/id: '(\w+)',\s*tier:\s*(\d+),\s*elo:\s*(\d+)/g)]
    .map((m) => ({ id: m[1], tier: Number(m[2]), elo: Number(m[3]) }));
  const appMeta = [...appTsx.matchAll(/id: '(\w+)',\s*tier:\s*(\d+),\s*elo:\s*(\d+)/g)]
    .map((m) => ({ id: m[1], tier: Number(m[2]), elo: Number(m[3]) }));

  assert.equal(engineMeta.length, 11, 'engine should declare 11 AI tiers');
  assert.equal(appMeta.length, 11, 'React shell should declare 11 AI tiers');
  assert.deepEqual(engineMeta.map((m) => m.id), appMeta.map((m) => m.id), 'AI tier ids diverge');
  assert.deepEqual(engineMeta.map((m) => m.tier), appMeta.map((m) => m.tier), 'AI tier numbers diverge');
  assert.deepEqual(engineMeta.map((m) => m.elo), appMeta.map((m) => m.elo), 'AI ELO values diverge');
});

test('Ultra preset carries the enriched cosmic layers', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const ultraMatch = engine.match(/'ultra':\s*\{([^}]+)\}/);
  assert.ok(ultraMatch, 'ultra preset not found');
  const ultra = ultraMatch[1];
  for (const field of [
    'farStars', 'ultraFarStars', 'globulars', 'ringedPlanets', 'distantGalaxies',
    'binaryStars', 'motes', 'emissionNebulae', 'milkyWay', 'accretion',
    'supernovae', 'twinkleCount'
  ]) {
    assert.ok(ultra.includes(field), `ultra preset missing ${field}`);
  }
});
