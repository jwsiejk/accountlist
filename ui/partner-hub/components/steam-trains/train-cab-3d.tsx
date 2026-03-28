"use client";

import { useMemo, useRef } from "react";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { GroupProps } from "@react-three/fiber";
import type { Group } from "three";

import { buildCabTheme, buildScene3dModel } from "@/lib/steam-trains/scene3d";
import type { Scene3dLandmarkCue, Scene3dModel, Scene3dTrackPreview } from "@/lib/steam-trains/scene3d";
import type { SteamTrainsSimulationState } from "@/lib/steam-trains/types";

type TrainCab3DProps = {
  state: SteamTrainsSimulationState;
  helperMode: boolean;
};

const toWorldZ = (forwardZ: number) => -forwardZ;

const branchXAt = (route: Scene3dTrackPreview, z: number) => {
  const span = Math.max(1, route.endZ - route.splitZ);
  const ratio = Math.max(0, Math.min(1, (z - route.splitZ) / span));
  return route.branchOffset * ratio;
};

function RepeaterField({ model }: { model: Scene3dModel }) {
  const sleepers = model.repeaters.filter((item) => item.kind === "sleeper");
  const poles = model.repeaters.filter((item) => item.kind === "pole");
  const trees = model.repeaters.filter((item) => item.kind === "tree");

  return (
    <>
      {sleepers.map((item) => (
        <mesh key={item.id} position={[0, 0.04, toWorldZ(item.z)]}>
          <boxGeometry args={[1.95, 0.06, 0.26]} />
          <meshStandardMaterial color="#6e4f2f" />
        </mesh>
      ))}

      {poles.map((item) => (
        <group key={item.id} position={[item.x, 0, toWorldZ(item.z)]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 3.6, 8]} />
            <meshStandardMaterial color="#7b7065" />
          </mesh>
          <mesh position={[0.45, 2.9, 0]}>
            <boxGeometry args={[0.95, 0.08, 0.08]} />
            <meshStandardMaterial color="#8e8176" />
          </mesh>
        </group>
      ))}

      {trees.map((item) => (
        <group key={item.id} position={[item.x, 0, toWorldZ(item.z)]} scale={item.scale}>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 2.3, 10]} />
            <meshStandardMaterial color="#5a3f2a" />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <coneGeometry args={[0.95, 2.2, 10]} />
            <meshStandardMaterial color="#2f7d3e" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function TrackGeometry({ model }: { model: Scene3dModel }) {
  const farZ = -model.horizonDistance;
  const nearZ = 56;
  const centerZ = (farZ + nearZ) / 2;
  const length = nearZ - farZ;

  const railSegments = useMemo(
    () =>
      model.routePreviews.flatMap((route) => {
        const pieces = 9;
        const segLength = (route.endZ - route.splitZ) / pieces;
        return Array.from({ length: pieces }, (_, index) => {
          const segStart = route.splitZ + segLength * index;
          const segEnd = segStart + segLength;
          const midZ = (segStart + segEnd) / 2;
          return {
            id: `${route.id}-${index}`,
            x: branchXAt(route, midZ),
            z: toWorldZ(midZ),
            len: Math.max(1, segLength),
            safeBranch: route.safeBranch,
          };
        });
      }),
    [model.routePreviews],
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, centerZ]}>
        <planeGeometry args={[48, length]} />
        <meshStandardMaterial color="#76a95f" />
      </mesh>

      <mesh position={[0, 0, centerZ]}>
        <boxGeometry args={[5.6, 0.18, length]} />
        <meshStandardMaterial color="#6d5a45" />
      </mesh>

      <mesh position={[-0.72, 0.19, centerZ]}>
        <boxGeometry args={[0.16, 0.16, length]} />
        <meshStandardMaterial color="#b0b7c3" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0.72, 0.19, centerZ]}>
        <boxGeometry args={[0.16, 0.16, length]} />
        <meshStandardMaterial color="#b0b7c3" metalness={0.3} roughness={0.4} />
      </mesh>

      {railSegments.map((segment) => (
        <group key={segment.id} position={[segment.x, 0, segment.z]}>
          <mesh position={[-0.72, 0.2, 0]}>
            <boxGeometry args={[0.12, 0.12, segment.len]} />
            <meshStandardMaterial color={segment.safeBranch === "main" ? "#8fbef0" : "#f7cb73"} metalness={0.2} roughness={0.45} />
          </mesh>
          <mesh position={[0.72, 0.2, 0]}>
            <boxGeometry args={[0.12, 0.12, segment.len]} />
            <meshStandardMaterial color={segment.safeBranch === "main" ? "#8fbef0" : "#f7cb73"} metalness={0.2} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function LandmarkMesh({ landmark }: { landmark: Scene3dLandmarkCue }) {
  const x = landmark.side === "left" ? -8.8 : 8.8;
  const zCenter = toWorldZ(landmark.z + landmark.length / 2);

  if (landmark.type === "bridge") {
    return (
      <group position={[0, 0, zCenter]}>
        <mesh position={[0, 1.9, 0]}>
          <boxGeometry args={[13, 0.45, landmark.length]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
        <mesh position={[-6.1, 1, 0]}>
          <boxGeometry args={[0.4, 2, landmark.length]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        <mesh position={[6.1, 1, 0]}>
          <boxGeometry args={[0.4, 2, landmark.length]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      </group>
    );
  }

  if (landmark.type === "tunnel") {
    return (
      <group position={[0, 0, zCenter]}>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[8.5, 4.4, landmark.length]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, 1.6, landmark.length / 2 - 0.45]}>
          <boxGeometry args={[4.8, 2.8, 0.5]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, zCenter]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[4.8, 0.9, landmark.length]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[2.8, 1.2, 5.8]} />
        <meshStandardMaterial color="#a8a29e" />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[3.4, 0.2, 6.2]} />
        <meshStandardMaterial color="#57534e" />
      </mesh>
    </group>
  );
}

function CheckpointSignals({ model }: { model: Scene3dModel }) {
  return (
    <>
      {model.checkpointCues.map((cue) => {
        const branchX = cue.safeBranch === "main" ? -3.2 : 3.2;
        return (
          <group key={cue.id} position={[branchX, 0, toWorldZ(cue.z)]}>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 2.6, 12]} />
              <meshStandardMaterial color="#52525b" />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
              <boxGeometry args={[0.75, 0.35, 0.2]} />
              <meshStandardMaterial color={cue.safeBranch === "main" ? "#34d399" : "#f59e0b"} emissive={cue.safeBranch === "main" ? "#14532d" : "#7c2d12"} />
            </mesh>
          </group>
        );
      })}

      {model.stationCue && model.stationCue.endZ > -45 && model.stationCue.startZ < model.horizonDistance && (
        <group position={[-4.2, 0, toWorldZ((model.stationCue.startZ + model.stationCue.endZ) / 2)]}>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.14, 1.7, Math.max(5, model.stationCue.endZ - model.stationCue.startZ)]} />
            <meshStandardMaterial color={model.stationCue.completed ? "#10b981" : "#fb923c"} emissive={model.stationCue.completed ? "#064e3b" : "#7c2d12"} />
          </mesh>
        </group>
      )}
    </>
  );
}

function HelperGuide({ model, enabled }: { model: Scene3dModel; enabled: boolean }) {
  const target = enabled ? model.checkpointCues[0] : undefined;
  const ringRef = useRef<Group | null>(null);

  useFrame(({ clock }, delta) => {
    if (!ringRef.current) {
      return;
    }

    if (!target) {
      ringRef.current.visible = false;
      return;
    }

    ringRef.current.visible = true;
    ringRef.current.position.set(0, 1.1 + Math.sin(clock.getElapsedTime() * 1.6) * 0.15, toWorldZ(target.z));
    ringRef.current.rotation.y += delta * 0.85;
  });

  return (
    <group ref={ringRef} visible={Boolean(target)}>
      <mesh>
        <torusGeometry args={[1.2, 0.06, 16, 64]} />
        <meshStandardMaterial color="#facc15" emissive="#713f12" />
      </mesh>
    </group>
  );
}

function MovingCabRig({ children, speedFactor = 1 }: GroupProps & { speedFactor?: number }) {
  const rigRef = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    if (!rigRef.current) {
      return;
    }

    rigRef.current.position.y = Math.sin(clock.getElapsedTime() * 4.2) * 0.015 * speedFactor;
  });

  return <group ref={rigRef}>{children}</group>;
}

function CabShell({ model, helperMode, state }: { model: Scene3dModel; helperMode: boolean; state: SteamTrainsSimulationState }) {
  const theme = useMemo(() => buildCabTheme(state.train.definition), [state.train.definition]);

  return (
    <>
      <PerspectiveCamera makeDefault fov={56} position={[0, 2.45, 10.6]} rotation={[-0.05, 0, 0]} />
      <color attach="background" args={["#87ceeb"]} />
      <fog attach="fog" args={["#a9cfe8", 38, 220]} />
      <ambientLight intensity={0.8} />
      <directionalLight intensity={0.9} position={[8, 14, 14]} castShadow={false} />
      <hemisphereLight args={["#e0f2fe", "#5b7b42", 0.7]} />

      <TrackGeometry model={model} />
      <RepeaterField model={model} />
      <CheckpointSignals model={model} />
      {model.landmarks.map((landmark) => (
        <LandmarkMesh key={landmark.id} landmark={landmark} />
      ))}
      <HelperGuide model={model} enabled={helperMode} />

      <MovingCabRig speedFactor={Math.max(0.45, state.train.speed * 0.03)}>
        <mesh position={[0, -0.62, 13.2]}>
          <boxGeometry args={[18, 1.15, 9]} />
          <meshStandardMaterial color={theme.bodyColor} />
        </mesh>
        <mesh position={[0, -0.1, 8.9]}>
          <boxGeometry args={[6.4, 0.8, 1.6]} />
          <meshStandardMaterial color={theme.sillColor} />
        </mesh>
        <mesh position={[0, 0.45, 8.35]}>
          <boxGeometry args={[3.9, 0.9, 0.6]} />
          <meshStandardMaterial color={theme.dashColor} />
        </mesh>
        <mesh position={[0, 0.75, 7.85]}>
          <boxGeometry args={[1.8, 0.3, 0.3]} />
          <meshStandardMaterial color={theme.noseColor} />
        </mesh>
        <mesh position={[-2.95, 0.2, 8.95]}>
          <boxGeometry args={[0.35, 1.2, 1.2]} />
          <meshStandardMaterial color={theme.trimColor} />
        </mesh>
        <mesh position={[2.95, 0.2, 8.95]}>
          <boxGeometry args={[0.35, 1.2, 1.2]} />
          <meshStandardMaterial color={theme.trimColor} />
        </mesh>
      </MovingCabRig>
    </>
  );
}

export function TrainCab3D({ state, helperMode }: TrainCab3DProps) {
  const model = useMemo(() => buildScene3dModel(state), [state]);

  return (
    <div className="relative h-[500px] overflow-hidden rounded-2xl border border-border bg-sky-200">
      <Canvas dpr={[1, 1.5]}>
        <CabShell model={model} helperMode={helperMode} state={state} />
      </Canvas>
    </div>
  );
}
