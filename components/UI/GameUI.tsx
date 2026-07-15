import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Undo2, RotateCcw, Volume2, VolumeX, Sparkles, Cpu, User, 
  ArrowLeftRight, Settings, Eye, EyeOff, X, HelpCircle, Check, Play
} from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { stockfishClient } from '../engine/stockfishClient';
import { CpuLevel, PlayerColor } from '../types/chess';

// Helper to format timers (MM:SS.d)
const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (totalSeconds < 20) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Chess piece point values
const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export const GameUI: React.FC = () => {
  const {
    status, winner, drawReason, fen, history, selectedSquare, lastMove,
    checkingSquares, promotionPending, settings, timeControl, captured,
    evalScore, isCpuThinking
  } = useChessStore();

  const {
    selectSquare, makeMove, undoMove, resetGame, setDifficulty, setPlayerColor,
    setVolume, toggleAmbient, flipBoard, toggleReducedMotion, toggleHighContrast,
    toggleCoordinates, setPromotionPending, suggestHint, updateTimers, makeCpuMove
  } = useChessStore();

  const [showSettings, setShowSettings] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null);

  // Timer Tick Hook
  useEffect(() => {
    let intervalId: any = null;
    if (status === 'playing' && timeControl.isActive) {
      intervalId = setInterval(() => {
        updateTimers();
      }, 100);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, timeControl.isActive, updateTimers]);

  // CPU Move Trigger Hook
  const chessInstance = useChessStore((state) => state.chessInstance);
  useEffect(() => {
    if (status === 'playing') {
      const turn = chessInstance.turn();
      const isCpuTurn = turn !== settings.playerColor;
      
      if (isCpuTurn && !isCpuThinking) {
        // Request Stockfish CPU move
        stockfishClient.getCpuMove(fen, settings.level, turn);
      }
    }
  }, [fen, status, settings.playerColor, settings.level, isCpuThinking, chessInstance]);

  // Ambient Drone loop initial trigger
  useEffect(() => {
    // Web Audio requires user interaction to initialize, managed via Zustand stores
  }, []);

  // Clear hint when a new move is made
  useEffect(() => {
    setHintMove(null);
  }, [fen]);

  // Calculate material advantages
  const materialScore = React.useMemo(() => {
    let whiteTotal = 0;
    let blackTotal = 0;

    Object.entries(captured.w).forEach(([piece, count]) => {
      whiteTotal += count * (pieceValues[piece as keyof typeof pieceValues] || 0);
    });

    Object.entries(captured.b).forEach(([piece, count]) => {
      blackTotal += count * (pieceValues[piece as keyof typeof pieceValues] || 0);
    });

    const diff = whiteTotal - blackTotal;
    return {
      whiteAdvantage: diff > 0 ? `+${diff}` : '',
      blackAdvantage: diff < 0 ? `+${Math.abs(diff)}` : '',
    };
  }, [captured]);

  // Clamp evaluation scores between -8 and +8 for the UI meter
  const evalPercent = React.useMemo(() => {
    const minEval = -8;
    const maxEval = 8;
    const clamped = Math.max(minEval, Math.min(maxEval, evalScore));
    // map [-8, 8] to [5%, 95%]
    return 50 + (clamped / 8) * 45;
  }, [evalScore]);

  // Handle hint request
  const handleHintRequest = () => {
    const hint = suggestHint();
    if (hint) {
      setHintMove(hint);
      // Automatically clear after 4 seconds
      setTimeout(() => setHintMove(null), 4000);
    }
  };

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none font-sans ${settings.highContrast ? 'text-black dark:text-white' : 'text-white'}`}>
      
      {/* 1. Evaluation Bar (Left Screen Border) */}
      <div className="absolute left-2 md:left-4 top-24 bottom-24 w-2 md:w-3.5 bg-black/60 border border-white/10 rounded-full overflow-hidden flex flex-col pointer-events-auto shadow-2xl">
        {/* Black side of eval (top) */}
        <div className="flex-1 bg-[#1e1e1e] transition-all duration-700" style={{ height: `${100 - evalPercent}%` }} />
        {/* Divider */}
        <div className="h-0.5 bg-[#d4af37]" />
        {/* White side of eval (bottom) */}
        <div className="bg-[#f0eae1] transition-all duration-700" style={{ height: `${evalPercent}%` }} />
      </div>

      {/* 2. Top Header (Status and Timers) */}
      <header className="w-full flex items-center justify-between pointer-events-auto z-10">
        {/* App Title & Difficulty */}
        <div className="backdrop-blur-xl bg-black/30 border border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d4af37] to-[#e5c158] flex items-center justify-center text-black font-serif font-bold text-lg shadow-md">
            C
          </div>
          <div>
            <h1 className="font-serif font-semibold text-sm leading-tight tracking-wider text-white">CHESS GRAND</h1>
            <p className="text-[10px] text-white/50 tracking-widest font-mono">VS CPU Lvl {settings.level}</p>
          </div>
        </div>

        {/* Timers & Turn Indicator */}
        <div className="backdrop-blur-xl bg-black/30 border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-6 shadow-xl">
          {/* Black Timer */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-widest text-white/40 uppercase font-mono">CPU (Black)</span>
            <span className={`font-mono text-lg font-semibold tracking-tight transition-colors duration-200 ${
              chessInstance.turn() === 'b' && status === 'playing' ? 'text-amber-400 font-bold' : 'text-white/70'
            }`}>
              {formatTime(timeControl.blackTime)}
            </span>
          </div>

          {/* Active Turn/Alert badge */}
          <div className="h-8 w-[1px] bg-white/10" />

          {/* Turn Display status */}
          <div className="flex flex-col items-center min-w-[70px]">
            {isCpuThinking ? (
              <span className="flex items-center gap-1.5 text-blue-400 text-xs font-mono animate-pulse">
                <Cpu size={12} className="animate-spin" /> CPU
              </span>
            ) : status === 'playing' ? (
              <span className={`text-xs font-serif tracking-widest uppercase ${
                chessInstance.turn() === 'w' ? 'text-white' : 'text-amber-400'
              }`}>
                {chessInstance.turn() === 'w' ? 'White' : 'Black'} Move
              </span>
            ) : (
              <span className="text-xs text-white/60 tracking-widest uppercase font-serif">
                {status}
              </span>
            )}
          </div>

          <div className="h-8 w-[1px] bg-white/10" />

          {/* White Timer */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-widest text-white/40 uppercase font-mono">You (White)</span>
            <span className={`font-mono text-lg font-semibold tracking-tight transition-colors duration-200 ${
              chessInstance.turn() === 'w' && status === 'playing' ? 'text-emerald-400 font-bold' : 'text-white/70'
            }`}>
              {formatTime(timeControl.whiteTime)}
            </span>
          </div>
        </div>

        {/* Settings button */}
        <button 
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 backdrop-blur-xl bg-black/30 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 rounded-2xl flex items-center justify-center text-white pointer-events-auto cursor-pointer shadow-xl"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* 3. Middle Panels (Captured items on Left, Move History on Right) */}
      <main className="flex-1 w-full flex justify-between items-center my-4 overflow-hidden relative">
        {/* Left Side: Captured Pieces */}
        <div className="w-16 md:w-20 flex flex-col gap-4 pointer-events-auto ml-10">
          {/* Black captured items (taken by White) */}
          <div className="backdrop-blur-xl bg-black/35 border border-white/5 p-2 rounded-2xl shadow-xl flex flex-col gap-1.5">
            <span className="text-[9px] font-mono text-white/40 text-center tracking-widest uppercase border-b border-white/5 pb-1">TAKEN</span>
            <div className="flex flex-col gap-1 items-center">
              {Object.entries(captured.w).map(([piece, count]) => count > 0 && (
                <div key={piece} className="flex items-center gap-1">
                  <span className="font-serif text-sm opacity-90">{piece === 'p' ? '♟' : piece === 'n' ? '♞' : piece === 'b' ? '♝' : piece === 'r' ? '♜' : '♛'}</span>
                  <span className="text-[10px] font-mono text-white/50">x{count}</span>
                </div>
              ))}
            </div>
            {materialScore.whiteAdvantage && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold text-center mt-1">
                {materialScore.whiteAdvantage}
              </span>
            )}
          </div>

          {/* White captured items (taken by Black) */}
          <div className="backdrop-blur-xl bg-black/35 border border-white/5 p-2 rounded-2xl shadow-xl flex flex-col gap-1.5">
            <span className="text-[9px] font-mono text-white/40 text-center tracking-widest uppercase border-b border-white/5 pb-1">LOST</span>
            <div className="flex flex-col gap-1 items-center">
              {Object.entries(captured.b).map(([piece, count]) => count > 0 && (
                <div key={piece} className="flex items-center gap-1">
                  <span className="font-serif text-sm opacity-50">{piece === 'p' ? '♙' : piece === 'n' ? '♘' : piece === 'b' ? '♗' : piece === 'r' ? '♖' : '♕'}</span>
                  <span className="text-[10px] font-mono text-white/30">x{count}</span>
                </div>
              ))}
            </div>
            {materialScore.blackAdvantage && (
              <span className="text-[10px] font-mono text-amber-500 font-bold text-center mt-1">
                {materialScore.blackAdvantage}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Move History Log */}
        <div className="w-48 md:w-56 h-72 backdrop-blur-xl bg-black/30 border border-white/10 rounded-3xl p-4 flex flex-col shadow-2xl pointer-events-auto">
          <h2 className="font-serif text-xs font-semibold tracking-wider text-white/70 uppercase border-b border-white/10 pb-2 mb-2 flex items-center justify-between">
            <span>Move History</span>
            <span className="text-[10px] font-mono opacity-50">PGN</span>
          </h2>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 scrollbar-thin">
            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs font-serif italic text-center p-2">
                No moves played yet. Start the match!
              </div>
            ) : (
              // Group history into pairs for standard chess notation
              Array.from({ length: Math.ceil(history.length / 2) }).map((_, idx) => {
                const moveNum = idx + 1;
                const whiteMove = history[idx * 2];
                const blackMove = history[idx * 2 + 1];
                return (
                  <div key={moveNum} className="grid grid-cols-5 text-xs py-1 hover:bg-white/5 rounded px-1 transition-colors">
                    <span className="col-span-1 text-white/40 font-mono">{moveNum}.</span>
                    <span className="col-span-2 font-mono text-white/80">{whiteMove.san}</span>
                    <span className="col-span-2 font-mono text-amber-400/90">{blackMove ? blackMove.san : ''}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* 4. Bottom Controls */}
      <footer className="w-full flex justify-center pointer-events-auto z-10">
        <div className="backdrop-blur-xl bg-black/35 border border-white/10 px-6 py-3.5 rounded-3xl flex items-center justify-center gap-6 md:gap-8 shadow-2xl max-w-lg w-full">
          {/* Undo Action */}
          <button
            onClick={undoMove}
            disabled={history.length === 0}
            title="Undo last move"
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            <Undo2 size={20} />
            <span className="text-[9px] font-mono tracking-widest">UNDO</span>
          </button>

          {/* Flip Board Action */}
          <button
            onClick={flipBoard}
            title="Flip board orientation"
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight size={20} />
            <span className="text-[9px] font-mono tracking-widest">FLIP</span>
          </button>

          {/* Quick Restart Action */}
          <button
            onClick={resetGame}
            title="Restart game"
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw size={20} />
            <span className="text-[9px] font-mono tracking-widest">RESET</span>
          </button>

          {/* Hint Action */}
          <button
            onClick={handleHintRequest}
            disabled={status !== 'playing' || chessInstance.turn() !== settings.playerColor}
            title="Get a move hint"
            className="flex flex-col items-center gap-1 text-white/60 hover:text-amber-400 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles size={20} />
            <span className="text-[9px] font-mono tracking-widest text-inherit">HINT</span>
          </button>

          {/* Line separator */}
          <div className="h-6 w-[1px] bg-white/10" />

          {/* Level Selector */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-mono tracking-wider text-white/40 uppercase">AI LEVEL</span>
            <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
              {([1, 2, 3, 4, 5] as CpuLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition-all ${
                    settings.level === lvl 
                      ? 'bg-[#d4af37] text-black shadow-md' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* 5. Modals & Overlays (Framer Motion Animated) */}
      <AnimatePresence>
        
        {/* Settings Drawer (Right Side overlay) */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto z-50 flex justify-end">
            {/* Click outside backdrop to close */}
            <div className="absolute inset-0 -z-10" onClick={() => setShowSettings(false)} />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-80 h-full backdrop-blur-2xl bg-[#140e0a]/95 border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl text-white"
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                  <h3 className="font-serif text-lg font-bold tracking-wider">SETTINGS</h3>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Audio controls */}
                <div className="flex flex-col gap-5 mb-8">
                  <h4 className="text-[10px] font-mono tracking-widest text-white/40 uppercase">AUDIO</h4>
                  
                  {/* SFX Volume */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-mono text-white/80">
                      <span>Sound Effects</span>
                      <span>{Math.round(settings.soundVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={settings.soundVolume}
                      onChange={(e) => setVolume('sound', parseFloat(e.target.value))}
                      className="w-full accent-[#d4af37] bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Ambient Room drone volume */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-mono text-white/80">
                      <span>Room Ambient Sound</span>
                      <button 
                        onClick={toggleAmbient}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-all ${
                          settings.isAmbientPlaying 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-white/5 text-white/50 border border-white/10'
                        }`}
                      >
                        {settings.isAmbientPlaying ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      disabled={!settings.isAmbientPlaying}
                      value={settings.ambientVolume}
                      onChange={(e) => setVolume('ambient', parseFloat(e.target.value))}
                      className={`w-full accent-[#d4af37] bg-white/10 h-1 rounded-lg appearance-none cursor-pointer transition-opacity ${
                        !settings.isAmbientPlaying ? 'opacity-30 pointer-events-none' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Gameplay & Accessibilities */}
                <div className="flex flex-col gap-5">
                  <h4 className="text-[10px] font-mono tracking-widest text-white/40 uppercase">PREFERENCES</h4>

                  {/* Board orientation / side selection */}
                  <div className="flex justify-between items-center text-xs font-mono text-white/80">
                    <span>Play As Side</span>
                    <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                      <button
                        onClick={() => setPlayerColor('w')}
                        className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                          settings.playerColor === 'w' ? 'bg-white text-black font-semibold' : 'text-white/60'
                        }`}
                      >
                        WHITE
                      </button>
                      <button
                        onClick={() => setPlayerColor('b')}
                        className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                          settings.playerColor === 'b' ? 'bg-white text-black font-semibold' : 'text-white/60'
                        }`}
                      >
                        BLACK
                      </button>
                    </div>
                  </div>

                  {/* Show coordinates */}
                  <div className="flex justify-between items-center text-xs font-mono text-white/80">
                    <span>Display Coordinates</span>
                    <button 
                      onClick={toggleCoordinates}
                      className="w-10 h-6 bg-white/10 rounded-full p-0.5 flex items-center justify-start transition-all"
                    >
                      <div className={`w-5 h-5 rounded-full shadow-md transform duration-200 flex items-center justify-center ${
                        settings.showCoordinates ? 'translate-x-4 bg-[#d4af37]' : 'translate-x-0 bg-white/40'
                      }`}>
                        {settings.showCoordinates ? <Check size={10} className="text-black" /> : null}
                      </div>
                    </button>
                  </div>

                  {/* Reduced Motion accessibility */}
                  <div className="flex justify-between items-center text-xs font-mono text-white/80">
                    <span>Reduced Motion</span>
                    <button 
                      onClick={toggleReducedMotion}
                      className="w-10 h-6 bg-white/10 rounded-full p-0.5 flex items-center justify-start transition-all"
                    >
                      <div className={`w-5 h-5 rounded-full shadow-md transform duration-200 flex items-center justify-center ${
                        settings.reducedMotion ? 'translate-x-4 bg-[#d4af37]' : 'translate-x-0 bg-white/40'
                      }`}>
                        {settings.reducedMotion ? <Check size={10} className="text-black" /> : null}
                      </div>
                    </button>
                  </div>

                  {/* High Contrast accessibility */}
                  <div className="flex justify-between items-center text-xs font-mono text-white/80">
                    <span>High Contrast Mode</span>
                    <button 
                      onClick={toggleHighContrast}
                      className="w-10 h-6 bg-white/10 rounded-full p-0.5 flex items-center justify-start transition-all"
                    >
                      <div className={`w-5 h-5 rounded-full shadow-md transform duration-200 flex items-center justify-center ${
                        settings.highContrast ? 'translate-x-4 bg-[#d4af37]' : 'translate-x-0 bg-white/40'
                      }`}>
                        {settings.highContrast ? <Check size={10} className="text-black" /> : null}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Version Footer */}
              <div className="text-[10px] font-mono text-white/30 text-center tracking-widest pt-4 border-t border-white/5">
                STOCKFISH AI 18.0 LITE • REACT 19
              </div>
            </motion.div>
          </div>
        )}

        {/* Pawn Promotion Modal (Centred overlay) */}
        {promotionPending && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md pointer-events-auto z-40 flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="backdrop-blur-2xl bg-[#140e0a]/90 border border-white/15 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center text-white"
            >
              <h3 className="font-serif text-lg font-bold tracking-wider mb-2">PAWN PROMOTION</h3>
              <p className="text-xs text-white/50 mb-6 font-serif italic">Select which piece to promote your pawn into</p>
              
              <div className="grid grid-cols-4 gap-4 w-full mb-2">
                {[
                  { type: 'q', name: 'Queen', icon: '♛' },
                  { type: 'r', name: 'Rook', icon: '♜' },
                  { type: 'b', name: 'Bishop', icon: '♝' },
                  { type: 'n', name: 'Knight', icon: '♞' }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => makeMove(promotionPending.from, promotionPending.to, item.type)}
                    className="aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/5 hover:bg-[#d4af37]/20 border border-white/10 hover:border-[#d4af37]/50 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
                  >
                    <span className="text-3xl font-serif leading-none group-hover:text-amber-400 transition-colors">{item.icon}</span>
                    <span className="text-[9px] font-mono tracking-widest text-white/50 group-hover:text-white transition-colors">{item.name.toUpperCase()}</span>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setPromotionPending(null)}
                className="mt-6 text-xs font-mono tracking-widest text-white/40 hover:text-white transition-colors uppercase"
              >
                Cancel Move
              </button>
            </motion.div>
          </div>
        )}

        {/* Game Result Modal (GameOver card overlay) */}
        {status !== 'playing' && status !== 'idle' && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md pointer-events-auto z-45 flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="backdrop-blur-2xl bg-[#1a130e]/95 border border-[#d4af37]/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center text-white"
            >
              {/* Highlight ribbon */}
              <div className="w-16 h-1 bg-[#d4af37] rounded-full mb-4" />
              
              <h2 className="font-serif text-2xl font-bold tracking-widest mb-1.5 text-white">
                {status === 'checkmate' ? (
                  winner === settings.playerColor ? 'VICTORY' : 'DEFEAT'
                ) : 'MATCH DRAW'}
              </h2>

              <p className="text-xs text-[#d4af37] tracking-widest font-mono uppercase mb-6">
                {status === 'checkmate' ? (
                  winner === 'w' ? 'White wins by Checkmate' : 'Black wins by Checkmate'
                ) : (
                  `Draw by ${drawReason}`
                )}
              </p>

              {/* Statistics Panel */}
              <div className="w-full bg-black/30 rounded-2xl p-4 border border-white/5 mb-8 flex flex-col gap-3">
                <div className="flex justify-between text-xs font-mono text-white/60">
                  <span>Game Mode</span>
                  <span className="text-white">Player vs CPU</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-white/60">
                  <span>Total Moves</span>
                  <span className="text-white">{history.length}</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-white/60">
                  <span>Stockfish Difficulty</span>
                  <span className="text-white">Level {settings.level}</span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={resetGame}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#e5c158] hover:from-[#e5c158] hover:to-[#d4af37] text-black font-serif font-bold text-sm tracking-widest shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={14} className="fill-black" /> PLAY AGAIN
              </button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* 6. Active 3D Hint overlay indicator (Invisible visual pointer helper) */}
      {hintMove && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-md bg-amber-400/10 border border-amber-400/30 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl pointer-events-auto">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-mono text-white tracking-widest">
            HINT: <b className="text-amber-400">{hintMove.from.toUpperCase()} → {hintMove.to.toUpperCase()}</b>
          </span>
        </div>
      )}
    </div>
  );
};
export default GameUI;
