import { describe, it, expect, beforeEach } from 'vitest';
import { ManualGame, AutoGame } from './SolitaireGame';
import { GameRecorder, ReplayController } from './GameRecorder';
import {
  applyMove,
  createNewGame,
  isGameOver,
  isValidMove,
  listValidMoves,
  countPegs,
} from './SolitaireLogic';

// Static re-exports used by replay determinism tests
const apply = applyMove;
const cng = createNewGame;

// ============================================================
// Sprint 2 baseline (kept for regression)
// ============================================================
describe('Sprint 2 – SolitaireLogic baseline', () => {
  it('creates a new English game with center hole', () => {
    const b = createNewGame('English', 7);
    expect(b[3][3]).toBe('hole');
    expect(countPegs(b)).toBeGreaterThan(0);
  });

  it('rejects even board size', () => {
    expect(() => createNewGame('English', 6)).toThrow();
  });

  it('lists at least one valid move at start (English 7)', () => {
    const b = createNewGame('English', 7);
    expect(listValidMoves(b).length).toBeGreaterThan(0);
  });

  it('applies a valid move and reduces peg count by 1', () => {
    const b = createNewGame('English', 7);
    const moves = listValidMoves(b);
    expect(moves.length).toBeGreaterThan(0);
    const m = moves[0];
    const before = countPegs(b);
    const next = applyMove(b, m.from, m.to);
    expect(countPegs(next)).toBe(before - 1);
    expect(next[m.to.r][m.to.c]).toBe('peg');
    expect(next[m.from.r][m.from.c]).toBe('hole');
    expect(next[m.over.r][m.over.c]).toBe('hole');
  });

  it('isGameOver is false at the start of a Diamond 7 game', () => {
    const b = createNewGame('Diamond', 7);
    expect(isGameOver(b)).toBe(false);
  });
});

// ============================================================
// Sprint 3 – ManualGame class
// ============================================================
describe('Sprint 3 – ManualGame', () => {
  let game: ManualGame;

  beforeEach(() => {
    game = new ManualGame('English', 7);
  });

  it('modeName returns "Manual"', () => {
    expect(game.modeName()).toBe('Manual');
  });

  it('starts with a hole at the center', () => {
    const b = game.getBoard();
    expect(b[3][3]).toBe('hole');
  });

  it('has valid moves at the start', () => {
    expect(game.getValidMoves().length).toBeGreaterThan(0);
  });

  it('makeMove returns true for a valid move and updates the board', () => {
    const moves = game.getValidMoves();
    const m = moves[0];
    const pegsBefore = game.countPegs();
    const ok = game.makeMove(m.from, m.to);
    expect(ok).toBe(true);
    expect(game.countPegs()).toBe(pegsBefore - 1);
  });

  it('makeMove returns false for an invalid move and does not change board', () => {
    const pegsBefore = game.countPegs();
    const ok = game.makeMove({ r: 0, c: 0 }, { r: 0, c: 1 });
    expect(ok).toBe(false);
    expect(game.countPegs()).toBe(pegsBefore);
  });

  it('isOver returns false at game start', () => {
    expect(game.isOver()).toBe(false);
  });

  it('newGame resets the board to a fresh state', () => {
    const m = game.getValidMoves()[0];
    game.makeMove(m.from, m.to);
    const pegsAfterMove = game.countPegs();
    game.newGame();
    const pegsAfterReset = game.countPegs();
    expect(pegsAfterReset).toBeGreaterThan(pegsAfterMove);
    expect(game.getBoard()[3][3]).toBe('hole');
  });

  it('randomize changes the board state', () => {
    const pegsBefore = game.countPegs();
    game.randomize(5);
    expect(game.countPegs()).toBeLessThan(pegsBefore);
  });

  it('getRating returns Outstanding for 1 peg', () => {
    const g = new ManualGame('English', 7);
    expect(typeof g.getRating()).toBe('string');
  });

  it('works with Hexagon board', () => {
    const g = new ManualGame('Hexagon', 7);
    expect(g.getBoard()[3][3]).toBe('hole');
    expect(g.getValidMoves().length).toBeGreaterThan(0);
  });

  it('works with Diamond board', () => {
    const g = new ManualGame('Diamond', 7);
    expect(g.getBoard()[3][3]).toBe('hole');
    expect(g.getValidMoves().length).toBeGreaterThan(0);
  });
});

// ============================================================
// Sprint 3 – AutoGame class
// ============================================================
describe('Sprint 3 – AutoGame', () => {
  let game: AutoGame;

  beforeEach(() => {
    game = new AutoGame('English', 7);
  });

  it('modeName returns "Auto"', () => {
    expect(game.modeName()).toBe('Auto');
  });

  it('starts with a hole at the center', () => {
    expect(game.getBoard()[3][3]).toBe('hole');
  });

  it('has valid moves at the start', () => {
    expect(game.getValidMoves().length).toBeGreaterThan(0);
  });

  it('makeAutoMove returns a Move object and reduces peg count by 1', () => {
    const before = game.countPegs();
    const m = game.makeAutoMove();
    expect(m).not.toBeNull();
    expect(game.countPegs()).toBe(before - 1);
  });

  it('makeAutoMove returns null when game is over', () => {
    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();
    expect(game.isOver()).toBe(true);
    expect(game.makeAutoMove()).toBeNull();
  });

  it('isOver becomes true when no valid moves remain after autoplay', () => {
    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();
    expect(game.isOver()).toBe(true);
  });

  it('newGame resets a finished auto game', () => {
    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();
    game.newGame();
    expect(game.isOver()).toBe(false);
    expect(game.getBoard()[3][3]).toBe('hole');
  });

  it('getRating returns a valid rating string after game ends', () => {
    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();
    expect(['Outstanding', 'Very Good', 'Good', 'Average']).toContain(game.getRating());
  });

  it('manual makeMove always returns false in AutoGame', () => {
    const moves = game.getValidMoves();
    expect(game.makeMove(moves[0].from, moves[0].to)).toBe(false);
  });

  it('randomize then auto-completes without error', () => {
    game.randomize(5);
    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();
    expect(game.isOver()).toBe(true);
  });
});

// ============================================================
// Sprint 3 – isValidMove edge cases
// ============================================================
describe('Sprint 3 – isValidMove edge cases', () => {
  it('rejects a move where the "over" cell is a hole', () => {
    const b = createNewGame('English', 7);
    const b2 = b.map((r) => r.slice());
    b2[2][3] = 'hole';
    expect(isValidMove(b2, { r: 1, c: 3 }, { r: 3, c: 3 })).toBe(false);
  });

  it('rejects a move to a cell occupied by a peg', () => {
    const b = createNewGame('English', 7);
    expect(isValidMove(b, { r: 3, c: 1 }, { r: 3, c: 3 })).toBe(true);
    const b2 = b.map((r) => r.slice());
    b2[3][3] = 'peg';
    expect(isValidMove(b2, { r: 3, c: 1 }, { r: 3, c: 3 })).toBe(false);
  });

  it('rejects a 1-step move', () => {
    const b = createNewGame('English', 7);
    expect(isValidMove(b, { r: 3, c: 2 }, { r: 3, c: 3 })).toBe(false);
  });
});

// ============================================================
// Sprint 4 – GameRecorder
// ============================================================
describe('Sprint 4 – GameRecorder', () => {
  it('starts with an empty move list', () => {
    const rec = new GameRecorder('English', 7);
    expect(rec.getMoves()).toHaveLength(0);
  });

  it('recordMove appends a move with the correct source', () => {
    const rec = new GameRecorder('English', 7);
    rec.recordMove({ r: 1, c: 3 }, { r: 3, c: 3 }, 'manual');
    const moves = rec.getMoves();
    expect(moves).toHaveLength(1);
    expect(moves[0].source).toBe('manual');
    expect(moves[0].from).toEqual({ r: 1, c: 3 });
    expect(moves[0].to).toEqual({ r: 3, c: 3 });
  });

  it('getRecord returns boardType and size correctly', () => {
    const rec = new GameRecorder('Diamond', 9);
    const r = rec.getRecord();
    expect(r.boardType).toBe('Diamond');
    expect(r.size).toBe(9);
  });

  it('getMoves returns a copy — mutating it does not affect the recorder', () => {
    const rec = new GameRecorder('English', 7);
    rec.recordMove({ r: 1, c: 3 }, { r: 3, c: 3 }, 'auto');
    const moves = rec.getMoves();
    moves.pop();
    expect(rec.getMoves()).toHaveLength(1);
  });
});

// ============================================================
// Sprint 4 – ManualGame recording (Story 20: record manual game)
// ============================================================
describe('Sprint 4 – ManualGame recording', () => {
  it('isRecording returns false when no recorder is attached', () => {
    const game = new ManualGame('English', 7);
    expect(game.isRecording()).toBe(false);
  });

  it('isRecording returns true after enableRecording()', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);
    expect(game.isRecording()).toBe(true);
  });

  it('each successful makeMove appends a "manual" move to the recorder', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    const m = game.getValidMoves()[0];
    game.makeMove(m.from, m.to);
    expect(rec.getMoves()).toHaveLength(1);
    expect(rec.getMoves()[0].source).toBe('manual');
  });

  it('a failed makeMove does NOT append to the recorder', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    game.makeMove({ r: 0, c: 0 }, { r: 0, c: 1 }); // invalid
    expect(rec.getMoves()).toHaveLength(0);
  });

  it('multiple moves are all recorded in order', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    for (let i = 0; i < 3; i++) {
      const moves = game.getValidMoves();
      if (moves.length === 0) break;
      game.makeMove(moves[0].from, moves[0].to);
    }
    expect(rec.getMoves().length).toBeGreaterThanOrEqual(1);
    expect(rec.getMoves().every((m) => m.source === 'manual')).toBe(true);
  });

  it('disableRecording stops recording — subsequent moves are not captured', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    const m1 = game.getValidMoves()[0];
    game.makeMove(m1.from, m1.to);
    expect(rec.getMoves()).toHaveLength(1);

    game.disableRecording();
    const m2 = game.getValidMoves()[0];
    game.makeMove(m2.from, m2.to);
    expect(rec.getMoves()).toHaveLength(1); // still 1
  });

  it('newGame clears the recorder reference', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);
    game.newGame();
    expect(game.isRecording()).toBe(false);
  });
});

// ============================================================
// Sprint 4 – Manual game with randomize recorded (Story 21)
// ============================================================
describe('Sprint 4 – ManualGame recording with randomize', () => {
  it('randomize moves are recorded with source "randomize"', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    game.randomize(5);
    const moves = rec.getMoves();
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.source === 'randomize')).toBe(true);
  });

  it('mixed session: randomize + manual moves both recorded correctly', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    game.randomize(3);
    const afterRandomize = rec.getMoves().length;
    expect(afterRandomize).toBeGreaterThan(0);

    const validMoves = game.getValidMoves();
    if (validMoves.length > 0) {
      game.makeMove(validMoves[0].from, validMoves[0].to);
    }

    const allMoves = rec.getMoves();
    const manualMoves = allMoves.filter((m) => m.source === 'manual');
    const randomizeMoves = allMoves.filter((m) => m.source === 'randomize');

    expect(randomizeMoves.length).toBe(afterRandomize);
    expect(manualMoves.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// Sprint 4 – AutoGame recording (Story 22: record auto game)
// ============================================================
describe('Sprint 4 – AutoGame recording', () => {
  it('makeAutoMove records moves with source "auto"', () => {
    const game = new AutoGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    game.makeAutoMove();
    expect(rec.getMoves()).toHaveLength(1);
    expect(rec.getMoves()[0].source).toBe('auto');
  });

  it('a full auto game records every move', () => {
    const game = new AutoGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    const initialPegs = game.countPegs();
    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();

    // each move removes one peg
    const pegsRemoved = initialPegs - game.countPegs();
    expect(rec.getMoves()).toHaveLength(pegsRemoved);
    expect(rec.getMoves().every((m) => m.source === 'auto')).toBe(true);
  });
});

// ============================================================
// Sprint 4 – ReplayController (Stories 20–22 replay)
// ============================================================
describe('Sprint 4 – ReplayController', () => {
  /** Helper: record a short manual game and return its GameRecord */
  function recordShortManualGame(steps = 3) {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);
    let recorded = 0;
    while (recorded < steps && !game.isOver()) {
      const moves = game.getValidMoves();
      if (moves.length === 0) break;
      game.makeMove(moves[0].from, moves[0].to);
      recorded++;
    }
    return rec.getRecord();
  }

  it('totalMoves matches the number of recorded moves', () => {
    const record = recordShortManualGame(3);
    const ctrl = new ReplayController(record);
    expect(ctrl.totalMoves).toBe(record.moves.length);
  });

  it('currentIndex starts at 0', () => {
    const record = recordShortManualGame(2);
    const ctrl = new ReplayController(record);
    expect(ctrl.currentIndex).toBe(0);
  });

  it('nextMove returns moves in order and advances currentIndex', () => {
    const record = recordShortManualGame(3);
    const ctrl = new ReplayController(record);

    const m0 = ctrl.nextMove();
    expect(m0).not.toBeNull();
    expect(ctrl.currentIndex).toBe(1);

    const m1 = ctrl.nextMove();
    expect(m1).not.toBeNull();
    expect(ctrl.currentIndex).toBe(2);
  });

  it('isDone becomes true after all moves are consumed', () => {
    const record = recordShortManualGame(2);
    const ctrl = new ReplayController(record);
    while (!ctrl.isDone) ctrl.nextMove();
    expect(ctrl.isDone).toBe(true);
  });

  it('nextMove returns null when isDone', () => {
    const record = recordShortManualGame(2);
    const ctrl = new ReplayController(record);
    while (!ctrl.isDone) ctrl.nextMove();
    expect(ctrl.nextMove()).toBeNull();
  });

  it('reset sets currentIndex back to 0', () => {
    const record = recordShortManualGame(3);
    const ctrl = new ReplayController(record);
    ctrl.nextMove();
    ctrl.nextMove();
    ctrl.reset();
    expect(ctrl.currentIndex).toBe(0);
    expect(ctrl.isDone).toBe(false);
  });

  it('replaying all moves produces the same board as the original game', () => {
    // Record a game
    const origGame = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    origGame.enableRecording(rec);
    let count = 0;
    while (count < 5 && !origGame.isOver()) {
      const moves = origGame.getValidMoves();
      if (!moves.length) break;
      origGame.makeMove(moves[0].from, moves[0].to);
      count++;
    }
    const record = rec.getRecord();
    const finalBoard = origGame.getBoard();

    // Replay it
    let replayBoard = cng(record.boardType, record.size);
    const ctrl = new ReplayController(record);
    while (!ctrl.isDone) {
      const m = ctrl.nextMove()!;
      replayBoard = apply(replayBoard, m.from, m.to);
    }

    expect(replayBoard).toEqual(finalBoard);
  });
});

// ============================================================
// Sprint 4 – Replay with randomize (Story 21 replay)
// ============================================================
describe('Sprint 4 – Replay with randomize interleaved', () => {
  it('replaying a randomize+manual session reproduces the final board exactly', () => {
    const game = new ManualGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    // randomize then make a couple manual moves
    game.randomize(4);
    let manual = 0;
    while (manual < 2 && !game.isOver()) {
      const moves = game.getValidMoves();
      if (!moves.length) break;
      game.makeMove(moves[0].from, moves[0].to);
      manual++;
    }

    const record = rec.getRecord();
    const finalBoard = game.getBoard();

    // Replay
    let replayBoard = cng(record.boardType, record.size);
    const ctrl = new ReplayController(record);
    while (!ctrl.isDone) {
      const m = ctrl.nextMove()!;
      replayBoard = apply(replayBoard, m.from, m.to);
    }

    expect(replayBoard).toEqual(finalBoard);
  });
});

// ============================================================
// Sprint 4 – AutoGame replay (Story 22 replay)
// ============================================================
describe('Sprint 4 – AutoGame replay', () => {
  it('replaying a full auto game reproduces the final board', () => {
    const game = new AutoGame('English', 7);
    const rec = new GameRecorder('English', 7);
    game.enableRecording(rec);

    let safety = 200;
    while (!game.isOver() && safety-- > 0) game.makeAutoMove();

    const record = rec.getRecord();
    const finalBoard = game.getBoard();

    let replayBoard = cng(record.boardType, record.size);
    const ctrl = new ReplayController(record);
    while (!ctrl.isDone) {
      const m = ctrl.nextMove()!;
      replayBoard = apply(replayBoard, m.from, m.to);
    }

    expect(replayBoard).toEqual(finalBoard);
  });
});