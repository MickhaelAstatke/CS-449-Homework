import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardType, Pos } from './types';
import { ManualGame, AutoGame, SolitaireGame } from './SolitaireGame';
import type { Board } from './SolitaireLogic';

type GameMode = 'manual' | 'auto';

const DEFAULT_SIZE = 7;
const AUTO_STEP_MS = 400; // ms between autoplay steps

function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

// ── small helpers ──────────────────────────────────────────────────────────

function CellDot({ state }: { state: 'peg' | 'hole' }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: state === 'peg' ? '#222' : 'transparent',
        border: state === 'hole' ? '2px solid #888' : '2px solid transparent',
      }}
    />
  );
}

// ── main component ──────────────────────────────────────────────────────────

const Sprint3GUI: React.FC = () => {
  const [boardType, setBoardType] = useState<BoardType>('English');
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_SIZE);
  const [gameMode, setGameMode] = useState<GameMode>('manual');

  // We keep the game object in a ref so mutations don't re-render on every step.
  const gameRef = useRef<SolitaireGame>(new ManualGame('English', DEFAULT_SIZE));

  // Mirror of gameRef.current.getBoard() used purely for rendering.
  const [board, setBoard] = useState<Board>(() => gameRef.current.getBoard());
  const [selectedFrom, setSelectedFrom] = useState<Pos | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isAutoplaying, setIsAutoplaying] = useState<boolean>(false);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync board display from game object
  const syncBoard = useCallback(() => {
    setBoard(gameRef.current.getBoard().map((r) => r.slice()));
  }, []);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
    autoplayRef.current = null;
    setIsAutoplaying(false);
  }, []);

  // ---- New Game ----
  const onNewGame = useCallback(() => {
    stopAutoplay();
    const g =
      gameMode === 'manual'
        ? new ManualGame(boardType, boardSize)
        : new AutoGame(boardType, boardSize);
    gameRef.current = g;
    setSelectedFrom(null);
    setStatus(`New ${g.modeName()} game started. Board: ${boardType} ${boardSize}×${boardSize}.`);
    syncBoard();
  }, [boardType, boardSize, gameMode, syncBoard, stopAutoplay]);

  // ---- Manual move ----
  const onCellClick = useCallback(
    (r: number, c: number) => {
      if (isAutoplaying) return;
      const g = gameRef.current;
      if (!(g instanceof ManualGame)) return;

      const here: Pos = { r, c };
      const cellState = g.getBoard()[r][c];
      if (cellState === 'invalid') return;

      if (cellState === 'peg') {
        setSelectedFrom(here);
        setStatus(`Peg selected at (${r}, ${c}). Click a destination hole.`);
        return;
      }

      // cellState === 'hole'
      if (!selectedFrom) {
        setStatus('Select a peg first.');
        return;
      }

      const ok = g.makeMove(selectedFrom, here);
      setSelectedFrom(null);
      if (ok) {
        syncBoard();
        if (g.isOver()) {
          setStatus(
            `Game over! ${g.countPegs()} peg(s) left. Rating: ${g.getRating()}.`,
          );
        } else {
          setStatus(`Move applied. ${g.countPegs()} pegs left.`);
        }
      } else {
        setStatus('Invalid move – must jump over an adjacent peg into an empty hole 2 steps away.');
      }
    },
    [isAutoplaying, selectedFrom, syncBoard],
  );

  // ---- Autoplay ----
  const stepAuto = useCallback(() => {
    const g = gameRef.current;
    if (!(g instanceof AutoGame)) return;

    if (g.isOver()) {
      syncBoard();
      setStatus(`Auto game over! ${g.countPegs()} peg(s) left. Rating: ${g.getRating()}.`);
      setIsAutoplaying(false);
      return;
    }

    const m = g.makeAutoMove();
    syncBoard();
    if (!m || g.isOver()) {
      setStatus(`Auto game over! ${g.countPegs()} peg(s) left. Rating: ${g.getRating()}.`);
      setIsAutoplaying(false);
      return;
    }

    setStatus(
      `Auto move: (${m.from.r},${m.from.c}) → (${m.to.r},${m.to.c}). ${g.countPegs()} pegs left.`,
    );

    autoplayRef.current = setTimeout(stepAuto, AUTO_STEP_MS);
  }, [syncBoard]);

  const onAutoplay = useCallback(() => {
    // Switch to auto game if needed
    if (!(gameRef.current instanceof AutoGame)) {
      const g = new AutoGame(boardType, boardSize);
      gameRef.current = g;
      syncBoard();
      setStatus('Switched to Auto mode and started autoplay.');
      setGameMode('auto');
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
    autoplayRef.current = setTimeout(stepAuto, AUTO_STEP_MS);
  }, [boardSize, boardType, isAutoplaying, stepAuto, stopAutoplay, syncBoard]);

  // ---- Randomize ----
  const onRandomize = useCallback(() => {
    stopAutoplay();
    gameRef.current.randomize(12);
    syncBoard();
    const g = gameRef.current;
    setStatus(
      `Board randomised. ${g.countPegs()} pegs left. ${g.getValidMoves().length} valid moves.`,
    );
    setSelectedFrom(null);
  }, [stopAutoplay, syncBoard]);

  // cleanup on unmount
  useEffect(() => () => stopAutoplay(), [stopAutoplay]);

  const g = gameRef.current;
  const pegsLeft = g.countPegs();
  const validCount = g.getValidMoves().length;
  const gameOver = g.isOver();

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', maxWidth: 960 }}>
      <h2 style={{ marginBottom: 4 }}>CS 449 – Peg Solitaire (Sprint 3)</h2>
      <p style={{ color: '#666', marginTop: 0 }}>
        Manual or automated Peg Solitaire with English, Hexagon, and Diamond boards.
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

          {/* Action buttons */}
          <button
            onClick={onNewGame}
            style={{ display: 'block', width: '100%', marginBottom: 8, padding: '6px 0' }}
          >
            New Game
          </button>

          <button
            onClick={onAutoplay}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: 8,
              padding: '6px 0',
              background: isAutoplaying ? '#e57373' : '#66bb6a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {isAutoplaying ? '⏸ Pause Autoplay' : '▶ Autoplay'}
          </button>

          <button
            onClick={onRandomize}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 0',
              background: '#42a5f5',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            🎲 Randomize
          </button>

          {/* Stats */}
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7 }}>
            <div>
              <strong>Mode:</strong> {g.modeName()}
            </div>
            <div>
              <strong>Pegs left:</strong> {pegsLeft}
            </div>
            <div>
              <strong>Valid moves:</strong> {validCount}
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
              maxWidth: 400,
            }}
          >
            {status || 'Click a peg to select it, then click a hole 2 spaces away.'}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${board.length}, 36px)`,
              gap: 3,
            }}
          >
            {board.map((row, r) =>
              row.map((cellState, c) => {
                if (cellState === 'invalid') {
                  return <div key={`${r}-${c}`} style={{ width: 36, height: 36 }} />;
                }

                const isSelected =
                  selectedFrom?.r === r && selectedFrom?.c === c;

                return (
                  <div
                    key={posKey({ r, c })}
                    onClick={() => onCellClick(r, c)}
                    title={`(${r},${c}) ${cellState}`}
                    style={{
                      width: 36,
                      height: 36,
                      border: `2px solid ${isSelected ? '#f57f17' : '#bbb'}`,
                      borderRadius: 6,
                      background: isSelected ? '#fff9c4' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: cellState === 'peg' && !isAutoplaying ? 'pointer' : 'default',
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

export default Sprint3GUI;