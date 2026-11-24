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
