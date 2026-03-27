import { getLocomotiveSilhouette, getTrainLayout } from "@/lib/steam-trains/visuals";
import type { TrainDefinition } from "@/lib/steam-trains/types";

type TrainSelectorProps = {
  selectedTrainId: string;
  trains: TrainDefinition[];
  onSelectTrain: (trainId: string) => void;
};

const previewWidth = 220;
const baseY = 98;
const previewPadding = 8;
const carGap = 10;

const getTrainRole = (trainId: string): string => {
  if (trainId.includes("switcher")) return "Switcher";
  if (trainId.includes("passenger")) return "Passenger";
  if (trainId.includes("freight")) return "Freight";
  if (trainId.startsWith("custom-train-")) return "Custom";
  return "Steam";
};

const renderLocoPreview = (train: TrainDefinition, locomotiveStart: number, scale: number) => {
  const loco = train.locomotive;
  const silhouette = getLocomotiveSilhouette(loco);
  const pilot = loco.pilot ?? { length: 40, height: 24, color: "#374151", ribCount: 5 };

  return (
    <g>
      <rect x="0" y="95" width={previewWidth} height="15" fill="#7c6450" />
      <rect x="0" y="93" width={previewWidth} height="3" fill="#d1d5db" />
      <rect x="0" y="101" width={previewWidth} height="3" fill="#9ca3af" />

      <polygon
        points={`${locomotiveStart - pilot.length * scale},${baseY} ${locomotiveStart + 4},${baseY} ${locomotiveStart + 4},${baseY - pilot.height * scale}`}
        fill={pilot.color}
      />

      <rect
        x={locomotiveStart + 10 * scale}
        y={baseY + silhouette.runningBoardY * scale}
        width={(silhouette.boilerLength + 50) * scale}
        height={loco.bodyHeight * 0.34 * scale}
        fill="#0f172a"
      />

      <rect
        x={locomotiveStart + 18 * scale}
        y={baseY + silhouette.boilerTop * scale}
        width={silhouette.boilerLength * scale}
        height={silhouette.boilerHeight * scale}
        rx={10 * scale}
        fill={loco.color}
      />

      <circle
        cx={locomotiveStart + silhouette.smokeboxCenterX * scale}
        cy={baseY + (silhouette.boilerTop + silhouette.boilerHeight / 2) * scale}
        r={silhouette.smokeboxRadius * scale}
        fill="#111827"
      />

      <rect
        x={locomotiveStart + 22 * scale}
        y={baseY + (silhouette.boilerTop - 9) * scale}
        width={silhouette.boilerLength * 0.58 * scale}
        height={6 * scale}
        fill={loco.trimColor}
      />

      {loco.stack && (
        <>
          <rect
            x={locomotiveStart + loco.stack.offsetX * scale}
            y={baseY + loco.stack.offsetY * scale}
            width={loco.stack.width * scale}
            height={loco.stack.height * scale}
            rx={2 * scale}
            fill="#0f172a"
          />
          <rect
            x={locomotiveStart + (loco.stack.offsetX - (loco.stack.flareWidth - loco.stack.width) / 2) * scale}
            y={baseY + (loco.stack.offsetY - loco.stack.flareHeight) * scale}
            width={loco.stack.flareWidth * scale}
            height={loco.stack.flareHeight * scale}
            rx={2 * scale}
            fill="#0f172a"
          />
        </>
      )}

      {loco.cab && (
        <polygon
          points={`${locomotiveStart + loco.cab.offsetX * scale},${baseY - (loco.cab.height - 2) * scale} ${locomotiveStart + (loco.cab.offsetX + loco.cab.width) * scale},${baseY - (loco.cab.height - 2) * scale} ${locomotiveStart + (loco.cab.offsetX + loco.cab.width) * scale},${baseY - 8 * scale} ${locomotiveStart + (loco.cab.offsetX + 10) * scale},${baseY - 8 * scale}`}
          fill={loco.color}
        />
      )}

      {Array.from({ length: loco.wheelSet.count }).map((_, wheelIndex) => (
        <g key={`${train.id}-wheel-${wheelIndex}`}>
          <circle
            cx={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing) * scale}
            cy={baseY}
            r={loco.wheelSet.radius * scale}
            fill="#0f172a"
          />
          <circle
            cx={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing) * scale}
            cy={baseY}
            r={(loco.wheelSet.radius - 4) * scale}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1.6 * scale}
          />
        </g>
      ))}
    </g>
  );
};

export function TrainSelector({ selectedTrainId, trains, onSelectTrain }: TrainSelectorProps) {
  return (
    <section className="space-y-2" aria-label="Train selection">
      <h2 className="text-lg font-bold">Choose your train</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {trains.map((train) => {
          const selected = train.id === selectedTrainId;
          const layout = getTrainLayout(train, previewWidth, previewPadding, 0.65, { locomotiveToTender: 20, carGap });

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
                <svg viewBox={`0 0 ${previewWidth} 110`} role="img" aria-label={train.displayName} className="h-28 w-full">
                  {renderLocoPreview(train, layout.locomotiveStart, layout.scale)}
                  {train.tender && (
                    <g>
                      <rect
                        x={layout.tenderStart}
                        y={baseY - train.tender.height * layout.scale}
                        width={train.tender.length * layout.scale}
                        height={train.tender.height * layout.scale}
                        fill={train.tender.color}
                      />
                      <rect
                        x={layout.tenderStart + 8 * layout.scale}
                        y={baseY - (train.tender.height + 12) * layout.scale}
                        width={(train.tender.length - 16) * layout.scale}
                        height={12 * layout.scale}
                        fill="#0f172a"
                      />
                    </g>
                  )}
                  {train.rollingStock.map((car, carIndex) => {
                    const x = layout.rollingStockStart + carIndex * (car.length + carGap) * layout.scale;
                    return (
                      <g key={car.id}>
                        <rect x={x} y={baseY - car.height * layout.scale} width={car.length * layout.scale} height={car.height * layout.scale} fill={car.color} />
                        <rect
                          x={x + 8 * layout.scale}
                          y={baseY - (car.height - 10) * layout.scale}
                          width={(car.length - 16) * layout.scale}
                          height={Math.min(16, car.height * 0.4) * layout.scale}
                          fill={train.id.includes("passenger") ? "#fef3c7" : "#334155"}
                        />
                      </g>
                    );
                  })}
                </svg>
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
