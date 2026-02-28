import { describe, it, expect } from 'vitest';
import { canJump, pegAt, holeAt, occupiedSpace } from './SolitaireLogic';

describe('Solitaire Move Logic', () => {
  it('should allow a jump when an adjacent peg and an empty hole exist', () => {
    expect(canJump(pegAt, holeAt)).toBe(true);
  });

  it('should reject a move to an occupied space', () => {
    expect(canJump(pegAt, occupiedSpace)).toBe(false);
  });
});