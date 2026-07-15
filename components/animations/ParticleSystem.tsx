import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useChessStore } from '../store/chessStore';
import { squareToVector3 } from '../pieces/ProceduralPieces';

// Types of particles we support
interface CaptureExplosion {
  id: number;
  pos: THREE.Vector3;
  color: 'w' | 'b'; // captured piece color
  startTime: number;
}

const particleCount = 35;
const confettiCount = 120;

// Particle helper math
const randomInSphere = (radius: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = radius * Math.cbrt(Math.random());
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, Math.abs(y) * 1.5, z); // lift explosion velocity upward
};

export const ParticleSystem: React.FC = () => {
  const lastMove = useChessStore((state) => state.lastMove);
  const history = useChessStore((state) => state.history);
  const status = useChessStore((state) => state.status);
  const winner = useChessStore((state) => state.winner);
  const playerColor = useChessStore((state) => state.settings.playerColor);
  const reducedMotion = useChessStore((state) => state.settings.reducedMotion);

  // Instanced mesh refs
  const captureMeshRef = useRef<THREE.InstancedMesh>(null);
  const confettiMeshRef = useRef<THREE.InstancedMesh>(null);

  // Tracks currently active explosions
  const activeExplosions = useRef<CaptureExplosion[]>([]);
  const nextExplosionId = useRef(0);

  // Setup matrices and positions once
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Listen for captures in history
  useEffect(() => {
    if (history.length === 0 || !lastMove) return;
    const latestRecord = history[history.length - 1];
    
    // If the last move resulted in a capture, spawn explosion
    if (latestRecord.captured) {
      const pos = squareToVector3(lastMove.to);
      // Captured piece color is the OPPOSITE of the moving player
      const capturedColor = latestRecord.color === 'w' ? 'b' : 'w';
      
      activeExplosions.current.push({
        id: nextExplosionId.current++,
        pos: new THREE.Vector3(pos.x, 0.2, pos.z),
        color: capturedColor,
        startTime: Date.now() / 1000
      });

      // Cap size of array to prevent leaks
      if (activeExplosions.current.length > 5) {
        activeExplosions.current.shift();
      }
    }
  }, [history, lastMove]);

  // Pre-generate random velocities for capture particles
  const velocities = useMemo(() => {
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount * 5; i++) { // support up to 5 overlapping explosions
      vels.push(randomInSphere(4.5));
    }
    return vels;
  }, []);

  // Pre-generate confetti data
  const confettiData = useMemo(() => {
    const data = [];
    for (let i = 0; i < confettiCount; i++) {
      data.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 8.5, // spread across board width
          8.0 + Math.random() * 5.0,  // spawn high above board
          (Math.random() - 0.5) * 8.5
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          -1.5 - Math.random() * 1.5, // downward fall speed
          (Math.random() - 0.5) * 1.2
        ),
        rotSpeed: new THREE.Vector3(
          Math.random() * 4 + 2,
          Math.random() * 4 + 2,
          Math.random() * 4 + 2
        ),
        color: new THREE.Color().setHSL(Math.random(), 0.85, 0.6) // metallic shiny rainbow
      });
    }
    return data;
  }, []);

  // Frame tick animation loop
  useFrame((state) => {
    if (reducedMotion) return;

    const t = state.clock.getElapsedTime();

    // 1. Render Capture Explosion Particles
    if (captureMeshRef.current) {
      let instIdx = 0;
      const curTime = Date.now() / 1000;

      activeExplosions.current.forEach((exp) => {
        const age = curTime - exp.startTime;
        const duration = 0.8; // seconds

        if (age < duration) {
          const tProgress = age / duration;
          const gravity = 7.0; // gravity acceleration
          
          for (let p = 0; p < particleCount; p++) {
            const vel = velocities[(exp.id % 5) * particleCount + p];
            
            // Dynamic position = startPos + vel*t - 0.5*g*t^2
            const px = exp.pos.x + vel.x * tProgress;
            const py = exp.pos.y + vel.y * tProgress - 0.5 * gravity * tProgress * tProgress;
            const pz = exp.pos.z + vel.z * tProgress;

            // Shrink and rotate
            dummy.position.set(px, Math.max(-0.2, py), pz);
            dummy.scale.setScalar(THREE.MathUtils.lerp(0.08, 0, tProgress));
            dummy.rotation.set(tProgress * 5, tProgress * 5, 0);
            dummy.updateMatrix();

            captureMeshRef.current!.setMatrixAt(instIdx, dummy.matrix);

            // Set color based on captured piece: white = Ivory marble, black = Walnut brown
            const col = exp.color === 'w' 
              ? new THREE.Color('#f0eae1') 
              : new THREE.Color('#3d2817');
            captureMeshRef.current!.setColorAt(instIdx, col);

            instIdx++;
          }
        }
      });

      // Clear remaining instances that aren't active
      for (let i = instIdx; i < particleCount * 5; i++) {
        dummy.position.set(0, -100, 0); // hide below table
        dummy.updateMatrix();
        captureMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      captureMeshRef.current.instanceMatrix.needsUpdate = true;
      if (captureMeshRef.current.instanceColor) {
        captureMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // 2. Render Victory Confetti (only if status is checkmate and user won)
    const isPlayerVictory = status === 'checkmate' && winner === playerColor;

    if (confettiMeshRef.current) {
      if (isPlayerVictory) {
        confettiData.forEach((cf, idx) => {
          // Loop confetti falling down
          const fallProgress = (t * 0.4) % 1.0;
          
          const curY = cf.pos.y + cf.vel.y * t * 0.4;
          const curX = cf.pos.x + Math.sin(t * 1.5 + idx) * 0.3;
          const curZ = cf.pos.z + Math.cos(t * 1.5 + idx) * 0.3;

          // If hit table level, reset position high above
          if (curY < -0.1) {
            dummy.position.set(cf.pos.x, -50, cf.pos.z); // hide
          } else {
            dummy.position.set(curX, curY, curZ);
          }

          dummy.rotation.set(
            t * cf.rotSpeed.x,
            t * cf.rotSpeed.y,
            t * cf.rotSpeed.z
          );
          dummy.scale.set(0.12, 0.05, 0.01); // rectangular flat strip
          dummy.updateMatrix();

          confettiMeshRef.current!.setMatrixAt(idx, dummy.matrix);
          confettiMeshRef.current!.setColorAt(idx, cf.color);
        });
      } else {
        // Hide all confetti
        for (let i = 0; i < confettiCount; i++) {
          dummy.position.set(0, -100, 0);
          dummy.updateMatrix();
          confettiMeshRef.current.setMatrixAt(i, dummy.matrix);
        }
      }
      confettiMeshRef.current.instanceMatrix.needsUpdate = true;
      if (confettiMeshRef.current.instanceColor) {
        confettiMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  if (reducedMotion) return null;

  return (
    <>
      {/* Instanced Mesh for Capture Particle Explosions */}
      <instancedMesh 
        ref={captureMeshRef} 
        args={[null as any, null as any, particleCount * 5]} 
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial 
          roughness={0.2} 
          metalness={0.1} 
          clearcoat={0.6}
        />
      </instancedMesh>

      {/* Instanced Mesh for Victory Confetti */}
      <instancedMesh 
        ref={confettiMeshRef} 
        args={[null as any, null as any, confettiCount]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial 
          roughness={0.1} 
          metalness={0.9} 
          clearcoat={1.0}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </>
  );
};
export default ParticleSystem;
