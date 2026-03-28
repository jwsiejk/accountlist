import type { TrainDefinition } from "@/lib/steam-trains/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainPreviewCanvas } from "./train-preview-canvas";
import { TrainSelector } from "./train-selector";

type TrainShowroomProps = {
  selectedTrainId: string;
  trains: TrainDefinition[];
  onSelectTrain: (trainId: string) => void;
};

export function TrainShowroom({ selectedTrainId, trains, onSelectTrain }: TrainShowroomProps) {
  const selectedTrain = trains.find((train) => train.id === selectedTrainId) ?? trains[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Train Showroom</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-gradient-to-b from-sky-100 via-sky-50 to-green-100 p-3">
          {selectedTrain ? (
            <>
              <TrainPreviewCanvas train={selectedTrain} width={920} height={220} className="h-52 w-full" />
              <p className="mt-2 text-lg font-bold text-slate-900">{selectedTrain.displayName}</p>
              <p className="text-sm font-semibold text-slate-700">Outside showroom view • pick a train before driving in cab mode</p>
            </>
          ) : (
            <p className="text-sm font-semibold">No trains available yet.</p>
          )}
        </div>
        <TrainSelector selectedTrainId={selectedTrainId} trains={trains} onSelectTrain={onSelectTrain} />
      </CardContent>
    </Card>
  );
}
