import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';
import { squareToVector3 } from '../pieces/ProceduralPieces';

export const SceneEffects: React.FC = () => {
  const selectedSquare = useChessStore((state) => state.selectedSquare);
  const checkingSquares = useChessStore((state) => state.checkingSquares);
  const isCpuThinking = useChessStore((state) => state.isCpuThinking);
  const status = useChessStore((state) => state.status);
  const boardTheme = useChessStore((state) => state.settings.boardTheme || 'marble');
  
  const selectLightRef = useRef<THREE.PointLight>(null);
  const checkLightRef = useRef<THREE.PointLight>(null);

  const sceneStyle = React.useMemo(() => {
    switch (boardTheme) {
      case 'wood':
        return {
          background: '#140c08',
          cornerLight: '#d4af37',
          backLight: '#e5c158',
          skyColor: '#ffedd5',
          groundColor: '#2c1c0f',
          fogNear: 9,
          fogFar: 30,
        };
      case 'ice':
        return {
          background: '#080e1a',
          cornerLight: '#38bdf8',
          backLight: '#7dd3fc',
          skyColor: '#e0f2fe',
          groundColor: '#0c1a30',
          fogNear: 11,
          fogFar: 34,
        };
      case 'volcanic':
        return {
          background: '#090300',
          cornerLight: '#f97316',
          backLight: '#ef4444',
          skyColor: '#fecdd3',
          groundColor: '#1c0500',
          fogNear: 7,
          fogFar: 34,
        };
      case 'forest':
        return {
          background: '#050c05',
          cornerLight: '#34d399',
          backLight: '#10b981',
          skyColor: '#d1fae5',
          groundColor: '#051805',
          fogNear: 9,
          fogFar: 32,
        };
      case 'space':
        return {
          background: '#020208',
          cornerLight: '#06b6d4',
          backLight: '#8b5cf6',
          skyColor: '#c084fc',
          groundColor: '#050518',
          fogNear: 13,
          fogFar: 42,
        };
      case 'steampunk':
        return {
          background: '#0f0d0a',
          cornerLight: '#f97316',
          backLight: '#b45309',
          skyColor: '#fed7aa',
          groundColor: '#18120a',
          fogNear: 6,
          fogFar: 28,
        };
      case 'desert':
        return {
          background: '#1a130c',
          cornerLight: '#eab308',
          backLight: '#f59e0b',
          skyColor: '#fef9c3',
          groundColor: '#241a10',
          fogNear: 8,
          fogFar: 34,
        };
      case 'gothic':
        return {
          background: '#0d0f12',
          cornerLight: '#9ca3af',
          backLight: '#4b5563',
          skyColor: '#e5e7eb',
          groundColor: '#111317',
          fogNear: 9,
          fogFar: 36,
        };
      case 'neon':
        return {
          background: '#05000a',
          cornerLight: '#ec4899',
          backLight: '#a855f7',
          skyColor: '#fdf4ff',
          groundColor: '#0f021c',
          fogNear: 10,
          fogFar: 34,
        };
      case 'marble':
      default:
        return {
          background: '#0e0906',
          cornerLight: '#d4af37',
          backLight: '#e5c158',
          skyColor: '#ffffff',
          groundColor: '#2c1c0f',
          fogNear: 10,
          fogFar: 32,
        };
    }
  }, [boardTheme]);

  // Position of selected square light
  const selectLightPos = React.useMemo(() => {
    if (selectedSquare) {
      const pos = squareToVector3(selectedSquare);
      return new THREE.Vector3(pos.x, 1.2, pos.z);
    }
    return new THREE.Vector3(0, -10, 0); // Hide below board
  }, [selectedSquare]);

  // Position of checked king light
  const checkLightPos = React.useMemo(() => {
    if (checkingSquares.length > 0) {
      const pos = squareToVector3(checkingSquares[0]);
      return new THREE.Vector3(pos.x, 1.4, pos.z);
    }
    return new THREE.Vector3(0, -10, 0);
  }, [checkingSquares]);

  // Frame animations for lights (pulsing selected/checking lights)
  useFrame((state, delta) => {
    // Pulse selected light intensity
    if (selectLightRef.current && selectedSquare) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 5.0) * 0.4 + 1.2;
      selectLightRef.current.intensity = pulse;
    }

    // Pulse check light intensity (red alert pulse)
    if (checkLightRef.current && checkingSquares.length > 0) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 8.0) * 0.8 + 1.6;
      checkLightRef.current.intensity = pulse;
    }
  });

  return (
    <>
      {/* 1. Global Ambient Light (Soft room lighting) */}
      <ambientLight intensity={0.45} />

      {/* 2. Hemisphere Light (Simulates sky/ground ambient gradients) */}
      <hemisphereLight 
        args={[sceneStyle.skyColor, sceneStyle.groundColor, 0.4]} 
        position={[0, 20, 0]} 
      />

      {/* 3. Primary Key Directional Light (Casts beautiful soft shadows) */}
      <directionalLight
        position={[5, 12, 4]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={25}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0003}
      />

      {/* 4. Warm Gold Rim/Back Light (For edge definitions on dark pieces) */}
      <directionalLight
        position={[-6, 8, -6]}
        intensity={0.65}
        color={sceneStyle.backLight}
      />

      {/* 5. Soft Gold Ambient Point Lights at Board Corners */}
      <pointLight 
        position={[4.5, 0.8, 4.5]} 
        intensity={0.35} 
        color={sceneStyle.cornerLight} 
        distance={6} 
      />
      <pointLight 
        position={[-4.5, 0.8, -4.5]} 
        intensity={0.35} 
        color={sceneStyle.cornerLight} 
        distance={6} 
      />

      {/* 6. Dynamic Selected Square Light (Gold spotlight) */}
      {selectedSquare && (
        <pointLight
          ref={selectLightRef}
          position={selectLightPos}
          color="#e5c158"
          intensity={1.5}
          distance={3}
          decay={2}
        />
      )}

      {/* 7. Dynamic Checking King Alert Light (Pulsing Red) */}
      {checkingSquares.length > 0 && (
        <pointLight
          ref={checkLightRef}
          position={checkLightPos}
          color="#ef4444"
          intensity={2.2}
          distance={3.5}
          decay={1.8}
        />
      )}

      {/* 8. CPU Thinking Glow (Casts subtle blue light when Stockfish is calculating) */}
      {isCpuThinking && (
        <pointLight
          position={[0, 2.5, 0]}
          color="#3b82f6"
          intensity={0.8}
          distance={10}
          decay={1.5}
        />
      )}

      {/* 9. Background Room Fog (Draws focus to the board) */}
      <color attach="background" args={[sceneStyle.background]} />
      <fog attach="fog" args={[sceneStyle.background, sceneStyle.fogNear, sceneStyle.fogFar]} />
    </>
  );
};
export default SceneEffects;
