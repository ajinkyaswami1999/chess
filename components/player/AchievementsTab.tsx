import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db, DbAchievement } from '../utils/db';
import { Award, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

export const AchievementsTab: React.FC = () => {
  const [achievements, setAchievements] = useState<DbAchievement[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'wins' | 'games' | 'captures' | 'rating' | 'streaks' | 'special'>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    const list = await db.achievements.toArray();
    setAchievements(list);
  };

  // Completion metrics
  const completionStats = useMemo(() => {
    const total = achievements.length;
    if (total === 0) return { total: 0, unlocked: 0, percentage: 0 };
    const unlocked = achievements.filter((a) => a.unlocked === 1).length;
    const percentage = Math.round((unlocked / total) * 100);
    return { total, unlocked, percentage };
  }, [achievements]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return achievements;
    return achievements.filter((a) => a.category === activeCategory);
  }, [achievements, activeCategory]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto max-h-[85vh] custom-scrollbar text-white">
      
      {/* 1. Header & Overall Progress Ring */}
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1c1917]/95 via-[#0c0a09]/98 to-[#040404] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.05),transparent_40%)]" />
        <div className="space-y-1.5 text-center md:text-left z-10">
          <h2 className="text-2xl font-bold tracking-tight">Offline Badges & Achievements</h2>
          <p className="text-xs text-gray-400 font-semibold">Earn experience points (XP) to level up your Chess profile.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-2xl font-bold text-white block">{completionStats.unlocked} / {completionStats.total}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Unlocked Badges</span>
          </div>
          <div className="w-28 bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#d4af37] to-[#e5c158] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionStats.percentage}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <span className="text-sm font-bold text-[#d4af37]">{completionStats.percentage}%</span>
        </div>
      </div>

      {/* 2. Category Filters */}
      <div className="flex bg-white/[0.03] rounded-2xl p-1.5 border border-white/[0.06] text-xs overflow-x-auto custom-scrollbar gap-1.5">
        {(['all', 'wins', 'games', 'captures', 'rating', 'streaks', 'special'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-2 rounded-xl capitalize text-xs font-bold transition-all relative shrink-0 border ${
              activeCategory === cat 
                ? 'text-[#e2c15a] shadow-[0_4px_15px_rgba(212,175,55,0.05)] border-[#d4af37]/35 bg-[#d4af37]/10' 
                : 'text-gray-400 hover:text-white border-transparent bg-transparent'
            }`}
          >
            {cat === 'all' ? 'All Trophies' : cat}
          </button>
        ))}
      </div>

      {/* 3. Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((ach) => {
          const isUnlocked = ach.unlocked === 1;
          const progressPercent = Math.min(100, Math.round((ach.progress / ach.target) * 100));

          return (
            <motion.div
              key={ach.id}
              className={`relative rounded-2xl border p-5 transition-all flex flex-col justify-between overflow-hidden group ${
                isUnlocked 
                  ? 'border-[#d4af37]/20 bg-gradient-to-b from-[#d4af37]/6 to-transparent shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.03]' 
                  : 'border-white/[0.05] bg-gradient-to-b from-white/[0.02] to-transparent filter grayscale opacity-60 hover:grayscale-[30%] hover:border-white/10 hover:bg-white/[0.03]'
              }`}
              whileHover={{ scale: 1.02 }}
              layout
            >
              {/* Unlocked light burst glow */}
              {isUnlocked && (
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles className="w-20 h-20 text-[#d4af37]" />
                </div>
              )}

              <div className="space-y-4">
                {/* Badge Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${
                    isUnlocked 
                      ? 'bg-[#d4af37]/20 border-[#d4af37]/20 text-[#d4af37]' 
                      : 'bg-white/5 border-white/5 text-gray-500'
                  }`}>
                    {isUnlocked ? '🏆' : <Lock className="w-5 h-5 text-gray-600" />}
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isUnlocked 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-white/5 text-gray-500 border-white/5'
                  }`}>
                    +{ach.xpReward} XP
                  </span>
                </div>

                {/* Badge Content */}
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold tracking-tight ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                    {ach.title}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">{ach.description}</p>
                </div>
              </div>

              {/* Progress Bar Footer */}
              <div className="mt-5 pt-3 border-t border-white/5 space-y-1.5">
                <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                  <span>Progress</span>
                  <span>{ach.progress} / {ach.target}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isUnlocked ? 'bg-gradient-to-r from-[#d4af37] to-[#e5c158]' : 'bg-gray-700'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {isUnlocked && ach.unlockedAt && (
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3 h-3" /> Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};
export default AchievementsTab;
