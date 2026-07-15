import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X, Eye, ExternalLink } from 'lucide-react';
import { db, DbCalendarEntry, DbGame } from '../utils/db';

export const ContributionCalendar: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<{ [date: string]: DbCalendarEntry }>({});
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    entry?: DbCalendarEntry;
    x: number;
    y: number;
  } | null>(null);
  
  const [selectedDayGames, setSelectedDayGames] = useState<{
    date: string;
    games: DbGame[];
  } | null>(null);

  // Available years in db
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear];
  }, []);

  useEffect(() => {
    const fetchCalendarData = async () => {
      const startStr = `${selectedYear}-01-01`;
      const endStr = `${selectedYear}-12-31`;
      
      const entries = await db.calendar
        .where('date')
        .between(startStr, endStr, true, true)
        .toArray();

      const dataMap: { [date: string]: DbCalendarEntry } = {};
      entries.forEach((e) => {
        dataMap[e.date] = e;
      });
      setCalendarData(dataMap);
    };

    fetchCalendarData();
  }, [selectedYear]);

  // Generate grid days for selected year
  const gridDays = useMemo(() => {
    const days = [];
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    
    // Pad front (Sunday of first week)
    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the year
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateString = curr.toISOString().split('T')[0];
      days.push({
        date: dateString,
        month: curr.getMonth(),
        dayOfWeek: curr.getDay(),
        dayOfMonth: curr.getDate()
      });
      curr.setDate(curr.getDate() + 1);
    }

    // Pad back
    const lastDayOfWeek = endDate.getDay();
    for (let i = lastDayOfWeek; i < 6; i++) {
      days.push(null);
    }

    return days;
  }, [selectedYear]);

  // Color Intensity calculator based on wins
  const getCellColor = (dateStr: string) => {
    const entry = calendarData[dateStr];
    if (!entry || entry.gamesCount === 0) return 'bg-white/[0.03] hover:bg-white/[0.08]'; // Gray fallback
    
    const wins = entry.wins;
    if (wins === 1) return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20'; // Green 100
    if (wins === 2) return 'bg-emerald-800/60 text-emerald-300 border border-emerald-700/30'; // Green 300
    if (wins === 3) return 'bg-emerald-600/80 text-emerald-200 border border-emerald-500/40'; // Green 500
    return 'bg-emerald-400 text-emerald-950 shadow-[0_0_10px_rgba(52,211,153,0.15)]'; // Green 700
  };

  const handleCellHover = (e: React.MouseEvent, day: { date: string } | null) => {
    if (!day) {
      setHoveredDay(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const entry = calendarData[day.date];
    setHoveredDay({
      date: day.date,
      entry,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10
    });
  };

  const handleCellClick = async (day: { date: string } | null) => {
    if (!day) return;
    
    const startOfDay = new Date(day.date).setHours(0, 0, 0, 0);
    const endOfDay = new Date(day.date).setHours(23, 59, 59, 999);
    
    const dayGames = await db.games
      .where('date')
      .between(startOfDay, endOfDay, true, true)
      .toArray();

    if (dayGames.length > 0) {
      setSelectedDayGames({
        date: day.date,
        games: dayGames
      });
    }
  };

  // Render Month Labels
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCols = useMemo(() => {
    const cols = [];
    let currentMonth = -1;
    
    // We group by week columns (stretching 53 columns)
    for (let c = 0; c < 53; c++) {
      const idx = c * 7;
      const day = gridDays[idx];
      if (day && day.month !== currentMonth) {
        cols.push({ name: months[day.month], colSpan: c });
        currentMonth = day.month;
      }
    }
    return cols;
  }, [gridDays]);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#d4af37]" />
          <h3 className="text-lg font-semibold text-white">Championship Activity Calendar</h3>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(y => Math.max(availableYears[0], y - 1))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white px-3">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(y => Math.min(availableYears[availableYears.length - 1], y + 1))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-gray-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-[720px] select-none relative">
          
          {/* Month Labels row */}
          <div className="flex text-[10px] text-gray-500 font-medium mb-1.5 h-4 pl-7 relative">
            {monthCols.map((m, idx) => {
              // Calculate left margin offset based on column index
              const leftPos = `${(m.colSpan * 12.5) + 28}px`;
              return (
                <div key={idx} className="absolute" style={{ left: leftPos }}>
                  {m.name}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            {/* Weekday labels col */}
            <div className="grid grid-rows-7 text-[9px] text-gray-500 font-medium w-5 justify-items-end pr-1 h-[90px] pt-1">
              <span>Sun</span>
              <span></span>
              <span>Tue</span>
              <span></span>
              <span>Thu</span>
              <span></span>
              <span>Sat</span>
            </div>

            {/* Squares Grid */}
            <div className="grid grid-flow-col grid-rows-7 gap-[2px]">
              {gridDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="w-[10px] h-[10px]" />;
                }
                return (
                  <motion.div
                    key={day.date}
                    className={`w-[10px] h-[10px] rounded-[2px] transition-colors cursor-pointer ${getCellColor(day.date)}`}
                    onMouseEnter={(e) => handleCellHover(e, day)}
                    onMouseLeave={(e) => handleCellHover(e, null)}
                    onClick={() => handleCellClick(day)}
                    whileHover={{ scale: 1.25, zIndex: 20 }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Color Key Legends */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-gray-500 font-medium pt-2 border-t border-white/5">
        <span>Less Wins</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-white/[0.03]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-950/40 border border-emerald-900/20" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-800/60 border border-emerald-700/30" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-600/80 border border-emerald-500/40" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-400" />
        <span>More Wins</span>
      </div>

      {/* Hover Floating Tooltip */}
      <AnimatePresence>
        {hoveredDay && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-50 p-2.5 rounded-xl border border-white/10 bg-[#120a05] text-white text-[11px] font-medium shadow-2xl backdrop-blur-md space-y-1 w-48"
            style={{
              left: `${hoveredDay.x - 96}px`,
              top: `${hoveredDay.y - 85}px`
            }}
          >
            <p className="text-gray-400 font-semibold">{hoveredDay.date}</p>
            {hoveredDay.entry ? (
              <div className="space-y-0.5">
                <p>Matches Played: <span className="text-white font-bold">{hoveredDay.entry.gamesCount}</span></p>
                <div className="flex gap-2 text-[10px] text-gray-400">
                  <span className="text-emerald-400">Wins: {hoveredDay.entry.wins}</span>
                  <span className="text-red-400">Losses: {hoveredDay.entry.losses}</span>
                  <span>Draws: {hoveredDay.entry.draws}</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-white/5 text-[10px] text-gray-400">
                  <span>Accuracy: {hoveredDay.entry.avgAccuracy}%</span>
                  <span className={hoveredDay.entry.ratingChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    Elo: {hoveredDay.entry.ratingChange >= 0 ? '+' : ''}{hoveredDay.entry.ratingChange}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No matches played.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Day Games Detail Modal */}
      <AnimatePresence>
        {selectedDayGames && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0d0906]"
              onClick={() => setSelectedDayGames(null)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b120c] to-[#0e0906] p-6 shadow-2xl backdrop-blur-xl max-h-[75vh] flex flex-col"
            >
              <button
                onClick={() => setSelectedDayGames(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-lg font-bold text-white mb-1">Matches Played</h4>
              <p className="text-xs text-gray-400 mb-4">{selectedDayGames.date}</p>

              {/* Match List Scrollable */}
              <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3 pr-1">
                {selectedDayGames.games.map((g) => (
                  <div key={g.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        g.result === 'win' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : g.result === 'loss' 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {g.result === 'win' ? 'Win' : g.result === 'loss' ? 'Loss' : 'Draw'}
                      </span>
                      <span className="text-gray-400">
                        {new Date(g.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white text-sm font-semibold">VS Level {g.difficulty} AI</p>
                        <p className="text-xs text-gray-400 mt-0.5">{g.opening || 'Standard Opening'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">{g.accuracy}%</p>
                        <span className="text-[9px] text-gray-400 block mt-0.5">Accuracy</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between text-[11px] text-gray-400">
                      <span>Moves: {g.moveCount}</span>
                      <span>Duration: {Math.floor(g.duration / 60)}m {g.duration % 60}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ContributionCalendar;
