"use client";

import { useMemo } from "react";

import { buildCabTheme, buildScene3dModel } from "@/lib/steam-trains/scene3d";
import type { Scene3dLandmarkCue, Scene3dRepeater, Scene3dTrackPreview } from "@/lib/steam-trains/scene3d";
import type { SteamTrainsSimulationState } from "@/lib/steam-trains/types";

type TrainCab3DProps = {
  state: SteamTrainsSimulationState;
  helperMode: boolean;
};

const TRACK_WIDTH = 170;
const ROADBED_WIDTH = 300;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const perspectiveY = (z: number, horizon: number) => {
  const ratio = 1 - clamp01(z / horizon);
  return Math.round(460 - ratio * 430);
};

const perspectiveScale = (z: number, horizon: number) => 0.35 + (1 - clamp01(z / horizon)) * 1.55;

const perspectiveX = (x: number, z: number, horizon: number) => {
  const spread = 0.35 + (1 - clamp01(z / horizon)) * 0.9;
  return 400 + x * 9 * spread;
};

function RepeaterSprite({ item, horizon }: { item: Scene3dRepeater; horizon: number }) {
  const y = perspectiveY(item.z, horizon);
  const scale = perspectiveScale(item.z, horizon) * item.scale;
  const x = perspectiveX(item.x, item.z, horizon);

  if (item.kind === "sleeper") {
    return (
      <div
        className="absolute rounded-sm bg-amber-950/95"
        style={{ left: x - 20 * scale, top: y, width: 40 * scale, height: Math.max(2, 6 * scale) }}
      />
    );
  }

  if (item.kind === "pole") {
    return (
      <div className="absolute" style={{ left: x, top: y - 46 * scale, width: 4 * scale, height: 46 * scale }}>
        <div className="h-full w-full rounded bg-stone-600" />
        <div className="absolute left-0 top-1 h-[3px] w-[20px] rounded bg-stone-500" style={{ width: 20 * scale }} />
      </div>
    );
  }

  return (
    <div className="absolute" style={{ left: x - 11 * scale, top: y - 40 * scale, width: 22 * scale, height: 40 * scale }}>
      <div className="absolute bottom-0 left-1/2 h-[35%] w-[12%] -translate-x-1/2 rounded bg-amber-900" />
      <div className="absolute bottom-[26%] left-1/2 h-[74%] w-full -translate-x-1/2 rounded-[50%] bg-green-700" />
    </div>
  );
}

function RoutePreview({ route, horizon }: { route: Scene3dTrackPreview; horizon: number }) {
  const yStart = perspectiveY(route.splitZ, horizon);
  const yEnd = perspectiveY(route.endZ, horizon);
  const startX = perspectiveX(0, route.splitZ, horizon);
  const endX = perspectiveX(route.branchOffset, route.endZ, horizon);
  const color = route.safeBranch === "main" ? "#93c5fd" : "#fcd34d";
  const width = Math.hypot(endX - startX, yEnd - yStart);
  const angle = Math.atan2(yEnd - yStart, endX - startX);

  return (
    <div
      className="absolute origin-left rounded"
      style={{ left: startX, top: yStart, width, height: 3, transform: `rotate(${angle}rad)`, backgroundColor: color, opacity: 0.92 }}
    />
  );
}

function Landmark({ landmark, horizon }: { landmark: Scene3dLandmarkCue; horizon: number }) {
  const y = perspectiveY(landmark.z, horizon);
  const scale = perspectiveScale(landmark.z, horizon);
  const x = perspectiveX(landmark.side === "left" ? -7 : 7, landmark.z, horizon);

  if (landmark.type === "bridge") {
    return <div className="absolute rounded-md bg-slate-500/90" style={{ left: 290, top: y - 30 * scale, width: 220, height: 16 * scale }} />;
  }

  if (landmark.type === "tunnel") {
    return (
      <div className="absolute rounded-t-[35px] border-8 border-slate-700 bg-slate-900/80" style={{ left: 270, top: y - 70 * scale, width: 260, height: 88 * scale }} />
    );
  }

  return <div className="absolute rounded bg-stone-300" style={{ left: x - 28 * scale, top: y - 20 * scale, width: 56 * scale, height: 20 * scale }} />;
}

export function TrainCab3D({ state, helperMode }: TrainCab3DProps) {
  const model = useMemo(() => buildScene3dModel(state), [state]);
  const theme = useMemo(() => buildCabTheme(state.train.definition), [state.train.definition]);

  return (
    <div className="relative h-[500px] overflow-hidden rounded-2xl border border-border bg-sky-200">
      <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-sky-300 to-sky-100" />
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-green-900 via-green-700 to-green-600" />

      <div className="absolute left-1/2 top-16 h-[410px] -translate-x-1/2" style={{ width: ROADBED_WIDTH, background: "linear-gradient(to top, #5b4637, #6b5a45 45%, #806c52 100%)", clipPath: "polygon(0 100%, 100% 100%, 58% 0, 42% 0)" }} />
      <div className="absolute left-1/2 top-16 h-[410px] -translate-x-1/2" style={{ width: TRACK_WIDTH, background: "linear-gradient(to top, #4b5563, #9ca3af 60%, #d1d5db)", clipPath: "polygon(0 100%, 100% 100%, 58% 0, 42% 0)" }} />

      {model.repeaters.map((item) => (
        <RepeaterSprite key={item.id} item={item} horizon={model.horizonDistance} />
      ))}

      {model.routePreviews.map((route) => (
        <RoutePreview key={route.id} route={route} horizon={model.horizonDistance} />
      ))}

      {model.landmarks.map((landmark) => (
        <Landmark key={landmark.id} landmark={landmark} horizon={model.horizonDistance} />
      ))}

      {model.checkpointCues.map((cue) => {
        const y = perspectiveY(cue.z, model.horizonDistance);
        const x = perspectiveX(cue.safeBranch === "main" ? -4.5 : 4.5, cue.z, model.horizonDistance);
        return (
          <div key={cue.id} className="absolute" style={{ left: x - 6, top: y - 48 }}>
            <div className="h-11 w-1 rounded bg-zinc-700" />
            <div className="mt-1 h-4 w-12 -translate-x-6 rounded border border-zinc-900" style={{ backgroundColor: cue.safeBranch === "main" ? "#34d399" : "#f59e0b" }} />
          </div>
        );
      })}

      {model.stationCue && model.stationCue.endZ > -40 && model.stationCue.startZ < 360 && (
        <div
          className="absolute rounded-full"
          style={{
            left: perspectiveX(-3.8, model.stationCue.startZ, model.horizonDistance),
            top: perspectiveY((model.stationCue.startZ + model.stationCue.endZ) / 2, model.horizonDistance),
            width: 12,
            height: 12,
            backgroundColor: model.stationCue.completed ? "#34d399" : "#f97316",
          }}
        />
      )}

      {helperMode && model.checkpointCues[0] && (
        <div
          className="absolute h-10 w-10 rounded-full border-4 border-amber-300"
          style={{ left: perspectiveX(0, model.checkpointCues[0].z, model.horizonDistance) - 20, top: perspectiveY(model.checkpointCues[0].z, model.horizonDistance) - 30 }}
        />
      )}

      <div className="absolute inset-x-0 bottom-0 h-44 border-t-4" style={{ backgroundColor: theme.bodyColor, borderColor: theme.trimColor }}>
        <div className="mx-auto mt-6 flex w-[74%] items-end justify-between rounded-t-xl border-t-4 px-8 pb-6 pt-5" style={{ backgroundColor: theme.sillColor, borderColor: theme.trimColor }}>
          <div className="h-16 w-12 rounded bg-zinc-900/90" />
          <div className="h-20 w-[44%] rounded-t-lg border-t-4" style={{ backgroundColor: theme.dashColor, borderColor: theme.trimColor }} />
          <div className="h-16 w-12 rounded bg-zinc-900/90" />
        </div>
        <div className="absolute left-1/2 top-6 h-8 w-24 -translate-x-1/2 rounded-md border" style={{ backgroundColor: theme.noseColor, borderColor: theme.trimColor }} />
      </div>
    </div>
  );
}
