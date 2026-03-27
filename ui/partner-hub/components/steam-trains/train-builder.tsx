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
  const loco = previewTrain.locomotive;

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

          <div className="rounded-2xl border bg-sky-50 p-3">
            <svg viewBox="0 0 320 128" className="h-36 w-full" role="img" aria-label="Custom train preview">
              <rect x="0" y="108" width="320" height="8" fill="#64748b" />
              <rect x="0" y="114" width="320" height="4" fill="#475569" />
              <rect x="14" y={96 - loco.bodyHeight * 0.34} width={loco.bodyLength * 0.52} height={loco.bodyHeight * 0.34} fill={loco.color} />
              <ellipse cx={94} cy={96 - loco.bodyHeight * 0.48} rx={loco.bodyLength * 0.26} ry={loco.bodyHeight * 0.28} fill={loco.color} />
              {loco.stack && <rect x={20 + loco.stack.offsetX * 0.56} y={96 + loco.stack.offsetY * 0.56} width={loco.stack.width * 0.56} height={loco.stack.height * 0.56} fill="#0f172a" />}
              {loco.cab && <rect x={16 + loco.cab.offsetX * 0.56} y={96 - (loco.cab.height + 8) * 0.56} width={loco.cab.width * 0.56} height={loco.cab.height * 0.56} fill={loco.color} />}
              {Array.from({ length: loco.wheelSet.count }).map((_, index) => (
                <circle key={index} cx={18 + (loco.wheelSet.offsetX + index * loco.wheelSet.spacing) * 0.56} cy={96} r={loco.wheelSet.radius * 0.56} fill="#111827" />
              ))}
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
                <Button key={train.id} type="button" className="h-14 justify-start px-4 text-left text-base" variant="secondary" onClick={() => onLoadSaved(train.id)}>
                  {train.displayName}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
