/**
 * Sprint 4 – GameRecorder
 *
 * Records every move made during a game (manual, auto, or randomize-sourced)
 * so that the full session can be serialized to JSON and replayed exactly.
 *
 * Design decision: instead of recording high-level events like "randomize(12)"
 * we record each individual move produced by randomize, tagged with
 * source:'randomize'.  This makes replay 100 % deterministic with no need to
 * re-seed Math.random().
 */

import type { BoardType, Pos } from './types';

// ── Types ──────────────────────────────────────────────────────────────────

export type MoveSource = 'manual' | 'auto' | 'randomize';

export interface RecordedMove {
  from: Pos;
  to: Pos;
  /** Which part of the UI produced this move */
  source: MoveSource;
}

export interface GameRecord {
  /** Unique id so multiple records can coexist in localStorage */
  id: string;
  boardType: BoardType;
  size: number;
  /** ISO timestamp of when recording started */
  startedAt: string;
  moves: RecordedMove[];
}

// ── GameRecorder class ─────────────────────────────────────────────────────

export class GameRecorder {
  private record: GameRecord;

  constructor(boardType: BoardType, size: number) {
    this.record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      boardType,
      size,
      startedAt: new Date().toISOString(),
      moves: [],
    };
  }

  /** Called by game classes each time a move is successfully applied. */
  recordMove(from: Pos, to: Pos, source: MoveSource): void {
    this.record.moves.push({ from: { ...from }, to: { ...to }, source });
  }

  /** Snapshot of recorded moves so far (read-only copy). */
  getMoves(): RecordedMove[] {
    return [...this.record.moves];
  }

  getRecord(): GameRecord {
    return { ...this.record, moves: [...this.record.moves] };
  }

  // ── Persistence (localStorage) ────────────────────────────────────────

  static STORAGE_KEY = 'solitaire_sprint4_record';

  /** Serialize the current record and save it to localStorage. */
  save(): void {
    try {
      localStorage.setItem(GameRecorder.STORAGE_KEY, JSON.stringify(this.record));
    } catch {
      console.warn('GameRecorder: failed to save to localStorage');
    }
  }

  /** Load the most-recently saved record.  Returns null if none exists. */
  static load(): GameRecord | null {
    try {
      const raw = localStorage.getItem(GameRecorder.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GameRecord;
    } catch {
      return null;
    }
  }

  /** Remove saved record from localStorage. */
  static clear(): void {
    localStorage.removeItem(GameRecorder.STORAGE_KEY);
  }

  // ── Replay helper ─────────────────────────────────────────────────────

  /**
   * Create a fresh GameRecorder pre-loaded with an existing GameRecord.
   * Used by the replay UI so it can step through moves one at a time.
   */
  static fromRecord(record: GameRecord): ReplayController {
    return new ReplayController(record);
  }
}

// ── ReplayController ───────────────────────────────────────────────────────

/**
 * Thin wrapper around a GameRecord that lets the GUI consume one move at a
 * time, driving a SolitaireGame instance through its recorded history.
 */
export class ReplayController {
  readonly record: GameRecord;
  private cursor: number = 0;

  constructor(record: GameRecord) {
    this.record = record;
  }

  get totalMoves(): number {
    return this.record.moves.length;
  }

  get currentIndex(): number {
    return this.cursor;
  }

  get isDone(): boolean {
    return this.cursor >= this.record.moves.length;
  }

  /** Return the next move to apply, or null if replay is complete. */
  nextMove(): RecordedMove | null {
    if (this.isDone) return null;
    return this.record.moves[this.cursor++];
  }

  reset(): void {
    this.cursor = 0;
  }
}