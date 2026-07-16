import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/playerStore';
import { db, DbBackupHistory } from '../utils/db';
import { User, Volume2, ShieldAlert, Sliders, Database, Trash2, ArrowUpRight, RotateCcw, AlertTriangle, FileInput } from 'lucide-react';

const avatarOptions = ['👑', '♟', '⚔️', '🧠', '🛡️', '⚡', '🔥', '🦁', '🦉', '🐱', '🦊', '🦄', '🚀', '👽', '💀', '💎'];

export const SettingsTab: React.FC = () => {
  const playerProfile = usePlayerStore((state) => state.playerProfile);
  const settings = usePlayerStore((state) => state.settings);
  const updateProfile = usePlayerStore((state) => state.updateProfile);
  const updateSettings = usePlayerStore((state) => state.updateSettings);
  const factoryReset = usePlayerStore((state) => state.factoryReset);

  // Form states
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('US');
  const [avatar, setAvatar] = useState('👑');

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState<'reset_games' | 'reset_profile' | 'factory' | null>(null);
  const [backupLogs, setBackupLogs] = useState<DbBackupHistory[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (playerProfile) {
      setUsername(playerProfile.username);
      setName(playerProfile.name);
      setCountry(playerProfile.country);
      setAvatar(playerProfile.avatar);
    }
    fetchBackupLogs();
  }, [playerProfile]);

  const fetchBackupLogs = async () => {
    const list = await db.backupHistory.toArray();
    setBackupLogs(list.sort((a, b) => b.date - a.date).slice(0, 5));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ username, name, country, avatar });
    alert('Player profile updated successfully!');
  };

  // Export JSON Backup
  const exportBackup = async () => {
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

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `ChessMaster_Backup_${timestamp}.json`;
      link.click();

      // Log in backupHistory
      await db.backupHistory.add({
        id: 'backup-' + Date.now(),
        date: Date.now(),
        fileName: `ChessMaster_Backup_${timestamp}.json`,
        sizeBytes: blob.size,
        status: 'success',
        createdAt: Date.now()
      });
      fetchBackupLogs();
    } catch (e) {
      console.error(e);
      alert('Failed to generate backup export.');
    }
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Simple schema validation
        if (!parsed.profile || !parsed.games || !parsed.settings || !parsed.achievements) {
          setImportError('Invalid backup file structure: missing key tables.');
          return;
        }

        // Restore tables
        await db.player.clear();
        await db.games.clear();
        await db.ratingHistory.clear();
        await db.achievements.clear();
        await db.calendar.clear();
        await db.settings.clear();
        await db.favoriteGames.clear();
        await db.openingStats.clear();
        await db.pieceStats.clear();

        if (parsed.profile.length > 0) await db.player.bulkAdd(parsed.profile);
        if (parsed.games.length > 0) await db.games.bulkAdd(parsed.games);
        if (parsed.ratingHistory.length > 0) await db.ratingHistory.bulkAdd(parsed.ratingHistory);
        if (parsed.achievements.length > 0) await db.achievements.bulkAdd(parsed.achievements);
        if (parsed.calendar.length > 0) await db.calendar.bulkAdd(parsed.calendar);
        if (parsed.settings.length > 0) await db.settings.bulkAdd(parsed.settings);
        if (parsed.favoriteGames?.length > 0) await db.favoriteGames.bulkAdd(parsed.favoriteGames);
        if (parsed.openingStats?.length > 0) await db.openingStats.bulkAdd(parsed.openingStats);
        if (parsed.pieceStats?.length > 0) await db.pieceStats.bulkAdd(parsed.pieceStats);

        setImportSuccess(true);
        // Force refresh store
        window.location.reload();
      } catch (err) {
        setImportError('Failed to parse backup JSON file.');
      }
    };
    fileReader.readAsText(file);
  };

  // Clear Game History only
  const clearGamesHistory = async () => {
    await db.games.clear();
    await db.ratingHistory.clear();
    await db.calendar.clear();
    await db.openingStats.clear();
    await db.pieceStats.clear();
    
    // Reset player rating to 0
    await updateProfile({
      rating: 0,
      highestRating: 0,
      winStreak: 0,
      longestStreak: 0,
      totalPlayTime: 0
    });

    // Reset achievements progress
    const achs = await db.achievements.toArray();
    for (const ach of achs) {
      await db.achievements.update(ach.id, { progress: 0, unlocked: 0, unlockedAt: undefined });
    }

    setConfirmModal(null);
    alert('Completed match histories and statistics have been successfully cleared.');
    window.location.reload();
  };

  if (!playerProfile || !settings) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 overflow-y-auto max-h-[85vh] custom-scrollbar text-white">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Offline Preferences & Management</h2>
        <p className="text-xs text-gray-400">Configure theme profiles, audio volumes, backups, and profile settings.</p>
      </div>

      {/* 1. Edit Profile Section */}
      <motion.div 
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-4 shadow-xl hover:border-white/[0.1] transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-base font-bold flex items-center gap-2">
          <User className="w-4 h-4 text-[#d4af37]" /> Player Profile Details
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-sm">
          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold block">Select Player Avatar</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAvatar(opt)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all ${
                    avatar === opt 
                      ? 'bg-[#d4af37]/20 border-[#d4af37] text-white' 
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Profile Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/5 outline-none focus:border-[#d4af37]/30 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Full Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/5 outline-none focus:border-[#d4af37]/30 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-[#120a05] font-bold text-xs shadow-md transition-colors"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </motion.div>

      {/* 2. Audio & Accessibility */}
      <motion.div 
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-6 shadow-xl hover:border-white/[0.1] transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-base font-bold flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#d4af37]" /> Audio & Display Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Sounds */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Procedural Sound Effects Volume</span>
                <span className="font-semibold">{Math.round(settings.soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Ambient Room drone hum Volume</span>
                <span className="font-semibold">{Math.round(settings.ambientVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.ambientVolume}
                onChange={(e) => updateSettings({ ambientVolume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
            </div>
          </div>

          {/* Accessibilities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-xs">Reduced Motion</p>
                <p className="text-[10px] text-gray-400">Disables 3D camera pan animations</p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-[#d4af37] focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-xs">Show Coordinates labels</p>
                <p className="text-[10px] text-gray-400">Toggles Rank and File letters on board rim</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => updateSettings({ showCoordinates: e.target.checked })}
                className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-[#d4af37] focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-xs">Default Camera Angle</p>
                <p className="text-[10px] text-gray-400">Set default perspective for gameplay</p>
              </div>
              <select
                value={settings.cameraPreset || 'classic'}
                onChange={(e) => updateSettings({ cameraPreset: e.target.value })}
                className="px-2 py-1 rounded bg-[#1c120c] border border-white/10 text-xs text-white/80 focus:border-[#d4af37] outline-none"
              >
                <option value="classic">Classic 3D</option>
                <option value="topdown">Top-Down 2D</option>
                <option value="immersive">Immersive Low</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Visual Themes & Customizations */}
      <motion.div 
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-6 shadow-xl hover:border-white/[0.1] transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-base font-bold flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#d4af37]" /> Visual Themes & Customizations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Board Theme */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold block">3D Chessboard Theme</label>
            <select
              value={settings.boardTheme || 'marble'}
              onChange={(e) => updateSettings({ boardTheme: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#1c120c] border border-white/10 outline-none focus:border-[#d4af37]/30 text-white text-xs"
            >
              <option value="wood">Classic Wood</option>
              <option value="marble">Marble Luxury</option>
              <option value="ice">Ice Kingdom</option>
              <option value="volcanic">Volcanic Realm</option>
              <option value="forest">Forest Sanctuary</option>
              <option value="space">Space Odyssey</option>
              <option value="steampunk">Steampunk Empire</option>
              <option value="desert">Desert Oasis</option>
              <option value="gothic">Gothic Castle</option>
              <option value="neon">Neon Cyberpunk</option>
            </select>
          </div>

          {/* Piece Theme */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-semibold block">3D Chess Pieces Material</label>
            <select
              value={settings.pieceTheme || 'staunton'}
              onChange={(e) => updateSettings({ pieceTheme: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#1c120c] border border-white/10 outline-none focus:border-[#d4af37]/30 text-white text-xs"
            >
              <option value="staunton">Classic Staunton</option>
              <option value="gold">Luxury Gold</option>
              <option value="glass">Crystal Glass</option>
              <option value="dark_knight">Dark Knight</option>
              <option value="jade">Jade Royal</option>
              <option value="rose_gold">Rose Gold</option>
              <option value="steampunk">Steampunk</option>
              <option value="ice">Ice Crystal</option>
              <option value="lava">Lava Stone</option>
              <option value="wood_carved">Wooden Carved</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* 4. Local database exports & Backups */}
      <motion.div 
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-6 shadow-xl hover:border-white/[0.1] transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-base font-bold flex items-center gap-2">
          <Database className="w-4 h-4 text-[#d4af37]" /> Backup & Restore center
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Export / Import Cards */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs">Export Profile Backup</p>
                <p className="text-[10px] text-gray-400">Save all offline games and Elo levels as JSON</p>
              </div>
              <button
                onClick={exportBackup}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Import file drop */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <FileInput className="w-4 h-4 text-[#d4af37]" />
                <span className="font-semibold">Import Backup Database File</span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="text-xs file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-[#d4af37]/20 file:text-[#d4af37] file:cursor-pointer text-gray-400"
              />
              {importError && <p className="text-[10px] text-red-400 mt-1">{importError}</p>}
              {importSuccess && <p className="text-[10px] text-emerald-400 mt-1">Database restored successfully!</p>}
            </div>
          </div>

          {/* Backup logs */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Recent Backup Exports Logs</p>
            {backupLogs.length > 0 ? (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                {backupLogs.map(log => (
                  <div key={log.id} className="flex justify-between items-center text-[10px] text-gray-400 p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]" title={log.fileName}>
                      {log.fileName}
                    </span>
                    <span>{Math.round(log.sizeBytes / 1024)} KB</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 italic p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                No backup records logged yet.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* 4. Danger Zone */}
      <motion.div 
        className="rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/[0.04] to-transparent p-6 space-y-4 shadow-xl hover:border-red-500/30 transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-base font-bold flex items-center gap-2 text-red-400">
          <ShieldAlert className="w-4 h-4 text-red-400" /> Danger Zone
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
            <div>
              <p className="font-semibold text-red-400">Clear Game Statistics</p>
              <p className="text-[10px] text-gray-400">Deletes match logs and resets Elo levels to 0.</p>
            </div>
            <button
              onClick={() => setConfirmModal('reset_games')}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors text-red-400"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
            <div>
              <p className="font-semibold text-red-400">Factory Reset Database</p>
              <p className="text-[10px] text-gray-400">Deletes everything and resets application profiles.</p>
            </div>
            <button
              onClick={() => setConfirmModal('factory')}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Overlay Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setConfirmModal(null)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl border border-red-500/25 bg-gradient-to-br from-[#240c0c] to-[#0a0303] p-6 shadow-2xl backdrop-blur-xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-bold tracking-tight">Confirm Destructive Action</h4>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                {confirmModal === 'reset_games' 
                  ? 'This will permanently delete all completed matches, rating histories, opening statistics, and calendar achievements progress. Your rating will reset to 0 Elo. This cannot be undone.'
                  : 'This will wipe the entire ChessMaster IndexedDB database. All games, settings preferences, and earned badges achievements will be deleted. This cannot be undone.'}
              </p>

              <div className="flex gap-2 justify-end text-xs font-semibold pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal === 'reset_games' ? clearGamesHistory : factoryReset}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Wipe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
export default SettingsTab;
