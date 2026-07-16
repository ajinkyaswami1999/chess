import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';
import { ProceduralPieces, squareToVector3 } from '../pieces/ProceduralPieces';

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
  whiteSquareMat: THREE.Material;
  blackSquareMat: THREE.Material;
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
  whiteSquareMat,
  blackSquareMat,
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
  const boardTheme = useChessStore((state) => state.settings.boardTheme || 'marble');

  const boardMaterials = useMemo(() => {
    const createMat = (params: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(params);

    switch (boardTheme) {
      case 'wood':
        return {
          whiteSquare: createMat({ color: '#d7a15c', roughness: 0.25, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.1 }),
          blackSquare: createMat({ color: '#3d2314', roughness: 0.35, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.15 }),
          frame: createMat({ color: '#1c0d06', roughness: 0.4, metalness: 0.0 }),
          border: createMat({ color: '#c59b27', metalness: 0.8, roughness: 0.2, clearcoat: 0.5 }),
          table: createMat({ color: '#160904', roughness: 0.15, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
        };
      case 'ice':
        return {
          whiteSquare: createMat({ color: '#e0f7fc', roughness: 0.05, metalness: 0.1, transmission: 0.4, thickness: 0.5, clearcoat: 1.0, reflectivity: 0.9 }),
          blackSquare: createMat({ color: '#1e3a8a', roughness: 0.1, metalness: 0.2, transmission: 0.5, thickness: 0.5, clearcoat: 1.0, reflectivity: 0.9 }),
          frame: createMat({ color: '#f1f5f9', roughness: 0.5, metalness: 0.1 }),
          border: createMat({ color: '#22d3ee', roughness: 0.1, emissive: '#0891b2', clearcoat: 0.8 }),
          table: createMat({ color: '#091220', roughness: 0.02, metalness: 0.8, clearcoat: 1.0, reflectivity: 0.95, transmission: 0.3, thickness: 1.0 }),
        };
      case 'volcanic':
        return {
          whiteSquare: createMat({ color: '#4b5563', roughness: 0.8, metalness: 0.1 }),
          blackSquare: createMat({ color: '#111827', roughness: 0.7, emissive: '#ea580c', emissiveIntensity: 1.2 }),
          frame: createMat({ color: '#030712', roughness: 0.15, metalness: 0.3, clearcoat: 0.5 }),
          border: createMat({ color: '#ea580c', metalness: 0.5, roughness: 0.3, emissive: '#ea580c' }),
          table: createMat({ color: '#050302', roughness: 0.85, metalness: 0.1 }),
        };
      case 'forest':
        return {
          whiteSquare: createMat({ color: '#d1fae5', roughness: 0.4, clearcoat: 0.1 }),
          blackSquare: createMat({ color: '#064e3b', roughness: 0.6, clearcoat: 0.1 }),
          frame: createMat({ color: '#14532d', roughness: 0.8 }),
          border: createMat({ color: '#10b981', metalness: 0.7, roughness: 0.3 }),
          table: createMat({ color: '#091c0e', roughness: 0.9 }),
        };
      case 'space':
        return {
          whiteSquare: createMat({ color: '#1e1b4b', roughness: 0.05, metalness: 0.8, clearcoat: 1.0, reflectivity: 0.9 }),
          blackSquare: createMat({ color: '#030712', roughness: 0.05, metalness: 0.9, clearcoat: 1.0, reflectivity: 0.9 }),
          frame: createMat({ color: '#111827', roughness: 0.3, metalness: 0.6 }),
          border: createMat({ color: '#06b6d4', roughness: 0.1, emissive: '#3b82f6', emissiveIntensity: 1.5 }),
          table: createMat({ color: '#07080f', metalness: 0.95, roughness: 0.2, clearcoat: 0.5 }),
        };
      case 'steampunk':
        return {
          whiteSquare: createMat({ color: '#d97706', metalness: 0.8, roughness: 0.2, clearcoat: 0.5 }),
          blackSquare: createMat({ color: '#27272a', metalness: 0.9, roughness: 0.3, clearcoat: 0.5 }),
          frame: createMat({ color: '#18181b', metalness: 0.9, roughness: 0.4 }),
          border: createMat({ color: '#ea580c', metalness: 0.9, roughness: 0.2, clearcoat: 0.8 }),
          table: createMat({ color: '#100c08', metalness: 0.9, roughness: 0.4 }),
        };
      case 'desert':
        return {
          whiteSquare: createMat({ color: '#fef08a', roughness: 0.6 }),
          blackSquare: createMat({ color: '#b45309', roughness: 0.5 }),
          frame: createMat({ color: '#d97706', roughness: 0.7 }),
          border: createMat({ color: '#eab308', metalness: 0.8, roughness: 0.2 }),
          table: createMat({ color: '#c2935c', roughness: 0.8 }),
        };
      case 'gothic':
        return {
          whiteSquare: createMat({ color: '#9ca3af', roughness: 0.5, clearcoat: 0.1 }),
          blackSquare: createMat({ color: '#374151', roughness: 0.6, clearcoat: 0.1 }),
          frame: createMat({ color: '#1f2937', metalness: 0.8, roughness: 0.5 }),
          border: createMat({ color: '#6b7280', metalness: 0.8, roughness: 0.3 }),
          table: createMat({ color: '#1c1e22', roughness: 0.7 }),
        };
      case 'neon':
        return {
          whiteSquare: createMat({ color: '#111111', roughness: 0.05, clearcoat: 1.0, emissive: '#db2777', emissiveIntensity: 1.2 }),
          blackSquare: createMat({ color: '#000000', roughness: 0.05, clearcoat: 1.0, emissive: '#7c3aed', emissiveIntensity: 1.2 }),
          frame: createMat({ color: '#09090b', roughness: 0.5 }),
          border: createMat({ color: '#ff007f', metalness: 0.2, roughness: 0.1, emissive: '#d946ef', emissiveIntensity: 1.5 }),
          table: createMat({ color: '#020005', metalness: 0.95, roughness: 0.05, clearcoat: 1.0 }),
        };
      case 'marble':
      default:
        return {
          whiteSquare: createMat({ color: '#ece8e0', roughness: 0.1, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 0.8 }),
          blackSquare: createMat({ color: '#342114', roughness: 0.25, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.15, reflectivity: 0.5 }),
          frame: createMat({ color: '#21130a', roughness: 0.35, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
          border: createMat({ color: '#d4af37', metalness: 0.9, roughness: 0.15, clearcoat: 1.0 }),
          table: createMat({ color: '#0d0805', roughness: 0.15, clearcoat: 0.8 }),
        };
    }
  }, [boardTheme]);

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
      {/* Table surface underneath the board */}
      <mesh position={[0, -0.315, 0]} receiveShadow material={boardMaterials.table}>
        <boxGeometry args={[32, 0.02, 32]} />
      </mesh>

      {/* 1. Main Wood Border Frame */}
      <mesh position={[0, -0.16, 0]} receiveShadow castShadow material={boardMaterials.frame}>
        <boxGeometry args={[8.8, 0.3, 8.8]} />
      </mesh>

      {/* Gold Inner Bevel Rim */}
      <mesh position={[0, -0.05, 0]} material={boardMaterials.border}>
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
            whiteSquareMat={boardMaterials.whiteSquare}
            blackSquareMat={boardMaterials.blackSquare}
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
