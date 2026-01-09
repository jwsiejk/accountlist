import type { VendorPack } from "../../../types";

export const vastPlatformX: VendorPack = {
  id: "vast-data-vast-platform-x",
  domain: "Storage",
  vendor: "VAST Data",
  product: "VAST Platform",
  model: "X (baseline)",
  pitch:
    "Unified file/object platform delivering low-latency parallel access with global namespace and storage efficiency.",
  positioning:
    "Position for large-scale AI and analytics environments needing a single namespace across flash and capacity tiers.",
  watchouts: [
    "Plan for balanced CBOX/DBOX scaling to keep metadata and data throughput aligned.",
    "Confirm client protocol mix (NFS/SMB/S3) aligns with performance targets.",
    "Reserve network capacity for east-west traffic between enclosures.",
  ],
  walkthrough: [
    {
      id: "vast-step-1",
      title: "AI/analytics clients",
      script: "Begin with the AI/analytics cluster driving parallel read/write demand.",
      nodeIds: ["app-cluster"],
    },
    {
      id: "vast-step-2",
      title: "Client gateway",
      script: "The gateway terminates NFS/SMB/S3 and fans traffic into the platform.",
      nodeIds: ["client-gateway"],
      edgeIds: ["apps-to-gateway"],
    },
    {
      id: "vast-step-3",
      title: "Metadata engine",
      script: "Metadata services keep the global namespace and policy control centralized.",
      nodeIds: ["metadata-engine"],
      edgeIds: ["gateway-to-metadata"],
    },
    {
      id: "vast-step-4",
      title: "Performance tier",
      script: "CBOX delivers NVMe performance for hot data and metadata.",
      nodeIds: ["cbox"],
      edgeIds: ["gateway-to-cbox", "metadata-to-cbox"],
    },
    {
      id: "vast-step-5",
      title: "Capacity tier",
      script: "DBOX provides efficient capacity for snapshots and colder datasets.",
      nodeIds: ["dbox"],
      edgeIds: ["cbox-to-dbox"],
    },
  ],
  spec: {
    nodes: [
      {
        id: "app-cluster",
        kind: "compute",
        label: "AI/Analytics Cluster",
        description: "GPU and analytics applications generating parallel IO.",
      },
      {
        id: "client-gateway",
        kind: "service",
        label: "VAST Client Gateway",
        description: "Client protocol services for NFS/SMB/S3.",
      },
      {
        id: "metadata-engine",
        kind: "service",
        label: "Metadata Engine",
        description: "Global namespace, snapshots, and policy control.",
      },
      {
        id: "cbox",
        kind: "storage",
        label: "CBOX (NVMe)",
        description: "Performance tier for hot data and metadata.",
      },
      {
        id: "dbox",
        kind: "storage",
        label: "DBOX (Capacity)",
        description: "Capacity tier for cold data and snapshots.",
      },
      {
        id: "ops-team",
        kind: "external",
        label: "Ops & Observability",
        description: "Admins, automation, and monitoring tooling.",
      },
    ],
    edges: [
      {
        id: "apps-to-gateway",
        from: "app-cluster",
        to: "client-gateway",
        label: "NFS/SMB/S3",
      },
      {
        id: "gateway-to-metadata",
        from: "client-gateway",
        to: "metadata-engine",
        label: "Namespace ops",
      },
      {
        id: "gateway-to-cbox",
        from: "client-gateway",
        to: "cbox",
        label: "Data IO",
      },
      {
        id: "metadata-to-cbox",
        from: "metadata-engine",
        to: "cbox",
        label: "Metadata storage",
      },
      {
        id: "cbox-to-dbox",
        from: "cbox",
        to: "dbox",
        label: "Tiering",
      },
      {
        id: "ops-to-metadata",
        from: "ops-team",
        to: "metadata-engine",
        label: "Policy + monitoring",
      },
    ],
    flows: [
      {
        id: "vast-data-channel",
        channel: "data",
        from: "app-cluster",
        to: "cbox",
        path: ["app-cluster", "client-gateway", "cbox"],
        description: "READ/WRITE data channel for model training and analytics.",
      },
      {
        id: "vast-metadata-channel",
        channel: "metadata",
        from: "app-cluster",
        to: "metadata-engine",
        path: ["app-cluster", "client-gateway", "metadata-engine"],
        description: "CREATE/LIST metadata channel for namespace operations.",
      },
      {
        id: "vast-tiering-channel",
        channel: "mgmt",
        from: "metadata-engine",
        to: "dbox",
        path: ["metadata-engine", "cbox", "dbox"],
        description: "Policy-driven tiering and lifecycle management.",
      },
    ],
  },
};
