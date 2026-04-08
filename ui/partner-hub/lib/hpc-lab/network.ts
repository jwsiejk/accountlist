import type { HpcLabNetworkTickState } from "./types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const simulateNetworkTick = (
  requestedReadGbps: number,
  requestedWriteGbps: number,
  networkBandwidthGbps: number,
): HpcLabNetworkTickState => {
  const requestedTotal = requestedReadGbps + requestedWriteGbps;
  const servedRatio = requestedTotal > 0 ? Math.min(1, networkBandwidthGbps / requestedTotal) : 1;

  const deliveredReadGbps = requestedReadGbps * servedRatio;
  const deliveredWriteGbps = requestedWriteGbps * servedRatio;

  return {
    requestedReadGbps,
    requestedWriteGbps,
    deliveredReadGbps,
    deliveredWriteGbps,
    networkUtilization: clamp01(requestedTotal > 0 ? (deliveredReadGbps + deliveredWriteGbps) / networkBandwidthGbps : 0),
    networkPressure: clamp01(1 - servedRatio),
  };
};
