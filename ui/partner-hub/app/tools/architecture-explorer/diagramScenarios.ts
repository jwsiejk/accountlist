import type { Edge, Node } from "@xyflow/react";

export type ArchitectureNodeData = {
  label: string;
  title: string;
  bullets: string[];
};

export type ArchitectureScenario = {
  id: string;
  label: string;
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge[];
};

export const diagramScenarios: ArchitectureScenario[] = [
  {
    id: "data-center-refresh",
    label: "Data Center Refresh",
    nodes: [
      {
        id: "intake",
        position: { x: 40, y: 40 },
        data: {
          label: "Discovery",
          title: "Discovery & Assessment",
          bullets: [
            "Capture workload inventory and growth projections.",
            "Audit resiliency gaps and modernization constraints.",
            "Align stakeholders on refresh timelines and risk posture.",
          ],
        },
      },
      {
        id: "core",
        position: { x: 300, y: 20 },
        data: {
          label: "Core Platform",
          title: "Core Storage Platform",
          bullets: [
            "Standardize on a consolidated block + file tier.",
            "Introduce automation for provisioning and policy.",
            "Prepare for scale-out growth over the next 3 years.",
          ],
        },
      },
      {
        id: "backup",
        position: { x: 300, y: 190 },
        data: {
          label: "Protection",
          title: "Data Protection Layer",
          bullets: [
            "Replace legacy backup tooling with immutable snapshots.",
            "Define retention tiers and recovery objectives.",
            "Coordinate DR runbooks with application teams.",
          ],
        },
      },
      {
        id: "operations",
        position: { x: 560, y: 105 },
        data: {
          label: "Operations",
          title: "Operational Excellence",
          bullets: [
            "Centralize monitoring and ticket automation.",
            "Train ops teams on new workflows.",
            "Measure success with refresh KPIs and service health.",
          ],
        },
      },
    ],
    edges: [
      { id: "e-intake-core", source: "intake", target: "core" },
      { id: "e-intake-backup", source: "intake", target: "backup" },
      { id: "e-core-ops", source: "core", target: "operations" },
      { id: "e-backup-ops", source: "backup", target: "operations" },
    ],
  },
  {
    id: "hybrid-cloud",
    label: "Hybrid Cloud",
    nodes: [
      {
        id: "edge",
        position: { x: 30, y: 120 },
        data: {
          label: "Edge DC",
          title: "Edge Data Center",
          bullets: [
            "Collect latency-sensitive workloads close to users.",
            "Cache data for AI/ML inferencing at the edge.",
            "Stream telemetry back to core cloud services.",
          ],
        },
      },
      {
        id: "core-hub",
        position: { x: 280, y: 30 },
        data: {
          label: "Core Hub",
          title: "Private Cloud Hub",
          bullets: [
            "Host regulated workloads and shared services.",
            "Apply policy-based data tiering for governance.",
            "Provide API integration for dev teams.",
          ],
        },
      },
      {
        id: "public-cloud",
        position: { x: 280, y: 210 },
        data: {
          label: "Public Cloud",
          title: "Public Cloud Extension",
          bullets: [
            "Burst analytics and test environments on demand.",
            "Maintain secure connectivity via VPN / Direct Connect.",
            "Enforce tagging for cost management.",
          ],
        },
      },
      {
        id: "control-plane",
        position: { x: 560, y: 120 },
        data: {
          label: "Control Plane",
          title: "Unified Control Plane",
          bullets: [
            "Surface one view of inventory and compliance.",
            "Automate data mobility workflows.",
            "Enable consistent identity and access control.",
          ],
        },
      },
    ],
    edges: [
      { id: "e-edge-core", source: "edge", target: "core-hub" },
      { id: "e-edge-public", source: "edge", target: "public-cloud" },
      { id: "e-core-control", source: "core-hub", target: "control-plane" },
      { id: "e-public-control", source: "public-cloud", target: "control-plane" },
    ],
  },
  {
    id: "dr-bc",
    label: "DR / BC",
    nodes: [
      {
        id: "primary",
        position: { x: 40, y: 40 },
        data: {
          label: "Primary",
          title: "Primary Data Center",
          bullets: [
            "Host Tier-1 workloads and critical data services.",
            "Provide synchronous replication for key systems.",
            "Maintain local backup and snapshot schedules.",
          ],
        },
      },
      {
        id: "replication",
        position: { x: 300, y: 30 },
        data: {
          label: "Replication",
          title: "Replication Fabric",
          bullets: [
            "Stream deltas to secondary sites in real time.",
            "Monitor lag and alert on RPO deviations.",
            "Test failover without impacting production.",
          ],
        },
      },
      {
        id: "secondary",
        position: { x: 300, y: 200 },
        data: {
          label: "Secondary",
          title: "Secondary Data Center",
          bullets: [
            "Standby infrastructure for automated failover.",
            "Run quarterly DR exercises and audits.",
            "Provide recovery workflows for critical apps.",
          ],
        },
      },
      {
        id: "command",
        position: { x: 560, y: 110 },
        data: {
          label: "Command",
          title: "BC Command Center",
          bullets: [
            "Coordinate communications during an incident.",
            "Track recovery status and business impact.",
            "Review post-incident improvements.",
          ],
        },
      },
    ],
    edges: [
      { id: "e-primary-rep", source: "primary", target: "replication" },
      { id: "e-primary-secondary", source: "primary", target: "secondary" },
      { id: "e-rep-command", source: "replication", target: "command" },
      { id: "e-secondary-command", source: "secondary", target: "command" },
    ],
  },
];
