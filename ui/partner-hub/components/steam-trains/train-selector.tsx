import type { TrainDefinition } from "@/lib/steam-trains/types";

import { TrainPreviewCanvas } from "./train-preview-canvas";

type TrainSelectorProps = {
  selectedTrainId: string;
  trains: TrainDefinition[];
  onSelectTrain: (trainId: string) => void;
};

const previewWidth = 220;
const previewHeight = 110;

const getTrainRole = (trainId: string): string => {
  if (trainId.includes("switcher")) return "Switcher";
  if (trainId.includes("passenger")) return "Passenger";
  if (trainId.includes("freight")) return "Freight";
  if (trainId.startsWith("custom-train-")) return "Custom";
  return "Steam";
};

export function TrainSelector({ selectedTrainId, trains, onSelectTrain }: TrainSelectorProps) {
  return (
    <section className="space-y-2" aria-label="Train selection">
      <h2 className="text-lg font-bold">Choose your train</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {trains.map((train) => {
          const selected = train.id === selectedTrainId;

          return (
            <button
              key={train.id}
              type="button"
              onClick={() => onSelectTrain(train.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60"
              }`}
              aria-pressed={selected}
            >
              <div className="rounded-xl bg-gradient-to-b from-sky-100 via-sky-50 to-green-100 p-2">
                <TrainPreviewCanvas train={train} width={previewWidth} height={previewHeight} className="h-28 w-full" animated={selected} />
              </div>
              <p className="mt-2 text-lg font-semibold">{train.displayName}</p>
              <p className="text-sm text-muted-foreground">
                {getTrainRole(train.id)} • {train.locomotive.wheelArrangement}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
