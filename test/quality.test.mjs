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
