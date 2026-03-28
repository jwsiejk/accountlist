"use client";

import { useMemo } from "react";

import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { buildCabTheme, buildScene3dModel } from "@/lib/steam-trains/scene3d";
import type { SteamTrainsSimulationState } from "@/lib/steam-trains/types";

type TrainCab3DProps = {
  state: SteamTrainsSimulationState;
  helperMode: boolean;
};

const TRACK_HALF_WIDTH = 1.65;

function GroundAndDistantScenery() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 120]} receiveShadow>
        <planeGeometry args={[420, 860]} />
        <meshStandardMaterial color="#6a8c58" />
      </mesh>
      <mesh position={[-42, 12, 240]}>
        <coneGeometry args={[34, 34, 10]} />
        <meshStandardMaterial color="#6d7f8e" />
      </mesh>
      <mesh position={[56, 15, 290]}>
        <coneGeometry args={[44, 40, 10]} />
        <meshStandardMaterial color="#697d88" />
      </mesh>
      <mesh position={[-65, 1.7, 160]}>
        <boxGeometry args={[13, 3.3, 7]} />
        <meshStandardMaterial color="#c4b5a4" />
      </mesh>
      <mesh position={[64, 1.4, 180]}>
        <boxGeometry args={[10, 2.6, 6]} />
        <meshStandardMaterial color="#bfa989" />
      </mesh>
    </>
  );
}

function ProceduralTreeLine() {
  const trees = useMemo(
    () =>
      Array.from({ length: 44 }, (_, index) => {
        const z = index * 18 - 70;
        const side = index % 2 === 0 ? -1 : 1;
        const laneOffset = 16 + (index % 5) * 2.4;
        const x = side * laneOffset;
        const scale = 0.8 + (index % 4) * 0.16;
        return { x, z, scale };
      }),
    [],
  );

  return (
    <group>
      {trees.map((tree) => (
        <group key={`${tree.x}-${tree.z}`} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 1.6, 6]} />
            <meshStandardMaterial color="#5f4633" />
          </mesh>
          <mesh position={[0, 2, 0]}>
            <coneGeometry args={[0.9, 2.3, 8]} />
            <meshStandardMaterial color="#2f6d3f" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TrackAndSignals({ state, helperMode }: { state: SteamTrainsSimulationState; helperMode: boolean }) {
  const model = useMemo(() => buildScene3dModel(state), [state]);

  const sleepers = useMemo(
    () =>
      Array.from({ length: 72 }, (_, index) => ({
        z: -50 + index * 8,
      })),
    [],
  );

  const poles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        z: -20 + index * 24,
      })),
    [],
  );

  return (
    <group>
      <mesh position={[-TRACK_HALF_WIDTH, 0.02, 130]}>
        <boxGeometry args={[0.2, 0.1, 360]} />
        <meshStandardMaterial color="#7a6f64" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[TRACK_HALF_WIDTH, 0.02, 130]}>
        <boxGeometry args={[0.2, 0.1, 360]} />
        <meshStandardMaterial color="#7a6f64" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[4.4, 0.0, 190]} rotation={[0, 0.22, 0]}>
        <boxGeometry args={[0.2, 0.08, 86]} />
        <meshStandardMaterial color="#7a6f64" metalness={0.2} roughness={0.5} />
      </mesh>
      {sleepers.map((sleeper) => (
        <mesh key={`sleeper-${sleeper.z}`} position={[0, -0.02, sleeper.z]}>
          <boxGeometry args={[4.3, 0.1, 0.65]} />
          <meshStandardMaterial color="#6f513a" />
        </mesh>
      ))}
      {poles.map((pole) => (
        <group key={`pole-${pole.z}`} position={[-9.8, 0, pole.z]}>
          <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 3.8, 7]} />
            <meshStandardMaterial color="#8b715a" />
          </mesh>
          <mesh position={[0.35, 3.6, 0]}>
            <boxGeometry args={[1.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#8b715a" />
          </mesh>
        </group>
      ))}
      {model.checkpointCues.map((cue) => (
        <group key={cue.id} position={[cue.safeBranch === "main" ? -3.5 : 3.5, 0, cue.z]}>
          <mesh position={[0, 2.3, 0]}>
            <boxGeometry args={[0.2, 4.6, 0.2]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
          <mesh position={[0, 3.7, 0.1]}>
            <boxGeometry args={[1.25, 0.9, 0.2]} />
            <meshStandardMaterial color={cue.safeBranch === "main" ? "#34d399" : "#f59e0b"} emissive="#111827" />
          </mesh>
        </group>
      ))}
      {model.stationCue && model.stationCue.endZ > -40 && model.stationCue.startZ < 360 && (
        <>
          <mesh position={[-7.2, 0.06, (model.stationCue.startZ + model.stationCue.endZ) / 2]}>
            <boxGeometry args={[5.8, 0.18, Math.max(6, model.stationCue.endZ - model.stationCue.startZ)]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
          <mesh position={[-8.8, 1.7, model.stationCue.startZ + 10]}>
            <boxGeometry args={[1.6, 3, 6]} />
            <meshStandardMaterial color="#d6c6b0" />
          </mesh>
          <mesh position={[-8.8, 3.5, model.stationCue.startZ + 10]}>
            <boxGeometry args={[2.3, 0.25, 6.4]} />
            <meshStandardMaterial color="#7f1d1d" />
          </mesh>
        </>
      )}

      {helperMode && model.checkpointCues[0] && (
        <mesh position={[0, 2.9, model.checkpointCues[0].z]}>
          <torusGeometry args={[2.3, 0.08, 10, 40]} />
          <meshStandardMaterial color="#fbbf24" emissive="#451a03" />
        </mesh>
      )}
    </group>
  );
}

function CabInterior({ state }: { state: SteamTrainsSimulationState }) {
  const theme = useMemo(() => buildCabTheme(state.train.definition), [state.train.definition]);
  return (
    <group>
      <mesh position={[0, 1.15, -0.8]}>
        <boxGeometry args={[5.5, 2.4, 0.2]} />
        <meshStandardMaterial color={theme.bodyColor} />
      </mesh>
      <mesh position={[0, 0.3, 0.4]}>
        <boxGeometry args={[5.7, 0.28, 3]} />
        <meshStandardMaterial color="#262626" />
      </mesh>
      <mesh position={[0, 0.95, 0.36]}>
        <boxGeometry args={[3.4, 0.3, 1.2]} />
        <meshStandardMaterial color={theme.trimColor} emissive="#111827" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[-1.2, 1.14, 0.94]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.12]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[1.2, 1.14, 0.94]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.12]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

export function TrainCab3D({ state, helperMode }: TrainCab3DProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950">
      <Canvas shadows camera={{ position: [0, 2.6, -1.8], fov: 62 }} className="h-[500px] w-full">
        <color attach="background" args={["#8fc5ff"]} />
        <fog attach="fog" args={["#b9daff", 80, 420]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[12, 16, 10]} intensity={1.2} castShadow />
        <Sky distance={450000} turbidity={6} rayleigh={1} inclination={0.52} azimuth={0.14} />

        <GroundAndDistantScenery />
        <ProceduralTreeLine />
        <TrackAndSignals state={state} helperMode={helperMode} />
        <CabInterior state={state} />
      </Canvas>
    </div>
  );
}
