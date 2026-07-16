import React, { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { useChessStore } from '../store/chessStore';
import {
  seededRandom,
  ColumnProp,
  PostLampProp,
  IceSpireProp,
  CrystalShardProp,
  RockSpireProp,
  AsteroidProp,
  VolcanoProp,
  TreeProp,
  PalmTreeProp,
  PyramidProp,
  DuneMound,
  GearWheelProp,
  PipeProp,
  SmokestackProp,
  GothicSpireProp,
  NeonPylonProp,
  PlanetProp,
} from './EnvironmentProps';

type Vec3 = [number, number, number];

interface RingSite {
  position: Vec3;
  rotationY: number;
  seed: number;
}

/** Evenly-spaced ring of sites around the board, with small deterministic jitter so it doesn't look mechanical. */
function ringLayout(count: number, radius: number, seedOffset = 0): RingSite[] {
  const sites: RingSite[] = [];
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const jitterR = (seededRandom(i * 7.13 + seedOffset) - 0.5) * radius * 0.12;
    const jitterAngle = (seededRandom(i * 3.71 + seedOffset + 100) - 0.5) * 0.3;
    const r = radius + jitterR;
    const a = baseAngle + jitterAngle;
    sites.push({
      position: [Math.cos(a) * r, 0, Math.sin(a) * r],
      rotationY: seededRandom(i * 5.19 + seedOffset + 200) * Math.PI * 2,
      seed: i + seedOffset,
    });
  }
  return sites;
}

const GROUND_COLORS: Record<string, string> = {
  wood: '#2c1c0f',
  marble: '#2c1c0f',
  ice: '#0c1a30',
  volcanic: '#1c0500',
  forest: '#051805',
  space: '#050518',
  steampunk: '#18120a',
  desert: '#241a10',
  gothic: '#111317',
  neon: '#0f021c',
  default: '#2c1c0f',
};

export const ThemeEnvironment: React.FC = () => {
  const boardTheme = useChessStore((state) => state.settings.boardTheme || 'marble');
  const reducedMotion = useChessStore((state) => state.settings.reducedMotion);

  const groundColor = GROUND_COLORS[boardTheme] || GROUND_COLORS.default;

  const content = useMemo(() => {
    switch (boardTheme) {
      case 'wood': {
        const near = ringLayout(8, 12);
        const lamps = ringLayout(4, 11, 50);
        const distant = ringLayout(3, 22, 300);
        return (
          <>
            {near.map((s) => (
              <ColumnProp key={`c-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} shaftColor="#3d2314" accentColor="#d4af37" shaftHeight={6} />
            ))}
            {lamps.map((s) => (
              <PostLampProp key={`l-${s.seed}`} position={s.position} height={0.5} glowColor="#ffab40" />
            ))}
            {distant.map((s) => (
              <ColumnProp key={`d-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={1.6} shaftColor="#241408" accentColor="#a8821a" shaftHeight={6} />
            ))}
          </>
        );
      }
      case 'marble': {
        const near = ringLayout(8, 13);
        const lamps = ringLayout(4, 12, 50);
        const distant = ringLayout(3, 24, 300);
        return (
          <>
            {near.map((s) => (
              <ColumnProp key={`c-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} shaftColor="#e8e4da" accentColor="#d4af37" shaftHeight={6.5} />
            ))}
            {lamps.map((s) => (
              <PostLampProp key={`l-${s.seed}`} position={s.position} height={0.5} glowColor="#e5c158" />
            ))}
            {distant.map((s) => (
              <ColumnProp key={`d-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={1.8} shaftColor="#f5f2ea" accentColor="#d4af37" shaftHeight={6.5} />
            ))}
          </>
        );
      }
      case 'ice': {
        const near = ringLayout(8, 13);
        const small = ringLayout(4, 15, 50);
        const distant = ringLayout(2, 28, 300);
        return (
          <>
            {near.map((s) => (
              <IceSpireProp key={`i-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} color="#cdeffd" emissive="#38bdf8" radius={0.7 + seededRandom(s.seed) * 0.3} height={4 + seededRandom(s.seed + 1) * 2} />
            ))}
            {small.map((s) => (
              <IceSpireProp key={`s-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={0.6} color="#cdeffd" emissive="#38bdf8" />
            ))}
            <CrystalShardProp position={[0, 0, -24]} color="#bee9fb" emissive="#7dd3fc" scale={1.4} />
            {distant.map((s) => (
              <IceSpireProp key={`d-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={2} color="#dff4fc" emissive="#7dd3fc" />
            ))}
          </>
        );
      }
      case 'volcanic': {
        const near = ringLayout(10, 12);
        const distant = ringLayout(2, 26, 300);
        return (
          <>
            {near.map((s) => (
              <RockSpireProp key={`r-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} color="#1c1917" emissive="#ea580c" seed={s.seed} />
            ))}
            <VolcanoProp position={[0, 0, -30]} rockColor="#1c0500" lavaColor="#f97316" />
            {distant.map((s) => (
              <RockSpireProp key={`d-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={2.5} color="#0d0b0a" emissive="#ea580c" seed={s.seed} />
            ))}
          </>
        );
      }
      case 'forest': {
        const near = ringLayout(14, 13);
        const distant = ringLayout(3, 27, 300);
        return (
          <>
            {near.map((s, i) => (
              <TreeProp
                key={`t-${s.seed}`}
                position={s.position}
                rotation={[0, s.rotationY, 0]}
                scale={0.85 + seededRandom(s.seed) * 0.3}
                trunkColor="#3d2817"
                foliageColor={i % 2 === 0 ? '#10b981' : '#064e3b'}
              />
            ))}
            {distant.map((s) => (
              <TreeProp key={`d-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={1.8} trunkColor="#1c140d" foliageColor="#065f46" />
            ))}
          </>
        );
      }
      case 'space': {
        const near = ringLayout(16, 15);
        const moons = ringLayout(2, 32, 300);
        return (
          <>
            <Stars radius={100} depth={50} count={reducedMotion ? 2000 : 4000} factor={4} fade speed={reducedMotion ? 0 : 0.5} />
            {near.map((s) => (
              <AsteroidProp
                key={`a-${s.seed}`}
                position={[s.position[0], seededRandom(s.seed + 9) * 2 - 1, s.position[2]]}
                rotation={[0, s.rotationY, 0]}
                scale={0.3 + seededRandom(s.seed) * 0.2}
                color="#1e1b4b"
                seed={s.seed}
              />
            ))}
            <PlanetProp position={[6, 6, -30]} radius={4} color="#6d28d9" hasRing ringColor="#a855f7" />
            {moons.map((s) => (
              <PlanetProp key={`m-${s.seed}`} position={[s.position[0], 4 + seededRandom(s.seed) * 3, s.position[2]]} radius={1.2} color="#312e81" />
            ))}
          </>
        );
      }
      case 'steampunk': {
        const gears = ringLayout(6, 12);
        const pipes = ringLayout(3, 13, 50);
        const lamps = ringLayout(3, 11, 100);
        const stacks = ringLayout(2, 24, 300);
        return (
          <>
            {gears.map((s, i) => (
              <GearWheelProp
                key={`g-${s.seed}`}
                position={[s.position[0], 1.2 + seededRandom(s.seed) * 0.6, s.position[2]]}
                radius={0.6 + seededRandom(s.seed) * 0.4}
                color="#d97706"
                accentColor="#27272a"
                detailed={i < 2}
                reducedMotion={reducedMotion}
              />
            ))}
            {pipes.map((s) => (
              <PipeProp key={`p-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} color="#3f3f46" accentColor="#ea580c" />
            ))}
            {lamps.map((s) => (
              <PostLampProp key={`l-${s.seed}`} position={s.position} height={2.2} glowColor="#f59e0b" hasCage />
            ))}
            {stacks.map((s) => (
              <SmokestackProp key={`s-${s.seed}`} position={s.position} scale={1.5} color="#3f3f46" glowColor="#ea580c" />
            ))}
            <GearWheelProp position={[0, 4, -26]} scale={3} radius={0.8} color="#27272a" accentColor="#d97706" reducedMotion={reducedMotion} />
          </>
        );
      }
      case 'desert': {
        const palms = ringLayout(10, 13);
        const dunes = ringLayout(8, 15.5, 50);
        const distantDunes = ringLayout(2, 26, 300);
        return (
          <>
            {palms.map((s) => (
              <PalmTreeProp key={`p-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0.08]} scale={0.85 + seededRandom(s.seed) * 0.3} trunkColor="#a16207" frondColor="#65a30d" />
            ))}
            {dunes.map((s) => (
              <DuneMound key={`d-${s.seed}`} position={[s.position[0], -0.2, s.position[2]]} scale={0.8 + seededRandom(s.seed) * 0.6} color="#c2935c" />
            ))}
            <PyramidProp position={[0, 0, -30]} color="#d97706" />
            {distantDunes.map((s) => (
              <DuneMound key={`dd-${s.seed}`} position={[s.position[0], -0.2, s.position[2]]} scale={3} color="#b07a45" />
            ))}
          </>
        );
      }
      case 'gothic': {
        const near = ringLayout(8, 12);
        const lamps = ringLayout(3, 11, 50);
        const distant = ringLayout(3, 28, 300);
        return (
          <>
            {near.map((s) => (
              <GothicSpireProp key={`g-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} color="#1f2937" accentColor="#6b7280" height={4 + seededRandom(s.seed) * 2} />
            ))}
            {lamps.map((s) => (
              <PostLampProp key={`l-${s.seed}`} position={s.position} height={1.6} glowColor="#9ca3af" hasCage />
            ))}
            {distant.map((s) => (
              <GothicSpireProp key={`d-${s.seed}`} position={s.position} rotation={[0, s.rotationY, 0]} scale={2.2} color="#111317" accentColor="#4b5563" />
            ))}
          </>
        );
      }
      case 'neon': {
        const near = ringLayout(10, 13);
        const distant = ringLayout(3, 26, 300);
        const bandSets = [
          ['#ec4899', '#a855f7'],
          ['#ff007f', '#7c3aed'],
          ['#d946ef', '#38bdf8'],
        ];
        return (
          <>
            {near.map((s, i) => (
              <NeonPylonProp
                key={`n-${s.seed}`}
                position={s.position}
                rotation={[0, s.rotationY, 0]}
                height={4 + seededRandom(s.seed) * 5}
                bodyColor="#111111"
                bandColors={bandSets[i % bandSets.length]}
              />
            ))}
            {distant.map((s, i) => (
              <NeonPylonProp
                key={`d-${s.seed}`}
                position={s.position}
                rotation={[0, s.rotationY, 0]}
                scale={2.5}
                height={5 + seededRandom(s.seed) * 4}
                bodyColor="#000000"
                bandColors={bandSets[i % bandSets.length]}
                emissiveIntensity={0.7}
              />
            ))}
          </>
        );
      }
      default:
        return null;
    }
  }, [boardTheme, reducedMotion]);

  return (
    <group position={[0, -0.4, 0]}>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[42, 42, 0.4, 32]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
      {content}
    </group>
  );
};

export default ThemeEnvironment;
