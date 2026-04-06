/**
 * Sprint 3 - Class Hierarchy
 *
 * SolitaireGame (abstract base)
 *   ├── ManualGame   – human selects moves via the GUI
 *   └── AutoGame     – computer picks a random valid move each step
 *
 * Common behaviour lives in SolitaireGame; mode-specific behaviour is
 * overridden in the subclasses (polymorphism / method overriding).
 */

import {
  applyMove,
  cloneBoard,
  countPegs,
  createNewGame,
  isGameOver,
  isValidMove,
  listValidMoves,
  type Board,
} from './SolitaireLogic';
import type { BoardType, Move, Pos } from './types';

// ---------------------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------------------
export abstract class SolitaireGame {
  protected board: Board;
  readonly boardType: BoardType;
  readonly size: number;

  constructor(boardType: BoardType, size: number) {
    this.boardType = boardType;
    this.size = size;
    this.board = createNewGame(boardType, size);
  }

  // ---- shared, concrete methods ----

  getBoard(): Board {
    return this.board;
  }

  getValidMoves(): Move[] {
    return listValidMoves(this.board);
  }

  isOver(): boolean {
    return isGameOver(this.board);
  }

  countPegs(): number {
    return countPegs(this.board);
  }

  newGame(): void {
    this.board = createNewGame(this.boardType, this.size);
    this.onNewGame();
  }

  /**
   * Randomise the state of the board by performing a number of random valid
   * moves from the current position.  If no valid moves are available the
   * board is left unchanged.
   */
  randomize(steps: number = 10): void {
    let b = cloneBoard(this.board);
    for (let i = 0; i < steps; i++) {
      const moves = listValidMoves(b);
      if (moves.length === 0) break;
      const m = moves[Math.floor(Math.random() * moves.length)];
      b = applyMove(b, m.from, m.to);
    }
    this.board = b;
  }

  /** Rating string based on pegs remaining. */
  getRating(): string {
    const p = this.countPegs();
    if (p === 1) return 'Outstanding';
    if (p === 2) return 'Very Good';
    if (p === 3) return 'Good';
    return 'Average';
  }

  // ---- abstract / overrideable hooks ----

  /** Called after newGame() so subclasses can reset their own state. */
  protected onNewGame(): void {}

  /** Attempt to make a move.  Returns true on success. */
  abstract makeMove(from: Pos, to: Pos): boolean;

  /** Return the game-mode label shown in the UI. */
  abstract modeName(): string;
}

// ---------------------------------------------------------------------------
// Manual game – the human drives every move
// ---------------------------------------------------------------------------
export class ManualGame extends SolitaireGame {
  modeName(): string {
    return 'Manual';
  }

  makeMove(from: Pos, to: Pos): boolean {
    if (!isValidMove(this.board, from, to)) return false;
    this.board = applyMove(this.board, from, to);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Auto game – the computer picks a random valid move each step
// ---------------------------------------------------------------------------
export class AutoGame extends SolitaireGame {
  modeName(): string {
    return 'Auto';
  }

  /**
   * Ignored in AutoGame – the computer always picks randomly.
   * Provided to satisfy the abstract contract; returns false.
   */
  makeMove(_from: Pos, _to: Pos): boolean {
    return false;
  }

  /** Pick and apply one random valid move.  Returns the move or null. */
  makeAutoMove(): Move | null {
    const moves = listValidMoves(this.board);
    if (moves.length === 0) return null;
    const m = moves[Math.floor(Math.random() * moves.length)];
    this.board = applyMove(this.board, m.from, m.to);
    return m;
  }
}