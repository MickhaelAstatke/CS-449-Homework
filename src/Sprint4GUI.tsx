/**
 * Sprint 4 GUI
 *
 * Extends the Sprint 3 GUI with:
 *   ☑  Record game  – checkbox; when checked a GameRecorder is attached
 *                     to the current game and every move is saved.  The
 *                     record is persisted to localStorage when the game ends
 *                     (or New Game is pressed).
 *   [Replay]        – loads the last saved record and re-applies every move
 *                     at the same AUTO_STEP_MS cadence, with a colour-coded
 *                     source badge (manual / auto / randomize).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardType, Pos } from './types';
import { ManualGame, AutoGame, SolitaireGame } from './SolitaireGame';
import { GameRecorder, ReplayController, type RecordedMove } from './GameRecorder';
import type { Board } from './SolitaireLogic';
import { applyMove, createNewGame } from './SolitaireLogic';

type GameMode = 'manual' | 'auto';

const DEFAULT_SIZE = 7;
const AUTO_STEP_MS = 400;

function posKey(p: Pos) {
  return `${p.r},${p.c}`;
}

// ── source badge colours ─────────────────────────────────────────────────
const SOURCE_COLOR: Record<string, string> = {
  manual: '#1565c0',
  auto: '#2e7d32',
  randomize: '#6a1b9a',
};

// ── tiny components ───────────────────────────────────────────────────────

function CellDot({ state }: { state: 'peg' | 'hole' }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: state === 'peg' ? '#222' : 'transparent',
        border: state === 'hole' ? '2px solid #888' : '2px solid transparent',
        transition: 'background 0.15s',
      }}
    />
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: color,
        color: '#fff',
        marginLeft: 6,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  );
}

// ── main component ─────────────────────────────────────────────────────────

const Sprint4GUI: React.FC = () => {
  const [boardType, setBoardType] = useState<BoardType>('English');
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_SIZE);
  const [gameMode, setGameMode] = useState<GameMode>('manual');
  const [recordEnabled, setRecordEnabled] = useState<boolean>(false);
  const [hasSavedRecord, setHasSavedRecord] = useState<boolean>(
    () => GameRecorder.load() !== null,
  );

  const gameRef = useRef<SolitaireGame>(new ManualGame('English', DEFAULT_SIZE));
  const recorderRef = useRef<GameRecorder | null>(null);

  const [board, setBoard] = useState<Board>(() => gameRef.current.getBoard());
  const [selectedFrom, setSelectedFrom] = useState<Pos | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isAutoplaying, setIsAutoplaying] = useState<boolean>(false);

  // ── Replay state ────────────────────────────────────────────────────────
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const replayRef = useRef<ReplayController | null>(null);
  const [replayBoard, setReplayBoard] = useState<Board | null>(null);
  const [lastReplayMove, setLastReplayMove] = useState<RecordedMove | null>(null);

  const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const syncBoard = useCallback(() => {
    setBoard(gameRef.current.getBoard().map((r) => r.slice()));
  }, []);

  const clearTimer = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const stopAutoplay = useCallback(() => {
    clearTimer();
    setIsAutoplaying(false);
  }, [clearTimer]);

  /** Flush current recorder to localStorage and reset it. */
  const flushRecorder = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.save();
      setHasSavedRecord(true);
      recorderRef.current = null;
    }
  }, []);

  /** Attach a fresh recorder to the current game if recording is enabled. */
  const attachRecorder = useCallback(
    (game: SolitaireGame) => {
      if (!recordEnabled) return;
      const rec = new GameRecorder(game.boardType, game.size);
      game.enableRecording(rec);
      recorderRef.current = rec;
    },
    [recordEnabled],
  );

  // ── New Game ──────────────────────────────────────────────────────────────

  const onNewGame = useCallback(() => {
    stopAutoplay();
    setIsReplaying(false);
    replayRef.current = null;
    setReplayBoard(null);
    setLastReplayMove(null);
    flushRecorder();

    const g =
      gameMode === 'manual'
        ? new ManualGame(boardType, boardSize)
        : new AutoGame(boardType, boardSize);
    gameRef.current = g;
    attachRecorder(g);
    setSelectedFrom(null);
    setStatus(`New ${g.modeName()} game started. Board: ${boardType} ${boardSize}×${boardSize}.${recordEnabled ? '  🔴 Recording.' : ''}`);
    syncBoard();
  }, [boardType, boardSize, gameMode, recordEnabled, syncBoard, stopAutoplay, flushRecorder, attachRecorder]);

  // ── Manual move ────────────────────────────────────────────────────────

  const onCellClick = useCallback(
    (r: number, c: number) => {
      if (isAutoplaying || isReplaying) return;
      const g = gameRef.current;
      if (!(g instanceof ManualGame)) return;

      const here: Pos = { r, c };
      const cellState = g.getBoard()[r][c];
      if (cellState === 'invalid') return;

      if (cellState === 'peg') {
        setSelectedFrom(here);
        setStatus(`Peg selected at (${r},${c}). Click a destination hole.`);
        return;
      }

      if (!selectedFrom) {
        setStatus('Select a peg first.');
        return;
      }

      const ok = g.makeMove(selectedFrom, here);
      setSelectedFrom(null);
      if (ok) {
        syncBoard();
        if (g.isOver()) {
          flushRecorder();
          setStatus(`Game over! ${g.countPegs()} peg(s) left. Rating: ${g.getRating()}.${hasSavedRecord ? '  💾 Record saved.' : ''}`);
        } else {
          setStatus(`Move applied. ${g.countPegs()} pegs left.${g.isRecording() ? '  🔴' : ''}`);
        }
      } else {
        setStatus('Invalid move – must jump over an adjacent peg into an empty hole 2 steps away.');
      }
    },
    [isAutoplaying, isReplaying, selectedFrom, syncBoard, flushRecorder, hasSavedRecord],
  );

  // ── Autoplay ──────────────────────────────────────────────────────────────

  const stepAuto = useCallback(() => {
    const g = gameRef.current;
    if (!(g instanceof AutoGame)) return;

    if (g.isOver()) {
      syncBoard();
      flushRecorder();
      setStatus(`Auto game over! ${g.countPegs()} peg(s) left. Rating: ${g.getRating()}.`);
      setIsAutoplaying(false);
      return;
    }

    const m = g.makeAutoMove();
    syncBoard();

    if (!m || g.isOver()) {
      flushRecorder();
      setStatus(`Auto game over! ${g.countPegs()} peg(s) left. Rating: ${g.getRating()}.`);
      setIsAutoplaying(false);
      return;
    }

    setStatus(`Auto move: (${m.from.r},${m.from.c}) → (${m.to.r},${m.to.c}). ${g.countPegs()} pegs left.${g.isRecording() ? '  🔴' : ''}`);
    autoplayTimerRef.current = setTimeout(stepAuto, AUTO_STEP_MS);
  }, [syncBoard, flushRecorder]);

  const onAutoplay = useCallback(() => {
    if (isReplaying) return;

    if (!(gameRef.current instanceof AutoGame)) {
      flushRecorder();
      const g = new AutoGame(boardType, boardSize);
      gameRef.current = g;
      attachRecorder(g);
      syncBoard();
      setGameMode('auto');
      setStatus('Switched to Auto mode.' + (recordEnabled ? '  🔴 Recording.' : ''));
    }

    if (isAutoplaying) {
      stopAutoplay();
      setStatus('Autoplay paused.');
      return;
    }

    if (gameRef.current.isOver()) {
      setStatus('Game is already over – start a New Game first.');
      return;
    }

    setIsAutoplaying(true);
    setSelectedFrom(null);
    autoplayTimerRef.current = setTimeout(stepAuto, AUTO_STEP_MS);
  }, [boardSize, boardType, isAutoplaying, isReplaying, recordEnabled, stepAuto, stopAutoplay, syncBoard, flushRecorder, attachRecorder]);

  // ── Randomize ─────────────────────────────────────────────────────────────

  const onRandomize = useCallback(() => {
    if (isReplaying) return;
    stopAutoplay();
    gameRef.current.randomize(12);
    syncBoard();
    const g = gameRef.current;
    setStatus(`Board randomised. ${g.countPegs()} pegs left. ${g.getValidMoves().length} valid moves.${g.isRecording() ? '  🔴' : ''}`);
    setSelectedFrom(null);
  }, [isReplaying, stopAutoplay, syncBoard]);

  // ── Replay ─────────────────────────────────────────────────────────────────

  const stepReplay = useCallback(() => {
    const ctrl = replayRef.current;
    if (!ctrl) return;

    const move = ctrl.nextMove();
    if (!move) {
      setIsReplaying(false);
      setStatus(`Replay complete. ${ctrl.totalMoves} moves replayed.`);
      return;
    }

    setLastReplayMove(move);
    setReplayBoard((prev) => {
      if (!prev) return prev;
      try {
        return applyMove(prev, move.from, move.to);
      } catch {
        return prev;
      }
    });

    const progress = `${ctrl.currentIndex}/${ctrl.totalMoves}`;
    setStatus(`Replaying move ${progress}: (${move.from.r},${move.from.c}) → (${move.to.r},${move.to.c})  [${move.source}]`);
    autoplayTimerRef.current = setTimeout(stepReplay, AUTO_STEP_MS);
  }, []);

  const onReplay = useCallback(() => {
    const record = GameRecorder.load();
    if (!record) {
      setStatus('No saved record found. Play a game with "Record game" checked first.');
      return;
    }

    stopAutoplay();
    flushRecorder();
    setIsReplaying(true);
    setLastReplayMove(null);
    setSelectedFrom(null);

    const freshBoard = createNewGame(record.boardType, record.size);
    setReplayBoard(freshBoard);

    const ctrl = new ReplayController(record);
    replayRef.current = ctrl;

    const started = new Date(record.startedAt).toLocaleString();
    setStatus(`Replaying "${record.boardType} ${record.size}×${record.size}" recorded at ${started}. ${record.moves.length} moves.`);

    autoplayTimerRef.current = setTimeout(stepReplay, AUTO_STEP_MS);
  }, [stepReplay, stopAutoplay, flushRecorder]);

  const onStopReplay = useCallback(() => {
    clearTimer();
    setIsReplaying(false);
    replayRef.current = null;
    setReplayBoard(null);
    setLastReplayMove(null);
    setStatus('Replay stopped.');
  }, [clearTimer]);

  // ── Record checkbox ───────────────────────────────────────────────────────

  const onToggleRecord = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setRecordEnabled(checked);
      if (checked && !gameRef.current.isRecording() && !gameRef.current.isOver()) {
        const rec = new GameRecorder(gameRef.current.boardType, gameRef.current.size);
        gameRef.current.enableRecording(rec);
        recorderRef.current = rec;
        setStatus('Recording started for current game.');
      } else if (!checked) {
        flushRecorder();
        gameRef.current.disableRecording();
        setStatus('Recording stopped.');
      }
    },
    [flushRecorder],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  // ── derived display ───────────────────────────────────────────────────────

  const displayBoard = isReplaying && replayBoard ? replayBoard : board;
  const g = gameRef.current;
  const pegsLeft = isReplaying
    ? displayBoard.flat().filter((c) => c === 'peg').length
    : g.countPegs();
  const gameOver = !isReplaying && g.isOver();

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', maxWidth: 960 }}>
      <h2 style={{ marginBottom: 4 }}>CS 449 – Peg Solitaire (Sprint 4)</h2>
      <p style={{ color: '#666', marginTop: 0 }}>
        Record games to localStorage and replay them step-by-step.
      </p>
      <hr style={{ border: 0, height: 2, background: '#333', margin: '12px 0' }} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ── Left panel ── */}
        <div
          style={{
            minWidth: 220,
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: 14,
            background: '#fafafa',
          }}
        >
          {/* Board size */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>
              Board Size (odd)
            </label>
            <input
              type="number"
              value={boardSize}
              min={3}
              step={2}
              onChange={(e) => setBoardSize(Number(e.target.value))}
              style={{ width: 80 }}
            />
          </div>

          {/* Board type */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>Board Type</p>
            {(['English', 'Hexagon', 'Diamond'] as BoardType[]).map((t) => (
              <label key={t} style={{ display: 'block', marginBottom: 4 }}>
                <input
                  type="radio"
                  value={t}
                  checked={boardType === t}
                  onChange={() => setBoardType(t)}
                />{' '}
                {t}
              </label>
            ))}
          </div>

          {/* Game mode */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>Game Mode</p>
            {(['manual', 'auto'] as GameMode[]).map((m) => (
              <label key={m} style={{ display: 'block', marginBottom: 4 }}>
                <input
                  type="radio"
                  value={m}
                  checked={gameMode === m}
                  onChange={() => setGameMode(m)}
                />{' '}
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </label>
            ))}
          </div>

          {/* ── Sprint 4: Record game checkbox ── */}
          <div
            style={{
              marginBottom: 14,
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: 4,
              background: recordEnabled ? '#fff3e0' : '#fff',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={recordEnabled}
                onChange={onToggleRecord}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontWeight: 600 }}>
                {recordEnabled ? '🔴 Record game' : '⚪ Record game'}
              </span>
            </label>
            {hasSavedRecord && (
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                💾 A saved record is available for replay.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <button
            onClick={onNewGame}
            style={{ display: 'block', width: '100%', marginBottom: 8, padding: '6px 0' }}
          >
            New Game
          </button>

          {/* ── Sprint 4: Replay button ── */}
          {isReplaying ? (
            <button
              onClick={onStopReplay}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 8,
                padding: '6px 0',
                background: '#ef6c00',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ⏹ Stop Replay
            </button>
          ) : (
            <button
              onClick={onReplay}
              disabled={!hasSavedRecord}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 8,
                padding: '6px 0',
                background: hasSavedRecord ? '#5c6bc0' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: hasSavedRecord ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              ▶ Replay
            </button>
          )}

          <button
            onClick={onAutoplay}
            disabled={isReplaying}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: 8,
              padding: '6px 0',
              background: isReplaying ? '#ccc' : isAutoplaying ? '#e57373' : '#66bb6a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: isReplaying ? 'not-allowed' : 'pointer',
            }}
          >
            {isAutoplaying ? '⏸ Pause Autoplay' : '▶ Autoplay'}
          </button>

          <button
            onClick={onRandomize}
            disabled={isReplaying}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 0',
              background: isReplaying ? '#ccc' : '#42a5f5',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: isReplaying ? 'not-allowed' : 'pointer',
            }}
          >
            🎲 Randomize
          </button>

          {/* Stats */}
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7 }}>
            {isReplaying ? (
              <>
                <div>
                  <strong>Mode:</strong>{' '}
                  <Badge label="REPLAY" color="#5c6bc0" />
                </div>
                {lastReplayMove && (
                  <div>
                    <strong>Source:</strong>
                    <Badge label={lastReplayMove.source} color={SOURCE_COLOR[lastReplayMove.source] ?? '#555'} />
                  </div>
                )}
                <div>
                  <strong>Pegs left:</strong> {pegsLeft}
                </div>
                {replayRef.current && (
                  <div>
                    <strong>Progress:</strong>{' '}
                    {replayRef.current.currentIndex}/{replayRef.current.totalMoves}
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <strong>Mode:</strong> {g.modeName()}
                </div>
                <div>
                  <strong>Pegs left:</strong> {pegsLeft}
                </div>
                <div>
                  <strong>Valid moves:</strong> {g.getValidMoves().length}
                </div>
                {gameOver && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '6px 8px',
                      background: '#ffebee',
                      border: '1px solid #ef9a9a',
                      borderRadius: 4,
                    }}
                  >
                    <strong>Game Over</strong>
                    <br />
                    Rating: <strong>{g.getRating()}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Board ── */}
        <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 14 }}>
          <div
            style={{
              marginBottom: 10,
              fontSize: 13,
              color: '#444',
              minHeight: 20,
              maxWidth: 440,
            }}
          >
            {status || 'Click a peg to select it, then click a hole 2 spaces away.'}
          </div>

          {isReplaying && (
            <div
              style={{
                marginBottom: 8,
                padding: '4px 10px',
                background: '#e8eaf6',
                borderRadius: 4,
                fontSize: 12,
                color: '#3949ab',
                fontWeight: 600,
              }}
            >
              ▶ REPLAY IN PROGRESS — board is read-only
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${displayBoard.length}, 36px)`,
              gap: 3,
            }}
          >
            {displayBoard.map((row, r) =>
              row.map((cellState, c) => {
                if (cellState === 'invalid') {
                  return <div key={`${r}-${c}`} style={{ width: 36, height: 36 }} />;
                }

                const isSelected = selectedFrom?.r === r && selectedFrom?.c === c;

                // Highlight last replayed move
                const isReplayFrom =
                  isReplaying &&
                  lastReplayMove?.to.r === r &&
                  lastReplayMove?.to.c === c;

                return (
                  <div
                    key={posKey({ r, c })}
                    onClick={() => onCellClick(r, c)}
                    title={`(${r},${c}) ${cellState}`}
                    style={{
                      width: 36,
                      height: 36,
                      border: `2px solid ${isSelected ? '#f57f17' : isReplayFrom ? '#7b1fa2' : '#bbb'}`,
                      borderRadius: 6,
                      background: isSelected
                        ? '#fff9c4'
                        : isReplayFrom
                        ? '#f3e5f5'
                        : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor:
                        cellState === 'peg' && !isAutoplaying && !isReplaying
                          ? 'pointer'
                          : 'default',
                    }}
                  >
                    <CellDot state={cellState} />
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sprint4GUI;