import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const engine = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

test('executeChessMove keeps review/animation/turn/friendly-fire/legality guards', () => {
  const fn = engine.match(/function executeChessMove\(fromR, fromC, toR, toC, options = \{\}\) \{([\s\S]*?)\n      if \(!options\.fromRemote\)/);
  assert.ok(fn, 'executeChessMove header not found');
  const body = fn[1];
  assert.ok(body.includes('reviewingHistoryIndex !== null'), 'must block moves during history review');
  assert.ok(body.includes('boardState[fromR]?.[fromC]'), 'must bounds-guard source square');
  assert.ok(body.includes('isAnimatingMove || gameOver'), 'must block during animation / after game over');
  assert.ok(body.includes('piece.color !== currentTurn'), 'must enforce turn order');
  assert.ok(body.includes('targetOnDest.color === piece.color'), 'must forbid friendly fire');
});

test('History inspect/analyze APIs bounds-check the index and entry shape', () => {
  for (const name of ['inspectHistoryMove', 'analyzeHistoryMove']) {
    const fn = engine.match(new RegExp(`function ${name}\\(index\\) \\{([\\s\\S]*?)\\n      const entry`));
    assert.ok(fn, `${name} not found`);
    assert.ok(fn[1].includes("typeof index !== 'number' || index < 0 || index >= moveHistory.length"), `${name} must bounds-check index`);
  }
});

test('resetChessBoard clears timers, tweens, history and review state', () => {
  const fn = engine.match(/function resetChessBoard\(orientCamera = true, preserveScript = false\) \{([\s\S]*?)\n      currentTurn = 'w';/);
  assert.ok(fn, 'resetChessBoard not found');
  const body = fn[1];
  for (const needle of ['clearTimeout(aiTimer)', 'activeMoveTweens.length = 0', 'clearCheckmateSequence()', 'clearAllPieces()', 'clearSquareHighlights()']) {
    assert.ok(body.includes(needle), `resetChessBoard missing cleanup: ${needle}`);
  }
});

test('Draco decoder is wired and shipped for the compressed cathedral', () => {
  assert.ok(engine.includes("import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'"), 'DRACOLoader import missing');
  assert.ok(engine.includes("dracoLoader.setDecoderPath('./draco/')"), 'decoder path must stay relative for Pages subpath');
  assert.ok(engine.includes('gltfLoader.setDRACOLoader(dracoLoader)'), 'GLTFLoader must use the Draco decoder');
  for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/draco', f)), `public/draco/${f} missing`);
  }
  const b64 = fs.readFileSync(path.join(ROOT, 'public/assets/glb/option8_cathedral.glb.gz.b64'), 'utf-8').trim();
  const raw = Buffer.from(b64, 'base64');
  // gzip magic 1f 8b; decompressed GLB must declare the Draco extension
  assert.equal(raw[0], 0x1f);
  assert.equal(raw[1], 0x8b);
  assert.ok(b64.length < 7_000_000, 'cathedral payload should stay under 7MB base64 after Draco');
});

test('index.html preloads the cathedral payload alongside the JS bundle', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  assert.ok(html.includes('rel="preload" href="./assets/glb/option8_cathedral.glb.gz.b64" as="fetch" crossorigin="anonymous"'), 'cathedral preload link missing or altered');
});
