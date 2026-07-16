import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Play, Clock, Sparkles, Award, ArrowUpRight, TrendingUp } from 'lucide-react';
import { db, DbGame, DbAchievement } from '../utils/db';
import { usePlayerStore } from '../store/playerStore';

export const DashboardTab: React.FC = () => {
  const playerProfile = usePlayerStore((state) => state.playerProfile);
  const setTab = usePlayerStore((state) => state.setTab);
  const [stats, setStats] = useState({
    gamesToday: 0,
    gamesThisWeek: 0,
    gamesThisMonth: 0,
    winRate: 0,
    avgAccuracy: 0,
    favOpening: 'None',
    favDifficulty: 'None'
  });
  const [recentMatch, setRecentMatch] = useState<DbGame | null>(null);
  const [recentAch, setRecentAch] = useState<DbAchievement | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Fetch games and calculate recent statistics
      const games = await db.games.toArray();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      const todayGames = games.filter(g => (now - g.date) <= oneDay);
      const weekGames = games.filter(g => (now - g.date) <= oneWeek);
      const monthGames = games.filter(g => (now - g.date) <= oneMonth);

      const totalGames = games.length;
      const wins = games.filter(g => g.result === 'win').length;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      
      const totalAccuracy = games.reduce((sum, g) => sum + g.accuracy, 0);
      const avgAccuracy = totalGames > 0 ? Math.round(totalAccuracy / totalGames) : 0;

      // Calculate favorite opening
      const openingCounts: { [key: string]: number } = {};
      games.forEach(g => {
        if (g.opening) {
          openingCounts[g.opening] = (openingCounts[g.opening] || 0) + 1;
        }
      });
      let favOpening = 'None';
      let maxOpeningCount = 0;
      Object.entries(openingCounts).forEach(([name, count]) => {
        if (count > maxOpeningCount) {
          favOpening = name;
          maxOpeningCount = count;
        }
      });

      // Calculate favorite difficulty
      const diffCounts: { [key: string]: number } = {};
      games.forEach(g => {
        diffCounts[g.difficulty] = (diffCounts[g.difficulty] || 0) + 1;
      });
      const diffNames = { 1: 'Beginner', 2: 'Easy', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' };
      let favDifficulty = 'None';
      let maxDiffCount = 0;
      Object.entries(diffCounts).forEach(([diff, count]) => {
        if (count > maxDiffCount) {
          favDifficulty = diffNames[diff as unknown as keyof typeof diffNames];
          maxDiffCount = count;
        }
      });

      setStats({
        gamesToday: todayGames.length,
        gamesThisWeek: weekGames.length,
        gamesThisMonth: monthGames.length,
        winRate,
        avgAccuracy,
        favOpening,
        favDifficulty
      });

      // 2. Fetch last match
      if (games.length > 0) {
        const sortedGames = [...games].sort((a, b) => b.date - a.date);
        setRecentMatch(sortedGames[0]);
      }

      // 3. Fetch recent unlocked achievement
      const achs = await db.achievements.where('unlocked').equals(1).toArray();
      if (achs.length > 0) {
        const sortedAchs = [...achs].sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
        setRecentAch(sortedAchs[0]);
      }
    };

    fetchDashboardData();
  }, [playerProfile]);

  if (!playerProfile) return null;

  const xpNeeded = playerProfile.level * 500;
  const xpPercentage = Math.round((playerProfile.xp / xpNeeded) * 100);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  // Convert play time seconds to readable format
  const formatPlayTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto max-h-[85vh] custom-scrollbar"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1. Hero Profile Banner */}
      <motion.div 
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1c1917]/95 via-[#0c0a09]/98 to-[#040404] p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
        variants={cardVariants}
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_45%)]" />
        
        {/* Profile Info */}
        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
          <motion.div 
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#bfa043] to-[#8c7023] flex items-center justify-center text-5xl shadow-[0_4px_25px_rgba(212,175,55,0.15)] border border-[#d4af37]/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            {playerProfile.avatar}
          </motion.div>
          
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center flex-col md:flex-row gap-2 md:gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-white">{playerProfile.username}</h2>
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#d4af37]/10 text-[#e2c15a] border border-[#d4af37]/20 backdrop-blur-sm">
                Level {playerProfile.level}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{playerProfile.name}</p>
            
            {/* Level XP Bar */}
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-[11px] text-gray-400 font-semibold">
                <span>XP Progress</span>
                <span className="text-[#e2c15a]">{playerProfile.xp} / {xpNeeded} XP</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#d4af37] to-[#e5c158] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Play Quick Action */}
        <motion.button
          onClick={() => setTab('game')}
          className="z-10 mt-4 md:mt-0 flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#e5c158] hover:from-[#e5c158] hover:to-[#f0d478] text-[#120a05] font-semibold text-lg shadow-[0_10px_25px_-5px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.4)] transition-all"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <Play className="fill-current w-5 h-5" />
          Play Offline Match
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Elo Rating */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.02] hover:shadow-[0_8px_30px_rgba(212,175,55,0.06)] transition-all duration-300"
          variants={cardVariants}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trophy className="w-16 h-16 text-[#d4af37]" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Current Elo</p>
          <h2 className="text-4xl font-bold text-white mt-2 tracking-tight">{playerProfile.rating}</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Highest Rating: {playerProfile.highestRating}</span>
          </div>
        </motion.div>

        {/* Win Streak */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 backdrop-blur-md relative overflow-hidden group hover:border-orange-500/35 hover:bg-orange-500/[0.02] hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)] transition-all duration-300"
          variants={cardVariants}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame className="w-16 h-16 text-orange-500" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Current Streak</p>
          <h2 className="text-4xl font-bold text-white mt-2 tracking-tight">{playerProfile.winStreak}</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Longest Streak: {playerProfile.longestStreak} games</span>
          </div>
        </motion.div>

        {/* Win Rate */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/35 hover:bg-emerald-500/[0.02] hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)] transition-all duration-300"
          variants={cardVariants}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Overall Win Rate</p>
          <h2 className="text-4xl font-bold text-white mt-2 tracking-tight">{stats.winRate}%</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3 font-medium">
            <span>Accuracy Avg: {stats.avgAccuracy}%</span>
          </div>
        </motion.div>

        {/* Play Time */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 backdrop-blur-md relative overflow-hidden group hover:border-blue-500/35 hover:bg-blue-500/[0.02] hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)] transition-all duration-300"
          variants={cardVariants}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-blue-400" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Play Time</p>
          <h2 className="text-4xl font-bold text-white mt-2 tracking-tight">{formatPlayTime(playerProfile.totalPlayTime)}</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3 font-medium">
            <span>Favorite: {stats.favDifficulty} AI</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Deep Statistics & Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Activity Summary */}
        <motion.div 
          className="md:col-span-2 rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-4"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold text-white">Daily & Weekly Activity</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <p className="text-gray-400 text-xs font-medium">Games Today</p>
              <p className="text-2xl font-bold mt-1 text-white">{stats.gamesToday}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <p className="text-gray-400 text-xs font-medium">Games This Week</p>
              <p className="text-2xl font-bold mt-1 text-white">{stats.gamesThisWeek}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <p className="text-gray-400 text-xs font-medium">Games This Month</p>
              <p className="text-2xl font-bold mt-1 text-white">{stats.gamesThisMonth}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <p className="text-gray-400 text-xs font-medium">Favorite Opening</p>
              <p className="text-sm font-semibold mt-2 text-white overflow-hidden text-ellipsis whitespace-nowrap" title={stats.favOpening}>
                {stats.favOpening !== 'None' ? stats.favOpening.split(' ')[0] : 'None'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 fill-current" /> Daily Chess Goal
              </p>
              <p className="text-xs text-gray-400">Play 3 offline matches today to keep your streak alive.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">{stats.gamesToday} / 3</p>
              <span className="text-[10px] text-gray-400">Matches</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Links Card */}
        <motion.div 
          className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-4 flex flex-col justify-between"
          variants={cardVariants}
        >
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Player Center</h3>
            <p className="text-xs text-gray-400">Manage ratings, historical PGNs, achievements, settings, and local IndexedDB database data exports.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => setTab('stats')}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold flex items-center justify-between transition-colors text-white"
            >
              <span>View Interactive Analytics</span>
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </button>
            <button 
              onClick={() => setTab('history')}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold flex items-center justify-between transition-colors text-white"
            >
              <span>Browse Completed Matches</span>
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </button>
            <button 
              onClick={() => setTab('achievements')}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold flex items-center justify-between transition-colors text-white"
            >
              <span>Show Unlockable Badges</span>
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* 4. Recent Game and Achievement Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Game Card */}
        <motion.div 
          className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-4"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold text-white">Last Match Completed</h3>
          {recentMatch ? (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  recentMatch.result === 'win' 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : recentMatch.result === 'loss' 
                      ? 'bg-red-500/10 text-red-400' 
                      : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {recentMatch.result === 'win' ? 'Victory' : recentMatch.result === 'loss' ? 'Defeat' : 'Draw'}
                </span>
                <span className="text-[11px] text-gray-400">
                  {new Date(recentMatch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-white text-sm font-semibold">VS level {recentMatch.difficulty} AI</p>
                  <p className="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]" title={recentMatch.opening || 'Unknown Opening'}>
                    {recentMatch.opening || 'Standard Opening'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">{recentMatch.accuracy}%</p>
                  <span className="text-[10px] text-gray-400">Accuracy</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between text-xs text-gray-400">
                <span>Moves: {recentMatch.moveCount}</span>
                <span>Duration: {formatPlayTime(recentMatch.duration)}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white/5 border border-white/5 text-center text-sm text-gray-400">
              No games completed yet. Click "Play Offline Match" above!
            </div>
          )}
        </motion.div>

        {/* Recent Achievement Banner */}
        <motion.div 
          className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-4"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold text-white">Latest Achievement Unlocked</h3>
          {recentAch ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#d4af37]/10 to-transparent border border-[#d4af37]/20 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-xl bg-[#d4af37]/20 flex items-center justify-center text-2xl shadow-inner border border-[#d4af37]/20">
                🏅
              </div>
              <div className="space-y-0.5 z-10">
                <h4 className="text-white text-sm font-bold tracking-tight">{recentAch.title}</h4>
                <p className="text-xs text-gray-400">{recentAch.description}</p>
                <span className="text-[9px] text-[#d4af37] font-semibold uppercase tracking-wider block mt-1">
                  +{recentAch.xpReward} XP Awarded
                </span>
              </div>
              <div className="absolute -right-3 -bottom-3 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Award className="w-20 h-20 text-[#d4af37]" />
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white/5 border border-white/5 text-center text-sm text-gray-400">
              No achievements unlocked yet. Go earn some XP!
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
export default DashboardTab;
