import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TRAIN_BUILDER_SLOT_OPTIONS,
  buildTrainDefinitionFromSelection,
  type BuilderSlotOption,
  getDefaultTrainBuilderSelection,
  type TrainBuilderSelection,
  validateTrainBuilderSelection,
} from "@/lib/steam-trains/builder";
import { getCarWindowColor, getLocomotiveSilhouette, getPreviewPalette, getTrainLayout } from "@/lib/steam-trains/visuals";
import type { TrainDefinition } from "@/lib/steam-trains/types";

type TrainBuilderProps = {
  selection: TrainBuilderSelection;
  onChange: (next: TrainBuilderSelection) => void;
  onSave: () => void;
  onPlay: () => void;
  onReset: () => void;
  saveDisabled?: boolean;
  savedTrains: TrainDefinition[];
  onLoadSaved: (trainId: string) => void;
};

const slotRows: Array<{ key: keyof TrainBuilderSelection; label: string; options: BuilderSlotOption[] }> = [
  { key: "smokestackId", label: "Smokestack", options: TRAIN_BUILDER_SLOT_OPTIONS.smokestack },
  { key: "bodyShellId", label: "Boiler", options: TRAIN_BUILDER_SLOT_OPTIONS.bodyShell },
  { key: "cabId", label: "Cab", options: TRAIN_BUILDER_SLOT_OPTIONS.cab },
  { key: "headlampId", label: "Headlamp", options: TRAIN_BUILDER_SLOT_OPTIONS.headlamp },
  { key: "wheelArrangementId", label: "Wheels", options: TRAIN_BUILDER_SLOT_OPTIONS.wheelArrangement },
  { key: "drivingRodStyleId", label: "Driving Rod", options: TRAIN_BUILDER_SLOT_OPTIONS.drivingRodStyle },
  { key: "tenderStyleId", label: "Tender", options: TRAIN_BUILDER_SLOT_OPTIONS.tenderStyle },
  { key: "carSetId", label: "Cars", options: TRAIN_BUILDER_SLOT_OPTIONS.carSet },
  { key: "accentColorId", label: "Accent", options: TRAIN_BUILDER_SLOT_OPTIONS.accentColor },
];

const cycleOption = (options: BuilderSlotOption[], currentId: string, direction: -1 | 1): string => {
  const currentIndex = Math.max(0, options.findIndex((option) => option.id === currentId));
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  return options[nextIndex]?.id ?? options[0]?.id ?? currentId;
};

const previewWidth = 320;
const previewBaseY = 96;
const previewPadding = 10;
const previewCarGap = 10;
const previewPalette = getPreviewPalette();

const renderPreviewLocomotive = (train: TrainDefinition, locomotiveStart: number, scale: number) => {
  const loco = train.locomotive;
  const silhouette = getLocomotiveSilhouette(loco);
  const pilot = loco.pilot ?? { length: 40, height: 24, color: "#374151", ribCount: 5 };

  return (
    <g>
      <polygon
        points={`${locomotiveStart - pilot.length * scale},${previewBaseY} ${locomotiveStart + 4},${previewBaseY} ${locomotiveStart + 4},${previewBaseY - pilot.height * scale}`}
        fill={pilot.color}
      />
      <rect
        x={locomotiveStart + 10 * scale}
        y={previewBaseY + silhouette.runningBoardY * scale}
        width={(silhouette.boilerLength + 50) * scale}
        height={train.locomotive.bodyHeight * 0.34 * scale}
        fill={previewPalette.runningBoard}
      />
      <rect
        x={locomotiveStart + 18 * scale}
        y={previewBaseY + silhouette.boilerTop * scale}
        width={silhouette.boilerLength * scale}
        height={silhouette.boilerHeight * scale}
        rx={10 * scale}
        fill={loco.color}
      />
      <circle
        cx={locomotiveStart + silhouette.smokeboxCenterX * scale}
        cy={previewBaseY + (silhouette.boilerTop + silhouette.boilerHeight / 2) * scale}
        r={silhouette.smokeboxRadius * scale}
        fill={previewPalette.smokebox}
      />
      <rect
        x={locomotiveStart + 22 * scale}
        y={previewBaseY + (silhouette.boilerTop - 9) * scale}
        width={silhouette.boilerLength * 0.58 * scale}
        height={6 * scale}
        fill={loco.trimColor}
      />
      {loco.stack && (
        <>
          <rect
            x={locomotiveStart + loco.stack.offsetX * scale}
            y={previewBaseY + loco.stack.offsetY * scale}
            width={loco.stack.width * scale}
            height={loco.stack.height * scale}
            rx={2 * scale}
            fill={previewPalette.stack}
          />
          <rect
            x={locomotiveStart + (loco.stack.offsetX - (loco.stack.flareWidth - loco.stack.width) / 2) * scale}
            y={previewBaseY + (loco.stack.offsetY - loco.stack.flareHeight) * scale}
            width={loco.stack.flareWidth * scale}
            height={loco.stack.flareHeight * scale}
            rx={2 * scale}
            fill={previewPalette.stack}
          />
        </>
      )}
      {loco.cab && (
        <polygon
          points={`${locomotiveStart + loco.cab.offsetX * scale},${previewBaseY - (loco.cab.height - 2) * scale} ${locomotiveStart + (loco.cab.offsetX + loco.cab.width) * scale},${previewBaseY - (loco.cab.height - 2) * scale} ${locomotiveStart + (loco.cab.offsetX + loco.cab.width) * scale},${previewBaseY - 8 * scale} ${locomotiveStart + (loco.cab.offsetX + 10) * scale},${previewBaseY - 8 * scale}`}
          fill={loco.color}
        />
      )}
      {Array.from({ length: loco.wheelSet.count }).map((_, wheelIndex) => (
        <g key={`${train.id}-wheel-${wheelIndex}`}>
          <circle
            cx={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing) * scale}
            cy={previewBaseY}
            r={loco.wheelSet.radius * scale}
            fill={previewPalette.wheelFill}
          />
          <circle
            cx={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing) * scale}
            cy={previewBaseY}
            r={(loco.wheelSet.radius - 4) * scale}
            fill="none"
            stroke={previewPalette.wheelRim}
            strokeWidth={1.6 * scale}
          />
          <line
            x1={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing - loco.wheelSet.radius + 4) * scale}
            y1={previewBaseY}
            x2={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing + loco.wheelSet.radius - 4) * scale}
            y2={previewBaseY}
            stroke={previewPalette.wheelSpoke}
            strokeWidth={1.2 * scale}
          />
        </g>
      ))}
    </g>
  );
};

export function TrainBuilder({
  selection,
  onChange,
  onSave,
  onPlay,
  onReset,
  saveDisabled,
  savedTrains,
  onLoadSaved,
}: TrainBuilderProps) {
  const issues = validateTrainBuilderSelection(selection);
  const previewTrain = buildTrainDefinitionFromSelection(selection, "preview-custom");
  const previewLayout = getTrainLayout(previewTrain, previewWidth, previewPadding, 0.62, {
    locomotiveToTender: 18,
    carGap: previewCarGap,
  });

  return (
    <section className="space-y-4" aria-label="Train workshop">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Workshop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-semibold">Train Name</span>
              <input
                className="h-12 w-full rounded-xl border px-3 text-lg"
                value={selection.trainName}
                onChange={(event) => onChange({ ...selection, trainName: event.target.value })}
                maxLength={24}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-semibold">Number Plate</span>
              <input
                className="h-12 w-full rounded-xl border px-3 text-lg"
                value={selection.numberPlate}
                onChange={(event) => onChange({ ...selection, numberPlate: event.target.value.replace(/[^0-9A-Z]/gi, "") })}
                maxLength={4}
              />
            </label>
          </div>

          <div className="rounded-2xl border bg-gradient-to-b from-sky-100 via-sky-50 to-green-100 p-3">
            <svg viewBox="0 0 320 128" className="h-36 w-full" role="img" aria-label="Custom train preview">
              <rect x="0" y="95" width={previewWidth} height="15" fill={previewPalette.railBed} />
              <rect x="0" y="93" width={previewWidth} height="3" fill={previewPalette.railTop} />
              <rect x="0" y="101" width={previewWidth} height="3" fill={previewPalette.railBottom} />
              {renderPreviewLocomotive(previewTrain, previewLayout.locomotiveStart, previewLayout.scale)}
              {previewTrain.tender && (
                <g>
                  <rect
                    x={previewLayout.tenderStart}
                    y={previewBaseY - previewTrain.tender.height * previewLayout.scale}
                    width={previewTrain.tender.length * previewLayout.scale}
                    height={previewTrain.tender.height * previewLayout.scale}
                    fill={previewTrain.tender.color}
                  />
                  <rect
                    x={previewLayout.tenderStart + 8 * previewLayout.scale}
                    y={previewBaseY - (previewTrain.tender.height + 12) * previewLayout.scale}
                    width={(previewTrain.tender.length - 16) * previewLayout.scale}
                    height={12 * previewLayout.scale}
                    fill={previewPalette.runningBoard}
                  />
                </g>
              )}
              {previewTrain.rollingStock.map((car, carIndex) => {
                const x = previewLayout.rollingStockStart + carIndex * (car.length + previewCarGap) * previewLayout.scale;
                return (
                  <g key={car.id}>
                    <rect
                      x={x}
                      y={previewBaseY - car.height * previewLayout.scale}
                      width={car.length * previewLayout.scale}
                      height={car.height * previewLayout.scale}
                      fill={car.color}
                    />
                    <rect
                      x={x + 8 * previewLayout.scale}
                      y={previewBaseY - (car.height - 10) * previewLayout.scale}
                      width={(car.length - 16) * previewLayout.scale}
                      height={Math.min(16, car.height * 0.4) * previewLayout.scale}
                      fill={getCarWindowColor(previewTrain.id)}
                    />
                  </g>
                );
              })}
              <text x="12" y="22" fontSize="15" fill="#0f172a" fontWeight="700">
                {previewTrain.displayName}
              </text>
            </svg>
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            {slotRows.map((slot) => {
              const selected = slot.options.find((option) => option.id === selection[slot.key]) ?? slot.options[0];
              return (
                <div key={slot.key} className="flex items-center gap-2 rounded-xl border p-2">
                  <Button type="button" className="h-14 w-14 text-2xl" variant="secondary" onClick={() => onChange({ ...selection, [slot.key]: cycleOption(slot.options, selection[slot.key], -1) })}>
                    ◀
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">{slot.label}</p>
                    <p className="text-lg font-bold">{selected?.label ?? "-"}</p>
                  </div>
                  <Button type="button" className="h-14 w-14 text-2xl" variant="secondary" onClick={() => onChange({ ...selection, [slot.key]: cycleOption(slot.options, selection[slot.key], 1) })}>
                    ▶
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" className="h-14 text-xl font-bold" onClick={onSave} disabled={saveDisabled || issues.length > 0}>
              Save
            </Button>
            <Button type="button" className="h-14 text-xl font-bold" variant="secondary" onClick={onPlay} disabled={issues.length > 0}>
              Play
            </Button>
            <Button
              type="button"
              className="h-14 text-xl font-bold"
              variant="secondary"
              onClick={() => {
                onChange(getDefaultTrainBuilderSelection());
                onReset();
              }}
            >
              Reset
            </Button>
          </div>

          {issues.length > 0 && <p className="rounded-lg bg-amber-100 p-2 text-sm font-semibold">Pick a different wheel/rod/tender combo.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved Custom Trains</CardTitle>
        </CardHeader>
        <CardContent>
          {savedTrains.length === 0 ? (
            <p className="text-sm text-muted-foreground">Save your first train to use it in Levels and Free Play.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedTrains.map((train) => (
                <Button
                  key={train.id}
                  type="button"
                  className="h-auto min-h-14 justify-start px-3 py-2 text-left text-base"
                  variant="secondary"
                  onClick={() => onLoadSaved(train.id)}
                >
                  <span className="mr-2 inline-block h-3 w-8 rounded-full" style={{ backgroundColor: train.locomotive.trimColor }} />
                  <span className="truncate">{train.displayName}</span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
