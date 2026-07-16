export type PlayerColor = 'w' | 'b';

export type GameStatus = 'idle' | 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';

export type DrawReason = 'stalemate' | 'threefold' | 'insufficient' | '50moves' | 'agreement' | null;

export type CpuLevel = 1 | 2 | 3 | 4 | 5;

export interface MoveRecord {
  from: string;
  to: string;
  piece: string;
  color: PlayerColor;
  captured?: string;
  promotion?: string;
  san: string;
  fen: string;
  timestamp: number;
}

export interface CapturedPieces {
  w: {
    p: number;
    r: number;
    n: number;
    b: number;
    q: number;
  };
  b: {
    p: number;
    r: number;
    n: number;
    b: number;
    q: number;
  };
}

export type CameraPreset = 'classic' | 'topdown' | 'immersive';

export interface GameSettings {
  level: CpuLevel;
  playerColor: PlayerColor; // 'w' or 'b' for user, opponent is opposite
  soundVolume: number; // 0 to 1
  ambientVolume: number; // 0 to 1
  isAmbientPlaying: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  showCoordinates: boolean;
  isFlipped: boolean; // board rotated 180 degrees
  autoRotate: boolean; // rotate board based on turn
  cameraPreset: CameraPreset;
  boardTheme: string;
  pieceTheme: string;
}

export interface TimeControl {
  initialMinutes: number;
  whiteTime: number; // in milliseconds
  blackTime: number; // in milliseconds
  isActive: boolean;
}

export interface PieceItem {
  id: string;
  type: string;
  color: 'w' | 'b';
  square: string;
}

export interface ChessState {
  fen: string;
  history: MoveRecord[];
  pieces: PieceItem[];
  status: GameStatus;
  winner: PlayerColor | null;
  drawReason: DrawReason;
  selectedSquare: string | null;
  possibleMoves: string[];
  lastMove: { from: string; to: string } | null;
  checkingSquares: string[];
  mateSquare: string | null;
  promotionPending: { from: string; to: string } | null;
  settings: GameSettings;
  timeControl: TimeControl;
  captured: CapturedPieces;
  evalScore: number; // positive for white, negative for black
  isCpuThinking: boolean;
}
