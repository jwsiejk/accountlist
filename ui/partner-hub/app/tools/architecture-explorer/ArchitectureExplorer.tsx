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

type ViewMode = "explore" | "blast" | "demo";

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

const buildDownstreamSet = (startId: string, edges: Edge[]) => {
  const visited = new Set<string>();
  const queue: string[] = [startId];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return visited;
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
  const [viewMode, setViewMode] = useState<ViewMode>("explore");
  const [demoStep, setDemoStep] = useState(0);

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

  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<Node<ArchitectureNodeData>, Edge> | null>(null);
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
    setViewMode("explore");
    setDemoStep(0);

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

  const demoOrder = useMemo(
    () => ((scenario?.nodes ?? []) as Node<ArchitectureNodeData>[]).map((n) => n.id),
    [scenario],
  );

  // Apply graph highlighting based on mode
  const downstreamSet = useMemo(() => {
    if (viewMode !== "blast" || !selectedNodeId) return null;
    return buildDownstreamSet(selectedNodeId, edges);
  }, [viewMode, selectedNodeId, edges]);

  const demoNodeId = useMemo(() => {
    if (viewMode !== "demo") return null;
    return demoOrder[demoStep] ?? null;
  }, [viewMode, demoOrder, demoStep]);

  const displayNodes = useMemo(() => {
    return nodes.map((node) => {
      const baseStyle = node.style ?? {};
      const isSelected = node.id === selectedNodeId;
      const isDemo = demoNodeId ? node.id === demoNodeId : false;

      const inScope = downstreamSet ? downstreamSet.has(node.id) : true;
      const opacity = downstreamSet ? (inScope ? 1 : 0.22) : 1;

      const emphasis = isSelected || isDemo;

      return {
        ...node,
        style: {
          ...baseStyle,
          opacity,
          borderWidth: emphasis ? 3 : (baseStyle as Record<string, unknown>).borderWidth,
          boxShadow: emphasis ? "0 0 0 3px rgba(99, 102, 241, 0.35)" : "none",
        },
      };
    });
  }, [nodes, selectedNodeId, downstreamSet, demoNodeId]);

  const displayEdges = useMemo(() => {
    if (!downstreamSet) return edges;

    return edges.map((edge) => {
      const inScope = downstreamSet.has(edge.source) && downstreamSet.has(edge.target);
      return {
        ...edge,
        style: {
          ...(edge.style ?? {}),
          opacity: inScope ? 1 : 0.15,
          strokeWidth: inScope ? 2 : 1,
        },
      };
    });
  }, [edges, downstreamSet]);

  // Keep demo step in sync with selection + viewport
  useEffect(() => {
    if (viewMode !== "demo" || !demoNodeId) return;
    setSelectedNodeId(demoNodeId);

    if (!flowInstance) return;
    const node = nodes.find((n) => n.id === demoNodeId);
    if (!node) return;

    requestAnimationFrame(() => {
      try {
        // fitView supports selecting a subset of nodes in React Flow v12+
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (flowInstance as any).fitView?.({ nodes: [node], padding: 0.35, duration: 450 });
      } catch {
        flowInstance.fitView({ padding: 0.2, duration: 450 });
      }
    });
  }, [viewMode, demoNodeId, flowInstance, nodes]);

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
      brief: scenario.brief,
      nodes,
      edges,
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
            <Button
              variant={viewMode === "explore" ? "primary" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => setViewMode("explore")}
            >
              Explore
            </Button>
            <Button
              variant={viewMode === "blast" ? "primary" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => setViewMode("blast")}
              disabled={!selectedNodeId}
              title={!selectedNodeId ? "Select a node to enable blast radius." : ""}
            >
              Blast radius
            </Button>
            <Button
              variant={viewMode === "demo" ? "primary" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => {
                setViewMode("demo");
                setDemoStep(0);
              }}
              disabled={demoOrder.length === 0}
            >
              Demo
            </Button>
          </div>

          {viewMode === "demo" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs border border-border"
                onClick={() => setDemoStep((s) => Math.max(0, s - 1))}
                disabled={demoStep <= 0}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs border border-border"
                onClick={() => setDemoStep((s) => Math.min(demoOrder.length - 1, s + 1))}
                disabled={demoStep >= demoOrder.length - 1}
              >
                Next
              </Button>
              <Button
                variant="ghost"
                className="h-8 px-3 text-xs"
                onClick={() => setViewMode("explore")}
              >
                Exit
              </Button>
            </div>
          ) : null}

          <Button variant="secondary" className="border border-border" onClick={handleCopyShare}>
            {copyState}
          </Button>
          <Button
            variant="secondary"
            className="border border-border"
            onClick={handleExportScenario}
          >
            Export scenario JSON
          </Button>
          <Button
            variant="secondary"
            className="border border-border"
            onClick={() => flowInstance?.fitView({ padding: 0.2, duration: 400 })}
          >
            Reset View
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[420px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {viewMode === "blast" ? "Impact Map" : "Solution Map"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[420px]">
            <div className="h-full rounded-lg border border-dashed border-border/70">
              <ReactFlow<Node<ArchitectureNodeData>, Edge>
                nodes={displayNodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={(instance) => setFlowInstance(instance)}
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
              <CardTitle className="text-base">Scenario Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/70">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Business goal
                </p>
                <p className="text-foreground/80">{scenario.brief.problemStatement}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Success criteria
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {scenario.brief.successCriteria.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Constraints
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {scenario.brief.constraints.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              <details className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Delivery plan, assumptions, and risks
                </summary>
                <div className="mt-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      Assumptions
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {scenario.brief.assumptions.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      Phased approach
                    </p>
                    <div className="space-y-3">
                      {scenario.brief.phases.map((phase) => (
                        <div key={phase.title} className="space-y-1">
                          <p className="font-medium text-foreground/80">{phase.title}</p>
                          <ul className="list-disc space-y-1 pl-5">
                            {phase.bullets.map((bullet) => (
                              <li key={bullet}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      Risks and mitigations
                    </p>
                    <div className="space-y-2">
                      {scenario.brief.risks.map((item) => (
                        <div key={item.risk} className="rounded-md border border-border/60 bg-background p-2">
                          <p className="font-medium text-foreground/80">{item.risk}</p>
                          <p className="text-foreground/70">{item.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>

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
