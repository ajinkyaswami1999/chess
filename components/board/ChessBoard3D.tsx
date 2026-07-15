import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';
import { ProceduralPieces, squareToVector3 } from '../pieces/ProceduralPieces';

// Materials for board
const whiteSquareMat = new THREE.MeshPhysicalMaterial({
  color: '#ece8e0',
  roughness: 0.1,
  metalness: 0.05,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  reflectivity: 0.8
});

const blackSquareMat = new THREE.MeshPhysicalMaterial({
  color: '#342114',
  roughness: 0.25,
  metalness: 0.0,
  clearcoat: 0.7,
  clearcoatRoughness: 0.15,
  reflectivity: 0.5
});

const frameWoodMat = new THREE.MeshPhysicalMaterial({
  color: '#21130a',
  roughness: 0.35,
  metalness: 0.05,
  clearcoat: 0.5,
  clearcoatRoughness: 0.2
});

const frameGoldMat = new THREE.MeshPhysicalMaterial({
  color: '#d4af37',
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1.0
});

// Single Square Component to handle individual entrance animations
const Square3D: React.FC<{
  x: number;
  z: number;
  isDark: boolean;
  squareName: string;
  isSelected: boolean;
  isLastMove: boolean;
  isLegalTarget: boolean;
  isChecking: boolean;
  reducedMotion: boolean;
  onClick: () => void;
}> = ({
  x,
  z,
  isDark,
  squareName,
  isSelected,
  isLastMove,
  isLegalTarget,
  isChecking,
  reducedMotion,
  onClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const entranceProgress = useRef(0);
  const initialY = useMemo(() => -3.0 - Math.random() * 2.0, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Entrance Animation (slide up and scale)
    if (entranceProgress.current < 1.0) {
      const staggerDelay = (x + 3.5 + (3.5 - z)) * 0.07;
      if (state.clock.getElapsedTime() > staggerDelay) {
        const speed = reducedMotion ? 12 : 3.5;
        entranceProgress.current = Math.min(1.0, entranceProgress.current + delta * speed);
        
        // Easing out curve
        const ease = 1 - Math.pow(1 - entranceProgress.current, 3);
        const curY = THREE.MathUtils.lerp(initialY, 0, ease);
        const curScaleY = THREE.MathUtils.lerp(0.01, 1.0, ease);
        
        meshRef.current.position.y = curY;
        meshRef.current.scale.set(1.0, curScaleY, 1.0);
      } else {
        meshRef.current.position.y = initialY;
        meshRef.current.scale.set(1.0, 0.01, 1.0);
      }
    } else {
      // Hover scaling & selection glows
      const targetY = hovered && !isSelected ? 0.05 : 0;
      if (Math.abs(meshRef.current.position.y - targetY) > 0.001) {
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 12 * delta);
      } else {
        meshRef.current.position.y = targetY; // Lock to exact target
      }
    }
  });

  // Calculate material based on states
  const baseMaterial = isDark ? blackSquareMat : whiteSquareMat;

  return (
    <mesh
      ref={meshRef}
      position={[x, 0, z]}
      castShadow
      receiveShadow
      material={baseMaterial}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      <boxGeometry args={[0.96, 0.2, 0.96]} />
      
      {/* Selected Square Gold Overlay */}
      {isSelected && (
        <mesh position={[0, 0.105, 0]}>
          <boxGeometry args={[0.96, 0.01, 0.96]} />
          <meshBasicMaterial color="#e5c158" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Last Move Overlay */}
      {isLastMove && !isSelected && (
        <mesh position={[0, 0.102, 0]}>
          <boxGeometry args={[0.96, 0.008, 0.96]} />
          <meshBasicMaterial color="#d4af37" transparent opacity={0.25} />
        </mesh>
      )}

      {/* Checking glow */}
      {isChecking && (
        <mesh position={[0, 0.108, 0]}>
          <boxGeometry args={[0.96, 0.015, 0.96]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Legal Move Circle Dot Indicator */}
      {isLegalTarget && (
        <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.16, 32]} />
          <meshBasicMaterial color="#d4af37" side={THREE.DoubleSide} />
        </mesh>
      )}
    </mesh>
  );
};

export const ChessBoard3D: React.FC = () => {
  const { fen, selectedSquare, possibleMoves, lastMove, checkingSquares, pieces } = useChessStore();
  const selectSquare = useChessStore((state) => state.selectSquare);
  const reducedMotion = useChessStore((state) => state.settings.reducedMotion);
  const showCoordinates = useChessStore((state) => state.settings.showCoordinates);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Flattened grid of squares
  const squares = useMemo(() => {
    const list = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const squareName = files[c] + ranks[r];
        const isDark = (r + c) % 2 === 0;
        const x = c - 3.5;
        const z = (7 - r) - 3.5;
        list.push({ c, r, x, z, isDark, squareName });
      }
    }
    return list;
  }, []);



  return (
    <group position={[0, -0.1, 0]}>
      {/* 1. Main Wood Border Frame */}
      <mesh position={[0, -0.16, 0]} receiveShadow castShadow material={frameWoodMat}>
        <boxGeometry args={[8.8, 0.3, 8.8]} />
      </mesh>

      {/* Gold Inner Bevel Rim */}
      <mesh position={[0, -0.05, 0]} material={frameGoldMat}>
        <boxGeometry args={[8.06, 0.12, 8.06]} />
      </mesh>

      {/* Base slab underneath board */}
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[8.0, 0.05, 8.0]} />
        <meshBasicMaterial color="#1a110a" />
      </mesh>

      {/* 2. Render Board Squares */}
      {squares.map((sq) => {
        const isSelected = selectedSquare === sq.squareName;
        const isLastMove = lastMove !== null && (lastMove.from === sq.squareName || lastMove.to === sq.squareName);
        const isLegalTarget = possibleMoves.includes(sq.squareName);
        const isChecking = checkingSquares.includes(sq.squareName);

        return (
          <Square3D
            key={sq.squareName}
            x={sq.x}
            z={sq.z}
            isDark={sq.isDark}
            squareName={sq.squareName}
            isSelected={isSelected}
            isLastMove={isLastMove}
            isLegalTarget={isLegalTarget}
            isChecking={isChecking}
            reducedMotion={reducedMotion}
            onClick={() => selectSquare(sq.squareName)}
          />
        );
      })}

      {/* 3. Render Coordinate Text on Frame */}
      {showCoordinates && (
        <React.Suspense fallback={null}>
          <group position={[0, 0.02, 0]}>
            {/* File Labels (A - H) on Bottom/Top borders */}
            {files.map((file, idx) => {
              const x = idx - 3.5;
              return (
                <group key={file}>
                  {/* Bottom Border */}
                  <Text
                    position={[x, 0, 4.22]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    fontSize={0.22}
                    color="#d4af37"
                  >
                    {file.toUpperCase()}
                  </Text>
                  {/* Top Border */}
                  <Text
                    position={[x, 0, -4.22]}
                    rotation={[-Math.PI / 2, 0, Math.PI]}
                    fontSize={0.22}
                    color="#d4af37"
                  >
                    {file.toUpperCase()}
                  </Text>
                </group>
              );
            })}

            {/* Rank Labels (1 - 8) on Left/Right borders */}
            {ranks.map((rank, idx) => {
              const z = (7 - idx) - 3.5;
              return (
                <group key={rank}>
                  {/* Left Border */}
                  <Text
                    position={[-4.22, 0, z]}
                    rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                    fontSize={0.22}
                    color="#d4af37"
                  >
                    {rank}
                  </Text>
                  {/* Right Border */}
                  <Text
                    position={[4.22, 0, z]}
                    rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                    fontSize={0.22}
                    color="#d4af37"
                  >
                    {rank}
                  </Text>
                </group>
              );
            })}
          </group>
        </React.Suspense>
      )}

      {/* 4. Render Active Pieces */}
      {pieces.map((piece) => {
        const isSelected = selectedSquare === piece.square;
        const isLegalTarget = possibleMoves.includes(piece.square);
        const isInCheck = checkingSquares.includes(piece.square);

        return (
          <ProceduralPieces
            key={piece.id}
            type={piece.type}
            color={piece.color as any}
            square={piece.square}
            isSelected={isSelected}
            isLegalMoveTarget={isLegalTarget}
            isInCheck={isInCheck}
            reducedMotion={reducedMotion}
            onClick={() => selectSquare(piece.square)}
          />
        );
      })}
    </group>
  );
};
export default ChessBoard3D;
