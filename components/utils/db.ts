import Dexie, { type Table } from 'dexie';

// 1. Database Table Interfaces
export interface DbPlayer {
  id: string; // UUID
  username: string;
  name: string;
  country: string;
  avatar: string; // base64 or emoji
  level: number;
  xp: number;
  rating: number;
  highestRating: number;
  winStreak: number;
  longestStreak: number;
  totalPlayTime: number; // in seconds
  createdAt: number;
  updatedAt: number;
}

export interface DbGame {
  id: string; // UUID
  date: number; // timestamp
  duration: number; // in seconds
  moveCount: number;
  winner: 'w' | 'b' | 'draw';
  difficulty: 1 | 2 | 3 | 4 | 5;
  opening: string;
  result: 'win' | 'loss' | 'draw';
  accuracy: number; // 0 to 100
  mistakes: number;
  blunders: number;
  brilliantMoves: number;
  excellentMoves: number;
  goodMoves: number;
  inaccuracies: number;
  misses: number;
  capturedPieces: string; // JSON string of captured pieces
  castled: boolean;
  promotion: boolean;
  checkCount: number;
  checkmate: boolean;
  thinkingTime: number; // total thinking time in ms
  pgn: string;
  fen: string;
  notes: string;
  favorite: number; // 0 or 1 (indexed)
  createdAt: number;
  updatedAt: number;
}

export interface DbRatingHistory {
  id: string; // UUID
  oldRating: number;
  newRating: number;
  change: number;
  expectedScore: number;
  opponentRating: number;
  date: number; // timestamp
  gameId: string;
  createdAt: number;
}

export interface DbAchievement {
  id: string; // UUID
  key: string; // unique key
  title: string;
  description: string;
  category: 'wins' | 'games' | 'captures' | 'checkmates' | 'rating' | 'streaks' | 'time' | 'special';
  progress: number;
  target: number;
  unlocked: number; // 0 or 1
  unlockedAt?: number;
  xpReward: number;
  createdAt: number;
}

export interface DbCalendarEntry {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  gamesCount: number;
  wins: number;
  losses: number;
  draws: number;
  ratingChange: number;
  avgAccuracy: number;
  createdAt: number;
}

export interface DbSettings {
  id: string; // 'current'
  darkMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  showCoordinates: boolean;
  boardTheme: string;
  pieceTheme: string;
  soundVolume: number;
  ambientVolume: number;
  notificationSounds: boolean;
  cameraPreset: string;
  language: string;
  fontSize: string;
  createdAt: number;
  updatedAt: number;
}

export interface DbBackupHistory {
  id: string; // UUID
  date: number;
  fileName: string;
  sizeBytes: number;
  status: 'success' | 'failed';
  createdAt: number;
}

export interface DbFavoriteGame {
  id: string; // UUID
  gameUuid: string;
  addedAt: number;
}

export interface DbOpeningStats {
  id: string; // UUID (or opening name as id)
  name: string;
  plays: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface DbPieceStats {
  id: string; // UUID
  type: string; // 'p', 'r', 'n', 'b', 'q', 'k'
  captures: number;
  captured: number;
  moves: number;
}

// 2. Dexie Database Definition
export class ChessMasterDatabase extends Dexie {
  player!: Table<DbPlayer, string>;
  games!: Table<DbGame, string>;
  ratingHistory!: Table<DbRatingHistory, string>;
  achievements!: Table<DbAchievement, string>;
  calendar!: Table<DbCalendarEntry, string>;
  settings!: Table<DbSettings, string>;
  backupHistory!: Table<DbBackupHistory, string>;
  favoriteGames!: Table<DbFavoriteGame, string>;
  openingStats!: Table<DbOpeningStats, string>;
  pieceStats!: Table<DbPieceStats, string>;

  constructor() {
    super('ChessMaster');
    
    this.version(1).stores({
      player: 'id, username, level, rating',
      games: 'id, date, winner, difficulty, opening, result, favorite',
      ratingHistory: 'id, date, gameId',
      achievements: 'id, key, category, unlocked',
      calendar: 'id, date',
      settings: 'id',
      backupHistory: 'id, date',
      favoriteGames: 'id, gameUuid, addedAt',
      openingStats: 'id, name, plays',
      pieceStats: 'id, type'
    });
  }
}

// Instantiate and export database
export const db = new ChessMasterDatabase();
export default db;
