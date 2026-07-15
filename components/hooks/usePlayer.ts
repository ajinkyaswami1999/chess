import { db, DbGame, DbPlayer, DbAchievement, DbCalendarEntry } from '../utils/db';
import { usePlayerStore } from '../store/playerStore';

// Elo Ratings mapped to AI difficulty levels
const opponentEloMap = {
  1: 400,   // Beginner
  2: 900,   // Easy
  3: 1400,  // Intermediate
  4: 1900,  // Advanced
  5: 2400   // International (Expert)
};

// Calculate Elo change
export function calculateElo(playerRating: number, opponentRating: number, score: number): {
  newRating: number;
  change: number;
  expectedScore: number;
} {
  const K = 32; // standard rating coefficient
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const change = Math.round(K * (score - expectedScore));
  const newRating = Math.max(100, playerRating + change); // floor rating at 100
  return { newRating, change, expectedScore };
}

// Generate a random UUID
function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Export the hook
export function usePlayer() {
  const playerProfile = usePlayerStore((state) => state.playerProfile);
  const updateProfile = usePlayerStore((state) => state.updateProfile);
  const awardXp = usePlayerStore((state) => state.awardXp);
  const triggerAchievementUnlock = usePlayerStore((state) => state.triggerAchievementUnlock);

  // Save game result and update rating/achievements/calendar
  const saveGameResult = async (gameData: {
    duration: number; // in seconds
    moveCount: number;
    winner: 'w' | 'b' | 'draw'; // from player side: 'w' means user won
    difficulty: 1 | 2 | 3 | 4 | 5;
    opening: string;
    accuracy: number;
    mistakes: number;
    blunders: number;
    brilliantMoves: number;
    excellentMoves: number;
    goodMoves: number;
    inaccuracies: number;
    misses: number;
    capturedCount: number; // captured pieces count
    castled: boolean;
    promotion: boolean;
    checkCount: number;
    checkmate: boolean;
    thinkingTime: number; // total in ms
    pgn: string;
    fen: string;
  }) => {
    if (!playerProfile) return null;

    const gameId = generateUUID();
    const timestamp = Date.now();
    const opponentRating = opponentEloMap[gameData.difficulty];
    
    // 1. Calculate ELO Changes
    let score = 0.5; // default draw
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (gameData.winner === 'w') {
      score = 1;
      result = 'win';
    } else if (gameData.winner === 'b') {
      score = 0;
      result = 'loss';
    }

    const { newRating, change, expectedScore } = calculateElo(
      playerProfile.rating,
      opponentRating,
      score
    );

    // 2. Persist Game log
    const capturedDummy = JSON.stringify({ count: gameData.capturedCount });
    const gameRecord: DbGame = {
      id: gameId,
      date: timestamp,
      duration: gameData.duration,
      moveCount: gameData.moveCount,
      winner: gameData.winner,
      difficulty: gameData.difficulty,
      opening: gameData.opening,
      result,
      accuracy: gameData.accuracy,
      mistakes: gameData.mistakes,
      blunders: gameData.blunders,
      brilliantMoves: gameData.brilliantMoves,
      excellentMoves: gameData.excellentMoves,
      goodMoves: gameData.goodMoves,
      inaccuracies: gameData.inaccuracies,
      misses: gameData.misses,
      capturedPieces: capturedDummy,
      castled: gameData.castled,
      promotion: gameData.promotion,
      checkCount: gameData.checkCount,
      checkmate: gameData.checkmate,
      thinkingTime: gameData.thinkingTime,
      pgn: gameData.pgn,
      fen: gameData.fen,
      notes: '',
      favorite: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await db.games.add(gameRecord);

    // 3. Persist Rating History
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

    // 4. Update Calendar Activity Grid
    const todayStr = new Date(timestamp).toISOString().split('T')[0];
    let calendarEntry = await db.calendar.where('date').equals(todayStr).first();
    if (!calendarEntry) {
      calendarEntry = {
        id: generateUUID(),
        date: todayStr,
        gamesCount: 1,
        wins: result === 'win' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        draws: result === 'draw' ? 1 : 0,
        ratingChange: change,
        avgAccuracy: gameData.accuracy,
        createdAt: timestamp
      };
      await db.calendar.add(calendarEntry);
    } else {
      const gCount = calendarEntry.gamesCount + 1;
      const updatedEntry: DbCalendarEntry = {
        ...calendarEntry,
        gamesCount: gCount,
        wins: calendarEntry.wins + (result === 'win' ? 1 : 0),
        losses: calendarEntry.losses + (result === 'loss' ? 1 : 0),
        draws: calendarEntry.draws + (result === 'draw' ? 1 : 0),
        ratingChange: calendarEntry.ratingChange + change,
        avgAccuracy: Math.round((calendarEntry.avgAccuracy * calendarEntry.gamesCount + gameData.accuracy) / gCount)
      };
      await db.calendar.put(updatedEntry);
    }

    // 5. Update Openings Statistics
    if (gameData.opening) {
      let openStat = await db.openingStats.where('name').equals(gameData.opening).first();
      if (!openStat) {
        openStat = {
          id: generateUUID(),
          name: gameData.opening,
          plays: 1,
          wins: result === 'win' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0
        };
        await db.openingStats.add(openStat);
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

    // 6. Update Player Profile Stats (Elo, win streak, play duration, level XP)
    const newStreak = result === 'win' ? playerProfile.winStreak + 1 : 0;
    const newLongestStreak = Math.max(playerProfile.longestStreak, newStreak);
    const newHighestRating = Math.max(playerProfile.highestRating, newRating);

    await updateProfile({
      rating: newRating,
      highestRating: newHighestRating,
      winStreak: newStreak,
      longestStreak: newLongestStreak,
      totalPlayTime: playerProfile.totalPlayTime + gameData.duration
    });

    // Award Base XP for completing game: 50 XP
    // Win Bonus XP: 100 XP
    // Accuracy Bonus XP: Accuracy * 2 XP
    const winXp = result === 'win' ? 100 : 0;
    const accuracyXp = Math.round(gameData.accuracy * 1.5);
    const totalXpAwarded = 50 + winXp + accuracyXp;
    await awardXp(totalXpAwarded, `Match complete! +${totalXpAwarded} XP`);

    // 7. Verify Achievements Progress
    await checkAchievementsProgress(newRating, newStreak, result, gameData);

    // 8. Auto Backup trigger (Every 50 games)
    const totalGamesPlayed = await db.games.count();
    if (totalGamesPlayed % 50 === 0) {
      await autoBackupData(totalGamesPlayed);
    }

    return gameRecord;
  };

  // Internal helper to evaluate and unlock achievements
  const checkAchievementsProgress = async (
    newRating: number,
    newStreak: number,
    result: 'win' | 'loss' | 'draw',
    gameData: any
  ) => {
    const achievements = await db.achievements.toArray();
    const gamesCount = await db.games.count();
    const winsCount = await db.games.where('result').equals('win').count();
    
    // Sum total piece captures
    const allGames = await db.games.toArray();
    let totalCaptures = 0;
    allGames.forEach((g) => {
      try {
        const caps = JSON.parse(g.capturedPieces);
        totalCaptures += caps.count || 0;
      } catch (e) {}
    });

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
          currentProgress = (gameData.difficulty === 4 && result === 'win') ? 1 : 0;
          shouldUnlock = gameData.difficulty === 4 && result === 'win';
          break;
        case 'beat_expert':
          currentProgress = (gameData.difficulty === 5 && result === 'win') ? 1 : 0;
          shouldUnlock = gameData.difficulty === 5 && result === 'win';
          break;
        case 'perfect_accuracy':
          currentProgress = gameData.accuracy;
          shouldUnlock = gameData.accuracy >= 95 && result === 'win';
          break;
        case 'captures_100':
          currentProgress = totalCaptures;
          shouldUnlock = totalCaptures >= 100;
          break;
        case 'quick_victory':
          currentProgress = (result === 'win' && gameData.moveCount <= 15) ? 1 : 0;
          shouldUnlock = result === 'win' && gameData.moveCount <= 15;
          break;
      }

      // Update progress
      const updatedAch: DbAchievement = {
        ...ach,
        progress: Math.min(ach.target, currentProgress),
        unlocked: shouldUnlock ? 1 : 0,
        unlockedAt: shouldUnlock ? Date.now() : undefined
      };

      if (shouldUnlock) {
        // Unlock achievement
        await db.achievements.put(updatedAch);
        triggerAchievementUnlock(ach.title);
        // Award achievement XP bonus
        await awardXp(ach.xpReward, `Unlocked Achievement: "${ach.title}"! +${ach.xpReward} XP`);
      } else if (currentProgress !== ach.progress) {
        // Save progress update
        await db.achievements.put(updatedAch);
      }
    }
  };

  // Execute automatic backups
  const autoBackupData = async (gameCount: number) => {
    try {
      const backupData = {
        profile: await db.player.toArray(),
        games: await db.games.toArray(),
        ratingHistory: await db.ratingHistory.toArray(),
        achievements: await db.achievements.toArray(),
        calendar: await db.calendar.toArray(),
        settings: await db.settings.toArray(),
        favoriteGames: await db.favoriteGames.toArray(),
        openingStats: await db.openingStats.toArray(),
        pieceStats: await db.pieceStats.toArray()
      };
      
      const jsonString = JSON.stringify(backupData);
      const fileName = `ChessMaster_AutoBackup_Match${gameCount}_${new Date().toISOString().split('T')[0]}.json`;
      const sizeBytes = new Blob([jsonString]).size;

      // Log in backupHistory table
      await db.backupHistory.add({
        id: generateUUID(),
        date: Date.now(),
        fileName,
        sizeBytes,
        status: 'success',
        createdAt: Date.now()
      });

      // Save locally in localStorage as a quick restore checkpoint
      localStorage.setItem(`chessmaster_auto_backup`, jsonString);
      console.log(`Automatic background backup saved at ${fileName}`);
    } catch (e) {
      console.error('Failed to run automatic backup:', e);
    }
  };

  return { saveGameResult };
}
