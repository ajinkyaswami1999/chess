import { useEffect } from 'react';
import { useChessStore } from '../store/chessStore';
import { soundSynth } from '../utils/soundSynth';

export function useAudio() {
  const soundToPlay = useChessStore((state) => state.soundToPlay);
  const triggerSound = useChessStore((state) => state.triggerSound);
  const soundVolume = useChessStore((state) => state.settings.soundVolume);
  const ambientVolume = useChessStore((state) => state.settings.ambientVolume);
  const isAmbientPlaying = useChessStore((state) => state.settings.isAmbientPlaying);

  // Synchronize volumes with the synthesizer
  useEffect(() => {
    if (!soundSynth) return;
    soundSynth.setVolumes(soundVolume, ambientVolume);
  }, [soundVolume, ambientVolume]);

  // Handle ambient room sound playing/stopping
  useEffect(() => {
    if (!soundSynth) return;
    
    if (isAmbientPlaying) {
      soundSynth.startAmbient();
    } else {
      soundSynth.stopAmbient();
    }

    return () => {
      if (soundSynth) {
        soundSynth.stopAmbient();
      }
    };
  }, [isAmbientPlaying]);

  // Handle playing sound effects when triggered by the game state
  useEffect(() => {
    if (!soundSynth || !soundToPlay) return;

    switch (soundToPlay) {
      case 'move':
        soundSynth.playMove();
        break;
      case 'capture':
        soundSynth.playCapture();
        break;
      case 'check':
        soundSynth.playCheck();
        break;
      case 'castle':
        soundSynth.playCastle();
        break;
      case 'promotion':
        soundSynth.playPromotion();
        break;
      case 'start':
        soundSynth.playStart();
        break;
      case 'victory':
        soundSynth.playVictory();
        break;
      case 'defeat':
        soundSynth.playDefeat();
        break;
      default:
        break;
    }

    // Reset sound trigger after playing
    triggerSound(null);
  }, [soundToPlay, triggerSound]);
}
