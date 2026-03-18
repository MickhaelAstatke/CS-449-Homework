import React, { useMemo, useState } from 'react';
import type { BoardType, Pos } from './types';
import {
  applyMove,
  createNewGame,
  isGameOver,
  isValidMove,
  listValidMoves,
  type Board,
  countPegs,
} from './SolitaireLogic';

const DEFAULT_SIZE = 7;

function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

const Sprint2GUI: React.FC = () => {
  const [boardType, setBoardType] = useState<BoardType>('English');
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_SIZE);
  const [recordGame, setRecordGame] = useState<boolean>(false);

  const [board, setBoard] = useState<Board>(() => createNewGame('English', DEFAULT_SIZE));
  const [selectedFrom, setSelectedFrom] = useState<Pos | null>(null);
  const [status, setStatus] = useState<string>('');

  const validMoves = useMemo(() => listValidMoves(board), [board]);
  const gameOver = useMemo(() => isGameOver(board), [board]);

  const onNewGame = () => {
    setBoard(createNewGame(boardType, boardSize));
    setSelectedFrom(null);
    setStatus('');
  };

  const onCellClick = (r: number, c: number) => {
    const here = { r, c };

    const cell = board[r][c];
    if (cell === 'invalid') return;

    // Click a peg to select the "from"
    if (cell === 'peg') {
      setSelectedFrom(here);
      setStatus(`Selected peg at (${r}, ${c}). Now click a destination hole 2 spaces away.`);
      return;
    }

    // Click a hole: try move from selectedFrom -> here
    if (cell === 'hole') {
      if (!selectedFrom) {
        setStatus('Click a peg first to select it.');
        return;
      }

      if (!isValidMove(board, selectedFrom, here)) {
        setStatus('Invalid move. A valid move jumps a peg orthogonally or diagonally into a hole two spaces away.');
        return;
      }

      const next = applyMove(board, selectedFrom, here);
      setBoard(next);
      setSelectedFrom(null);

      if (recordGame) {
        // Sprint 2 minimum doesn’t require recording logic; we just acknowledge the toggle.
        setStatus('Move applied (recording enabled, but recording storage is not part of Sprint 2 minimum).');
      } else {
        setStatus('Move applied.');
      }
    }
  };

  const pegsLeft = countPegs(board);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', maxWidth: 900 }}>
      <h2 style={{ marginBottom: 5 }}>CS 449: Peg Solitaire (Sprint 2)</h2>
      <p style={{ color: '#666', marginTop: 0 }}>
        Choose a board type and size, start a new game, make moves, and detect end-of-game.
      </p>

      <hr style={{ border: '0', height: 2, background: '#333', margin: '16px 0' }} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left controls */}
        <div style={{ minWidth: 240, border: '1px solid #ddd', padding: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 8px 0' }}><strong>Board Type</strong></p>

            <label style={{ display: 'block', marginBottom: 6 }}>
              <input
                type="radio"
                value="English"
                checked={boardType === 'English'}
                onChange={() => setBoardType('English')}
              />{' '}
              English
            </label>

            <label style={{ display: 'block', marginBottom: 6 }}>
              <input
                type="radio"
                value="Hexagon"
                checked={boardType === 'Hexagon'}
                onChange={() => setBoardType('Hexagon')}
              />{' '}
              Hexagon
            </label>

            <label style={{ display: 'block' }}>
              <input
                type="radio"
                value="Diamond"
                checked={boardType === 'Diamond'}
                onChange={() => setBoardType('Diamond')}
              />{' '}
              Diamond
            </label>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>
              <strong>Board size</strong> (odd number, e.g. 7)
            </label>
            <input
              type="number"
              value={boardSize}
              min={3}
              step={2}
              onChange={(e) => setBoardSize(Number(e.target.value))}
              style={{ width: 120 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <button onClick={onNewGame} style={{ padding: '6px 10px' }}>
              New Game
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
              <input
                type="checkbox"
                checked={recordGame}
                onChange={() => setRecordGame((x) => !x)}
              />
              Record game
            </label>
          </div>

          <div style={{ marginTop: 12, fontSize: 14, color: '#333' }}>
            <div><strong>Pegs left:</strong> {pegsLeft}</div>
            <div><strong>Valid moves:</strong> {validMoves.length}</div>
            {gameOver && <div style={{ marginTop: 8, color: '#b00020' }}><strong>Game Over:</strong> no more valid moves.</div>}
          </div>
        </div>

        {/* Board */}
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <div style={{ marginBottom: 10, color: '#444', fontSize: 14 }}>
            {status || 'Tip: Click a peg, then click a hole 2 spaces away (orthogonal or diagonal).'}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${board.length}, 34px)`,
              gap: 4,
              justifyContent: 'start',
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                if (cell === 'invalid') {
                  return <div key={`${r}-${c}`} style={{ width: 34, height: 34 }} />;
                }

                const isSelected = selectedFrom && selectedFrom.r === r && selectedFrom.c === c;

                const baseStyle: React.CSSProperties = {
                  width: 34,
                  height: 34,
                  border: '1px solid #999',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: isSelected ? '#fff3cd' : '#fff',
                  userSelect: 'none',
                };

                const dotStyle: React.CSSProperties = {
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: cell === 'peg' ? '#111' : 'transparent',
                  border: cell === 'hole' ? '2px solid #111' : '2px solid transparent',
                };

                return (
                  <div
                    key={posKey({ r, c })}
                    style={baseStyle}
                    onClick={() => onCellClick(r, c)}
                    title={`(${r}, ${c}) ${cell}`}
                  >
                    <div style={dotStyle} />
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

export default Sprint2GUI;