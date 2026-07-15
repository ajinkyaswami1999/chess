'use client';

import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Swords, LineChart, History, Award, Settings as SettingsIcon, Cpu, Sparkles, Award as Trophy } from 'lucide-react';
import { useChessStore } from '../components/store/chessStore';
import { usePlayerStore, ActiveTab } from '../components/store/playerStore';
import { useAudio } from '../components/hooks/useAudio';
import ChessBoard3D from '../components/board/ChessBoard3D';
import ChessGameCamera from '../components/board/ChessGameCamera';
import SceneEffects from '../components/effects/SceneEffects';
import ParticleSystem from '../components/animations/ParticleSystem';
import GameUI from '../components/UI/GameUI';
import { CpuLevel } from '../components/types/chess';

// Tab panels
import DashboardTab from '../components/player/DashboardTab';
import AnalyticsTab from '../components/player/AnalyticsTab';
import MatchHistoryTab from '../components/player/MatchHistoryTab';
import AchievementsTab from '../components/player/AchievementsTab';
import SettingsTab from '../components/player/SettingsTab';

export default function ChessGamePage() {
  // Global Web Audio synth hook
  useAudio();

  const { status, settings: chessSettings, resetGame, setDifficulty, setPlayerColor } = useChessStore();
  const { activeTab, setTab, initializeDb, playerProfile, xpNotification, unlockedAchievementPopup, isLoading } = usePlayerStore();

  // Initialize offline player db
  useEffect(() => {
    initializeDb();
  }, [initializeDb]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-[#0d0906] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#d4af37] to-[#e5c158] flex items-center justify-center text-black font-serif font-bold text-xl animate-pulse">
          C
        </div>
        <p className="text-xs font-mono tracking-widest text-[#d4af37] animate-pulse">LOADING CHESSMASTER DATABASE...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'game', label: 'Play Match', icon: Swords },
    { id: 'stats', label: 'Analytics', icon: LineChart },
    { id: 'history', label: 'Match History', icon: History },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#0a0604] flex text-white font-sans select-none relative">
      
      {/* 1. Left Sidebar Navigation */}
      <nav className="w-16 md:w-56 bg-[#120a05] border-r border-white/5 flex flex-col justify-between p-3 z-30 shrink-0">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#e5c158] flex items-center justify-center text-black font-serif font-bold text-lg shadow-md shadow-[#d4af37]/10 shrink-0">
              C
            </div>
            <div className="hidden md:block">
              <h1 className="font-serif text-sm font-bold tracking-widest text-white">CHESS GRAND</h1>
              <span className="text-[7px] font-mono text-[#d4af37] tracking-[0.2em] block uppercase">Premium Offline</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                    isActive ? 'text-[#e2c15a] font-bold shadow-[0_0_15px_rgba(212,175,55,0.05)]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {/* Sliding active bg */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBg"
                      className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/12 to-[#d4af37]/2 border border-[#d4af37]/20 rounded-xl z-0"
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBorder"
                      className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#d4af37] rounded-r-md z-10"
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    />
                  )}
                  
                  <Icon className="w-4.5 h-4.5 z-10 shrink-0" />
                  <span className="hidden md:block z-10">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Bottom Badge */}
        {playerProfile && (
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#a8821a] flex items-center justify-center text-lg shadow">
              {playerProfile.avatar}
            </div>
            <div className="hidden md:block min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{playerProfile.username}</p>
              <p className="text-[9px] text-[#d4af37] font-semibold mt-0.5">Elo: {playerProfile.rating}</p>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Main Content Area */}
      <div className="flex-1 h-full relative flex flex-col bg-[#0d0906] overflow-hidden">
        
        {/* R3F 3D Canvas Scene (Always mounted but only visible in Game Tab to save performance) */}
        <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${
          activeTab === 'game' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}>
          <Canvas
            shadows
            gl={{ 
              antialias: true, 
              powerPreference: 'high-performance',
              alpha: false 
            }}
            camera={{ position: [0, 8, 9], fov: 50 }}
          >
            <Suspense fallback={null}>
              <SceneEffects />
              <ChessBoard3D />
              <ParticleSystem />
              <ChessGameCamera />
            </Suspense>
          </Canvas>
        </div>

        {/* 2D game overlay */}
        {activeTab === 'game' && status !== 'idle' && <GameUI />}

        {/* Welcome Menu inside Game tab */}
        {activeTab === 'game' && status === 'idle' && (
          <div className="absolute inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-20 p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="backdrop-blur-3xl bg-[#17100b]/90 border border-white/10 p-8 md:p-10 rounded-[36px] max-w-lg w-full text-center shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative"
            >
              {/* Header Title */}
              <header className="mb-8">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#d4af37] to-[#e5c158] flex items-center justify-center text-black font-serif font-bold text-2xl shadow-lg shadow-[#d4af37]/10 mb-4">
                  C
                </div>
                <h1 className="font-serif text-3xl font-bold tracking-widest text-white leading-tight">
                  CHESS GRAND
                </h1>
                <p className="text-[10px] font-mono text-[#d4af37] tracking-[0.25em] mt-1.5 uppercase">
                  Premium AAA 3D Experience
                </p>
              </header>

              {/* Setup Configuration Options */}
              <div className="flex flex-col gap-6 mb-10">
                {/* Side Selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">SELECT YOUR COLOR</span>
                  <div className="grid grid-cols-2 gap-3 bg-black/30 p-1 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setPlayerColor('w')}
                      className={`py-3.5 rounded-xl font-serif text-sm tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        chessSettings.playerColor === 'w'
                          ? 'bg-[#f0eae1] text-black shadow-md'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">♙</span> WHITE (GOES FIRST)
                    </button>
                    <button
                      onClick={() => setPlayerColor('b')}
                      className={`py-3.5 rounded-xl font-serif text-sm tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        chessSettings.playerColor === 'b'
                          ? 'bg-[#3d2817] text-[#f5ebd6] border border-[#d4af37]/30 shadow-md'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">♞</span> BLACK
                    </button>
                  </div>
                </div>

                {/* CPU Level Selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">STOCKFISH DIFFICULTY</span>
                  <div className="grid grid-cols-5 gap-2 bg-black/30 p-1 rounded-2xl border border-white/5">
                    {([1, 2, 3, 4, 5] as CpuLevel[]).map((lvl) => {
                      const labels = ["Beginner", "Easy", "Medium", "Hard", "Expert"];
                      const elos = ["400 Elo", "900 Elo", "1400 Elo", "1900 Elo", "2400+ Elo"];
                      return (
                        <button
                          key={lvl}
                          onClick={() => setDifficulty(lvl)}
                          title={`${labels[lvl - 1]} (${elos[lvl - 1]})`}
                          className={`py-3 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                            chessSettings.level === lvl
                              ? 'bg-[#d4af37] text-black shadow-md'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-sm">{lvl}</span>
                          <span className="text-[8px] opacity-60 font-normal scale-90">{labels[lvl-1]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action play button */}
              <button
                onClick={resetGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#e5c158] hover:from-[#e5c158] hover:to-[#d4af37] text-black font-serif font-bold text-sm tracking-widest shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                BEGIN CHAMPIONSHIP
              </button>
            </motion.div>
          </div>
        )}

        {/* 2D Dashboard Tabs panels */}
        <div className="relative flex-1 z-10 w-full h-full overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DashboardTab />
              </motion.div>
            )}
            {activeTab === 'stats' && (
              <motion.div key="stats" className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyticsTab />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div key="history" className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MatchHistoryTab />
              </motion.div>
            )}
            {activeTab === 'achievements' && (
              <motion.div key="achievements" className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AchievementsTab />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div key="settings" className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SettingsTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* 3. Global Floating Notification Overlays */}
      <AnimatePresence>
        {/* XP Gains Notification */}
        {xpNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-[#120a05]/95 border border-[#d4af37]/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3 w-72"
          >
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/20 flex items-center justify-center text-lg">
              ✨
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-bold text-white tracking-tight">{xpNotification.message}</p>
              <p className="text-[10px] text-[#d4af37] font-semibold mt-0.5">+{xpNotification.xp} XP Earned</p>
            </div>
          </motion.div>
        )}

        {/* Steam-Style Achievement Unlock Popup */}
        {unlockedAchievementPopup && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 50 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-[#170f0a] to-[#0a0604] border border-[#d4af37]/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3 w-80"
          >
            <div className="w-11 h-11 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center text-2xl animate-bounce">
              🏅
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-mono tracking-widest text-[#d4af37] uppercase font-bold block">ACHIEVEMENT UNLOCKED</span>
              <p className="font-bold text-white text-xs truncate mt-0.5">{unlockedAchievementPopup}</p>
              <p className="text-[10px] text-gray-400 font-medium">Check your badges menu showcase.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
