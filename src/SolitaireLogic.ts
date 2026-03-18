import type { BoardType, CellState, Move, Pos } from './types';

/**
 * Board is represented as a square matrix. Some cells are 'invalid' (not part of shape),
 * others are 'peg' or 'hole'.
 *
 * Sprint 2 requirements supported:
 * - Choose board size and type
 * - Start a new game (board generation)
 * - Make a move (jump exactly 2 cells orthogonally or diagonally)
 * - Detect end of game (no valid moves remain)
 */
export type Board = CellState[][];

export function createNewGame(boardType: BoardType, size: number): Board {
  if (!Number.isInteger(size) || size < 3) {
    throw new Error('Board size must be an integer >= 3');
  }
  if (size % 2 === 0) {
    throw new Error('Board size must be odd (e.g., 7)');
  }

  const board = createShape(boardType, size);

  // Fill all valid cells with pegs, then make center a hole.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== 'invalid') board[r][c] = 'peg';
    }
  }

  const center = { r: Math.floor(size / 2), c: Math.floor(size / 2) };
  if (board[center.r][center.c] === 'invalid') {
    // Should not happen with our shapes, but keep it safe.
    throw new Error('Center of board is invalid for this shape/size.');
  }
  board[center.r][center.c] = 'hole';

  return board;
}

function createShape(boardType: BoardType, size: number): Board {
  const board: Board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'invalid' as CellState),
  );

  switch (boardType) {
    case 'English':
      // Classic "cross" shape: arms thickness = (size+1)/2, corners invalid.
      // For size=7: rows/cols 2..4 are full; outer rows have 3 valid in center.
      // Generalization: valid if (abs(r-center) <= arm && abs(c-center) <= arm) AND
      // not both abs(r-center) > core && abs(c-center) > core, where core = floor(size/4).
      // Simpler: "cross" = union of middle band rows and middle band cols.
      {
        const center = Math.floor(size / 2);
        const band = Math.floor(size / 3); // for 7 => 2, gives classic look
        const rMin = center - band;
        const rMax = center + band;

        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const inMiddleRows = r >= rMin && r <= rMax;
            const inMiddleCols = c >= rMin && c <= rMax;
            if (inMiddleRows || inMiddleCols) {
              board[r][c] = 'hole';
            }
          }
        }
      }
      return board;

    case 'Diamond':
      // Diamond shape where the center row has length = size
      // Valid if manhattan distance to center <= radius
      {
        const center = Math.floor(size / 2);
        const radius = center;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const dist = Math.abs(r - center) + Math.abs(c - center);
            if (dist <= radius) board[r][c] = 'hole';
          }
        }
      }
      return board;

    case 'Hexagon':
      // Hexagon projected into square matrix:
      // Use axial-like constraint on (r,c) via cube coords projection.
      // We can approximate with: let center = size//2, radius = center;
      // Valid if max(|dr|, |dc|, |dr+dc|) <= radius where dc is (c-center) and dr is (r-center).
      {
        const center = Math.floor(size / 2);
        const radius = center;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const dr = r - center;
            const dc = c - center;
            const d3 = dr + dc;
            const m = Math.max(Math.abs(dr), Math.abs(dc), Math.abs(d3));
            if (m <= radius) board[r][c] = 'hole';
          }
        }
      }
      return board;

    default:
      // Exhaustive check
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown board type: ${boardType}`);
  }
}

export function isInside(board: Board, p: Pos): boolean {
  return p.r >= 0 && p.r < board.length && p.c >= 0 && p.c < board[0].length;
}

export function cell(board: Board, p: Pos): CellState {
  if (!isInside(board, p)) return 'invalid';
  return board[p.r][p.c];
}

export function listValidMoves(board: Board): Move[] {
  const moves: Move[] = [];
  const dirs: Pos[] = [
    { r: -1, c: 0 },
    { r: 1, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 },
    { r: -1, c: -1 },
    { r: -1, c: 1 },
    { r: 1, c: -1 },
    { r: 1, c: 1 },
  ];

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c] !== 'peg') continue;

      for (const d of dirs) {
        const from = { r, c };
        const over = { r: r + d.r, c: c + d.c };
        const to = { r: r + 2 * d.r, c: c + 2 * d.c };

        if (isValidMove(board, from, to)) {
          moves.push({ from, over, to });
        }
      }
    }
  }

  return moves;
}

export function isValidMove(board: Board, from: Pos, to: Pos): boolean {
  if (!isInside(board, from) || !isInside(board, to)) return false;

  const dr = to.r - from.r;
  const dc = to.c - from.c;

  // Must be exactly 2 steps in orthogonal or diagonal direction
  const isOrth = (Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0);
  const isDiag = Math.abs(dr) === 2 && Math.abs(dc) === 2;
  if (!isOrth && !isDiag) return false;

  const over = { r: from.r + dr / 2, c: from.c + dc / 2 };

  // Must stay within shape
  if (cell(board, from) !== 'peg') return false;
  if (cell(board, over) !== 'peg') return false;
  if (cell(board, to) !== 'hole') return false;

  return true;
}

export function applyMove(board: Board, from: Pos, to: Pos): Board {
  if (!isValidMove(board, from, to)) {
    throw new Error('Invalid move');
  }
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const over = { r: from.r + dr / 2, c: from.c + dc / 2 };

  const next = cloneBoard(board);
  next[from.r][from.c] = 'hole';
  next[over.r][over.c] = 'hole';
  next[to.r][to.c] = 'peg';
  return next;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function isGameOver(board: Board): boolean {
  return listValidMoves(board).length === 0;
}

export function countPegs(board: Board): number {
  let n = 0;
  for (const row of board) for (const x of row) if (x === 'peg') n++;
  return n;
}