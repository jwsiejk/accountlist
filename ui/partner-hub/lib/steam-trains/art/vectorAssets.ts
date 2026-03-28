import type { LevelScene, LocomotiveDefinition, TrainDefinition } from "../types";

export type AssetLayer = {
  path: string;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  alpha?: number;
};

export type LocomotiveAssetFamily = {
  bodyShell: AssetLayer[];
  smokeboxFront: AssetLayer[];
  stack: AssetLayer[];
  cab: AssetLayer[];
  headlamp: AssetLayer[];
  pilot: AssetLayer[];
  runningBoard: AssetLayer[];
};

const BASE_FREIGHT_FAMILY: LocomotiveAssetFamily = {
  pilot: [
    { path: "M-54 2 L8 4 L14 -30 L-22 -34 Z", fill: "#1f2937" },
    { path: "M-50 -2 L0 -4 L8 -24 L-18 -26 Z", fill: "#475569", alpha: 0.7 },
  ],
  runningBoard: [
    { path: "M10 -36 H270 V-14 H10 Z", fill: "#111827" },
    { path: "M12 -35 H266 V-30 H12 Z", fill: "#2e3a4d" },
  ],
  bodyShell: [
    { path: "M22 -110 C34 -126 96 -132 172 -128 C232 -126 256 -114 262 -96 L262 -48 H22 Z", fill: "#0f172a" },
    { path: "M30 -106 C40 -118 98 -122 170 -120 C218 -118 244 -108 248 -96 L248 -58 H30 Z", fill: "{paint}" },
    { path: "M38 -94 C78 -88 198 -90 238 -96 L238 -70 C190 -62 92 -62 38 -72 Z", fill: "rgba(240,248,255,0.2)" },
    { path: "M56 -116 H214 V-110 H56 Z", fill: "{trim}" },
  ],
  smokeboxFront: [
    { path: "M252 -90 C278 -92 294 -72 292 -52 C290 -34 272 -22 250 -22 C234 -22 216 -30 212 -48 C206 -72 224 -88 252 -90 Z", fill: "#252f3f" },
    { path: "M250 -82 C268 -82 280 -70 280 -54 C280 -38 268 -26 250 -26 C236 -26 224 -36 224 -54 C224 -70 236 -82 250 -82 Z", stroke: "#c7d2e0", lineWidth: 3 },
  ],
  stack: [
    { path: "M90 -158 H118 V-106 H90 Z", fill: "#202b3d" },
    { path: "M78 -166 H130 V-152 H78 Z", fill: "#0f172a" },
    { path: "M84 -104 H124 V-96 H84 Z", fill: "#3a465b" },
  ],
  cab: [
    { path: "M188 -118 H286 V-44 H188 Z", fill: "{paint}" },
    { path: "M178 -128 H294 V-118 H178 Z", fill: "#141c2a" },
    { path: "M202 -100 H226 V-78 H202 Z", fill: "#c9ecff" },
    { path: "M238 -100 H262 V-78 H238 Z", fill: "#c9ecff" },
    { path: "M188 -50 H286 V-44 H188 Z", fill: "#0b1220" },
  ],
  headlamp: [
    { path: "M8 -70 C20 -82 36 -82 48 -70 C36 -58 20 -58 8 -70 Z", fill: "rgba(255, 248, 205, 0.55)" },
    { path: "M28 -70 C38 -70 46 -62 46 -52 C46 -42 38 -34 28 -34 C18 -34 10 -42 10 -52 C10 -62 18 -70 28 -70 Z", fill: "#b8860b" },
    { path: "M28 -64 C34 -64 38 -58 38 -52 C38 -46 34 -40 28 -40 C22 -40 18 -46 18 -52 C18 -58 22 -64 28 -64 Z", fill: "#fff1a8" },
  ],
};

const BASE_PASSENGER_FAMILY: LocomotiveAssetFamily = {
  ...BASE_FREIGHT_FAMILY,
  bodyShell: [
    { path: "M18 -106 C38 -128 118 -132 220 -124 C248 -122 266 -108 272 -94 L272 -48 H18 Z", fill: "#0f172a" },
    { path: "M24 -102 C42 -118 118 -122 214 -116 C242 -114 258 -104 262 -92 L262 -58 H24 Z", fill: "{paint}" },
    { path: "M38 -88 C90 -82 202 -84 250 -90 L250 -74 C194 -66 94 -66 38 -74 Z", fill: "rgba(236,245,255,0.24)" },
    { path: "M46 -112 H238 V-106 H46 Z", fill: "{trim}" },
  ],
  stack: [
    { path: "M104 -148 H130 V-108 H104 Z", fill: "#1f2937" },
    { path: "M94 -158 H140 V-146 H94 Z", fill: "#0f172a" },
  ],
};

const BASE_SWITCHER_FAMILY: LocomotiveAssetFamily = {
  ...BASE_FREIGHT_FAMILY,
  bodyShell: [
    { path: "M18 -96 C36 -112 96 -116 168 -110 C192 -108 208 -98 214 -86 L214 -46 H18 Z", fill: "#0f172a" },
    { path: "M24 -92 C40 -104 94 -106 164 -102 C184 -100 198 -92 202 -82 L202 -56 H24 Z", fill: "{paint}" },
    { path: "M30 -78 C68 -72 148 -74 186 -80 L186 -66 C148 -60 66 -60 30 -68 Z", fill: "rgba(236,245,255,0.2)" },
    { path: "M42 -98 H178 V-92 H42 Z", fill: "{trim}" },
  ],
  cab: [
    { path: "M132 -106 H214 V-44 H132 Z", fill: "{paint}" },
    { path: "M124 -116 H220 V-106 H124 Z", fill: "#141c2a" },
    { path: "M146 -92 H166 V-72 H146 Z", fill: "#c9ecff" },
    { path: "M174 -92 H194 V-72 H174 Z", fill: "#c9ecff" },
  ],
};

export const pickLocomotiveAssetFamily = (loco: LocomotiveDefinition): LocomotiveAssetFamily => {
  if (loco.wheelSet.count <= 2) return BASE_SWITCHER_FAMILY;
  if (loco.wheelSet.count >= 4) return BASE_FREIGHT_FAMILY;
  return BASE_PASSENGER_FAMILY;
};

export const TENDER_ASSET_LAYERS: AssetLayer[] = [
  { path: "M0 -80 H158 V-10 H0 Z", fill: "#0f172a" },
  { path: "M6 -74 H152 V-18 H6 Z", fill: "{paint}" },
  { path: "M12 -90 H146 V-74 H12 Z", fill: "#111827" },
  { path: "M20 -64 H138 V-54 H20 Z", fill: "rgba(241,245,249,0.18)" },
];

export const PASSENGER_CAR_ASSET_LAYERS: AssetLayer[] = [
  { path: "M0 -72 H172 V-10 H0 Z", fill: "#162234" },
  { path: "M4 -68 H168 V-16 H4 Z", fill: "{paint}" },
  { path: "M8 -62 H164 V-56 H8 Z", fill: "{trim}" },
  { path: "M14 -52 H34 V-32 H14 Z", fill: "#ffefb5" },
  { path: "M44 -52 H64 V-32 H44 Z", fill: "#ffefb5" },
  { path: "M74 -52 H94 V-32 H74 Z", fill: "#ffefb5" },
  { path: "M104 -52 H124 V-32 H104 Z", fill: "#ffefb5" },
  { path: "M134 -52 H154 V-32 H134 Z", fill: "#ffefb5" },
];

export const FREIGHT_CAR_ASSET_LAYERS: AssetLayer[] = [
  { path: "M0 -70 H164 V-10 H0 Z", fill: "#142033" },
  { path: "M6 -64 H158 V-16 H6 Z", fill: "{paint}" },
  { path: "M14 -56 H150 V-26 H14 Z", fill: "#364459" },
  { path: "M20 -60 V-20", stroke: "rgba(226,232,240,0.4)", lineWidth: 4 },
  { path: "M44 -60 V-20", stroke: "rgba(226,232,240,0.4)", lineWidth: 4 },
  { path: "M68 -60 V-20", stroke: "rgba(226,232,240,0.4)", lineWidth: 4 },
  { path: "M92 -60 V-20", stroke: "rgba(226,232,240,0.4)", lineWidth: 4 },
  { path: "M116 -60 V-20", stroke: "rgba(226,232,240,0.4)", lineWidth: 4 },
  { path: "M140 -60 V-20", stroke: "rgba(226,232,240,0.4)", lineWidth: 4 },
];

export const BACKDROP_LAYERS: AssetLayer[] = [
  { path: "M0 0 H1000 V500 H0 Z", fill: "{skyGradient}" },
  { path: "M0 250 H1000 V500 H0 Z", fill: "{groundGradient}" },
];

export const SCENE_LAYERS: Record<LevelScene, AssetLayer[]> = {
  yard: [
    { path: "M60 -170 H320 V-64 H60 Z", fill: "#6a7483" },
    { path: "M40 -188 H344 V-170 H40 Z", fill: "#4a5568" },
    { path: "M76 -142 H112 V-92 H76 Z", fill: "#334155" },
    { path: "M132 -142 H168 V-92 H132 Z", fill: "#334155" },
    { path: "M188 -142 H224 V-92 H188 Z", fill: "#334155" },
    { path: "M244 -142 H280 V-92 H244 Z", fill: "#334155" },
    { path: "M360 -70 H620 V-58 H360 Z", fill: "#6b4f36" },
  ],
  station: [
    { path: "M460 -192 H860 V-62 H460 Z", fill: "#f5f7fb" },
    { path: "M438 -212 H886 V-192 H438 Z", fill: "#8d5a4d" },
    { path: "M492 -166 H528 V-116 H492 Z", fill: "#32485f" },
    { path: "M552 -166 H588 V-116 H552 Z", fill: "#32485f" },
    { path: "M612 -166 H648 V-116 H612 Z", fill: "#32485f" },
    { path: "M672 -166 H708 V-116 H672 Z", fill: "#32485f" },
    { path: "M732 -166 H768 V-116 H732 Z", fill: "#32485f" },
    { path: "M450 -12 H900 V2 H450 Z", fill: "#8796ab" },
  ],
  bridge: [
    { path: "M60 12 H940 V44 H60 Z", fill: "#344357" },
    { path: "M80 44 H96 V136 H80 Z", fill: "#43566b" },
    { path: "M180 44 H196 V136 H180 Z", fill: "#43566b" },
    { path: "M280 44 H296 V136 H280 Z", fill: "#43566b" },
    { path: "M380 44 H396 V136 H380 Z", fill: "#43566b" },
    { path: "M480 44 H496 V136 H480 Z", fill: "#43566b" },
    { path: "M580 44 H596 V136 H580 Z", fill: "#43566b" },
    { path: "M680 44 H696 V136 H680 Z", fill: "#43566b" },
    { path: "M780 44 H796 V136 H780 Z", fill: "#43566b" },
    { path: "M0 136 H1000 V260 H0 Z", fill: "#285281" },
  ],
  tunnel: [
    { path: "M620 -20 C620 -140 860 -140 860 -20 V110 H620 Z", fill: "#556173" },
    { path: "M648 -20 C648 -118 832 -118 832 -20 V94 H648 Z", fill: "#111827" },
    { path: "M580 96 H900 V128 H580 Z", fill: "#495567" },
  ],
};

export const STEAM_PLUME_LAYERS: AssetLayer[] = [
  { path: "M0 0 C14 -20 42 -20 56 0 C42 16 14 16 0 0 Z", fill: "rgba(255,255,255,{alpha})" },
  { path: "M8 -8 C24 -24 48 -24 64 -8 C52 8 24 12 8 -8 Z", fill: "rgba(219,228,240,{alphaSoft})" },
  { path: "M18 -16 C30 -30 50 -30 62 -16 C54 -2 30 2 18 -16 Z", fill: "rgba(148,163,184,{alphaSmoke})" },
];

export const resolveTrainCarLayers = (train: TrainDefinition): AssetLayer[] =>
  train.id.includes("passenger") ? PASSENGER_CAR_ASSET_LAYERS : FREIGHT_CAR_ASSET_LAYERS;
