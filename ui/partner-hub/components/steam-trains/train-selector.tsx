import type { TrainDefinition } from "@/lib/steam-trains/types";

type TrainSelectorProps = {
  selectedTrainId: string;
  trains: TrainDefinition[];
  onSelectTrain: (trainId: string) => void;
};

const previewWidth = 220;
const baseY = 98;
const previewPadding = 8;
const locomotiveToTenderGap = 20;
const carGap = 10;

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
          const loco = train.locomotive;
          const tenderLength = train.tender?.length ?? 0;
          const rollingStockLength = train.rollingStock.reduce((total, car) => total + car.length, 0);
          const rollingStockSpacing = Math.max(0, train.rollingStock.length - 1) * carGap;
          const fullConsistLength =
            loco.bodyLength +
            (train.tender ? locomotiveToTenderGap + tenderLength : 0) +
            (train.rollingStock.length > 0 ? locomotiveToTenderGap : 0) +
            rollingStockLength +
            rollingStockSpacing;

          const usablePreviewWidth = previewWidth - previewPadding * 2;
          const scale = Math.min(0.65, usablePreviewWidth / Math.max(1, fullConsistLength));
          const locomotiveStart = previewPadding;
          const tenderStart = locomotiveStart + (loco.bodyLength + locomotiveToTenderGap) * scale;
          const rollingStockStart = tenderStart + (train.tender ? train.tender.length + locomotiveToTenderGap : 0) * scale;

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
              <div className="rounded-xl bg-sky-100 p-2">
                <svg viewBox={`0 0 ${previewWidth} 110`} role="img" aria-label={train.displayName} className="h-28 w-full">
                  <rect x="0" y="96" width={previewWidth} height="8" fill="#64748b" />
                  <rect x="0" y="102" width={previewWidth} height="4" fill="#475569" />
                  <rect
                    x={locomotiveStart}
                    y={baseY - loco.bodyHeight * 0.35 * scale}
                    width={loco.bodyLength * 0.66 * scale}
                    height={loco.bodyHeight * 0.35 * scale}
                    fill={loco.color}
                  />
                  <ellipse
                    cx={locomotiveStart + 10 + loco.bodyLength * 0.38 * scale}
                    cy={baseY - loco.bodyHeight * 0.52 * scale}
                    rx={loco.bodyLength * 0.35 * scale}
                    ry={loco.bodyHeight * 0.32 * scale}
                    fill={loco.color}
                  />
                  {loco.stack && (
                    <>
                      <rect
                        x={locomotiveStart + loco.stack.offsetX * scale}
                        y={baseY + loco.stack.offsetY * scale}
                        width={loco.stack.width * scale}
                        height={loco.stack.height * scale}
                        fill="#0f172a"
                      />
                      <rect
                        x={locomotiveStart + (loco.stack.offsetX - (loco.stack.flareWidth - loco.stack.width) / 2) * scale}
                        y={baseY + (loco.stack.offsetY - loco.stack.flareHeight) * scale}
                        width={loco.stack.flareWidth * scale}
                        height={loco.stack.flareHeight * scale}
                        fill="#0f172a"
                      />
                    </>
                  )}
                  {loco.cab && (
                    <rect
                      x={locomotiveStart + loco.cab.offsetX * scale}
                      y={baseY - (loco.cab.height + 8) * scale}
                      width={loco.cab.width * scale}
                      height={loco.cab.height * scale}
                      fill={loco.color}
                    />
                  )}
                  {Array.from({ length: loco.wheelSet.count }).map((_, wheelIndex) => (
                    <circle
                      key={`${train.id}-wheel-${wheelIndex}`}
                      cx={locomotiveStart + (loco.wheelSet.offsetX + wheelIndex * loco.wheelSet.spacing) * scale}
                      cy={baseY}
                      r={loco.wheelSet.radius * scale}
                      fill="#111827"
                    />
                  ))}
                  {train.tender && (
                    <rect
                      x={tenderStart}
                      y={baseY - train.tender.height * scale}
                      width={train.tender.length * scale}
                      height={train.tender.height * scale}
                      fill={train.tender.color}
                    />
                  )}
                  {train.rollingStock.map((car, carIndex) => {
                    const x = rollingStockStart + carIndex * (car.length + carGap) * scale;
                    return <rect key={car.id} x={x} y={baseY - car.height * scale} width={car.length * scale} height={car.height * scale} fill={car.color} />;
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
