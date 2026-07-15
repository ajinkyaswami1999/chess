import { create } from 'zustand';
import { db, DbPlayer, DbSettings } from '../utils/db';

export type ActiveTab = 'game' | 'dashboard' | 'stats' | 'history' | 'achievements' | 'settings';

interface PlayerState {
  activeTab: ActiveTab;
  playerProfile: DbPlayer | null;
  settings: DbSettings | null;
  isLoading: boolean;
  xpNotification: { xp: number; message: string } | null;
  unlockedAchievementPopup: string | null; // title of newly unlocked achievement
}

interface PlayerActions {
  setTab: (tab: ActiveTab) => void;
  initializeDb: () => Promise<void>;
  updateProfile: (updates: Partial<DbPlayer>) => Promise<void>;
  updateSettings: (updates: Partial<DbSettings>) => Promise<void>;
  awardXp: (amount: number, message: string) => Promise<void>;
  triggerAchievementUnlock: (title: string) => void;
  clearNotifications: () => void;
  factoryReset: () => Promise<void>;
}

export type PlayerStore = PlayerState & PlayerActions;

const defaultProfileId = 'primary-player';
const defaultSettingsId = 'current-settings';

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  activeTab: 'dashboard', // start on dashboard for a premium Steam-style landing
  playerProfile: null,
  settings: null,
  isLoading: true,
  xpNotification: null,
  unlockedAchievementPopup: null,

  setTab: (tab) => set({ activeTab: tab }),

  initializeDb: async () => {
    set({ isLoading: true });
    try {
      // 1. Fetch or create default player profile
      let profile = await db.player.get(defaultProfileId);
      if (!profile) {
        profile = {
          id: defaultProfileId,
          username: 'ChessMaster',
          name: 'Grandmaster in Training',
          country: 'US',
          avatar: '👑', // Default royal crown avatar
          level: 1,
          xp: 0,
          rating: 0, // starting FIDE Elo
          highestRating: 0,
          winStreak: 0,
          longestStreak: 0,
          totalPlayTime: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.player.add(profile);
      }

      // 2. Fetch or create default settings
      let settings = await db.settings.get(defaultSettingsId);
      if (!settings) {
        settings = {
          id: defaultSettingsId,
          darkMode: true,
          reducedMotion: false,
          highContrast: false,
          showCoordinates: true,
          boardTheme: 'marble',
          pieceTheme: 'walnut-ivory',
          soundVolume: 0.7,
          ambientVolume: 0.3,
          notificationSounds: true,
          cameraPreset: 'cinematic',
          language: 'en',
          fontSize: 'medium',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.settings.add(settings);
      }

      // 3. Initialize Achievements Table if empty
      const count = await db.achievements.count();
      if (count === 0) {
        const initialAchievements = [
          { id: 'ach-1', key: 'first_game', title: 'First Steps', description: 'Complete your first chess match.', category: 'games', progress: 0, target: 1, unlocked: 0, xpReward: 50, createdAt: Date.now() },
          { id: 'ach-2', key: 'first_win', title: 'First Blood', description: 'Win your first game against the CPU.', category: 'wins', progress: 0, target: 1, unlocked: 0, xpReward: 100, createdAt: Date.now() },
          { id: 'ach-3', key: 'games_10', title: 'Tactician', description: 'Play 10 total games.', category: 'games', progress: 0, target: 10, unlocked: 0, xpReward: 200, createdAt: Date.now() },
          { id: 'ach-4', key: 'games_50', title: 'Veteran', description: 'Play 50 total games.', category: 'games', progress: 0, target: 50, unlocked: 0, xpReward: 500, createdAt: Date.now() },
          { id: 'ach-5', key: 'wins_10', title: 'Dominant Force', description: 'Win 10 games.', category: 'wins', progress: 0, target: 10, unlocked: 0, xpReward: 300, createdAt: Date.now() },
          { id: 'ach-6', key: 'wins_50', title: 'Grandmaster', description: 'Win 50 games.', category: 'wins', progress: 0, target: 50, unlocked: 0, xpReward: 1000, createdAt: Date.now() },
          { id: 'ach-7', key: 'rating_1000', title: 'Four Digits', description: 'Reach 1000 Elo rating.', category: 'rating', progress: 0, target: 1000, unlocked: 0, xpReward: 200, createdAt: Date.now() },
          { id: 'ach-8', key: 'rating_1500', title: 'Master Mind', description: 'Reach 1500 Elo rating.', category: 'rating', progress: 0, target: 1500, unlocked: 0, xpReward: 500, createdAt: Date.now() },
          { id: 'ach-9', key: 'streak_5', title: 'On Fire', description: 'Achieve a 5-game winning streak.', category: 'streaks', progress: 0, target: 5, unlocked: 0, xpReward: 250, createdAt: Date.now() },
          { id: 'ach-10', key: 'beat_advanced', title: 'Giant Slayer', description: 'Defeat the Advanced AI (Level 4).', category: 'special', progress: 0, target: 1, unlocked: 0, xpReward: 400, createdAt: Date.now() },
          { id: 'ach-11', key: 'beat_expert', title: 'Deep Blue Who?', description: 'Defeat the Expert Stockfish AI (Level 5).', category: 'special', progress: 0, target: 1, unlocked: 0, xpReward: 1000, createdAt: Date.now() },
          { id: 'ach-12', key: 'perfect_accuracy', title: 'Perfect Accuracy', description: 'Complete a game with over 95% accuracy.', category: 'special', progress: 0, target: 100, unlocked: 0, xpReward: 500, createdAt: Date.now() },
          { id: 'ach-13', key: 'captures_100', title: 'Carnage', description: 'Capture 100 opponent pieces.', category: 'captures', progress: 0, target: 100, unlocked: 0, xpReward: 150, createdAt: Date.now() },
          { id: 'ach-14', key: 'quick_victory', title: 'Blitzkrieg', description: 'Win a game in under 15 moves.', category: 'special', progress: 0, target: 1, unlocked: 0, xpReward: 300, createdAt: Date.now() }
        ];
        // Bulk put
        await db.achievements.bulkAdd(initialAchievements as any);
      }

      set({ playerProfile: profile, settings, isLoading: false });
    } catch (e) {
      console.error('Failed to initialize database:', e);
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { playerProfile } = get();
    if (!playerProfile) return;
    
    const updatedProfile: DbPlayer = {
      ...playerProfile,
      ...updates,
      updatedAt: Date.now()
    };

    try {
      await db.player.put(updatedProfile);
      set({ playerProfile: updatedProfile });
    } catch (e) {
      console.error('Failed to update player profile:', e);
    }
  },

  updateSettings: async (updates) => {
    const { settings } = get();
    if (!settings) return;

    const updatedSettings: DbSettings = {
      ...settings,
      ...updates,
      updatedAt: Date.now()
    };

    try {
      await db.settings.put(updatedSettings);
      set({ settings: updatedSettings });
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  },

  awardXp: async (amount, message) => {
    const { playerProfile } = get();
    if (!playerProfile) return;

    let xp = playerProfile.xp + amount;
    let level = playerProfile.level;
    
    // Level Up Formula: XP needed for next level = level * 500
    let xpNeeded = level * 500;
    let leveledUp = false;

    while (xp >= xpNeeded) {
      xp -= xpNeeded;
      level += 1;
      xpNeeded = level * 500;
      leveledUp = true;
    }

    const updates: Partial<DbPlayer> = { xp, level };
    
    // Trigger XP notification overlay
    set({ 
      xpNotification: { xp: amount, message: leveledUp ? `LEVEL UP! Level ${level} reached!` : message } 
    });

    await get().updateProfile(updates);

    // Auto-clear notification after 4 seconds
    setTimeout(() => {
      set({ xpNotification: null });
    }, 4000);
  },

  triggerAchievementUnlock: (title) => {
    set({ unlockedAchievementPopup: title });
    setTimeout(() => {
      set({ unlockedAchievementPopup: null });
    }, 4500);
  },

  clearNotifications: () => set({ xpNotification: null, unlockedAchievementPopup: null }),

  factoryReset: async () => {
    set({ isLoading: true });
    try {
      // Clear database tables
      await db.player.clear();
      await db.games.clear();
      await db.ratingHistory.clear();
      await db.achievements.clear();
      await db.calendar.clear();
      await db.settings.clear();
      await db.backupHistory.clear();
      await db.favoriteGames.clear();
      await db.openingStats.clear();
      await db.pieceStats.clear();
      
      // Re-initialize
      await get().initializeDb();
      set({ activeTab: 'dashboard' });
    } catch (e) {
      console.error('Failed to factory reset database:', e);
      set({ isLoading: false });
    }
  }
}));
export default usePlayerStore;
