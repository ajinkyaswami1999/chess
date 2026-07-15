import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';
import { squareToVector3 } from '../pieces/ProceduralPieces';

export const ChessGameCamera: React.FC = () => {
  const { camera } = useThree();
  const isFlipped = useChessStore((state) => state.settings.isFlipped);
  const status = useChessStore((state) => state.status);
  const checkingSquares = useChessStore((state) => state.checkingSquares);
  const mateSquare = useChessStore((state) => state.mateSquare);
  const reducedMotion = useChessStore((state) => state.settings.reducedMotion);

  // We use refs to control OrbitControls target and camera positions programmatically
  const controlsRef = useRef<any>(null);

  // Ideal target angles & positions
  // White side: x = 0, y = 6.2, z = 6.8 (approx 45 degrees, centered)
  // Black side: x = 0, y = 6.2, z = -6.8 (flipped)
  const defaultPos = useMemo(() => new THREE.Vector3(0, 6.2, 6.8), []);
  const flippedPos = useMemo(() => new THREE.Vector3(0, 6.2, -6.8), []);
  
  const targetCamPos = useRef<THREE.Vector3>(defaultPos.clone());
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Update target coordinates based on game events
  useEffect(() => {
    // 1. Checkmate Cinematic Zoom
    if (status === 'checkmate' && mateSquare) {
      const kingPos = squareToVector3(mateSquare);
      
      // Look directly at checkmated king
      targetLookAt.current.set(kingPos.x, 0.4, kingPos.z);
      
      // Position camera closely in front of the king based on board flip
      const offsetZ = isFlipped ? 2.2 : -2.2;
      targetCamPos.current.set(kingPos.x, 2.5, kingPos.z + offsetZ);
    } 
    // 2. Check Zoom
    else if (checkingSquares.length > 0) {
      const kingPos = squareToVector3(checkingSquares[0]);
      targetLookAt.current.set(kingPos.x * 0.4, 0, kingPos.z * 0.4); // pull focus slightly towards king
      
      const basePos = isFlipped ? flippedPos : defaultPos;
      targetCamPos.current.copy(basePos).multiplyScalar(0.85); // zoom in 15%
    } 
    // 3. Normal Playing Positions
    else {
      targetLookAt.current.set(0, 0, 0); // center on board
      targetCamPos.current.copy(isFlipped ? flippedPos : defaultPos);
    }
  }, [status, mateSquare, checkingSquares, isFlipped, defaultPos, flippedPos]);

  // Handle board flip entrance jump
  useEffect(() => {
    if (reducedMotion) {
      // Instantly position camera
      camera.position.copy(isFlipped ? flippedPos : defaultPos);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [isFlipped, camera, defaultPos, flippedPos, reducedMotion]);

  // Interpolate camera position and control targets on every frame
  useFrame((state, delta) => {
    if (reducedMotion) return;

    // Damp camera position towards targeted positions
    const lerpSpeed = status === 'checkmate' ? 1.5 * delta : 3.5 * delta;
    
    camera.position.lerp(targetCamPos.current, lerpSpeed);

    if (controlsRef.current) {
      // Damp OrbitControls target point towards targetLookAt
      controlsRef.current.target.lerp(targetLookAt.current, lerpSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.05}
      // Zoom limits
      minDistance={3.0}
      maxDistance={11.0}
      // Orbit limits (prevent going beneath the table or looking straight down)
      minPolarAngle={Math.PI / 6} // ~30 degrees
      maxPolarAngle={Math.PI / 2.15} // ~83 degrees (just above horizontal)
      enablePan={false} // lock camera focus center to board coordinates
    />
  );
};
export default ChessGameCamera;
