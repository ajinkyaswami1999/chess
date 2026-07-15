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
  
  const selectLightRef = useRef<THREE.PointLight>(null);
  const checkLightRef = useRef<THREE.PointLight>(null);

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
        args={['#ffffff', '#2c1c0f', 0.4]} 
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
        color="#e5c158"
      />

      {/* 5. Soft Gold Ambient Point Lights at Board Corners */}
      <pointLight 
        position={[4.5, 0.8, 4.5]} 
        intensity={0.35} 
        color="#d4af37" 
        distance={6} 
      />
      <pointLight 
        position={[-4.5, 0.8, -4.5]} 
        intensity={0.35} 
        color="#d4af37" 
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
      <color attach="background" args={['#0e0906']} />
      <fog attach="fog" args={['#0e0906', 7, 20]} />
    </>
  );
};
export default SceneEffects;
