import { CpuLevel } from '../types/chess';
import { useChessStore } from '../store/chessStore';

class StockfishClient {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentTurn: 'w' | 'b' = 'w';

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === 'undefined' || this.worker) return;

    try {
      // Initialize Web Worker with the local public stockfish file
      this.worker = new Worker('/stockfish.js');
      
      this.worker.onmessage = (e: MessageEvent) => {
        this.handleMessage(e.data);
      };

      // Send initial UCI setup commands
      this.send('uci');
      this.send('ucinewgame');
      this.send('isready');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Stockfish worker:', error);
    }
  }

  private send(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  private handleMessage(message: string) {
    // Console log if needed for debugging, but cap it to avoid console spam in AAA product
    // console.log("SF:", message);

    // Parse best move
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const moveLAN = parts[1]; // e.g. "e2e4" or "e7e8q"
      
      if (moveLAN && moveLAN !== '(none)') {
        const from = moveLAN.substring(0, 2);
        const to = moveLAN.substring(2, 4);
        const promotion = moveLAN.length > 4 ? moveLAN.substring(4, 5) : undefined;
        
        // Execute CPU move in the Zustand store
        const makeCpuMove = useChessStore.getState().makeCpuMove;
        
        // Add a slight artificial delay (e.g. min 500ms) to make CPU move feel "thoughtful" and premium
        setTimeout(() => {
          makeCpuMove(from, to, promotion);
        }, 600);
      } else {
        // CPU has no legal moves (checkmate or draw)
        useChessStore.getState().setCpuThinking(false);
      }
    }

    // Parse evaluation score
    // Format: info depth 10 seldepth 12 score cp 34 ... pv e2e4 ...
    if (message.startsWith('info') && message.includes('score')) {
      const parts = message.split(' ');
      const scoreIndex = parts.indexOf('score');
      
      if (scoreIndex !== -1 && scoreIndex + 2 < parts.length) {
        const type = parts[scoreIndex + 1]; // "cp" or "mate"
        const valStr = parts[scoreIndex + 2];
        const value = parseInt(valStr, 10);
        
        if (!isNaN(value)) {
          let score = 0;
          if (type === 'cp') {
            // Centipawns to pawns conversion
            score = value / 100;
          } else if (type === 'mate') {
            // Checkmate in N moves. Return very high score in direction of checkmate
            score = value > 0 ? 10 - value / 100 : -10 + value / 100;
          }

          // In Stockfish, the evaluation is relative to the active player.
          // Convert it to absolute score where positive means White is leading, negative means Black.
          const finalScore = this.currentTurn === 'w' ? score : -score;

          // Update evaluation bar in state
          useChessStore.getState().updateEval(finalScore);
        }
      }
    }
  }

  public getCpuMove(fen: string, level: CpuLevel, turn: 'w' | 'b') {
    this.init();
    if (!this.isInitialized) {
      console.warn('Stockfish client not initialized yet. Retrying...');
      return;
    }

    this.currentTurn = turn;
    useChessStore.getState().setCpuThinking(true);

    // Stop any active search
    this.send('stop');

    // Configure Stockfish options based on difficulty level
    // 1: Beginner, 2: Easy, 3: Intermediate, 4: Advanced, 5: Stockfish Full (2400+)
    let skillLevel = 0;
    let depth = 1;
    let moveTime = 150;

    switch (level) {
      case 1:
        skillLevel = 0; // Extremely weak
        depth = 1;
        moveTime = 150;
        break;
      case 2:
        skillLevel = 3; // Weak
        depth = 3;
        moveTime = 300;
        break;
      case 3:
        skillLevel = 8; // Medium
        depth = 6;
        moveTime = 600;
        break;
      case 4:
        skillLevel = 15; // Strong
        depth = 10;
        moveTime = 1200;
        break;
      case 5:
        skillLevel = 20; // Maximum
        depth = 15;
        moveTime = 2500;
        break;
    }

    // Set engine skill level
    this.send(`setoption name Skill Level value ${skillLevel}`);
    
    // Set position
    this.send(`position fen ${fen}`);
    
    // Search
    if (level === 5) {
      // In level 5, search purely by depth to allow deepest analysis
      this.send(`go depth ${depth}`);
    } else {
      // Limit by time for natural-feeling response times
      this.send(`go depth ${depth} movetime ${moveTime}`);
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

export const stockfishClient = new StockfishClient();
export default stockfishClient;
