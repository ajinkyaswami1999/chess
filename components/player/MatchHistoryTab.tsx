import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess } from 'chess.js';
import { db, DbGame } from '../utils/db';
import { Search, Filter, Trash2, Download, Star, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BookOpen, AlertCircle, X } from 'lucide-react';

// Unicode chess pieces mapping
const unicodePieces: { [key: string]: string } = {
  kp: '♙', kr: '♖', kn: '♘', kb: '♗', kq: '♕', kk: '♔',
  bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚'
};

export const MatchHistoryTab: React.FC = () => {
  const [games, setGames] = useState<DbGame[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [diffFilter, setDiffFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'accuracy' | 'moves'>('date');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  
  // Replayer Drawer state
  const [replayGame, setReplayGame] = useState<DbGame | null>(null);
  const [replayMoveIdx, setReplayMoveIdx] = useState(0);
  const [replayMoves, setReplayMoves] = useState<any[]>([]);
  const [replayBoard, setReplayBoard] = useState<any[][]>([]);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    const list = await db.games.toArray();
    setGames(list.sort((a, b) => b.date - a.date)); // newest first
  };

  // Toggle favorite
  const toggleFavorite = async (gameId: string, currentVal: number) => {
    const newVal = currentVal === 1 ? 0 : 1;
    await db.games.update(gameId, { favorite: newVal });
    fetchGames();
  };

  // Delete single game
  const deleteGame = async (gameId: string) => {
    if (confirm('Are you sure you want to delete this match record?')) {
      await db.games.delete(gameId);
      fetchGames();
      if (replayGame?.id === gameId) setReplayGame(null);
    }
  };

  // Bulk Delete
  const deleteSelected = async () => {
    if (selectedGames.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedGames.length} selected match records?`)) {
      await db.games.bulkDelete(selectedGames);
      setSelectedGames([]);
      fetchGames();
      setReplayGame(null);
    }
  };

  // Export Selected PGNs
  const exportPgn = (game: DbGame) => {
    const blob = new Blob([game.pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ChessGame_${game.id}.pgn`;
    link.click();
  };

  // Filter and Sort Logic
  const processedGames = useMemo(() => {
    let list = [...games];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(g => 
        (g.opening && g.opening.toLowerCase().includes(term)) ||
        (g.notes && g.notes.toLowerCase().includes(term))
      );
    }

    // Result filter
    if (resultFilter !== 'all') {
      list = list.filter(g => g.result === resultFilter);
    }

    // Difficulty filter
    if (diffFilter !== 'all') {
      list = list.filter(g => g.difficulty.toString() === diffFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'accuracy') return b.accuracy - a.accuracy;
      if (sortBy === 'moves') return b.moveCount - a.moveCount;
      return b.date - a.date; // default date
    });

    return list;
  }, [games, searchTerm, resultFilter, diffFilter, sortBy]);

  // Handle opening Replay Viewer
  const startReplay = (game: DbGame) => {
    try {
      const chess = new Chess();
      // Load initial FEN or start from scratch
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      
      // Parse PGN moves
      const tempChess = new Chess();
      tempChess.loadPgn(game.pgn);
      const moves = tempChess.history({ verbose: true });
      
      setReplayGame(game);
      setReplayMoves(moves);
      setReplayMoveIdx(0);
      setReplayBoard(chess.board());
    } catch (e) {
      alert('Failed to parse match PGN records.');
    }
  };

  // Navigate Replay Move Index
  const setMoveIndex = (idx: number) => {
    if (!replayGame) return;
    const targetIdx = Math.max(0, Math.min(replayMoves.length, idx));
    
    // Reconstruct board at this move index
    const chess = new Chess();
    chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    for (let i = 0; i < targetIdx; i++) {
      chess.move(replayMoves[i]);
    }
    
    setReplayMoveIdx(targetIdx);
    setReplayBoard(chess.board());
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGames(prev => 
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-y-auto max-h-[85vh] custom-scrollbar text-white flex flex-col lg:flex-row gap-6">
      
      {/* 1. Main Match Table List */}
      <div className="flex-1 space-y-4">
        {/* Filters Panel */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-4 flex flex-wrap gap-4 items-center justify-between shadow-xl">
          <div className="flex flex-1 min-w-[200px] items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by opening or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-gray-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {/* Result */}
            <select
              value={resultFilter}
              onChange={(e: any) => setResultFilter(e.target.value)}
              className="bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-gray-300 font-semibold"
            >
              <option value="all" className="bg-[#120a05]">All Results</option>
              <option value="win" className="bg-[#120a05]">Wins</option>
              <option value="loss" className="bg-[#120a05]">Losses</option>
              <option value="draw" className="bg-[#120a05]">Draws</option>
            </select>

            {/* Difficulty */}
            <select
              value={diffFilter}
              onChange={(e: any) => setDiffFilter(e.target.value)}
              className="bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-gray-300 font-semibold"
            >
              <option value="all" className="bg-[#120a05]">All Difficulties</option>
              <option value="1" className="bg-[#120a05]">Level 1 (Beginner)</option>
              <option value="2" className="bg-[#120a05]">Level 2 (Easy)</option>
              <option value="3" className="bg-[#120a05]">Level 3 (Intermediate)</option>
              <option value="4" className="bg-[#120a05]">Level 4 (Advanced)</option>
              <option value="5" className="bg-[#120a05]">Level 5 (Expert)</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-gray-300 font-semibold"
            >
              <option value="date" className="bg-[#120a05]">Newest Matches</option>
              <option value="accuracy" className="bg-[#120a05]">Highest Accuracy</option>
              <option value="moves" className="bg-[#120a05]">Longest Games (Moves)</option>
            </select>
          </div>
        </div>

        {/* Selected bulk action panel */}
        {selectedGames.length > 0 && (
          <motion.div 
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-xs"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-red-400 font-semibold">{selectedGames.length} matches selected</span>
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </motion.div>
        )}

        {/* Scrollable match cards */}
        <div className="space-y-3">
          {processedGames.length > 0 ? (
            processedGames.map((game) => (
              <motion.div
                key={game.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors gap-4"
                layout
              >
                {/* Checkbox and Favorite */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedGames.includes(game.id)}
                    onChange={() => handleSelectGame(game.id)}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#d4af37] focus:ring-0"
                  />
                  <button
                    onClick={() => toggleFavorite(game.id, game.favorite)}
                    className="p-1 rounded-lg hover:bg-white/5"
                  >
                    <Star className={`w-4 h-4 ${game.favorite === 1 ? 'fill-[#d4af37] text-[#d4af37]' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Match Summary */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        game.result === 'win' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : game.result === 'loss' 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {game.result}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(game.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">Level {game.difficulty} AI</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={game.opening || 'Standard Opening'}>
                      <BookOpen className="inline w-3.5 h-3.5 mr-1 text-[#d4af37]" />
                      {game.opening || 'Standard Opening'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Moves: {game.moveCount} | Duration: {Math.floor(game.duration / 60)}m</p>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-white font-bold text-sm">{game.accuracy}% Accuracy</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Engine Evaluation</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => startReplay(game)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Replay Move List"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => exportPgn(game)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Export PGN"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGame(game.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </motion.div>
            ))
          ) : (
            <div className="p-12 border border-white/5 rounded-2xl bg-white/[0.01] text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-400">No completed matches found.</p>
              <p className="text-xs text-gray-500">Go play a match against Stockfish AI to start saving history.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive 2D Chessboard Replayer (Sidebar Panel) */}
      <AnimatePresence>
        {replayGame && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="w-full lg:w-96 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1c1917]/95 via-[#0c0a09]/98 to-[#040404] p-5 space-y-4 shadow-2xl backdrop-blur-xl h-fit shrink-0 relative"
          >
            <button
              onClick={() => setReplayGame(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-white">Interactive Match Replayer</h3>
              <p className="text-xs text-gray-400 mt-0.5">Stepping through moves of match {replayGame.id.slice(0, 8)}</p>
            </div>

            {/* 2D Board grid */}
            <div className="aspect-square w-full bg-[#0f0e0d] rounded-lg p-1 border border-white/10 select-none shadow-inner grid grid-cols-8 grid-rows-8 gap-[1px]">
              {replayBoard.map((row, rIdx) => 
                row.map((cell, cIdx) => {
                  const isDark = (rIdx + cIdx) % 2 === 1;
                  const squareColor = isDark ? 'bg-[#262524]' : 'bg-[#d6cdc1]';
                  const pieceSymbol = cell 
                    ? unicodePieces[`${cell.color}${cell.type}`] || ''
                    : '';
                  const textCol = cell?.color === 'w' ? 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]' : 'text-neutral-900';

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`flex items-center justify-center text-3xl font-bold rounded-[1px] relative ${squareColor}`}
                    >
                      <span className={`${textCol}`}>{pieceSymbol}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Move Navigators */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="flex gap-1">
                <button
                  onClick={() => setMoveIndex(0)}
                  disabled={replayMoveIdx === 0}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-gray-300"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMoveIndex(replayMoveIdx - 1)}
                  disabled={replayMoveIdx === 0}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-gray-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs font-bold text-white">
                Move {replayMoveIdx} / {replayMoves.length}
              </span>

              <div className="flex gap-1">
                <button
                  onClick={() => setMoveIndex(replayMoveIdx + 1)}
                  disabled={replayMoveIdx === replayMoves.length}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-gray-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMoveIndex(replayMoves.length)}
                  disabled={replayMoveIdx === replayMoves.length}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 text-gray-300"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SAN Move text display */}
            {replayMoves.length > 0 && (
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl max-h-24 overflow-y-auto custom-scrollbar text-xs space-y-1">
                <p className="text-gray-400 font-semibold mb-1">PGN Move List</p>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-300">
                  {Array.from({ length: Math.ceil(replayMoves.length / 2) }).map((_, i) => {
                    const whiteMove = replayMoves[i * 2]?.san || '';
                    const blackMove = replayMoves[i * 2 + 1]?.san || '';
                    const isCurrentWhite = replayMoveIdx === i * 2 + 1;
                    const isCurrentBlack = replayMoveIdx === i * 2 + 2;

                    return (
                      <React.Fragment key={i}>
                        <span className="text-gray-500 font-medium">{i + 1}.</span>
                        <span 
                          onClick={() => setMoveIndex(i * 2 + 1)}
                          className={`cursor-pointer hover:text-white rounded px-1 w-fit ${isCurrentWhite ? 'bg-[#d4af37] text-[#120a05] font-bold' : ''}`}
                        >
                          {whiteMove}
                        </span>
                        <span 
                          onClick={() => setMoveIndex(i * 2 + 2)}
                          className={`cursor-pointer hover:text-white rounded px-1 w-fit ${isCurrentBlack ? 'bg-[#d4af37] text-[#120a05] font-bold' : ''}`}
                        >
                          {blackMove}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
export default MatchHistoryTab;
