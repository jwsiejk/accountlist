import { EnergyTool } from "@/components/energy/energy-tool";

// Backwards-compatible alias.
// The canonical route is /tools/energy, but this keeps older links working.
export default function EnergyAliasPage() {
  return <EnergyTool />;
}
