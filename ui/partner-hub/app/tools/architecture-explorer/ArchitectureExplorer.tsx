"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { diagramScenarios, type ArchitectureNodeData } from "./diagramScenarios";

export default function ArchitectureExplorer() {
  const [scenarioId, setScenarioId] = useState(diagramScenarios[0]?.id ?? "");
  const scenario = useMemo(
    () => diagramScenarios.find((item) => item.id === scenarioId) ?? diagramScenarios[0],
    [scenarioId],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNodeData>(
    scenario?.nodes ?? [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(scenario?.edges ?? []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    scenario?.nodes[0]?.id ?? null,
  );
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  useEffect(() => {
    if (!scenario) {
      return;
    }

    setNodes(scenario.nodes);
    setEdges(scenario.edges);
    setSelectedNodeId(scenario.nodes[0]?.id ?? null);

    if (flowInstance) {
      requestAnimationFrame(() => {
        flowInstance.fitView({ padding: 0.2, duration: 400 });
      });
    }
  }, [scenario, setNodes, setEdges, flowInstance]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Scenario
          </span>
          <select
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value)}
            className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {diagramScenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          onClick={() => flowInstance?.fitView({ padding: 0.2, duration: 400 })}
        >
          Reset View
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[420px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Architecture Map</CardTitle>
          </CardHeader>
          <CardContent className="h-[420px]">
            <div className="h-full rounded-lg border border-dashed border-border/70">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={setFlowInstance}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                fitView
              >
                <Background gap={16} color="hsl(var(--border))" />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Node Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground/70">
            {selectedNode ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    {selectedNode.data.label}
                  </p>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedNode.data.title}
                  </h3>
                </div>
                <ul className="list-disc space-y-2 pl-5">
                  {selectedNode.data.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Select a node to review architecture details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
