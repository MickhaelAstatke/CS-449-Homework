import { describe, it, expect } from 'vitest';
import { applyMove, createNewGame, isGameOver, isValidMove, listValidMoves, countPegs } from './src/SolitaireLogic';

describe('Sprint 2 - Peg Solitaire minimum features', () => {
  it('creates a new English game with center hole', () => {
    const b = createNewGame('English', 7);
    const center = { r: 3, c: 3 };
    expect(b[center.r][center.c]).toBe('hole');
    expect(countPegs(b)).toBeGreaterThan(0);
  });

  it('rejects invalid size (even number)', () => {
    expect(() => createNewGame('English', 6)).toThrow();
  });

  it('lists at least one valid move at start (English 7)', () => {
    const b = createNewGame('English', 7);
    const moves = listValidMoves(b);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('validates and applies a known opening move into the center (English 7)', () => {
    const b = createNewGame('English', 7);

    // For our generalized English cross, a typical opening move exists into the center.
    // Try a couple common "into center" moves; at least one should be valid.
    const center = { r: 3, c: 3 };
    const candidates = [
      { from: { r: 1, c: 3 }, to: center }, // from above
      { from: { r: 5, c: 3 }, to: center }, // from below
      { from: { r: 3, c: 1 }, to: center }, // from left
      { from: { r: 3, c: 5 }, to: center }, // from right
      { from: { r: 1, c: 1 }, to: center }, // diagonal candidate
      { from: { r: 5, c: 5 }, to: center }, // diagonal candidate
    ];

    const valid = candidates.find((m) => isValidMove(b, m.from, m.to));
    expect(valid).toBeTruthy();

    const before = countPegs(b);
    const next = applyMove(b, valid!.from, valid!.to);
    const after = countPegs(next);

    // One peg moved, one jumped removed => peg count decreases by 1
    expect(after).toBe(before - 1);
    expect(next[center.r][center.c]).toBe('peg');
  });

  it('game over detection returns boolean and is false at start', () => {
    const b = createNewGame('Diamond', 7);
    expect(typeof isGameOver(b)).toBe('boolean');
    expect(isGameOver(b)).toBe(false);
  });
});