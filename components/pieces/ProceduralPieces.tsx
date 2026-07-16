import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';

interface PieceProps {
  type: string; // 'p' | 'r' | 'n' | 'b' | 'q' | 'k'
  color: 'w' | 'b';
  square: string; // e.g. "e4"
  isSelected: boolean;
  isLegalMoveTarget: boolean;
  isInCheck: boolean;
  reducedMotion: boolean;
  onClick?: () => void;
}

// Per piece-set silhouette: overall proportions, lathe/ring faceting, and topper shapes —
// so sets read as genuinely different sculpts, not just recolored Staunton pieces.
type FinialShape = 'sphere' | 'icosahedron' | 'cone' | 'dodecahedron';
type CrenellationShape = 'box' | 'cone' | 'cylinder' | 'dodecahedron' | 'icosahedron' | 'dome';

interface ThemeShapeConfig {
  scale: [number, number, number];
  segments: number;
  headShape: FinialShape;
  crenellationShape: CrenellationShape;
  bevelSegments: number;
}

const THEME_SHAPE: Record<string, ThemeShapeConfig> = {
  staunton: { scale: [1, 1, 1], segments: 32, headShape: 'sphere', crenellationShape: 'box', bevelSegments: 3 },
  gold: { scale: [1.05, 1.06, 1.05], segments: 32, headShape: 'sphere', crenellationShape: 'box', bevelSegments: 4 },
  glass: { scale: [1, 1, 1], segments: 7, headShape: 'icosahedron', crenellationShape: 'icosahedron', bevelSegments: 1 },
  dark_knight: { scale: [0.92, 1.16, 0.92], segments: 10, headShape: 'cone', crenellationShape: 'cone', bevelSegments: 1 },
  jade: { scale: [1.18, 0.9, 1.18], segments: 32, headShape: 'sphere', crenellationShape: 'dome', bevelSegments: 4 },
  rose_gold: { scale: [0.9, 1.14, 0.9], segments: 32, headShape: 'sphere', crenellationShape: 'box', bevelSegments: 4 },
  steampunk: { scale: [1.12, 0.94, 1.12], segments: 16, headShape: 'sphere', crenellationShape: 'cylinder', bevelSegments: 2 },
  ice: { scale: [1, 1.08, 1], segments: 6, headShape: 'icosahedron', crenellationShape: 'icosahedron', bevelSegments: 1 },
  lava: { scale: [1.25, 0.85, 1.25], segments: 9, headShape: 'dodecahedron', crenellationShape: 'dodecahedron', bevelSegments: 1 },
  wood_carved: { scale: [1.15, 0.93, 1.15], segments: 12, headShape: 'sphere', crenellationShape: 'dome', bevelSegments: 3 },
};

function FinialGeometry({ shape, size, segments }: { shape: FinialShape; size: number; segments: number }) {
  switch (shape) {
    case 'icosahedron':
      return <icosahedronGeometry args={[size, 0]} />;
    case 'cone':
      return <coneGeometry args={[size * 0.9, size * 1.8, Math.max(4, Math.min(segments, 8))]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={[size, 0]} />;
    case 'sphere':
    default:
      return <sphereGeometry args={[size, Math.max(8, segments), Math.max(8, segments)]} />;
  }
}

function CrenellationGeometry({ shape, size }: { shape: CrenellationShape; size: number }) {
  switch (shape) {
    case 'cone':
      return <coneGeometry args={[size * 0.8, size * 1.5, 6]} />;
    case 'cylinder':
      return <cylinderGeometry args={[size * 0.55, size * 0.55, size * 1.3, 10]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={[size * 0.8, 0]} />;
    case 'icosahedron':
      return <icosahedronGeometry args={[size * 0.8, 0]} />;
    case 'dome':
      return <sphereGeometry args={[size * 0.75, 12, 8]} />;
    case 'box':
    default:
      return <boxGeometry args={[size, size * 0.85, size]} />;
  }
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

export const ProceduralPieces: React.FC<PieceProps> = ({
  type,
  color,
  square,
  isSelected,
  isLegalMoveTarget,
  isInCheck,
  reducedMotion,
  onClick
}) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Track visual position for animations
  const targetPos = useMemo(() => squareToVector3(square), [square]);
  const currentPos = useRef<THREE.Vector3>(targetPos.clone());
  
  // Capture movement state
  const isMoving = useRef(false);
  const moveProgress = useRef(0);
  const moveStartPos = useRef<THREE.Vector3>(targetPos.clone());

  const pieceTheme = useChessStore((state) => state.settings.pieceTheme || 'staunton');
  const shapeConfig = THEME_SHAPE[pieceTheme] || THEME_SHAPE.staunton;
  const ringSegments = Math.max(8, shapeConfig.segments);

  const materials = useMemo(() => {
    const createMat = (params: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(params);

    switch (pieceTheme) {
      case 'gold':
        return {
          white: createMat({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 }), // Platinum/Silver
          black: createMat({ color: '#e5c158', metalness: 0.95, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 }), // Gold
          accent: createMat({ color: '#3f3f46', metalness: 0.9, roughness: 0.2, clearcoat: 0.5 }), // Dark chrome
        };
      case 'glass':
        return {
          white: createMat({ color: '#ffffff', transmission: 0.9, thickness: 0.8, roughness: 0.1, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 }), // Frosted glass
          black: createMat({ color: '#1f2937', transmission: 0.85, thickness: 0.8, roughness: 0.15, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 }), // Smoked glass
          accent: createMat({ color: '#e4e4e7', metalness: 0.95, roughness: 0.1, clearcoat: 1.0 }), // Chrome
        };
      case 'dark_knight':
        return {
          white: createMat({ color: '#e2e8f0', metalness: 0.9, roughness: 0.15, clearcoat: 0.8 }), // Polished steel
          black: createMat({ color: '#111827', metalness: 0.8, roughness: 0.45, clearcoat: 0.1 }), // Matte black metal
          accent: createMat({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1 }), // Steel
        };
      case 'jade':
        return {
          white: createMat({ color: '#f5f5f0', roughness: 0.15, transmission: 0.25, thickness: 0.3, clearcoat: 0.8 }), // White jade
          black: createMat({ color: '#047857', roughness: 0.12, transmission: 0.25, thickness: 0.3, clearcoat: 0.8 }), // Green jade
          accent: createMat({ color: '#f59e0b', metalness: 0.85, roughness: 0.2, clearcoat: 0.5 }), // Gold
        };
      case 'rose_gold':
        return {
          white: createMat({ color: '#fda4af', metalness: 0.9, roughness: 0.15, clearcoat: 0.8 }), // Rose gold
          black: createMat({ color: '#334155', metalness: 0.95, roughness: 0.1, clearcoat: 0.5 }), // Hematite steel
          accent: createMat({ color: '#fda4af', metalness: 0.95, roughness: 0.15 }), // Rose gold
        };
      case 'steampunk':
        return {
          white: createMat({ color: '#ca8a04', metalness: 0.8, roughness: 0.3, clearcoat: 0.3 }), // Antique brass
          black: createMat({ color: '#1e293b', metalness: 0.85, roughness: 0.4, clearcoat: 0.2 }), // Oiled iron
          accent: createMat({ color: '#ea580c', metalness: 0.9, roughness: 0.2, clearcoat: 0.5 }), // Copper
        };
      case 'ice':
        return {
          white: createMat({ color: '#e0f2fe', transmission: 0.65, thickness: 0.4, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1 }), // Snow crystal
          black: createMat({ color: '#0284c7', transmission: 0.75, thickness: 0.4, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05, emissive: '#0369a1', emissiveIntensity: 0.3 }), // Deep ice
          accent: createMat({ color: '#38bdf8', metalness: 0.5, roughness: 0.1, emissive: '#0ea5e9', emissiveIntensity: 0.8 }), // Glowing cyan
        };
      case 'lava':
        return {
          white: createMat({ color: '#9ca3af', roughness: 0.7, metalness: 0.0 }), // Granite
          black: createMat({ color: '#111827', roughness: 0.6, metalness: 0.1, emissive: '#ea580c', emissiveIntensity: 1.2 }), // Lava basalt
          accent: createMat({ color: '#ef4444', roughness: 0.3, emissive: '#ef4444', emissiveIntensity: 1.5 }), // Lava
        };
      case 'wood_carved':
        return {
          white: createMat({ color: '#eab308', roughness: 0.45, clearcoat: 0.2 }), // Cherry/Maple
          black: createMat({ color: '#451a03', roughness: 0.45, clearcoat: 0.2 }), // Walnut
          accent: createMat({ color: '#b45309', roughness: 0.35, clearcoat: 0.3 }), // Mahogany
        };
      case 'staunton':
      default:
        return {
          white: createMat({ color: '#fcfbfa', roughness: 0.12, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 0.9 }), // Ivory white
          black: createMat({ color: '#1a100a', roughness: 0.28, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2, reflectivity: 0.4 }), // Ebony
          accent: createMat({ color: '#d4af37', metalness: 0.9, roughness: 0.15, clearcoat: 1.0 }), // Brass
        };
    }
  }, [pieceTheme]);

  // Detect when square changes to trigger a lift-and-move Bezier arc
  useEffect(() => {
    if (!currentPos.current.equals(targetPos)) {
      isMoving.current = true;
      moveProgress.current = 0;
      moveStartPos.current.copy(currentPos.current);
    }
  }, [targetPos]);

  // Material choice
  const activeMaterial = color === 'w' ? materials.white : materials.black;
  const goldMaterial = materials.accent;

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
      bevelSegments: shapeConfig.bevelSegments
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
  }, [shapeConfig.bevelSegments]);

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
    <group 
      ref={meshRef} 
      position={targetPos}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* 1. Pawn */}
      {type === 'p' && (
        <group scale={shapeConfig.scale}>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.pawnPoints, shapeConfig.segments]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.44, 0]} material={goldMaterial}>
            <torusGeometry args={[0.15, 0.025, 8, ringSegments]} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.8, 0]} material={activeMaterial}>
            <FinialGeometry shape={shapeConfig.headShape} size={0.22} segments={shapeConfig.segments} />
          </mesh>
        </group>
      )}

      {/* 2. Bishop */}
      {type === 'b' && (
        <group scale={shapeConfig.scale}>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.bishopPoints, shapeConfig.segments]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.62, 0]} material={goldMaterial}>
            <torusGeometry args={[0.16, 0.03, 8, ringSegments]} />
          </mesh>
          {/* Head crown */}
          <mesh position={[0, 1.20, 0]} material={activeMaterial}>
            <FinialGeometry shape={shapeConfig.headShape} size={0.16} segments={shapeConfig.segments} />
          </mesh>
          {/* Bishop finial tip (gold) */}
          <mesh position={[0, 1.4, 0]} material={goldMaterial}>
            <FinialGeometry shape={shapeConfig.headShape} size={0.05} segments={shapeConfig.segments} />
          </mesh>
        </group>
      )}

      {/* 3. Knight */}
      {type === 'n' && (
        <group scale={shapeConfig.scale}>
          {/* Circular base */}
          <mesh material={activeMaterial}>
            <cylinderGeometry args={[0.34, 0.36, 0.16, shapeConfig.segments]} />
          </mesh>
          {/* Gold base ring */}
          <mesh position={[0, 0.08, 0]} material={goldMaterial}>
            <torusGeometry args={[0.32, 0.03, 8, ringSegments]} />
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
        <group scale={shapeConfig.scale}>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.rookPoints, shapeConfig.segments]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.74, 0]} material={goldMaterial}>
            <torusGeometry args={[0.26, 0.03, 8, ringSegments]} />
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
                  <CrenellationGeometry shape={shapeConfig.crenellationShape} size={0.12} />
                </mesh>
              );
            })}
          </group>
        </group>
      )}

      {/* 5. Queen */}
      {type === 'q' && (
        <group scale={shapeConfig.scale}>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.queenPoints, shapeConfig.segments]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.84, 0]} material={goldMaterial}>
            <torusGeometry args={[0.2, 0.035, 8, ringSegments]} />
          </mesh>
          {/* Coronet pearls (tiny gems surrounding the crown) */}
          <group position={[0, 1.34, 0]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i * Math.PI) / 4;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * 0.28, 0.02, Math.sin(angle) * 0.28]}
                  material={goldMaterial}
                >
                  <FinialGeometry shape={shapeConfig.headShape} size={0.04} segments={shapeConfig.segments} />
                </mesh>
              );
            })}
          </group>
          {/* Tiny center crown pearl */}
          <mesh position={[0, 1.44, 0]} material={goldMaterial}>
            <FinialGeometry shape={shapeConfig.headShape} size={0.06} segments={shapeConfig.segments} />
          </mesh>
        </group>
      )}

      {/* 6. King */}
      {type === 'k' && (
        <group scale={shapeConfig.scale}>
          <mesh material={activeMaterial}>
            <latheGeometry args={[geometries.kingPoints, shapeConfig.segments]} />
          </mesh>
          {/* Gold collar */}
          <mesh position={[0, 0.94, 0]} material={goldMaterial}>
            <torusGeometry args={[0.22, 0.035, 8, ringSegments]} />
          </mesh>
          {/* Crown band */}
          <mesh position={[0, 1.38, 0]} material={goldMaterial}>
            <torusGeometry args={[0.24, 0.025, 8, ringSegments]} />
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
