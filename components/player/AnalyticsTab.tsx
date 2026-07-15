import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db, DbGame, DbRatingHistory } from '../utils/db';
import { TrendingUp, BarChart2, PieChart, Timer, Target, Award } from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [games, setGames] = useState<DbGame[]>([]);
  const [ratings, setRatings] = useState<DbRatingHistory[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '30days' | '7days'>('all');

  useEffect(() => {
    const fetchAnalytics = async () => {
      const gList = await db.games.toArray();
      const rList = await db.ratingHistory.toArray();
      
      setGames(gList.sort((a, b) => a.date - b.date));
      setRatings(rList.sort((a, b) => a.date - b.date));
    };
    fetchAnalytics();
  }, []);

  // Filter lists based on timeframe
  const filteredData = useMemo(() => {
    const now = Date.now();
    const cutoff = selectedTimeframe === '7days' 
      ? now - 7 * 24 * 60 * 60 * 1000 
      : selectedTimeframe === '30days' 
        ? now - 30 * 24 * 60 * 60 * 1000 
        : 0;

    return {
      games: cutoff ? games.filter(g => g.date >= cutoff) : games,
      ratings: cutoff ? ratings.filter(r => r.date >= cutoff) : ratings
    };
  }, [games, ratings, selectedTimeframe]);

  // Aggregate stats
  const statsSummary = useMemo(() => {
    const g = filteredData.games;
    const total = g.length;
    if (total === 0) return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgAccuracy: 0, avgTime: 0 };

    const wins = g.filter(x => x.result === 'win').length;
    const losses = g.filter(x => x.result === 'loss').length;
    const draws = g.filter(x => x.result === 'draw').length;
    const winRate = Math.round((wins / total) * 100);
    
    const avgAccuracy = Math.round(g.reduce((sum, x) => sum + x.accuracy, 0) / total);
    
    // Average move thinking time (or total duration / total moves)
    const avgTime = Math.round(g.reduce((sum, x) => sum + (x.duration / (x.moveCount || 1)), 0) / total);

    return { total, wins, losses, draws, winRate, avgAccuracy, avgTime };
  }, [filteredData]);

  // Donut chart path values
  const donutData = useMemo(() => {
    const { wins, losses, draws, total } = statsSummary;
    if (total === 0) return [];
    
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    
    const segments = [
      { label: 'Wins', value: wins, color: '#34d399', percentage: (wins / total) * 100 },
      { label: 'Losses', value: losses, color: '#ef4444', percentage: (losses / total) * 100 },
      { label: 'Draws', value: draws, color: '#9ca3af', percentage: (draws / total) * 100 }
    ];

    let accumOffset = 0;
    return segments.map((seg) => {
      const strokeDashoffset = circumference - (seg.percentage / 100) * circumference;
      const strokeDasharray = circumference;
      const offset = accumOffset;
      accumOffset += (seg.percentage / 100) * circumference;
      return { ...seg, strokeDashoffset, strokeDasharray, offset };
    });
  }, [statsSummary]);

  // Custom SVG line chart coordinates for Rating Progress
  const ratingLineChart = useMemo(() => {
    const r = filteredData.ratings;
    if (r.length === 0) return { points: [], pathD: '', areaD: '', width: 500, height: 180, firstRating: 0, currentRating: 0 };
    
    const width = 500;
    const height = 180;
    const padding = 20;

    const elos = r.map(x => x.newRating);
    const minElo = Math.min(...elos, 0) - 50;
    const maxElo = Math.max(...elos, 0) + 50;
    const eloRange = maxElo - minElo || 100;

    const points = r.map((entry, index) => {
      const x = padding + (index / (r.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((entry.newRating - minElo) / eloRange) * (height - 2 * padding);
      return { x, y, elo: entry.newRating, date: new Date(entry.date).toLocaleDateString() };
    });

    const pathD = points.reduce((path, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');

    // Area path closed to bottom
    const areaD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return { points, pathD, areaD, width, height, firstRating: elos[0] || 0, currentRating: elos[elos.length - 1] || 0 };
  }, [filteredData]);

  // Custom SVG Bar Chart for Games Played Over Time (Daily/Weekly grouping)
  const barChartData = useMemo(() => {
    const g = filteredData.games;
    const width = 500;
    const height = 180;
    const padding = 20;

    // Group games by day (MM-DD)
    const dateCounts: { [key: string]: number } = {};
    const daysToShow = selectedTimeframe === '7days' ? 7 : selectedTimeframe === '30days' ? 15 : 10;
    
    // Initialize last N days
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dateCounts[label] = 0;
    }

    g.forEach((game) => {
      const label = new Date(game.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (label in dateCounts) {
        dateCounts[label]++;
      }
    });

    const entries = Object.entries(dateCounts);
    const maxCount = Math.max(...entries.map(([, count]) => count), 1);

    const bars = entries.map(([date, count], index) => {
      const x = padding + (index / (entries.length || 1)) * (width - 2 * padding);
      const barHeight = (count / maxCount) * (height - 2 * padding);
      const y = height - padding - barHeight;
      return { x, y, width: (width - 2 * padding) / entries.length - 6, height: barHeight, label: date, count };
    });

    return { bars, width, height, padding };
  }, [filteredData, selectedTimeframe]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto max-h-[85vh] custom-scrollbar text-white">
      {/* Timeframe Toggles */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interactive Game Analytics</h2>
          <p className="text-xs text-gray-400">Offline database analytics updated after every match.</p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 text-xs">
          {(['all', '30days', '7days'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                selectedTimeframe === tf 
                  ? 'bg-[#d4af37] text-[#120a05] shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf === 'all' ? 'Lifetime' : tf === '30days' ? 'Last 30 Days' : 'Last 7 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Rating Line Chart */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-4 shadow-xl hover:border-white/[0.1] transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-semibold">Rating Elo Progress</h3>
          </div>
          
          {ratings.length > 0 ? (
            <div className="relative w-full aspect-[5/2] pt-2">
              <svg 
                viewBox={`0 0 ${ratingLineChart.width} ${ratingLineChart.height}`} 
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#d4af37" floodOpacity="0.25" />
                  </filter>
                </defs>
                {/* Horizontal Guide Lines */}
                <line x1="20" y1="20" x2="480" y2="20" stroke="white" strokeOpacity="0.04" strokeDasharray="3 3" />
                <line x1="20" y1="90" x2="480" y2="90" stroke="white" strokeOpacity="0.04" strokeDasharray="3 3" />
                <line x1="20" y1="160" x2="480" y2="160" stroke="white" strokeOpacity="0.04" strokeDasharray="3 3" />
                
                {/* Area under curve */}
                {ratingLineChart.areaD && (
                  <motion.path 
                    d={ratingLineChart.areaD} 
                    fill="url(#areaGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  />
                )}

                {/* Rating Path Line */}
                {ratingLineChart.pathD && (
                  <motion.path 
                    d={ratingLineChart.pathD} 
                    fill="none" 
                    stroke="#d4af37" 
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#goldGlow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                  />
                )}

                {/* Circle points on line */}
                {ratingLineChart.points.map((p, idx) => (
                  <motion.circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill="#150e09"
                    stroke="#d4af37"
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + idx * 0.03, duration: 0.3 }}
                    whileHover={{ scale: 1.8 }}
                  />
                ))}
              </svg>
            </div>
          ) : (
            <div className="h-[180px] bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-xs text-gray-500">
              Complete your first rating match to view Elo progress!
            </div>
          )}
        </motion.div>

        {/* Bar Chart: Frequency */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-4 shadow-xl hover:border-white/[0.1] transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-semibold">Matches Played Frequency</h3>
          </div>

          {games.length > 0 ? (
            <div className="relative w-full aspect-[5/2] pt-2">
              <svg 
                viewBox={`0 0 ${barChartData.width} ${barChartData.height}`} 
                className="w-full h-full overflow-visible"
              >
                {/* Horizontal guides */}
                <line x1="20" y1="20" x2="480" y2="20" stroke="white" strokeOpacity="0.04" strokeDasharray="3 3" />
                <line x1="20" y1="90" x2="480" y2="90" stroke="white" strokeOpacity="0.04" strokeDasharray="3 3" />
                <line x1="20" y1="160" x2="480" y2="160" stroke="white" strokeOpacity="0.04" strokeDasharray="3 3" />

                {/* Bars */}
                {barChartData.bars.map((bar, idx) => (
                  <g key={idx}>
                    <motion.rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill="#e5c158"
                      opacity={0.8}
                      rx="3"
                      initial={{ height: 0, y: barChartData.height - barChartData.padding }}
                      animate={{ height: bar.height, y: bar.y }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.04 }}
                      whileHover={{ opacity: 1, fill: '#f0d478' }}
                    />
                    {/* Tiny labels */}
                    <text 
                      x={bar.x + bar.width / 2} 
                      y={barChartData.height - 4} 
                      textAnchor="middle" 
                      fill="#6b7280" 
                      fontSize="7" 
                      fontWeight="bold"
                    >
                      {bar.label.split(' ')[1] || bar.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="h-[180px] bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-xs text-gray-500">
              No match statistics to show.
            </div>
          )}
        </motion.div>

        {/* Donut Chart: Results Split */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-4 shadow-xl hover:border-white/[0.1] transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#d4af37]" />
            <h3 className="text-base font-semibold">Game Results Distribution</h3>
          </div>

          {games.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                  
                  {donutData.map((seg, idx) => (
                    seg.percentage > 0 && (
                      <motion.circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="50"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        style={{
                          transformOrigin: '60px 60px',
                          transform: `rotate(${seg.offset / seg.strokeDasharray * 360}deg)`
                        }}
                        initial={{ strokeDashoffset: seg.strokeDasharray }}
                        animate={{ strokeDashoffset: seg.strokeDashoffset }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      />
                    )
                  ))}
                </svg>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-white">{statsSummary.winRate}%</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">Win Rate</span>
                </div>
              </div>

              {/* Legends list */}
              <div className="flex-1 space-y-2 w-full">
                {donutData.map((seg, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="font-semibold text-gray-300">{seg.label}</span>
                    </div>
                    <span className="font-bold text-white">{seg.value} ({Math.round(seg.percentage)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-xs text-gray-500">
              No results to distribute yet.
            </div>
          )}
        </motion.div>

        {/* Accuracy and Timers summary */}
        <motion.div 
          className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-4 flex flex-col justify-between shadow-xl hover:border-white/[0.1] transition-all"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#d4af37]" />
              <h3 className="text-base font-semibold">Accuracy & Pace Performance</h3>
            </div>

            <div className="space-y-4">
              {/* Average Accuracy slider bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Average Accuracy</span>
                  <span className="font-semibold text-white">{statsSummary.avgAccuracy}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-red-500 via-[#d4af37] to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${statsSummary.avgAccuracy}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Average Think Time */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Average Time Per Move</span>
                  <span className="font-semibold text-white">{statsSummary.avgTime}s</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (statsSummary.avgTime / 30) * 100)}%` }} // normalized to max 30s
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">Total Play Time</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {Math.round(games.reduce((sum, g) => sum + g.duration, 0) / 60)} m
              </span>
            </div>
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">Total Matches Played</span>
              <span className="text-xl font-bold text-white mt-1 block">{statsSummary.total}</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
export default AnalyticsTab;
