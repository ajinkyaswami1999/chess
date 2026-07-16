import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Deterministic pseudo-random in [0,1) from a seed, stable across re-renders (no Math.random jitter). */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type Vec3 = [number, number, number];
type ScaleProp = number | Vec3;

interface BaseProps {
  position: Vec3;
  rotation?: Vec3;
  scale?: ScaleProp;
}

// 1. Column — plinth + shaft + capital + accent ring. Used by wood, marble.
export const ColumnProp: React.FC<BaseProps & {
  shaftColor: string;
  accentColor: string;
  shaftHeight?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, shaftColor, accentColor, shaftHeight = 6 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.075, 0]} castShadow>
      <boxGeometry args={[0.9, 0.15, 0.9]} />
      <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.15 + shaftHeight / 2, 0]} castShadow>
      <cylinderGeometry args={[0.32, 0.32, shaftHeight, 12]} />
      <meshStandardMaterial color={shaftColor} roughness={0.4} metalness={0.05} />
    </mesh>
    <mesh position={[0, 0.15 + shaftHeight - 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.4, 0.06, 8, 16]} />
      <meshStandardMaterial color={accentColor} roughness={0.25} metalness={0.7} />
    </mesh>
    <mesh position={[0, 0.15 + shaftHeight + 0.1, 0]} castShadow>
      <boxGeometry args={[0.9, 0.2, 0.9]} />
      <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.6} />
    </mesh>
  </group>
);

// 2. Post lamp — pole + glowing orb, optional cage. Used by wood/marble (candle), steampunk (lamp), gothic (lantern).
export const PostLampProp: React.FC<BaseProps & {
  glowColor: string;
  height?: number;
  hasCage?: boolean;
}> = ({ position, rotation = [0, 0, 0], scale = 1, glowColor, height = 1.6, hasCage = false }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, height / 2, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.08, height, 8]} />
      <meshStandardMaterial color="#2b2b2b" roughness={0.5} metalness={0.6} />
    </mesh>
    <mesh position={[0, height + 0.15, 0]}>
      <sphereGeometry args={[0.15, 12, 12]} />
      <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1.8} toneMapped={false} />
    </mesh>
    <pointLight position={[0, height + 0.15, 0]} color={glowColor} intensity={0.6} distance={4} decay={2} />
    {hasCage && (
      <mesh position={[0, height + 0.15, 0]}>
        <torusGeometry args={[0.22, 0.02, 6, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.7} />
      </mesh>
    )}
  </group>
);

// 3. Ice spire — faceted translucent cone. Used by ice.
export const IceSpireProp: React.FC<BaseProps & {
  color: string;
  emissive: string;
  radius?: number;
  height?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, color, emissive, radius = 0.7, height = 4.5 }) => (
  <mesh position={[position[0], position[1] + height / 2, position[2]]} rotation={rotation} scale={scale} castShadow>
    <coneGeometry args={[radius, height, 6]} />
    <meshPhysicalMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={0.3}
      roughness={0.1}
      transmission={0.4}
      thickness={0.6}
      clearcoat={1.0}
    />
  </mesh>
);

// 4. Crystal shard cluster — hero prop for ice theme's distant backdrop.
export const CrystalShardProp: React.FC<BaseProps & { color: string; emissive: string }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color,
  emissive,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {[0, 1, 2, 3].map((i) => {
      const r = 0.4 + seededRandom(i * 1.7) * 0.5;
      const tilt = (seededRandom(i * 2.3) - 0.5) * 1.1;
      const yaw = (i / 4) * Math.PI * 2 + seededRandom(i * 3.1) * 0.6;
      const h = 1.4 + seededRandom(i * 4.3) * 1.6;
      return (
        <mesh
          key={i}
          position={[Math.cos(yaw) * 0.3, h / 2, Math.sin(yaw) * 0.3]}
          rotation={[tilt, yaw, tilt * 0.6]}
        >
          <icosahedronGeometry args={[r, 0]} />
          <meshPhysicalMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={0.5}
            roughness={0.05}
            transmission={0.6}
            thickness={0.5}
            clearcoat={1.0}
          />
        </mesh>
      );
    })}
  </group>
);

// 5. Rock spire — jagged stacked dodecahedrons. Used by volcanic (rocks), space (small scale = asteroids).
export const RockSpireProp: React.FC<BaseProps & { color: string; emissive?: string; seed?: number }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color,
  emissive,
  seed = 0,
}) => {
  const stacks = 3;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {Array.from({ length: stacks }).map((_, i) => {
        const size = (1.1 - i * 0.3) * (0.8 + seededRandom(seed + i) * 0.4);
        const y = i * 0.9 + size * 0.5;
        const yStretch = 1.5 + seededRandom(seed + i * 2.1) * 1.0;
        return (
          <mesh
            key={i}
            position={[
              (seededRandom(seed + i * 3.7) - 0.5) * 0.4,
              y,
              (seededRandom(seed + i * 5.3) - 0.5) * 0.4,
            ]}
            rotation={[
              seededRandom(seed + i * 6.1) * Math.PI,
              seededRandom(seed + i * 7.9) * Math.PI,
              seededRandom(seed + i * 8.5) * Math.PI,
            ]}
            scale={[1, yStretch, 1]}
            castShadow
          >
            <dodecahedronGeometry args={[size, 0]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={emissive ? 0.5 : 0}
              roughness={0.85}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Small-scale reuse of RockSpireProp as an asteroid (space theme).
export const AsteroidProp: React.FC<BaseProps & { color: string; emissive?: string; seed?: number }> = (props) => (
  <RockSpireProp {...props} />
);

// 6. Volcano — large cone with a lava-glow band near the tip. Distant hero for volcanic.
export const VolcanoProp: React.FC<BaseProps & {
  rockColor: string;
  lavaColor: string;
  radius?: number;
  height?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, rockColor, lavaColor, radius = 7, height = 12 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, height / 2, 0]} castShadow>
      <coneGeometry args={[radius, height, 24]} />
      <meshStandardMaterial color={rockColor} roughness={0.95} metalness={0.05} />
    </mesh>
    <mesh position={[0, height * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 0.16, radius * 0.05, 8, 20]} />
      <meshStandardMaterial color={lavaColor} emissive={lavaColor} emissiveIntensity={1.6} toneMapped={false} />
    </mesh>
  </group>
);

// 7. Tree — tapered trunk + stacked foliage cones. Used by forest.
export const TreeProp: React.FC<BaseProps & {
  trunkColor: string;
  foliageColor: string;
  bare?: boolean;
}> = ({ position, rotation = [0, 0, 0], scale = 1, trunkColor, foliageColor, bare = false }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 1.0, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.25, 2.0, 8]} />
      <meshStandardMaterial color={trunkColor} roughness={0.85} />
    </mesh>
    {!bare && (
      <>
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[0.9, 1.2, 10]} />
          <meshStandardMaterial color={foliageColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 2.8, 0]} castShadow>
          <coneGeometry args={[0.7, 1.2, 10]} />
          <meshStandardMaterial color={foliageColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 3.4, 0]} castShadow>
          <coneGeometry args={[0.5, 1.2, 10]} />
          <meshStandardMaterial color={foliageColor} roughness={0.7} />
        </mesh>
      </>
    )}
  </group>
);

// 8. Palm tree — leaning trunk + radial fronds. Used by desert.
export const PalmTreeProp: React.FC<BaseProps & { trunkColor: string; frondColor: string }> = ({
  position,
  rotation = [0, 0, 0.08],
  scale = 1,
  trunkColor,
  frondColor,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 1.7, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.18, 3.4, 8]} />
      <meshStandardMaterial color={trunkColor} roughness={0.8} />
    </mesh>
    {Array.from({ length: 6 }).map((_, i) => {
      const yaw = (i / 6) * Math.PI * 2;
      return (
        <group key={i} position={[0, 3.4, 0]} rotation={[0, yaw, 0]}>
          <mesh position={[0.7, -0.1, 0]} rotation={[0, 0, -0.35]} castShadow>
            <boxGeometry args={[1.4, 0.05, 0.25]} />
            <meshStandardMaterial color={frondColor} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// 9. Pyramid — 4-sided cone. Distant hero for desert.
export const PyramidProp: React.FC<BaseProps & { color: string; radius?: number; height?: number }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color,
  radius = 8,
  height = 9,
}) => (
  <mesh
    position={[position[0], position[1] + height / 2, position[2]]}
    rotation={[rotation[0], rotation[1] + Math.PI / 4, rotation[2]]}
    scale={scale}
    castShadow
  >
    <coneGeometry args={[radius, height, 4]} />
    <meshStandardMaterial color={color} roughness={0.9} />
  </mesh>
);

// 10. Dune mound — flattened sphere. Used by desert.
export const DuneMound: React.FC<BaseProps & { color: string }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color,
}) => {
  const s: Vec3 = typeof scale === 'number' ? [scale * 4, scale * 1.1, scale * 4] : scale;
  return (
    <mesh position={position} rotation={rotation} scale={s} receiveShadow>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
};

// 11. Gear wheel — torus + optional hub/teeth, slow spin. Used by steampunk.
export const GearWheelProp: React.FC<BaseProps & {
  color: string;
  accentColor: string;
  radius?: number;
  detailed?: boolean;
  spin?: boolean;
  reducedMotion?: boolean;
}> = ({ position, rotation = [0, 0, 0], scale = 1, color, accentColor, radius = 0.8, detailed = false, spin = true, reducedMotion = false }) => {
  const ref = useRef<THREE.Group>(null);
  const dir = useRef(seededRandom(position[0] + position[2]) > 0.5 ? 1 : -1);

  useFrame((_, delta) => {
    if (!spin || reducedMotion || !ref.current) return;
    ref.current.rotation.z += delta * 0.3 * dir.current;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <torusGeometry args={[radius, radius * 0.18, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.75} />
      </mesh>
      {detailed && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radius * 0.2, radius * 0.2, radius * 0.3, 12]} />
            <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.8} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}
                rotation={[0, 0, a]}
              >
                <boxGeometry args={[radius * 0.28, radius * 0.28, radius * 0.2]} />
                <meshStandardMaterial color={color} roughness={0.35} metalness={0.75} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// 12. Pipe — two cylinders meeting at a joint with rivets. Used by steampunk.
export const PipeProp: React.FC<BaseProps & { color: string; accentColor: string }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color,
  accentColor,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.8, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.2, 1.6, 10]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.8} />
    </mesh>
    <mesh position={[0.7, 1.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.2, 0.2, 1.4, 10]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.8} />
    </mesh>
    <mesh position={[0, 1.6, 0]}>
      <sphereGeometry args={[0.24, 10, 10]} />
      <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.85} />
    </mesh>
    {[0.5, 1.1].map((y, i) => (
      <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.21, 0.03, 6, 12]} />
        <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.85} />
      </mesh>
    ))}
  </group>
);

// 13. Smokestack — chimney with rivet bands and a heat-glow ring. Distant hero for steampunk.
export const SmokestackProp: React.FC<BaseProps & {
  color: string;
  glowColor: string;
  height?: number;
  radius?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, color, glowColor, height = 4, radius = 0.35 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.4, 0]} castShadow>
      <coneGeometry args={[radius * 1.6, 0.8, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.8 + height / 2, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
    </mesh>
    {[0.35, 0.65].map((f, i) => (
      <mesh key={i} position={[0, 0.8 + height * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.05, 0.04, 6, 16]} />
        <meshStandardMaterial color="#18120a" roughness={0.4} metalness={0.7} />
      </mesh>
    ))}
    <mesh position={[0, 0.8 + height * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 1.02, 0.05, 6, 16]} />
      <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1.4} toneMapped={false} />
    </mesh>
  </group>
);

// 14. Gothic spire — angular cone on a buttress base with a stained-glass accent ring. Used by gothic.
export const GothicSpireProp: React.FC<BaseProps & {
  color: string;
  accentColor: string;
  height?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, color, accentColor, height = 5 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[0.8, 1.0, 0.8]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
    <mesh position={[0, 1.0 + height / 2, 0]} castShadow>
      <coneGeometry args={[0.7, height, 4]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
    <mesh position={[0, 1.0 + height * 0.35, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
      <torusGeometry args={[0.42, 0.04, 6, 4]} />
      <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} toneMapped={false} />
    </mesh>
  </group>
);

// 15. Neon pylon — thin tower with glowing bands and a crown. Used by neon.
export const NeonPylonProp: React.FC<BaseProps & {
  bodyColor: string;
  bandColors: string[];
  height?: number;
  emissiveIntensity?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, bodyColor, bandColors, height = 6, emissiveIntensity = 1.5 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, height / 2, 0]} castShadow>
      <boxGeometry args={[0.4, height, 0.4]} />
      <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />
    </mesh>
    {bandColors.map((c, i) => {
      const y = height * ((i + 1) / (bandColors.length + 1));
      return (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.46, 0.12, 0.46]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>
      );
    })}
    <mesh position={[0, height + 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.3, 0.05, 6, 12]} />
      <meshStandardMaterial
        color={bandColors[0]}
        emissive={bandColors[0]}
        emissiveIntensity={emissiveIntensity}
        toneMapped={false}
      />
    </mesh>
  </group>
);

// 16. Planet — sphere with an optional tilted ring. Distant hero (+moons) for space.
export const PlanetProp: React.FC<BaseProps & {
  color: string;
  hasRing?: boolean;
  ringColor?: string;
  radius?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1, color, hasRing = false, ringColor, radius = 3 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh castShadow>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.7} />
    </mesh>
    {hasRing && (
      <mesh rotation={[Math.PI / 2.4, 0, 0.4]}>
        <torusGeometry args={[radius * 1.6, radius * 0.08, 8, 32]} />
        <meshStandardMaterial
          color={ringColor ?? color}
          emissive={ringColor ?? color}
          emissiveIntensity={0.4}
          roughness={0.5}
        />
      </mesh>
    )}
  </group>
);
