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
import { GameRecorder } from './GameRecorder';
import type { BoardType, Move, Pos } from './types';
 
// ---------------------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------------------
export abstract class SolitaireGame {
  protected board: Board;
  readonly boardType: BoardType;
  readonly size: number;
 
  /** Sprint 4: optional recorder.  Set via enableRecording() / disable. */
  protected recorder: GameRecorder | null = null;
 
  constructor(boardType: BoardType, size: number) {
    this.boardType = boardType;
    this.size = size;
    this.board = createNewGame(boardType, size);
  }
 
  // ── Sprint 4 recording API ────────────────────────────────────────────
 
  enableRecording(recorder: GameRecorder): void {
    this.recorder = recorder;
  }
 
  disableRecording(): void {
    this.recorder = null;
  }
 
  isRecording(): boolean {
    return this.recorder !== null;
  }
 
  // ── Shared, concrete methods ──────────────────────────────────────────
 
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
    this.recorder = null; // stop recording on new game
    this.onNewGame();
  }
 
  /**
   * Randomise by performing random valid moves.
   * Sprint 4: each move is recorded with source:'randomize'.
   */
  randomize(steps: number = 10): void {
    let b = cloneBoard(this.board);
    for (let i = 0; i < steps; i++) {
      const moves = listValidMoves(b);
      if (moves.length === 0) break;
      const m = moves[Math.floor(Math.random() * moves.length)];
      b = applyMove(b, m.from, m.to);
      this.recorder?.recordMove(m.from, m.to, 'randomize');
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
 
  // ── Abstract / overrideable hooks ─────────────────────────────────────
 
  protected onNewGame(): void {}
 
  abstract makeMove(from: Pos, to: Pos): boolean;
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
    // Sprint 4: record the move
    this.recorder?.recordMove(from, to, 'manual');
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
 
  /** Always returns false — AutoGame is driven by makeAutoMove. */
  makeMove(_from: Pos, _to: Pos): boolean {
    return false;
  }
 
  /** Pick and apply one random valid move. Returns the move or null. */
  makeAutoMove(): Move | null {
    const moves = listValidMoves(this.board);
    if (moves.length === 0) return null;
    const m = moves[Math.floor(Math.random() * moves.length)];
    this.board = applyMove(this.board, m.from, m.to);
    // Sprint 4: record the move
    this.recorder?.recordMove(m.from, m.to, 'auto');
    return m;
  }
}
 



