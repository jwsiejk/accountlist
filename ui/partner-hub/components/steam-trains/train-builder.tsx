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

import { TrainPreviewCanvas } from "./train-preview-canvas";

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
            <TrainPreviewCanvas train={previewTrain} width={320} height={128} className="h-36 w-full" />
            <p className="mt-2 text-sm font-bold text-slate-800">{previewTrain.displayName}</p>
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
