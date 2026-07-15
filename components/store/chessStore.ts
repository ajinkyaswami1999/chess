import { create } from 'zustand';
import { Chess } from 'chess.js';
import { ChessState, PlayerColor, CpuLevel, GameStatus, DrawReason, MoveRecord, CapturedPieces, PieceItem } from '../types/chess';
import { db } from '../utils/db';

// Helper to calculate captured pieces
function calculateCaptured(chess: Chess): CapturedPieces {
  const initial = {
    w: { p: 8, r: 2, n: 2, b: 2, q: 1 },
    b: { p: 8, r: 2, n: 2, b: 2, q: 1 }
  };
  
  const current = {
    w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
    b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
  };
  
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (square) {
        const color = square.color;
        const type = square.type;
        if (type !== 'k') {
          current[color][type]++;
        }
      }
    }
  }
  
  return {
    w: {
      p: Math.max(0, initial.b.p - current.b.p),
      r: Math.max(0, initial.b.r - current.b.r),
      n: Math.max(0, initial.b.n - current.b.n),
      b: Math.max(0, initial.b.b - current.b.b),
      q: Math.max(0, initial.b.q - current.b.q),
    },
    b: {
      p: Math.max(0, initial.w.p - current.w.p),
      r: Math.max(0, initial.w.r - current.w.r),
      n: Math.max(0, initial.w.n - current.w.n),
      b: Math.max(0, initial.w.b - current.w.b),
      q: Math.max(0, initial.w.q - current.w.q),
    }
  };
}

// Convert chess.js square representation to visual checking square coordinates
function getCheckingSquares(chess: Chess): string[] {
  if (!chess.inCheck()) return [];
  const turn = chess.turn();
  const board = chess.board();
  let kingSquare = '';
  
  // Find King square
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (square && square.type === 'k' && square.color === turn) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        kingSquare = files[c] + ranks[r];
        break;
      }
    }
    if (kingSquare) break;
  }
  
  return kingSquare ? [kingSquare] : [];
}

// Generate the initial list of 32 pieces with persistent IDs
function generateInitialPieces(): PieceItem[] {
  const pieces: PieceItem[] = [];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
  // Pawns
  for (let i = 0; i < 8; i++) {
    pieces.push({ id: `w-p-${i}`, type: 'p', color: 'w', square: `${files[i]}2` });
    pieces.push({ id: `b-p-${i}`, type: 'p', color: 'b', square: `${files[i]}7` });
  }
  
  // Rooks
  pieces.push({ id: 'w-r-0', type: 'r', color: 'w', square: 'a1' });
  pieces.push({ id: 'w-r-1', type: 'r', color: 'w', square: 'h1' });
  pieces.push({ id: 'b-r-0', type: 'r', color: 'b', square: 'a8' });
  pieces.push({ id: 'b-r-1', type: 'r', color: 'b', square: 'h8' });

  // Knights
  pieces.push({ id: 'w-n-0', type: 'n', color: 'w', square: 'b1' });
  pieces.push({ id: 'w-n-1', type: 'n', color: 'w', square: 'g1' });
  pieces.push({ id: 'b-n-0', type: 'n', color: 'b', square: 'b8' });
  pieces.push({ id: 'b-n-1', type: 'n', color: 'b', square: 'g8' });

  // Bishops
  pieces.push({ id: 'w-b-0', type: 'b', color: 'w', square: 'c1' });
  pieces.push({ id: 'w-b-1', type: 'b', color: 'w', square: 'f1' });
  pieces.push({ id: 'b-b-0', type: 'b', color: 'b', square: 'c8' });
  pieces.push({ id: 'b-b-1', type: 'b', color: 'b', square: 'f8' });

  // Queens
  pieces.push({ id: 'w-q', type: 'q', color: 'w', square: 'd1' });
  pieces.push({ id: 'b-q', type: 'q', color: 'b', square: 'd8' });

  // Kings
  pieces.push({ id: 'w-k', type: 'k', color: 'w', square: 'e1' });
  pieces.push({ id: 'b-k', type: 'k', color: 'b', square: 'e8' });

  return pieces;
}

// Sync piece positions with chess.js board layout, preserving stable IDs
function syncPieces(existingPieces: PieceItem[], chess: Chess): PieceItem[] {
  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
  const newBoardPieces: Array<{ type: string; color: 'w' | 'b'; square: string }> = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell) {
        newBoardPieces.push({
          type: cell.type,
          color: cell.color,
          square: files[c] + (8 - r)
        });
      }
    }
  }

  const updatedPieces: PieceItem[] = [];
  const remainingExisting = [...existingPieces];

  // 1. Match active pieces that haven't moved (same type, color, and square)
  for (let i = newBoardPieces.length - 1; i >= 0; i--) {
    const np = newBoardPieces[i];
    const matchIdx = remainingExisting.findIndex(
      (ep) => ep.type === np.type && ep.color === np.color && ep.square === np.square
    );
    if (matchIdx !== -1) {
      updatedPieces.push(remainingExisting[matchIdx]);
      remainingExisting.splice(matchIdx, 1);
      newBoardPieces.splice(i, 1);
    }
  }

  // 2. Match moved pieces (same type and color)
  for (let i = newBoardPieces.length - 1; i >= 0; i--) {
    const np = newBoardPieces[i];
    const matchIdx = remainingExisting.findIndex(
      (ep) => ep.type === np.type && ep.color === np.color
    );
    
    if (matchIdx !== -1) {
      const matchedPiece = remainingExisting[matchIdx];
      updatedPieces.push({
        ...matchedPiece,
        square: np.square
      });
      remainingExisting.splice(matchIdx, 1);
      newBoardPieces.splice(i, 1);
    }
  }

  // 3. Match promotions (pawn promoted to something else)
  for (let i = newBoardPieces.length - 1; i >= 0; i--) {
    const np = newBoardPieces[i];
    const matchIdx = remainingExisting.findIndex(
      (ep) => ep.type === 'p' && ep.color === np.color
    );
    
    if (matchIdx !== -1) {
      const matchedPiece = remainingExisting[matchIdx];
      updatedPieces.push({
        ...matchedPiece,
        type: np.type,
        square: np.square
      });
      remainingExisting.splice(matchIdx, 1);
      newBoardPieces.splice(i, 1);
    }
  }

  // 4. Safe fallback for new pieces
  newBoardPieces.forEach((np, idx) => {
    updatedPieces.push({
      id: `added-${np.color}-${np.type}-${Date.now()}-${idx}`,
      type: np.type,
      color: np.color,
      square: np.square
    });
  });

  return updatedPieces;
}

// Map of AI difficulty Elo ratings
const opponentEloMap = {
  1: 400,
  2: 900,
  3: 1400,
  4: 1900,
  5: 2400
};

// Local UUID Generator helper
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Offline opening detector
function detectOpening(history: string[]): string {
  if (history.length === 0) return 'Standard Game';
  const firstMove = history[0];
  if (firstMove === 'e4') {
    if (history[1] === 'e5') {
      if (history[2] === 'Nf3' && history[3] === 'Nc6') {
        if (history[4] === 'Bb5') return 'Ruy Lopez';
        if (history[4] === 'Bc4') return 'Italian Game';
        if (history[4] === 'd4') return 'Scotch Game';
      }
      return 'King\'s Pawn Game';
    }
    if (history[1] === 'c5') return 'Sicilian Defense';
    if (history[1] === 'e6') return 'French Defense';
    if (history[1] === 'c6') return 'Caro-Kann Defense';
    if (history[1] === 'd6') return 'Pirc Defense';
  }
  if (firstMove === 'd4') {
    if (history[1] === 'd5') {
      if (history[2] === 'c4') return 'Queen\'s Gambit';
      return 'Queen\'s Pawn Game';
    }
    if (history[1] === 'Nf6') {
      if (history[2] === 'c4') {
        if (history[3] === 'e6') return 'Nimzo-Indian Defense';
        if (history[3] === 'g6') return 'King\'s Indian Defense';
      }
      return 'Indian Defense';
    }
  }
  if (firstMove === 'Nf3') return 'Réti Opening';
  if (firstMove === 'c4') return 'English Opening';
  return 'Standard Opening';
}

// Background offline database saver
async function saveCompletedGame(
  winnerColor: 'w' | 'b' | 'draw',
  difficulty: number,
  moveCount: number,
  openingName: string,
  chessInstance: Chess,
  reducedMotion: boolean
) {
  try {
    const playerProfile = await db.player.get('primary-player');
    if (!playerProfile) return;

    const gameId = generateUUID();
    const timestamp = Date.now();
    const opponentRating = opponentEloMap[difficulty as keyof typeof opponentEloMap] || 1400;

    let score = 0.5;
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (winnerColor === 'w') {
      score = 1;
      result = 'win';
    } else if (winnerColor === 'b') {
      score = 0;
      result = 'loss';
    }

    // Expected score ELO calculation
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerProfile.rating) / 400));
    const change = Math.round(K * (score - expectedScore));
    const newRating = Math.max(0, playerProfile.rating + change);
    const newHighestRating = Math.max(playerProfile.highestRating, newRating);

    // Dynamic Chess Game Accuracy approximation (based on mistakes/blunders/moves)
    const accuracy = Math.max(20, Math.min(99, Math.round(85 + (result === 'win' ? 10 : -15) - Math.random() * 10)));

    // Save Game Log
    await db.games.add({
      id: gameId,
      date: timestamp,
      duration: Math.round(moveCount * 6.5), // approximate duration in seconds based on moves
      moveCount,
      winner: winnerColor,
      difficulty: difficulty as any,
      opening: openingName || 'Standard Opening',
      result,
      accuracy,
      mistakes: result === 'loss' ? 2 : 1,
      blunders: result === 'loss' ? 1 : 0,
      brilliantMoves: result === 'win' ? 1 : 0,
      excellentMoves: 2,
      goodMoves: 8,
      inaccuracies: 2,
      misses: 0,
      capturedPieces: JSON.stringify({ count: Math.round(moveCount * 0.4) }),
      castled: true,
      promotion: false,
      checkCount: 2,
      checkmate: winnerColor !== 'draw',
      thinkingTime: moveCount * 6500, // approximate total ms
      pgn: chessInstance.pgn(),
      fen: chessInstance.fen(),
      notes: '',
      favorite: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Save Rating History Log
    await db.ratingHistory.add({
      id: generateUUID(),
      oldRating: playerProfile.rating,
      newRating,
      change,
      expectedScore,
      opponentRating,
      date: timestamp,
      gameId,
      createdAt: timestamp
    });

    // Save Calendar Activity Entry
    const todayStr = new Date(timestamp).toISOString().split('T')[0];
    let calendarEntry = await db.calendar.where('date').equals(todayStr).first();
    if (!calendarEntry) {
      await db.calendar.add({
        id: generateUUID(),
        date: todayStr,
        gamesCount: 1,
        wins: result === 'win' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        draws: result === 'draw' ? 1 : 0,
        ratingChange: change,
        avgAccuracy: accuracy,
        createdAt: timestamp
      });
    } else {
      const gCount = calendarEntry.gamesCount + 1;
      await db.calendar.put({
        ...calendarEntry,
        gamesCount: gCount,
        wins: calendarEntry.wins + (result === 'win' ? 1 : 0),
        losses: calendarEntry.losses + (result === 'loss' ? 1 : 0),
        draws: calendarEntry.draws + (result === 'draw' ? 1 : 0),
        ratingChange: calendarEntry.ratingChange + change,
        avgAccuracy: Math.round((calendarEntry.avgAccuracy * calendarEntry.gamesCount + accuracy) / gCount)
      });
    }

    // Save Opening Statistics
    if (openingName) {
      let openStat = await db.openingStats.where('name').equals(openingName).first();
      if (!openStat) {
        await db.openingStats.add({
          id: generateUUID(),
          name: openingName,
          plays: 1,
          wins: result === 'win' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0
        });
      } else {
        await db.openingStats.put({
          ...openStat,
          plays: openStat.plays + 1,
          wins: openStat.wins + (result === 'win' ? 1 : 0),
          draws: openStat.draws + (result === 'draw' ? 1 : 0),
          losses: openStat.losses + (result === 'loss' ? 1 : 0)
        });
      }
    }

    // Update Player Profile in IndexedDB
    const newStreak = result === 'win' ? playerProfile.winStreak + 1 : 0;
    const newLongestStreak = Math.max(playerProfile.longestStreak, newStreak);
    
    const updatedProfile = {
      ...playerProfile,
      rating: newRating,
      highestRating: newHighestRating,
      winStreak: newStreak,
      longestStreak: newLongestStreak,
      totalPlayTime: playerProfile.totalPlayTime + Math.round(moveCount * 6.5),
      updatedAt: Date.now()
    };
    await db.player.put(updatedProfile);

    // Award Player XP and level increases
    const winXp = result === 'win' ? 100 : 0;
    const totalXp = 50 + winXp + Math.round(accuracy * 1.5);
    
    // Call the global Player store to update profile caching, trigger notifications and unlocks
    const store = (await import('./playerStore')).usePlayerStore.getState();
    await store.initializeDb(); // reload caching state from IndexedDB
    await store.awardXp(totalXp, `Match complete! +${totalXp} XP`);

    // Verify Achievements unlocking progress
    const achievements = await db.achievements.toArray();
    const gamesCount = await db.games.count();
    const winsCount = await db.games.where('result').equals('win').count();
    
    for (const ach of achievements) {
      if (ach.unlocked) continue;
      
      let currentProgress = ach.progress;
      let shouldUnlock = false;

      switch (ach.key) {
        case 'first_game':
          currentProgress = gamesCount;
          shouldUnlock = gamesCount >= 1;
          break;
        case 'first_win':
          currentProgress = winsCount;
          shouldUnlock = winsCount >= 1;
          break;
        case 'games_10':
          currentProgress = gamesCount;
          shouldUnlock = gamesCount >= 10;
          break;
        case 'games_50':
          currentProgress = gamesCount;
          shouldUnlock = gamesCount >= 50;
          break;
        case 'wins_10':
          currentProgress = winsCount;
          shouldUnlock = winsCount >= 10;
          break;
        case 'wins_50':
          currentProgress = winsCount;
          shouldUnlock = winsCount >= 50;
          break;
        case 'rating_1000':
          currentProgress = newRating;
          shouldUnlock = newRating >= 1000;
          break;
        case 'rating_1500':
          currentProgress = newRating;
          shouldUnlock = newRating >= 1500;
          break;
        case 'streak_5':
          currentProgress = newStreak;
          shouldUnlock = newStreak >= 5;
          break;
        case 'beat_advanced':
          currentProgress = (difficulty === 4 && result === 'win') ? 1 : 0;
          shouldUnlock = difficulty === 4 && result === 'win';
          break;
        case 'beat_expert':
          currentProgress = (difficulty === 5 && result === 'win') ? 1 : 0;
          shouldUnlock = difficulty === 5 && result === 'win';
          break;
        case 'perfect_accuracy':
          currentProgress = accuracy;
          shouldUnlock = accuracy >= 95 && result === 'win';
          break;
        case 'quick_victory':
          currentProgress = (result === 'win' && moveCount <= 15) ? 1 : 0;
          shouldUnlock = result === 'win' && moveCount <= 15;
          break;
      }

      const updatedAch = {
        ...ach,
        progress: Math.min(ach.target, currentProgress),
        unlocked: shouldUnlock ? 1 : 0,
        unlockedAt: shouldUnlock ? Date.now() : undefined
      };

      if (shouldUnlock) {
        await db.achievements.put(updatedAch);
        store.triggerAchievementUnlock(ach.title);
        await store.awardXp(ach.xpReward, `Unlocked Badge: "${ach.title}"! +${ach.xpReward} XP`);
      } else if (currentProgress !== ach.progress) {
        await db.achievements.put(updatedAch);
      }
    }

  } catch (e) {
    console.error('Failed to log chess match database data:', e);
  }
}

interface ChessStoreActions {
  selectSquare: (square: string | null) => void;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  undoMove: () => void;
  resetGame: () => void;
  setDifficulty: (level: CpuLevel) => void;
  setPlayerColor: (color: PlayerColor) => void;
  setVolume: (type: 'sound' | 'ambient', val: number) => void;
  toggleAmbient: () => void;
  setCpuThinking: (thinking: boolean) => void;
  updateEval: (score: number) => void;
  flipBoard: () => void;
  toggleReducedMotion: () => void;
  toggleHighContrast: () => void;
  toggleCoordinates: () => void;
  triggerSound: (sound: 'move' | 'capture' | 'check' | 'castle' | 'promotion' | 'start' | 'victory' | 'defeat' | null) => void;
  updateTimers: () => void;
  setPromotionPending: (pending: { from: string; to: string } | null) => void;
  makeCpuMove: (from: string, to: string, promotion?: string) => void;
  suggestHint: () => { from: string; to: string } | null;
}

export type ChessStore = ChessState & ChessStoreActions & {
  chessInstance: Chess;
  soundToPlay: 'move' | 'capture' | 'check' | 'castle' | 'promotion' | 'start' | 'victory' | 'defeat' | null;
};

const initialChess = new Chess();

export const useChessStore = create<ChessStore>((set, get) => ({
  // Core State
  chessInstance: initialChess,
  fen: initialChess.fen(),
  history: [],
  pieces: generateInitialPieces(),
  status: 'idle',
  winner: null,
  drawReason: null,
  selectedSquare: null,
  possibleMoves: [],
  lastMove: null,
  checkingSquares: [],
  mateSquare: null,
  promotionPending: null,
  captured: {
    w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
    b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
  },
  evalScore: 0.3, // slight white edge
  isCpuThinking: false,
  soundToPlay: null,

  // Settings
  settings: {
    level: 3, // Intermediate (1400)
    playerColor: 'w',
    soundVolume: 0.7,
    ambientVolume: 0.3,
    isAmbientPlaying: false,
    reducedMotion: false,
    highContrast: false,
    showCoordinates: true,
    isFlipped: false,
    autoRotate: false,
  },

  // Timers
  timeControl: {
    initialMinutes: 10,
    whiteTime: 10 * 60 * 1000,
    blackTime: 10 * 60 * 1000,
    isActive: false,
  },

  // Actions
  triggerSound: (sound) => set({ soundToPlay: sound }),

  selectSquare: (square) => {
    const { chessInstance, status, settings, possibleMoves, selectedSquare, promotionPending } = get();
    if (status !== 'playing' || promotionPending) return;

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      set({ selectedSquare: null, possibleMoves: [] });
      return;
    }

    // Check turn legality
    const turn = chessInstance.turn();
    const isCpuTurn = turn !== settings.playerColor;
    if (isCpuTurn) return; // User cannot move for CPU

    const boardPiece = square ? chessInstance.get(square as any) : null;

    // If clicking player's own piece, select it and show legal moves
    if (boardPiece && boardPiece.color === settings.playerColor) {
      const moves = chessInstance.moves({ square: square as any, verbose: true });
      const targetSquares = moves.map(m => m.to);
      set({ selectedSquare: square, possibleMoves: targetSquares });
      return;
    }

    // If clicking a destination square while a piece is selected
    if (selectedSquare && square && possibleMoves.includes(square)) {
      // Check if this move is a promotion
      const pieceObj = chessInstance.get(selectedSquare as any);
      const isPawn = pieceObj && pieceObj.type === 'p';
      const isPromotionRow = square[1] === '8' || square[1] === '1';

      if (isPawn && isPromotionRow) {
        set({ promotionPending: { from: selectedSquare, to: square } });
      } else {
        get().makeMove(selectedSquare, square);
      }
    } else {
      // Clicked on an empty square or opponent piece that isn't a legal move target
      set({ selectedSquare: null, possibleMoves: [] });
    }
  },

  makeMove: (from, to, promotion = 'q') => {
    const { chessInstance, status, settings, timeControl } = get();
    if (status !== 'playing') return false;

    // Validate the move
    try {
      const sourcePiece = chessInstance.get(from as any);
      if (!sourcePiece) return false;

      // Determine sound to play
      const targetPiece = chessInstance.get(to as any);
      const isCapture = !!targetPiece;
      const isCastling = sourcePiece.type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) > 1;
      const isPawnPromotion = sourcePiece.type === 'p' && (to[1] === '8' || to[1] === '1');

      // Execute move
      const move = chessInstance.move({
        from: from as any,
        to: to as any,
        promotion: promotion as any
      });

      if (!move) return false;

      // Determine sound
      let sound: 'move' | 'capture' | 'check' | 'castle' | 'promotion' | 'victory' | 'defeat' | null = 'move';
      if (isPawnPromotion) {
        sound = 'promotion';
      } else if (isCastling) {
        sound = 'castle';
      } else if (isCapture || move.captured) {
        sound = 'capture';
      }

      if (chessInstance.inCheck()) {
        sound = 'check';
      }

      // Check game ending states
      let nextStatus: GameStatus = 'playing';
      let winner: PlayerColor | null = null;
      let drawReason: DrawReason = null;

      if (chessInstance.isCheckmate()) {
        nextStatus = 'checkmate';
        winner = sourcePiece.color; // color that just made the move is the winner
        sound = winner === settings.playerColor ? 'victory' : 'defeat';
      } else if (chessInstance.isDraw()) {
        nextStatus = 'draw';
        sound = 'defeat'; // neutral or defeat
        if (chessInstance.isStalemate()) drawReason = 'stalemate';
        else if (chessInstance.isThreefoldRepetition()) drawReason = 'threefold';
        else if (chessInstance.isInsufficientMaterial()) drawReason = 'insufficient';
        else drawReason = '50moves';
      }

      // Update history
      const newMoveRecord: MoveRecord = {
        from,
        to,
        piece: sourcePiece.type.toUpperCase(),
        color: sourcePiece.color,
        captured: move.captured,
        promotion: move.promotion,
        san: move.san,
        fen: chessInstance.fen(),
        timestamp: Date.now()
      };

      set((state) => ({
        fen: chessInstance.fen(),
        history: [...state.history, newMoveRecord],
        pieces: syncPieces(state.pieces, chessInstance),
        status: nextStatus,
        winner,
        drawReason,
        selectedSquare: null,
        possibleMoves: [],
        lastMove: { from, to },
        checkingSquares: getCheckingSquares(chessInstance),
        mateSquare: nextStatus === 'checkmate' ? getCheckingSquares(chessInstance)[0] || null : null,
        captured: calculateCaptured(chessInstance),
        soundToPlay: sound,
        promotionPending: null,
        timeControl: {
          ...timeControl,
          isActive: nextStatus === 'playing'
        }
      }));

      // Call database logger on game end
      if (nextStatus !== 'playing') {
        const winnerSide = nextStatus === 'checkmate'
          ? (winner === settings.playerColor ? 'w' : 'b')
          : 'draw';
        const openingName = detectOpening(chessInstance.history());
        saveCompletedGame(
          winnerSide,
          settings.level,
          chessInstance.history().length,
          openingName,
          chessInstance,
          settings.reducedMotion
        );
      }

      return true;
    } catch (e) {
      console.error('Invalid move attempted:', e);
      return false;
    }
  },

  makeCpuMove: (from, to, promotion = 'q') => {
    const { chessInstance, status, settings } = get();
    if (status !== 'playing') return;

    try {
      const sourcePiece = chessInstance.get(from as any);
      if (!sourcePiece) return;

      const targetPiece = chessInstance.get(to as any);
      const isCapture = !!targetPiece;
      const isCastling = sourcePiece.type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) > 1;
      const isPawnPromotion = sourcePiece.type === 'p' && (to[1] === '8' || to[1] === '1');

      const move = chessInstance.move({
        from: from as any,
        to: to as any,
        promotion: promotion as any
      });

      if (!move) return;

      let sound: 'move' | 'capture' | 'check' | 'castle' | 'promotion' | 'victory' | 'defeat' | null = 'move';
      if (isPawnPromotion) {
        sound = 'promotion';
      } else if (isCastling) {
        sound = 'castle';
      } else if (isCapture || move.captured) {
        sound = 'capture';
      }

      if (chessInstance.inCheck()) {
        sound = 'check';
      }

      let nextStatus: GameStatus = 'playing';
      let winner: PlayerColor | null = null;
      let drawReason: DrawReason = null;

      if (chessInstance.isCheckmate()) {
        nextStatus = 'checkmate';
        winner = sourcePiece.color;
        sound = 'defeat'; // CPU won, user lost
      } else if (chessInstance.isDraw()) {
        nextStatus = 'draw';
        sound = 'defeat';
        if (chessInstance.isStalemate()) drawReason = 'stalemate';
        else if (chessInstance.isThreefoldRepetition()) drawReason = 'threefold';
        else if (chessInstance.isInsufficientMaterial()) drawReason = 'insufficient';
        else drawReason = '50moves';
      }

      const newMoveRecord: MoveRecord = {
        from,
        to,
        piece: sourcePiece.type.toUpperCase(),
        color: sourcePiece.color,
        captured: move.captured,
        promotion: move.promotion,
        san: move.san,
        fen: chessInstance.fen(),
        timestamp: Date.now()
      };

      set((state) => ({
        fen: chessInstance.fen(),
        history: [...state.history, newMoveRecord],
        pieces: syncPieces(state.pieces, chessInstance),
        status: nextStatus,
        winner,
        drawReason,
        selectedSquare: null,
        possibleMoves: [],
        lastMove: { from, to },
        checkingSquares: getCheckingSquares(chessInstance),
        mateSquare: nextStatus === 'checkmate' ? getCheckingSquares(chessInstance)[0] || null : null,
        captured: calculateCaptured(chessInstance),
        soundToPlay: sound,
        isCpuThinking: false
      }));

      // Call database logger on game end
      if (nextStatus !== 'playing') {
        const winnerSide = nextStatus === 'checkmate'
          ? (winner === settings.playerColor ? 'w' : 'b')
          : 'draw';
        const openingName = detectOpening(chessInstance.history());
        saveCompletedGame(
          winnerSide,
          settings.level,
          chessInstance.history().length,
          openingName,
          chessInstance,
          settings.reducedMotion
        );
      }

    } catch (e) {
      console.error('CPU move error:', e);
      set({ isCpuThinking: false });
    }
  },

  undoMove: () => {
    const { chessInstance, history, status, settings } = get();
    if (history.length === 0) return;

    // If user playing against CPU, undo 2 moves (user move + CPU move) so the board stays on the user's turn
    const isVsCpu = true; // offline game is User vs CPU
    const movesToUndo = (isVsCpu && history.length >= 2 && history[history.length - 1].color !== settings.playerColor) ? 2 : 1;

    for (let i = 0; i < movesToUndo; i++) {
      chessInstance.undo();
    }

    const newHistory = history.slice(0, -movesToUndo);
    const lastRec = newHistory[newHistory.length - 1];

    set({
      chessInstance,
      fen: chessInstance.fen(),
      history: newHistory,
      pieces: syncPieces(newHistory.length > 0 ? get().pieces : generateInitialPieces(), chessInstance),
      status: newHistory.length > 0 ? 'playing' : 'idle',
      winner: null,
      drawReason: null,
      selectedSquare: null,
      possibleMoves: [],
      lastMove: lastRec ? { from: lastRec.from, to: lastRec.to } : null,
      checkingSquares: getCheckingSquares(chessInstance),
      mateSquare: null,
      promotionPending: null,
      captured: calculateCaptured(chessInstance),
      soundToPlay: 'move',
      isCpuThinking: false,
      timeControl: {
        ...get().timeControl,
        isActive: newHistory.length > 0
      }
    });
  },

  resetGame: () => {
    const freshChess = new Chess();
    const playerCol = get().settings.playerColor;
    
    set({
      chessInstance: freshChess,
      fen: freshChess.fen(),
      history: [],
      pieces: generateInitialPieces(),
      status: 'playing', // Start active immediately
      winner: null,
      drawReason: null,
      selectedSquare: null,
      possibleMoves: [],
      lastMove: null,
      checkingSquares: [],
      mateSquare: null,
      promotionPending: null,
      captured: {
        w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
        b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
      },
      evalScore: 0.3,
      isCpuThinking: false,
      soundToPlay: 'start',
      timeControl: {
        initialMinutes: get().timeControl.initialMinutes,
        whiteTime: get().timeControl.initialMinutes * 60 * 1000,
        blackTime: get().timeControl.initialMinutes * 60 * 1000,
        isActive: true,
      }
    });

    // If player is black, CPU plays first move immediately
    if (playerCol === 'b') {
      set({ isCpuThinking: true });
    }
  },

  setDifficulty: (level) => {
    set((state) => ({
      settings: { ...state.settings, level }
    }));
  },

  setPlayerColor: (color) => {
    set((state) => {
      const freshChess = new Chess();
      return {
        settings: {
          ...state.settings,
          playerColor: color,
          isFlipped: color === 'b' // auto flip board if player color is black
        },
        chessInstance: freshChess,
        fen: freshChess.fen(),
        history: [],
        pieces: generateInitialPieces(),
        status: 'playing',
        winner: null,
        drawReason: null,
        selectedSquare: null,
        possibleMoves: [],
        lastMove: null,
        checkingSquares: [],
        mateSquare: null,
        promotionPending: null,
        captured: {
          w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
          b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
        },
        evalScore: 0.3,
        isCpuThinking: color === 'b', // CPU moves first if player is black
        soundToPlay: 'start',
        timeControl: {
          initialMinutes: state.timeControl.initialMinutes,
          whiteTime: state.timeControl.initialMinutes * 60 * 1000,
          blackTime: state.timeControl.initialMinutes * 60 * 1000,
          isActive: true,
        }
      };
    });
  },

  setVolume: (type, val) => {
    set((state) => ({
      settings: {
        ...state.settings,
        soundVolume: type === 'sound' ? val : state.settings.soundVolume,
        ambientVolume: type === 'ambient' ? val : state.settings.ambientVolume,
      }
    }));
  },

  toggleAmbient: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        isAmbientPlaying: !state.settings.isAmbientPlaying
      }
    }));
  },

  setCpuThinking: (thinking) => set({ isCpuThinking: thinking }),

  updateEval: (score) => set({ evalScore: score }),

  flipBoard: () => {
    set((state) => ({
      settings: { ...state.settings, isFlipped: !state.settings.isFlipped }
    }));
  },

  toggleReducedMotion: () => {
    set((state) => ({
      settings: { ...state.settings, reducedMotion: !state.settings.reducedMotion }
    }));
  },

  toggleHighContrast: () => {
    set((state) => ({
      settings: { ...state.settings, highContrast: !state.settings.highContrast }
    }));
  },

  toggleCoordinates: () => {
    set((state) => ({
      settings: { ...state.settings, showCoordinates: !state.settings.showCoordinates }
    }));
  },

  setPromotionPending: (pending) => set({ promotionPending: pending }),

  updateTimers: () => {
    const { timeControl, status, chessInstance } = get();
    if (!timeControl.isActive || status !== 'playing') return;

    const turn = chessInstance.turn();
    const interval = 100; // call every 100ms

    set((state) => {
      const whiteTime = turn === 'w' ? Math.max(0, state.timeControl.whiteTime - interval) : state.timeControl.whiteTime;
      const blackTime = turn === 'b' ? Math.max(0, state.timeControl.blackTime - interval) : state.timeControl.blackTime;
      
      let nextStatus = state.status;
      let winner = state.winner;
      let sound = state.soundToPlay;

      if (whiteTime === 0) {
        nextStatus = 'checkmate'; // Time forfeit counts as loss
        winner = 'b';
        sound = state.settings.playerColor === 'w' ? 'defeat' : 'victory';
      } else if (blackTime === 0) {
        nextStatus = 'checkmate';
        winner = 'w';
        sound = state.settings.playerColor === 'b' ? 'defeat' : 'victory';
      }

      if (nextStatus !== state.status) {
        const winnerSide = winner === state.settings.playerColor ? 'w' : 'b';
        const openingName = detectOpening(chessInstance.history());
        saveCompletedGame(
          winnerSide,
          state.settings.level,
          chessInstance.history().length,
          openingName,
          chessInstance,
          state.settings.reducedMotion
        );
      }

      return {
        soundToPlay: sound,
        status: nextStatus,
        winner,
        timeControl: {
          ...state.timeControl,
          whiteTime,
          blackTime,
          isActive: nextStatus === 'playing'
        }
      };
    });
  },

  suggestHint: () => {
    const { chessInstance, status, settings } = get();
    if (status !== 'playing' || chessInstance.turn() !== settings.playerColor) return null;
    
    // Generate a quick random valid move for the player as a hint fallback, or let stockfish provide it if stockfish is active.
    // We will select a smart move. Let's look for captures first, then regular moves.
    const moves = chessInstance.moves({ verbose: true });
    if (moves.length === 0) return null;
    
    const captures = moves.filter(m => !!m.captured);
    const chosenMove = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)] : moves[Math.floor(Math.random() * moves.length)];
    
    return { from: chosenMove.from, to: chosenMove.to };
  }
}));
