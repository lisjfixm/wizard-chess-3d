import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { translate, dictionaryKeys } from '../src/i18n.js';

const ROOT = process.cwd();

test('Simplified Single-Player HUD in src/App.tsx excludes speed sliders, notation script bar, and multiplayer lobby', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  // Must include simplified game & camera controls
  for (const requiredId of [
    'btn-side-toggle',
    'btn-ai-move',
    'btn-reset',
    'btn-cam-player',
    'btn-cam-top',
    'btn-cam-side',
    'btn-cam-wide',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }

  // Must NOT include camera speed sliders, script mode bar, or multiplayer lobby
  for (const forbiddenId of [
    'cam-speed-wrap',
    'input-cam-speed',
    'rot-speed-wrap',
    'input-rot-speed',
    'script-bar',
    'btn-script-modal',
    'btn-script-prev',
    'btn-script-next',
    'btn-lobby',
    'lobby-modal',
    'room-pill',
    'btn-checkmate-stepback'
  ]) {
    assert.ok(!appTsx.includes(forbiddenId), `Forbidden UI element #${forbiddenId} found in App.tsx`);
  }
});

test('Effects toggle preference persists across reloads', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  assert.ok(engine.includes("wizardchess.effects"), 'effects storage key missing');
  assert.ok(engine.includes("readStorage('wizardchess.effects')"), 'effects not restored on boot');
  const setter = engine.match(/function setEffectsEnabled\(enabled\) \{([\s\S]*?)\n    \}/);
  assert.ok(setter, 'setEffectsEnabled not found');
  assert.ok(setter[1].includes("writeStorage('wizardchess.effects'"), 'effects toggle does not persist choice');
});

test('i18n translate falls back to key and substitutes placeholders', () => {
  // Missing key must not render undefined; returns the key itself.
  assert.equal(translate('en', 'definitely.missing.key'), 'definitely.missing.key');
  // Existing key resolves in every supported language.
  for (const lang of ['zh-CN', 'zh-TW', 'en', 'ja']) {
    const text = translate(lang, 'status.modeAuto');
    assert.ok(typeof text === 'string' && text.length > 0, `missing label for modeAuto in ${lang}`);
  }
  // Placeholder substitution works when vars are provided.
  const withVar = translate('en', 'ai.elo', { elo: 1450 });
  assert.ok(String(withVar).includes('1450'), 'elo placeholder not substituted');
});

test('i18n dictionary keys are symmetric across all four languages and every entry is non-empty', () => {
  const langs = ['zh-CN', 'zh-TW', 'en', 'ja'];
  const keySets = Object.fromEntries(langs.map((l) => [l, new Set(dictionaryKeys(l))]));
  const reference = keySets['en'];

  for (const lang of langs) {
    assert.equal(keySets[lang].size, reference.size, `key count mismatch in ${lang}`);
    for (const key of reference) {
      assert.ok(keySets[lang].has(key), `key "${key}" missing in ${lang}`);
    }
    for (const key of keySets[lang]) {
      const text = translate(lang, key);
      assert.ok(typeof text === 'string' && text.trim().length > 0, `empty entry "${key}" in ${lang}`);
    }
  }
});

test('All 7 compressed 3D assets (.glb.gz.b64) decode and gunzip to valid glTF 2.0 binary models', () => {
  const expectedModels = [
    'option8_cathedral',
    'pawn_white',
    'rook_white',
    'knight_white',
    'bishop_white',
    'queen_white',
    'king_white'
  ];

  for (const name of expectedModels) {
    const b64Path = path.join(ROOT, 'public/assets/glb', `${name}.glb.gz.b64`);
    assert.ok(fs.existsSync(b64Path), `Missing 3D asset ${b64Path}`);
    const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
    assert.ok(b64Text.length > 1000, `Asset ${name}.glb.gz.b64 is unexpectedly small`);

    const gzBuf = Buffer.from(b64Text, 'base64');
    const glbBuf = zlib.gunzipSync(gzBuf);

    const magic = glbBuf.toString('ascii', 0, 4);
    const version = glbBuf.readUInt32LE(4);
    const totalLen = glbBuf.readUInt32LE(8);
    assert.equal(magic, 'glTF', `Invalid glTF magic header for ${name}`);
    assert.equal(version, 2, `Invalid glTF version for ${name}`);
    assert.equal(totalLen, glbBuf.length, `Mismatched glTF byte length for ${name}`);
  }
});
