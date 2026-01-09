"use client";

import "@xyflow/react/dist/style.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import dagre from "dagre";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupPacks, listDomains } from "./registry";
import type {
  ArchitectureNode,
  Domain,
  FlowChannel,
  NodeKind,
  VendorPack,
  WalkthroughStep,
} from "./types";

type ExplorerMode = "compare" | "single" | "walkthrough";
type LayoutMode = "flow" | "layered";

type PackSelection = {
  vendor: string;
  product: string;
  model: string;
};

type SelectionState = {
  left: PackSelection;
  right: PackSelection;
};

type NodeSelection = {
  side: "left" | "right";
  nodeId: string;
};

type ReactFlowNodeData = {
  label: string;
  kind: NodeKind;
  description?: string;
};

type KindStyle = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const KIND_STYLES: Record<NodeKind, KindStyle> = {
  system: { backgroundColor: "#DBEAFE", borderColor: "#60A5FA", textColor: "#1E3A8A" },
  service: { backgroundColor: "#EDE9FE", borderColor: "#A78BFA", textColor: "#4C1D95" },
  database: { backgroundColor: "#DCFCE7", borderColor: "#4ADE80", textColor: "#14532D" },
  storage: { backgroundColor: "#FEF3C7", borderColor: "#FBBF24", textColor: "#92400E" },
  compute: { backgroundColor: "#FCE7F3", borderColor: "#F472B6", textColor: "#9D174D" },
  network: { backgroundColor: "#E0F2FE", borderColor: "#38BDF8", textColor: "#075985" },
  external: { backgroundColor: "#F3F4F6", borderColor: "#9CA3AF", textColor: "#374151" },
};

const FLOW_LABELS: Record<FlowChannel, string> = {
  data: "READ/WRITE",
  metadata: "CREATE/LIST",
  mgmt: "MGMT",
};

const CHANNEL_OPTIONS: FlowChannel[] = ["data", "metadata"];

const resolvePack = (domain: Domain, selection: PackSelection): VendorPack | undefined => {
  const grouped = groupPacks(domain);
  return grouped[selection.vendor]?.[selection.product]?.[selection.model];
};

const NODE_WIDTH = 190;
const NODE_HEIGHT = 90;
const LANE_SPACING = NODE_HEIGHT + 140;
const LANE_OFFSET = 40;

const getLane = (kind: NodeKind): number => {
  switch (kind) {
    case "external":
    case "network":
      return 0;
    case "system":
    case "service":
      return 1;
    case "database":
    case "storage":
    case "compute":
      return 2;
    default:
      return 3;
  }
};

const derivePackSelection = (domain: Domain): PackSelection => {
  const grouped = groupPacks(domain);
  const vendor = Object.keys(grouped)[0] ?? "";
  const product = vendor ? Object.keys(grouped[vendor] ?? {})[0] ?? "" : "";
  const model = product ? Object.keys(grouped[vendor]?.[product] ?? {})[0] ?? "" : "";

  return { vendor, product, model };
};

const layoutNodes = (pack: VendorPack, layoutMode: LayoutMode): Node<ReactFlowNodeData>[] => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  const isLayered = layoutMode === "layered";
  graph.setGraph({
    rankdir: "LR",
    nodesep: isLayered ? 70 : 60,
    ranksep: isLayered ? 90 : 80,
  });

  pack.spec.nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  pack.spec.edges.forEach((edge) => {
    graph.setEdge(edge.from, edge.to);
  });

  dagre.layout(graph);

  return pack.spec.nodes.map((node) => {
    const style = KIND_STYLES[node.kind];
    const layout = graph.node(node.id) as { x: number; y: number };
    const laneIndex = getLane(node.kind);
    const positionX = layout.x;
    const positionY = isLayered
      ? LANE_OFFSET + laneIndex * LANE_SPACING + NODE_HEIGHT / 2
      : layout.y;

    return {
      id: node.id,
      position: { x: positionX - NODE_WIDTH / 2, y: positionY - NODE_HEIGHT / 2 },
      data: {
        label: node.label,
        kind: node.kind,
        description: node.description,
      },
      style: {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.textColor,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: "solid",
        padding: 12,
        width: NODE_WIDTH,
        fontWeight: 600,
      },
    };
  });
};

const buildFlowEdges = (
  pack: VendorPack,
  selectedChannel: FlowChannel,
  highlightedEdgeIds?: Set<string>,
): Edge[] => {
  const edgeMap = new Map(
    pack.spec.edges.map((edge) => [`${edge.from}->${edge.to}`, edge.id]),
  );
  const flow = pack.spec.flows.find((item) => item.channel === selectedChannel);
  const flowEdgeIds = new Set<string>();

  if (flow?.path && flow.path.length > 1) {
    flow.path.forEach((nodeId, index) => {
      const next = flow.path?.[index + 1];
      if (!next) return;
      const edgeId = edgeMap.get(`${nodeId}->${next}`);
      if (edgeId) flowEdgeIds.add(edgeId);
    });
  } else if (flow) {
    const edgeId = edgeMap.get(`${flow.from}->${flow.to}`);
    if (edgeId) flowEdgeIds.add(edgeId);
  }

  const activeEdgeIds =
    highlightedEdgeIds && highlightedEdgeIds.size > 0 ? highlightedEdgeIds : flowEdgeIds;

  return pack.spec.edges.map((edge) => {
    const isActive = activeEdgeIds.has(edge.id);
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      animated: isActive,
      style: {
        stroke: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        strokeWidth: isActive ? 2.6 : 1.4,
        opacity: isActive ? 1 : 0.2,
      },
      labelStyle: {
        fill: "hsl(var(--foreground))",
        fontSize: 12,
        opacity: isActive ? 0.95 : 0.4,
      },
    };
  });
};

const buildTalkTrack = (pack: VendorPack, node: ArchitectureNode | undefined) => {
  if (!node) {
    return "Q: What should I highlight first?\nA: Select a component in the diagram to unlock a guided talk track.";
  }

  const description = node.description ?? "This component anchors a critical part of the architecture.";

  return `Q: What does ${node.label} do in this architecture?\nA: ${description}\n\nQ: Why does it matter for ${pack.product}?\nA: ${pack.positioning}\n\nQ: What should we watch for?\nA: ${pack.watchouts[0] ?? "Validate performance, scale, and operational readiness with the customer."}`;
};

const FlowCanvas = ({
  pack,
  selectedChannel,
  highlightedNodeIds,
  highlightedEdgeIds,
  onNodeSelect,
  selectedNodeId,
  layoutMode,
}: {
  pack: VendorPack;
  selectedChannel: FlowChannel;
  highlightedNodeIds?: Set<string>;
  highlightedEdgeIds?: Set<string>;
  selectedNodeId?: string;
  onNodeSelect: (node: ArchitectureNode) => void;
  layoutMode: LayoutMode;
}) => {
  const nodes = useMemo(() => layoutNodes(pack, layoutMode), [pack, layoutMode]);

  const edges = useMemo(
    () => buildFlowEdges(pack, selectedChannel, highlightedEdgeIds),
    [pack, selectedChannel, highlightedEdgeIds],
  );

  const displayNodes = useMemo(() => {
    return nodes.map((node) => {
      const baseStyle = (node.style ?? {}) as CSSProperties;
      const isSelected = node.id === selectedNodeId;
      const isHighlighted = highlightedNodeIds?.has(node.id) ?? false;

      return {
        ...node,
        style: {
          ...baseStyle,
          borderWidth: isSelected || isHighlighted ? 3 : 2,
          borderColor:
            isHighlighted || isSelected ? "hsl(var(--primary))" : baseStyle.borderColor,
          boxShadow:
            isSelected || isHighlighted ? "0 0 0 3px rgba(59,130,246,0.3)" : "none",
        },
      } as Node<ReactFlowNodeData>;
    });
  }, [nodes, selectedNodeId, highlightedNodeIds]);

  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<ReactFlowNodeData>, Edge> | null
  >(null);

  useEffect(() => {
    if (!flowInstance) return;
    requestAnimationFrame(() => flowInstance.fitView({ padding: 0.2, duration: 300 }));
  }, [flowInstance, nodes, edges]);

  const handleNodeClick = useCallback(
    (_event: ReactMouseEvent, node: Node<ReactFlowNodeData>) => {
      const original = pack.spec.nodes.find((item) => item.id === node.id);
      if (original) onNodeSelect(original);
    },
    [onNodeSelect, pack],
  );

  return (
    <div className="h-full rounded-lg border border-dashed border-border/70">
      <ReactFlow<Node<ReactFlowNodeData>, Edge>
        nodes={displayNodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        onInit={(instance) => setFlowInstance(instance)}
        fitView
      >
        <Background gap={16} color="hsl(var(--border))" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const PackSelector = ({
  label,
  selection,
  onSelectionChange,
  groupedPacks,
}: {
  label: string;
  selection: PackSelection;
  onSelectionChange: (selection: PackSelection) => void;
  groupedPacks: ReturnType<typeof groupPacks>;
}) => {
  const vendors = Object.keys(groupedPacks);
  const products = selection.vendor ? Object.keys(groupedPacks[selection.vendor] ?? {}) : [];
  const models =
    selection.vendor && selection.product
      ? Object.keys(groupedPacks[selection.vendor]?.[selection.product] ?? {})
      : [];

  const handleVendorChange = (vendor: string) => {
    const product = Object.keys(groupedPacks[vendor] ?? {})[0] ?? "";
    const model = product ? Object.keys(groupedPacks[vendor]?.[product] ?? {})[0] ?? "" : "";
    onSelectionChange({ vendor, product, model });
  };

  const handleProductChange = (product: string) => {
    const model = product
      ? Object.keys(groupedPacks[selection.vendor]?.[product] ?? {})[0] ?? ""
      : "";
    onSelectionChange({ ...selection, product, model });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Vendor</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={selection.vendor}
            onChange={(event) => handleVendorChange(event.target.value)}
          >
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Product</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={selection.product}
            onChange={(event) => handleProductChange(event.target.value)}
          >
            {products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Model</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={selection.model}
            onChange={(event) => onSelectionChange({ ...selection, model: event.target.value })}
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export function ArchitectureExplorer() {
  const domains = useMemo(() => listDomains(), []);
  const [domain, setDomain] = useState<Domain>(domains[0] ?? "Storage");
  const [mode, setMode] = useState<ExplorerMode>("compare");
  const [selectedChannel, setSelectedChannel] = useState<FlowChannel>("data");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("layered");
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);

  const initialSelection = useMemo(() => derivePackSelection(domain), [domain]);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    left: initialSelection,
    right: initialSelection,
  });

  const [selectedNode, setSelectedNode] = useState<NodeSelection | null>(null);

  useEffect(() => {
    setSelectionState({ left: initialSelection, right: initialSelection });
    setSelectedNode(null);
  }, [initialSelection]);

  const groupedPacks = useMemo(() => groupPacks(domain), [domain]);

  const leftPack = resolvePack(domain, selectionState.left);
  const rightPack = resolvePack(domain, selectionState.right);
  const walkthroughSteps = useMemo<WalkthroughStep[]>(
    () => leftPack?.walkthrough ?? [],
    [leftPack],
  );
  const activeWalkthroughStep = walkthroughSteps[walkthroughStepIndex];

  useEffect(() => {
    if (mode !== "walkthrough") return;
    setWalkthroughStepIndex(0);
  }, [mode, leftPack?.id]);

  useEffect(() => {
    if (walkthroughStepIndex < walkthroughSteps.length) return;
    setWalkthroughStepIndex(0);
  }, [walkthroughStepIndex, walkthroughSteps.length]);

  const handleSelectNode = (side: "left" | "right") => (node: ArchitectureNode) => {
    setSelectedNode({ side, nodeId: node.id });
  };

  const activePack =
    mode === "walkthrough" ? leftPack : selectedNode?.side === "right" ? rightPack : leftPack;
  const activeNode = useMemo(() => {
    if (!activePack || !selectedNode) return undefined;
    return activePack.spec.nodes.find((node) => node.id === selectedNode.nodeId);
  }, [activePack, selectedNode]);

  const highlightedNodeIds = useMemo(
    () => new Set(activeWalkthroughStep?.nodeIds ?? []),
    [activeWalkthroughStep],
  );
  const highlightedEdgeIds = useMemo(
    () => new Set(activeWalkthroughStep?.edgeIds ?? []),
    [activeWalkthroughStep],
  );

  const connectedNodes = useMemo(() => {
    if (!activePack || !activeNode) return [];

    return activePack.spec.edges
      .filter((edge) => edge.from === activeNode.id || edge.to === activeNode.id)
      .map((edge) => (edge.from === activeNode.id ? edge.to : edge.from))
      .map((nodeId) => activePack.spec.nodes.find((node) => node.id === nodeId)?.label)
      .filter((label): label is string => Boolean(label));
  }, [activePack, activeNode]);

  const componentBullets = useMemo(() => {
    if (!activePack || !activeNode) {
      return [
        "Select a component to reveal key points.",
        "We will summarize its role, dependencies, and flow alignment.",
      ];
    }

    return [
      activeNode.description ?? "Core component in the solution architecture.",
      `Role: ${activeNode.kind.toUpperCase()}`,
      connectedNodes.length
        ? `Connected to: ${connectedNodes.join(", ")}.`
        : "No direct dependencies defined in this pack.",
    ];
  }, [activePack, activeNode, connectedNodes]);

  const talkTrack = useMemo(() => {
    if (!activePack) {
      return "Q: Which pack is active?\nA: Choose a pack to view a guided talk track.";
    }

    return buildTalkTrack(activePack, activeNode);
  }, [activePack, activeNode]);

  const walkthroughScript =
    activeWalkthroughStep?.script ?? "No walkthrough steps are available for this pack yet.";

  const gridCols = mode === "compare" ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(0,1fr)_320px]";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Architecture Explorer</h1>
        <p className="text-sm text-foreground/70">
          Compare vendor architecture packs, explore data flows, and drive partner-ready talk tracks.
        </p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Domain</span>
          <select
            className="h-10 w-48 rounded-md border border-border bg-background px-3 text-sm"
            value={domain}
            onChange={(event) => setDomain(event.target.value as Domain)}
          >
            {domains.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
            {(["compare", "single", "walkthrough"] as ExplorerMode[]).map((option) => (
              <Button
                key={option}
                variant={mode === option ? "primary" : "ghost"}
                className="h-8 px-3 text-xs capitalize"
                onClick={() => setMode(option)}
              >
                {option}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
            {CHANNEL_OPTIONS.map((channel) => (
              <Button
                key={channel}
                variant={selectedChannel === channel ? "primary" : "ghost"}
                className="h-8 px-3 text-xs"
                onClick={() => setSelectedChannel(channel)}
              >
                {FLOW_LABELS[channel]}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
            <span className="pl-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/60">
              Layout
            </span>
            {(["flow", "layered"] as LayoutMode[]).map((option) => (
              <Button
                key={option}
                variant={layoutMode === option ? "primary" : "ghost"}
                className="h-8 px-3 text-xs capitalize"
                onClick={() => setLayoutMode(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${gridCols}`}>
        <div className="space-y-4">
          <PackSelector
            label={mode === "single" ? "Pack" : "Left pack"}
            selection={selectionState.left}
            onSelectionChange={(selection) =>
              setSelectionState((prev) => ({
                ...prev,
                left: selection,
              }))
            }
            groupedPacks={groupedPacks}
          />

          {leftPack ? (
            <Card className="min-h-[420px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {leftPack.vendor} {leftPack.product} {leftPack.model}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[420px]">
                <FlowCanvas
                  pack={leftPack}
                  selectedChannel={selectedChannel}
                  highlightedNodeIds={mode === "walkthrough" ? highlightedNodeIds : undefined}
                  highlightedEdgeIds={mode === "walkthrough" ? highlightedEdgeIds : undefined}
                  selectedNodeId={selectedNode?.side === "left" ? selectedNode.nodeId : undefined}
                  onNodeSelect={handleSelectNode("left")}
                  layoutMode={layoutMode}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-sm text-foreground/70">
                No packs available for this domain yet.
              </CardContent>
            </Card>
          )}

          {mode === "walkthrough" ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Walkthrough</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/70">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Step {walkthroughSteps.length ? walkthroughStepIndex + 1 : 0} of{" "}
                    {walkthroughSteps.length}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {activeWalkthroughStep?.title ?? "No walkthrough steps available"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs"
                    onClick={() =>
                      setWalkthroughStepIndex((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={walkthroughStepIndex === 0}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="h-8 px-3 text-xs"
                    onClick={() =>
                      setWalkthroughStepIndex((prev) =>
                        Math.min(prev + 1, Math.max(walkthroughSteps.length - 1, 0)),
                      )
                    }
                    disabled={walkthroughStepIndex >= walkthroughSteps.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {mode === "compare" ? (
          <div className="space-y-4">
            <PackSelector
              label="Right pack"
              selection={selectionState.right}
              onSelectionChange={(selection) =>
                setSelectionState((prev) => ({
                  ...prev,
                  right: selection,
                }))
              }
              groupedPacks={groupedPacks}
            />

            {rightPack ? (
              <Card className="min-h-[420px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {rightPack.vendor} {rightPack.product} {rightPack.model}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[420px]">
                  <FlowCanvas
                    pack={rightPack}
                    selectedChannel={selectedChannel}
                    highlightedNodeIds={undefined}
                    highlightedEdgeIds={undefined}
                    selectedNodeId={selectedNode?.side === "right" ? selectedNode.nodeId : undefined}
                    onNodeSelect={handleSelectNode("right")}
                    layoutMode={layoutMode}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-sm text-foreground/70">
                  No packs available for this domain yet.
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instructor Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground/70">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                {activePack ? `${activePack.vendor} · ${activePack.product}` : "Select a pack"}
              </span>
              <h2 className="text-lg font-semibold text-foreground">
                {mode === "walkthrough"
                  ? activeWalkthroughStep?.title ?? "Walkthrough script"
                  : activeNode?.label ?? "Click a node to begin"}
              </h2>
            </div>

            <div>
              {mode === "walkthrough" ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Walkthrough cues
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">
                    Highlight the nodes and edges shown in this step, then advance to continue.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Component bullets
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {componentBullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                {mode === "walkthrough" ? "Walkthrough script" : "Talk track"}
              </p>
              <p className="mt-2 whitespace-pre-line text-foreground/80">
                {mode === "walkthrough" ? walkthroughScript : talkTrack}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
