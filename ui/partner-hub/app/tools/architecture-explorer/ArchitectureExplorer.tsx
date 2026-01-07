"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  diagramScenarios,
  type ArchitectureNodeCategory,
  type ArchitectureNodeData,
} from "./diagramScenarios";

type CategoryStyle = {
  label: ArchitectureNodeCategory;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const CATEGORY_STYLES: Record<ArchitectureNodeCategory, CategoryStyle> = {
  Compute: {
    label: "Compute",
    backgroundColor: "#DBEAFE",
    borderColor: "#60A5FA",
    textColor: "#1E3A8A",
  },
  Storage: {
    label: "Storage",
    backgroundColor: "#DCFCE7",
    borderColor: "#4ADE80",
    textColor: "#166534",
  },
  Network: {
    label: "Network",
    backgroundColor: "#FEF3C7",
    borderColor: "#FBBF24",
    textColor: "#92400E",
  },
  Security: {
    label: "Security",
    backgroundColor: "#FCE7F3",
    borderColor: "#F472B6",
    textColor: "#9D174D",
  },
  Operations: {
    label: "Operations",
    backgroundColor: "#EDE9FE",
    borderColor: "#A78BFA",
    textColor: "#5B21B6",
  },
};

const decorateNodes = (nodes: Node<ArchitectureNodeData>[]) =>
  nodes.map((node) => {
    const categoryStyle = CATEGORY_STYLES[node.data.category];
    return {
      ...node,
      style: {
        backgroundColor: categoryStyle.backgroundColor,
        borderColor: categoryStyle.borderColor,
        color: categoryStyle.textColor,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: "solid",
        padding: 12,
        width: 180,
        fontWeight: 600,
      },
    };
  });

const buildShareUrl = (scenarioId: string) => {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("scenario", scenarioId);
  return url.toString();
};

const Legend = () => (
  <Card className="h-fit">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Legend</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      {Object.values(CATEGORY_STYLES).map((category) => (
        <div key={category.label} className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-sm border"
            style={{
              backgroundColor: category.backgroundColor,
              borderColor: category.borderColor,
            }}
          />
          <span className="font-medium" style={{ color: category.textColor }}>
            {category.label}
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default function ArchitectureExplorer() {
  const [scenarioId, setScenarioId] = useState(diagramScenarios[0]?.id ?? "");

  const scenario = useMemo(
    () => diagramScenarios.find((s) => s.id === scenarioId) ?? diagramScenarios[0],
    [scenarioId],
  );

  // Ensure local typed views of scenario data (handles cases where diagramScenarios is not strongly typed)
  const scenarioNodes = useMemo(
    () => decorateNodes((scenario?.nodes ?? []) as Node<ArchitectureNodeData>[]),
    [scenario],
  );

  const scenarioEdges = useMemo(
    () => ((scenario?.edges ?? []) as Edge[]),
    [scenario],
  );

  // ✅ FIX #1: generic must be Node<ArchitectureNodeData>, not ArchitectureNodeData
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>(
    scenarioNodes,
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(scenarioEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    (scenario?.nodes?.[0] as Node<ArchitectureNodeData> | undefined)?.id ?? null,
  );

  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [copyState, setCopyState] = useState("Copy share link");

  // Read scenario from query string on first load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const scenarioParam = params.get("scenario");
    if (scenarioParam && diagramScenarios.some((s) => s.id === scenarioParam)) {
      setScenarioId(scenarioParam);
    }
  }, []);

  // When scenario changes, reset graph state + selection + fit view
  useEffect(() => {
    setNodes(scenarioNodes);
    setEdges(scenarioEdges);
    setSelectedNodeId((scenario?.nodes?.[0] as Node<ArchitectureNodeData> | undefined)?.id ?? null);

    if (flowInstance) {
      requestAnimationFrame(() => flowInstance.fitView({ padding: 0.2, duration: 400 }));
    }
  }, [scenario, scenarioNodes, scenarioEdges, setNodes, setEdges, flowInstance]);

  // Keep URL in sync (so share links work)
  useEffect(() => {
    if (typeof window === "undefined" || !scenarioId) return;

    const url = new URL(window.location.href);
    url.searchParams.set("scenario", scenarioId);
    window.history.replaceState({}, "", url.toString());
  }, [scenarioId]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleCopyShare = async () => {
    const shareUrl = buildShareUrl(scenarioId);
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("Copied!");
      window.setTimeout(() => setCopyState("Copy share link"), 2000);
    } catch {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState("Copy share link"), 2000);
    }
  };

  const handleExportScenario = () => {
    if (!scenario) return;

    const payload = {
      id: scenario.id,
      label: scenario.label,
      nodes: scenario.nodes,
      edges: scenario.edges,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.id}-architecture.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Scenario
          </span>
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {diagramScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleCopyShare}>
            {copyState}
          </Button>
          <Button variant="outline" onClick={handleExportScenario}>
            Export scenario JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => flowInstance?.fitView({ padding: 0.2, duration: 400 })}
          >
            Reset View
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[420px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Architecture Map</CardTitle>
          </CardHeader>
          <CardContent className="h-[420px]">
            <div className="h-full rounded-lg border border-dashed border-border/70">
              <ReactFlow<Node<ArchitectureNodeData>, Edge>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={setFlowInstance}
                // ✅ FIX #2: type the unused event param so it’s not implicit any
                onNodeClick={(_event: ReactMouseEvent, node: Node<ArchitectureNodeData>) =>
                  setSelectedNodeId(node.id)
                }
                fitView
              >
                <Background gap={16} color="hsl(var(--border))" />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Node Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/70">
              {selectedNode ? (
                <>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      {selectedNode.data.category}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedNode.data.label}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                        What it does
                      </p>
                      <p className="text-foreground/80">{selectedNode.data.notes.what}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                        Why this design
                      </p>
                      <p className="text-foreground/80">{selectedNode.data.notes.why}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                        Common alternatives
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        {selectedNode.data.notes.alternatives.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                        Tradeoffs
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        {selectedNode.data.notes.tradeoffs.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <p>Select a node to review architecture details.</p>
              )}
            </CardContent>
          </Card>

          <Legend />
        </div>
      </div>
    </div>
  );
}
