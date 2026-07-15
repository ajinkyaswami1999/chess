import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PieceProps {
  type: string; // 'p' | 'r' | 'n' | 'b' | 'q' | 'k'
  color: 'w' | 'b';
  square: string; // e.g. "e4"
  isSelected: boolean;
  isLegalMoveTarget: boolean;
  isInCheck: boolean;
  reducedMotion: boolean;
}

// Convert board square to 3D positions
// a1 is top-left in our 3D grid: x = -3.5, z = -3.5 (centered at 0,0)
export function squareToVector3(square: string): THREE.Vector3 {
  const file = square.charCodeAt(0) - 97; // 'a' = 0, 'h' = 7
  const rank = parseInt(square[1], 10) - 1; // '1' = 0, '8' = 7
  
  // Center board at (0,0)
  const x = file - 3.5;
  const z = (7 - rank) - 3.5; // rank 8 is at top (z = -3.5)
  return new THREE.Vector3(x, 0, z);
}

// Procedural materials
const goldMaterial = new THREE.MeshPhysicalMaterial({
  color: '#e5c158',
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1
});

// White Ivory Marble Material
const whiteMaterial = new THREE.MeshPhysicalMaterial({
  color: '#f6f5f0',
  roughness: 0.12,
  metalness: 0.05,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  reflectivity: 0.9
});

// Black Walnut Wood Material
const blackMaterial = new THREE.MeshPhysicalMaterial({
  color: '#2e1d11',
  roughness: 0.28,
  metalness: 0.0,
  clearcoat: 0.6,
  clearcoatRoughness: 0.2,
  reflectivity: 0.4
});

export const ProceduralPieces: React.FC<PieceProps> = ({
  type,
  color,
  square,
  isSelected,
  isLegalMoveTarget,
  isInCheck,
  reducedMotion
}) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Track visual position for animations
  const targetPos = useMemo(() => squareToVector3(square), [square]);
  const currentPos = useRef<THREE.Vector3>(targetPos.clone());
  
  // Capture movement state
  const isMoving = useRef(false);
  const moveProgress = useRef(0);
  const moveStartPos = useRef<THREE.Vector3>(targetPos.clone());

  // Detect when square changes to trigger a lift-and-move Bezier arc
  useEffect(() => {
    if (!currentPos.current.equals(targetPos)) {
      isMoving.current = true;
      moveProgress.current = 0;
      moveStartPos.current.copy(currentPos.current);
    }
  }, [targetPos]);

  // Material choice
  const activeMaterial = color === 'w' ? whiteMaterial : blackMaterial;

  // Generate curves once for each piece type
  const geometries = useMemo(() => {
    // Helper to build Lathe points
    const makeLathePoints = (coords: [number, number][]) => {
      return coords.map(([x, y]) => new THREE.Vector2(x, y));
    };

    // 1. Pawn base/neck profile
    const pawnPoints = makeLathePoints([
      [0, 0],
      [0.34, 0],
      [0.34, 0.06],
      [0.28, 0.1],
      [0.22, 0.18],
      [0.12, 0.45],
      [0.16, 0.56],
      [0.16, 0.60],
      [0.12, 0.64],
      [0, 0.64]
    ]);

    // 2. Bishop profile
    const bishopPoints = makeLathePoints([
      [0, 0],
      [0.36, 0],
      [0.36, 0.08],
      [0.28, 0.12],
      [0.24, 0.22],
      [0.14, 0.62],
      [0.20, 0.70],
      [0.20, 0.80],
      [0.16, 1.0],
      [0.08, 1.1],
      [0, 1.12]
    ]);

    // 3. Rook profile
    const rookPoints = makeLathePoints([
      [0, 0],
      [0.36, 0],
      [0.36, 0.1],
      [0.30, 0.15],
      [0.26, 0.22],
      [0.24, 0.74],
      [0.32, 0.86],
      [0.32, 1.0],
      [0, 1.0]
    ]);

    // 4. Queen profile
    const queenPoints = makeLathePoints([
      [0, 0],
      [0.40, 0],
      [0.40, 0.1],
      [0.32, 0.16],
      [0.26, 0.26],
      [0.15, 0.84],
      [0.22, 1.04],
      [0.30, 1.22],
      [0.30, 1.3],
      [0, 1.3]
    ]);

    // 5. King profile
    const kingPoints = makeLathePoints([
      [0, 0],
      [0.42, 0],
      [0.42, 0.1],
      [0.34, 0.16],
      [0.28, 0.26],
      [0.17, 0.94],
      [0.24, 1.18],
      [0.28, 1.36],
      [0.18, 1.46],
      [0, 1.46]
    ]);

    // 6. Knight Extruded Horse Shape
    const knightShape = new THREE.Shape();
    knightShape.moveTo(0, 0);
    knightShape.lineTo(0.34, 0);
    knightShape.quadraticCurveTo(0.36, 0.36, 0.28, 0.54);
    knightShape.lineTo(0.18, 0.86);
    knightShape.quadraticCurveTo(0.08, 1.08, -0.06, 1.14); // Ears
    knightShape.lineTo(-0.1, 1.14);
    knightShape.lineTo(-0.16, 0.96); // Snout
    knightShape.lineTo(-0.36, 0.82);
    knightShape.quadraticCurveTo(-0.16, 0.62, -0.12, 0.58); // Jaw
    knightShape.lineTo(-0.24, 0.36); // Chest
    knightShape.quadraticCurveTo(-0.26, 0.1, 0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.02,
      bevelOffset: 0,
      bevelSegments: 3
    };

    return {
      pawnPoints,
      bishopPoints,
      rookPoints,
      queenPoints,
      kingPoints,
      knightShape,
      extrudeSettings
    };
  }, []);

  // Frame loop for 3D animations: float, select, and movements
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. Move animation (parabolic curve arc)
    if (isMoving.current) {
      // Speed of animation (quicker if reduced motion is false)
      const speed = reducedMotion ? 12 : 6;
      moveProgress.current += delta * speed;
      
      if (moveProgress.current >= 1.0) {
        moveProgress.current = 1.0;
        isMoving.current = false;
        currentPos.current.copy(targetPos);
      } else {
        // Interpolate X and Z linearly
        const currentX = THREE.MathUtils.lerp(moveStartPos.current.x, targetPos.x, moveProgress.current);
        const currentZ = THREE.MathUtils.lerp(moveStartPos.current.z, targetPos.z, moveProgress.current);
        
        // Add Y lift height (parabolic arc)
        const liftHeight = reducedMotion ? 0 : 0.6;
        const currentY = Math.sin(moveProgress.current * Math.PI) * liftHeight;
        
        currentPos.current.set(currentX, currentY, currentZ);
      }
      meshRef.current.position.copy(currentPos.current);
    } else {
      // Maintain base position
      currentPos.current.copy(targetPos);
      
      // Gentle idle float animation (only if reduced motion is off and not selected)
      let floatY = 0;
      if (!reducedMotion && !isSelected) {
        floatY = Math.sin(state.clock.getElapsedTime() * 1.8 + square.charCodeAt(0)) * 0.025;
      }
      meshRef.current.position.set(targetPos.x, targetPos.y + floatY, targetPos.z);
    }

    // 2. Scale & Selection animations
    const targetScale = isSelected ? 1.15 : isLegalMoveTarget ? 1.0 : 1.0;
    const currentScale = meshRef.current.scale.x;
    const lerpSpeed = 12 * delta;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpSpeed);
    meshRef.current.scale.set(newScale, newScale, newScale);

    // 3. Selection pulse float (higher lift when selected)
    if (isSelected && !reducedMotion) {
      const pulseY = Math.sin(state.clock.getElapsedTime() * 4.5) * 0.05 + 0.12;
      meshRef.current.position.y += pulseY;
    }

    // 4. Checking King shake animation
    if (isInCheck && type === 'k' && !reducedMotion) {
      const shakeTime = state.clock.getElapsedTime() * 25;
      meshRef.current.position.x += Math.sin(shakeTime) * 0.04;
      meshRef.current.position.z += Math.cos(shakeTime) * 0.04;
    }
  });

  // Render correct shapes
  return (
    <group ref={meshRef} position={targetPos}>
      {/* 1. Pawn */}
      {type === 'p' && (
        <group>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.pawnPoints, 32]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.44, 0]} material={goldMaterial}>
            <torusGeometry args={[0.15, 0.025, 8, 32]} />
          </mesh>
          {/* Head sphere */}
          <mesh position={[0, 0.8, 0]} material={activeMaterial}>
            <sphereGeometry args={[0.22, 32, 32]} />
          </mesh>
        </group>
      )}

      {/* 2. Bishop */}
      {type === 'b' && (
        <group>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.bishopPoints, 32]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.62, 0]} material={goldMaterial}>
            <torusGeometry args={[0.16, 0.03, 8, 32]} />
          </mesh>
          {/* Head crown sphere */}
          <mesh position={[0, 1.20, 0]} material={activeMaterial}>
            <sphereGeometry args={[0.16, 32, 32]} />
          </mesh>
          {/* Bishop finial tip (gold ball) */}
          <mesh position={[0, 1.4, 0]} material={goldMaterial}>
            <sphereGeometry args={[0.05, 16, 16]} />
          </mesh>
        </group>
      )}

      {/* 3. Knight */}
      {type === 'n' && (
        <group>
          {/* Circular base */}
          <mesh material={activeMaterial}>
            <cylinderGeometry args={[0.34, 0.36, 0.16, 32]} />
          </mesh>
          {/* Gold base ring */}
          <mesh position={[0, 0.08, 0]} material={goldMaterial}>
            <torusGeometry args={[0.32, 0.03, 8, 32]} />
          </mesh>
          {/* Extruded Horse Head */}
          <mesh 
            position={color === 'w' ? [-0.08, 0.08, 0.11] : [0.08, 0.08, -0.11]} 
            rotation={color === 'w' ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0]} 
            material={activeMaterial}
          >
            <extrudeGeometry args={[geometries.knightShape, geometries.extrudeSettings]} />
          </mesh>
        </group>
      )}

      {/* 4. Rook */}
      {type === 'r' && (
        <group>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.rookPoints, 32]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.74, 0]} material={goldMaterial}>
            <torusGeometry args={[0.26, 0.03, 8, 32]} />
          </mesh>
          {/* Castle top crenellations */}
          <group position={[0, 1.04, 0]}>
            {[0, 1, 2, 3].map((i) => {
              const angle = (i * Math.PI) / 2;
              return (
                <mesh 
                  key={i} 
                  position={[Math.cos(angle) * 0.24, 0, Math.sin(angle) * 0.24]} 
                  rotation={[0, -angle, 0]}
                  material={activeMaterial}
                >
                  <boxGeometry args={[0.12, 0.1, 0.12]} />
                </mesh>
              );
            })}
          </group>
        </group>
      )}

      {/* 5. Queen */}
      {type === 'q' && (
        <group>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.queenPoints, 32]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.84, 0]} material={goldMaterial}>
            <torusGeometry args={[0.2, 0.035, 8, 32]} />
          </mesh>
          {/* Coronet pearls (Gold tiny spheres surrounding the crown) */}
          <group position={[0, 1.34, 0]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i * Math.PI) / 4;
              return (
                <mesh 
                  key={i} 
                  position={[Math.cos(angle) * 0.28, 0.02, Math.sin(angle) * 0.28]} 
                  material={goldMaterial}
                >
                  <sphereGeometry args={[0.04, 12, 12]} />
                </mesh>
              );
            })}
          </group>
          {/* Tiny center crown pearl */}
          <mesh position={[0, 1.44, 0]} material={goldMaterial}>
            <sphereGeometry args={[0.06, 16, 16]} />
          </mesh>
        </group>
      )}

      {/* 6. King */}
      {type === 'k' && (
        <group>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.kingPoints, 32]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.94, 0]} material={goldMaterial}>
            <torusGeometry args={[0.22, 0.035, 8, 32]} />
          </mesh>
          {/* Crown band */}
          <mesh position={[0, 1.38, 0]} material={goldMaterial}>
            <torusGeometry args={[0.24, 0.025, 8, 32]} />
          </mesh>
          {/* King Cross Finial */}
          <group position={[0, 1.62, 0]}>
            {/* Cross vertical */}
            <mesh material={goldMaterial}>
              <boxGeometry args={[0.08, 0.26, 0.08]} />
            </mesh>
            {/* Cross horizontal */}
            <mesh position={[0, 0.06, 0]} material={goldMaterial}>
              <boxGeometry args={[0.22, 0.08, 0.08]} />
            </mesh>
          </group>
        </group>
      )}

      {/* Check Glow Effect */}
      {isInCheck && type === 'k' && (
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 1.5, 32, 1, true]} />
          <meshBasicMaterial 
            color="#ef4444" 
            transparent 
            opacity={0.35} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}
    </group>
  );
};
