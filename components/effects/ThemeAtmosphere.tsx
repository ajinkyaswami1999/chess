import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';

type Motion = 'fall' | 'rise' | 'wander' | 'bob' | 'drift' | 'twinkle';

interface AtmosphereConfig {
  count: number;
  colors: string[];
  motion: Motion;
  size: number;
  opacity: number;
  radius: number;
  yRange: [number, number];
  speedRange: [number, number];
}

const CONFIGS: Record<string, AtmosphereConfig> = {
  wood: { count: 50, colors: ['#f2d9a0'], motion: 'bob', size: 0.03, opacity: 0.25, radius: 6, yRange: [0.3, 3.5], speedRange: [0.3, 0.6] },
  marble: { count: 45, colors: ['#ffffff', '#e8e4da'], motion: 'bob', size: 0.03, opacity: 0.2, radius: 6, yRange: [0.3, 3.5], speedRange: [0.3, 0.6] },
  ice: { count: 90, colors: ['#e8f6ff'], motion: 'fall', size: 0.045, opacity: 0.85, radius: 9, yRange: [0, 9], speedRange: [0.5, 0.9] },
  volcanic: { count: 70, colors: ['#f97316', '#ef4444'], motion: 'rise', size: 0.05, opacity: 0.9, radius: 8, yRange: [0, 6], speedRange: [0.6, 1.2] },
  forest: { count: 55, colors: ['#a7f3d0', '#facc15'], motion: 'wander', size: 0.035, opacity: 0.8, radius: 9, yRange: [0.3, 2.5], speedRange: [0.2, 0.5] },
  space: { count: 60, colors: ['#a5f3fc', '#ffffff'], motion: 'twinkle', size: 0.03, opacity: 0.9, radius: 14, yRange: [1, 8], speedRange: [0.1, 0.3] },
  steampunk: { count: 40, colors: ['#d4d4d8'], motion: 'rise', size: 0.08, opacity: 0.2, radius: 8, yRange: [0, 5], speedRange: [0.2, 0.4] },
  desert: { count: 65, colors: ['#eab308', '#fde68a'], motion: 'drift', size: 0.035, opacity: 0.5, radius: 10, yRange: [0, 1.5], speedRange: [0.3, 0.8] },
  gothic: { count: 45, colors: ['#9ca3af'], motion: 'bob', size: 0.03, opacity: 0.2, radius: 6, yRange: [0.3, 3.5], speedRange: [0.3, 0.6] },
  neon: { count: 60, colors: ['#ec4899', '#a855f7'], motion: 'rise', size: 0.045, opacity: 0.9, radius: 9, yRange: [0, 6], speedRange: [0.6, 1.3] },
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const ThemeAtmosphere: React.FC = () => {
  const boardTheme = useChessStore((state) => state.settings.boardTheme || 'marble');
  const reducedMotion = useChessStore((state) => state.settings.reducedMotion);

  const config = CONFIGS[boardTheme] || CONFIGS.marble;
  const count = reducedMotion ? Math.max(6, Math.floor(config.count / 2)) : config.count;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * config.radius;
      list.push({
        baseX: Math.cos(angle) * r,
        baseZ: Math.sin(angle) * r,
        baseY: rand(config.yRange[0], config.yRange[1]),
        phase: Math.random() * Math.PI * 2,
        speed: rand(config.speedRange[0], config.speedRange[1]),
        color: new THREE.Color(config.colors[i % config.colors.length]),
      });
    }
    return list;
  }, [boardTheme, count, config]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = reducedMotion ? 0 : state.clock.getElapsedTime();
    const ySpan = config.yRange[1] - config.yRange[0];

    particles.forEach((p, i) => {
      let x = p.baseX;
      let y = p.baseY;
      let z = p.baseZ;
      let scale = config.size;

      switch (config.motion) {
        case 'fall': {
          const cycle = ySpan > 0 ? (t * p.speed + p.phase * ySpan) % ySpan : 0;
          y = config.yRange[1] - cycle;
          x += Math.sin(t * 0.2 + p.phase) * 0.4;
          z += Math.cos(t * 0.2 + p.phase) * 0.4;
          break;
        }
        case 'rise': {
          const cycle = ySpan > 0 ? (t * p.speed + p.phase * ySpan) % ySpan : 0;
          const progress = ySpan > 0 ? cycle / ySpan : 0;
          y = config.yRange[0] + cycle;
          x += Math.sin(t * 0.5 + p.phase) * 0.3;
          z += Math.cos(t * 0.5 + p.phase) * 0.3;
          scale = config.size * (1 - progress * 0.6);
          break;
        }
        case 'wander': {
          x += Math.sin(t * 0.6 + p.phase) * 0.8 + Math.sin(t * 0.23 + p.phase * 2) * 0.4;
          z += Math.cos(t * 0.5 + p.phase) * 0.8 + Math.cos(t * 0.31 + p.phase * 2) * 0.4;
          y += Math.sin(t * 0.8 + p.phase) * 0.3;
          break;
        }
        case 'bob': {
          y += Math.sin(t * 0.4 + p.phase) * 0.3;
          x += Math.sin(t * 0.15 + p.phase) * 0.15;
          z += Math.cos(t * 0.15 + p.phase) * 0.15;
          break;
        }
        case 'drift': {
          const span = config.radius * 2;
          x = (((p.baseX + t * p.speed + config.radius) % span) + span) % span - config.radius;
          z += Math.sin(t * 0.2 + p.phase) * 0.5;
          y += Math.sin(t * 0.5 + p.phase) * 0.1;
          break;
        }
        case 'twinkle': {
          x += Math.sin(t * 0.05 + p.phase) * 0.5;
          z += Math.cos(t * 0.05 + p.phase) * 0.5;
          scale = config.size * (0.6 + Math.abs(Math.sin(t * 2 + p.phase * 6)) * 0.6);
          break;
        }
      }

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, p.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh key={`${boardTheme}-${count}`} ref={meshRef} args={[null as any, null as any, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={config.opacity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
};

export default ThemeAtmosphere;
