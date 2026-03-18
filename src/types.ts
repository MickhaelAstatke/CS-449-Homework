export type BoardType = 'English' | 'Hexagon' | 'Diamond';

export type CellState = 'invalid' | 'peg' | 'hole';

export type Pos = { r: number; c: number };

export type Move = { from: Pos; over: Pos; to: Pos };