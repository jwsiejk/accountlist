"use client";

import { useMemo, useRef } from "react";

import { Canvas, useFrame } from "@react-three/fiber";
import type { GroupProps } from "@react-three/fiber";
import { Color, type Group } from "three";

import { buildCabTheme, buildScene3dModel } from "@/lib/steam-trains/scene3d";
import type {
  Scene3dBuilding,
  Scene3dCloud,
  Scene3dLandmarkCue,
  Scene3dModel,
  Scene3dRidge,
  Scene3dRouteCue,
  Scene3dTrackPreview,
} from "@/lib/steam-trains/scene3d";
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
        <group key={item.id} position={[0, 0.04, toWorldZ(item.z)]}>
          <mesh>
            <boxGeometry args={[1.95, 0.06, 0.26]} />
            <meshStandardMaterial color={item.variant % 2 === 0 ? "#6e4f2f" : "#7b5934"} roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[1.8, 0.01, 0.21]} />
            <meshStandardMaterial color="#4b3622" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {poles.map((item) => (
        <group key={item.id} position={[item.x, 0, toWorldZ(item.z)]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 3.6, 8]} />
            <meshStandardMaterial color={item.variant === 0 ? "#7b7065" : "#6b645b"} roughness={0.9} />
          </mesh>
          <mesh position={[0.45, 2.9, 0]}>
            <boxGeometry args={[0.95, 0.08, 0.08]} />
            <meshStandardMaterial color="#8e8176" roughness={0.78} />
          </mesh>
          <mesh position={[0, 2.45, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.75]} />
            <meshStandardMaterial color="#4b5563" metalness={0.4} roughness={0.45} />
          </mesh>
        </group>
      ))}

      {trees.map((item) => (
        <group key={item.id} position={[item.x, 0, toWorldZ(item.z)]} scale={item.scale}>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 2.3, 10]} />
            <meshStandardMaterial color="#5a3f2a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.65, 0]}>
            <coneGeometry args={[0.95, 1.8, 11]} />
            <meshStandardMaterial color={item.variant % 2 === 0 ? "#2f7d3e" : "#2f6f37"} roughness={0.9} />
          </mesh>
          <mesh position={[0.2, 3.4, 0.1]}>
            <dodecahedronGeometry args={[0.52, 0]} />
            <meshStandardMaterial color="#3f9a4c" roughness={0.88} />
          </mesh>
          <mesh position={[-0.38, 3.1, -0.2]}>
            <dodecahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color="#357d40" roughness={0.9} />
          </mesh>
          <mesh position={[0.42, 2.95, -0.18]}>
            <dodecahedronGeometry args={[0.38, 0]} />
            <meshStandardMaterial color="#2f6f37" roughness={0.92} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function SkyLayers({ clouds, ridges }: { clouds: Scene3dCloud[]; ridges: Scene3dRidge[] }) {
  return (
    <>
      {clouds.map((cloud) => (
        <group key={cloud.id} position={[cloud.x, cloud.y, toWorldZ(cloud.z)]} scale={cloud.scale}>
          <mesh>
            <sphereGeometry args={[cloud.depth === "near" ? 1.25 : 1.55, 14, 14]} />
            <meshStandardMaterial color={cloud.depth === "near" ? "#f8fdff" : "#dbeafe"} transparent opacity={cloud.depth === "near" ? 0.88 : 0.64} />
          </mesh>
          <mesh position={[0.9, -0.15, 0.12]}>
            <sphereGeometry args={[0.9, 12, 12]} />
            <meshStandardMaterial color="#f1f5f9" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-0.75, -0.2, -0.12]}>
            <sphereGeometry args={[0.82, 12, 12]} />
            <meshStandardMaterial color="#eff6ff" transparent opacity={0.75} />
          </mesh>
        </group>
      ))}

      {ridges.map((ridge) => {
        const baseColor = ridge.depth === "near" ? "#3f6212" : "#475569";
        const ridgeColor = new Color(baseColor).offsetHSL(0, -0.05, ridge.profile === "crag" ? -0.05 : 0.04).getStyle();
        return (
          <group key={ridge.id} position={[ridge.x, ridge.y, toWorldZ(ridge.z)]}>
            <mesh>
              <coneGeometry args={[ridge.width * 0.5, ridge.height, ridge.profile === "crag" ? 5 : 9]} />
              <meshStandardMaterial color={ridgeColor} transparent opacity={ridge.depth === "near" ? 0.9 : 0.68} roughness={0.95} />
            </mesh>
            {ridge.snowCap && (
              <mesh position={[0, ridge.height * 0.32, 0]}>
                <coneGeometry args={[ridge.width * 0.22, ridge.height * 0.26, 9]} />
                <meshStandardMaterial color="#e2e8f0" transparent opacity={0.75} roughness={0.85} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function BuildingField({ buildings }: { buildings: Scene3dBuilding[] }) {
  return (
    <>
      {buildings.map((building) => (
        <group key={building.id} position={[building.x, 0, toWorldZ(building.z)]}>
          <mesh position={[0, building.height / 2, 0]}>
            <boxGeometry args={[building.width, building.height, building.depth]} />
            <meshStandardMaterial color={building.color} roughness={0.88} />
          </mesh>
          <mesh position={[0, building.height + 0.28, 0]}>
            <boxGeometry args={[building.width + 0.2, 0.34, building.depth + 0.2]} />
            <meshStandardMaterial color={building.roofColor} roughness={0.74} metalness={building.style === "warehouse" ? 0.25 : 0.08} />
          </mesh>
          <mesh position={[0, building.height * 0.52, building.depth / 2 + 0.02]}>
            <boxGeometry args={[building.width * 0.85, building.height * 0.56, 0.06]} />
            <meshStandardMaterial color={building.accentColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, building.height * 0.55, building.depth / 2 + 0.07]}>
            <boxGeometry args={[building.width * 0.18, building.height * 0.34, 0.08]} />
            <meshStandardMaterial color="#dbeafe" emissive="#0f172a" emissiveIntensity={0.08} roughness={0.2} metalness={0.1} />
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
        <meshStandardMaterial color="#5f8b4a" roughness={0.98} />
      </mesh>

      <mesh position={[0, 0, centerZ]}>
        <boxGeometry args={[5.6, 0.18, length]} />
        <meshStandardMaterial color="#6d5a45" roughness={0.94} />
      </mesh>
      <mesh position={[-3.6, -0.01, centerZ]}>
        <boxGeometry args={[1.5, 0.1, length]} />
        <meshStandardMaterial color="#a3c973" />
      </mesh>
      <mesh position={[3.6, -0.01, centerZ]}>
        <boxGeometry args={[1.5, 0.1, length]} />
        <meshStandardMaterial color="#a3c973" />
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
            <meshStandardMaterial color={segment.safeBranch === "main" ? "#8fbef0" : "#f7cb73"} metalness={0.38} roughness={0.32} />
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
          <meshStandardMaterial color="#64748b" metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[-6.1, 1, 0]}>
          <boxGeometry args={[0.4, 2, landmark.length]} />
          <meshStandardMaterial color="#475569" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[6.1, 1, 0]}>
          <boxGeometry args={[0.4, 2, landmark.length]} />
          <meshStandardMaterial color="#475569" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.45, 0]}>
          <boxGeometry args={[12.8, 0.14, landmark.length]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.22} />
        </mesh>
      </group>
    );
  }

  if (landmark.type === "tunnel") {
    return (
      <group position={[0, 0, zCenter]}>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[8.7, 4.5, landmark.length]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.6, landmark.length / 2 - 0.45]}>
          <boxGeometry args={[4.8, 2.8, 0.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        <mesh position={[-2.45, 1.2, landmark.length / 2 - 0.3]}>
          <cylinderGeometry args={[0.2, 0.25, 1.4, 10]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[2.45, 1.2, landmark.length / 2 - 0.3]}>
          <cylinderGeometry args={[0.2, 0.25, 1.4, 10]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, zCenter]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[4.8, 0.9, landmark.length]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[2.8, 1.2, 5.8]} />
        <meshStandardMaterial color="#a8a29e" />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[3.4, 0.2, 6.2]} />
        <meshStandardMaterial color="#57534e" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.6, 2.8]}>
        <boxGeometry args={[2, 0.95, 0.08]} />
        <meshStandardMaterial color="#e2e8f0" emissive="#0f172a" emissiveIntensity={0.08} />
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
        <>
          <group position={[-4.2, 0, toWorldZ((model.stationCue.startZ + model.stationCue.endZ) / 2)]}>
            <mesh position={[0, 0.85, 0]}>
              <boxGeometry args={[0.14, 1.7, Math.max(5, model.stationCue.endZ - model.stationCue.startZ)]} />
              <meshStandardMaterial color={model.stationCue.completed ? "#10b981" : "#fb923c"} emissive={model.stationCue.completed ? "#064e3b" : "#7c2d12"} />
            </mesh>
          </group>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, toWorldZ((model.stationCue.startZ + model.stationCue.endZ) / 2)]}
          >
            <planeGeometry args={[6, Math.max(8, model.stationCue.endZ - model.stationCue.startZ)]} />
            <meshStandardMaterial
              color={model.stationCue.completed ? "#4ade80" : "#fdba74"}
              transparent
              opacity={model.stationCue.completed ? 0.28 : 0.42}
              emissive={model.stationCue.completed ? "#14532d" : "#7c2d12"}
            />
          </mesh>
        </>
      )}
    </>
  );
}

function RouteCueBoards({ routeCues }: { routeCues: Scene3dRouteCue[] }) {
  return (
    <>
      {routeCues.map((cue) => {
        const x = cue.safeBranch === "main" ? -6.2 : 6.2;
        return (
          <group key={cue.id} position={[x, 0, toWorldZ(cue.z)]}>
            <mesh position={[0, 2.1, 0]}>
              <boxGeometry args={[1.9, 0.9, 0.15]} />
              <meshStandardMaterial color={cue.urgency === "now" ? "#facc15" : "#93c5fd"} emissive={cue.urgency === "now" ? "#713f12" : "#1e3a8a"} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 2.3, 10]} />
              <meshStandardMaterial color="#4b5563" />
            </mesh>
          </group>
        );
      })}
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
      <color attach="background" args={["#7fa7c8"]} />
      <fog attach="fog" args={["#b7cde0", 28, 238]} />
      <ambientLight intensity={0.5} color="#f1f5f9" />
      <directionalLight intensity={1.1} position={[14, 15, 10]} color="#ffe8c4" castShadow={false} />
      <directionalLight intensity={0.35} position={[-18, 9, -8]} color="#cbd5e1" />
      <hemisphereLight args={["#fef3c7", "#334155", 0.62]} />

      <SkyLayers clouds={model.clouds} ridges={model.ridges} />
      <TrackGeometry model={model} />
      <BuildingField buildings={model.buildings} />
      <RepeaterField model={model} />
      <CheckpointSignals model={model} />
      <RouteCueBoards routeCues={model.routeCues} />
      {model.landmarks.map((landmark) => (
        <LandmarkMesh key={landmark.id} landmark={landmark} />
      ))}
      <HelperGuide model={model} enabled={helperMode} />

      <MovingCabRig speedFactor={Math.max(0.45, state.train.speed * 0.03)}>
        <mesh position={[0, -0.62, 13.2]}>
          <boxGeometry args={[18, 1.15, 9]} />
          <meshStandardMaterial color={theme.bodyColor} metalness={0.25} roughness={0.52} />
        </mesh>
        <mesh position={[0, -0.1, 8.9]}>
          <boxGeometry args={[6.4, 0.8, 1.6]} />
          <meshStandardMaterial color={theme.sillColor} metalness={0.15} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.45, 8.35]}>
          <boxGeometry args={[3.9, 0.9, 0.6]} />
          <meshStandardMaterial color={theme.dashColor} roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.75, 7.85]}>
          <boxGeometry args={[1.8, 0.3, 0.3]} />
          <meshStandardMaterial color={theme.noseColor} metalness={0.2} roughness={0.45} />
        </mesh>
        <mesh position={[0, 2, 8.1]}>
          <boxGeometry args={[7.4, 2.7, 0.4]} />
          <meshStandardMaterial color={theme.trimColor} metalness={0.12} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.95, 7.92]}>
          <boxGeometry args={[4.7, 1.8, 0.1]} />
          <meshStandardMaterial color="#dbeafe" transparent opacity={0.2} roughness={0.05} metalness={0.2} />
        </mesh>
        <mesh position={[-2.95, 0.2, 8.95]}>
          <boxGeometry args={[0.35, 1.2, 1.2]} />
          <meshStandardMaterial color={theme.trimColor} />
        </mesh>
        <mesh position={[2.95, 0.2, 8.95]}>
          <boxGeometry args={[0.35, 1.2, 1.2]} />
          <meshStandardMaterial color={theme.trimColor} />
        </mesh>
        <mesh position={[-1.1, 0.95, 8.15]}>
          <cylinderGeometry args={[0.1, 0.1, 0.42, 12]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[1.1, 0.95, 8.15]}>
          <cylinderGeometry args={[0.1, 0.1, 0.42, 12]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0, 0.1, 8.38]}>
          <boxGeometry args={[0.95, 0.55, 0.3]} />
          <meshStandardMaterial color="#111827" roughness={0.45} metalness={0.38} />
        </mesh>
        <mesh position={[-1.9, 0.45, 8.3]}>
          <torusGeometry args={[0.27, 0.04, 14, 28]} />
          <meshStandardMaterial color="#1f2937" metalness={0.65} roughness={0.28} />
        </mesh>
        <mesh position={[1.9, 0.45, 8.3]}>
          <torusGeometry args={[0.27, 0.04, 14, 28]} />
          <meshStandardMaterial color="#1f2937" metalness={0.65} roughness={0.28} />
        </mesh>
      </MovingCabRig>
    </>
  );
}

export function TrainCab3D({ state, helperMode }: TrainCab3DProps) {
  const model = useMemo(() => buildScene3dModel(state), [state]);

  return (
    <div className="relative h-[500px] overflow-hidden rounded-2xl border border-border bg-sky-200">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 2.8, -8], fov: 60 }}>
        <CabShell model={model} helperMode={helperMode} state={state} />
      </Canvas>
    </div>
  );
}
