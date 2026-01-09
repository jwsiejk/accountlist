import type { VendorPack } from "../../../types";

export const flashbladeS: VendorPack = {
  id: "pure-storage-flashblade-s",
  domain: "Storage",
  vendor: "Pure Storage",
  product: "FlashBlade",
  model: "//S (baseline)",
  pitch:
    "Scale-out all-flash file and object platform tuned for fast analytics, AI pipelines, and backup/restore workflows.",
  positioning:
    "Lead with ultra-fast parallelism and simple scale-out expansion for latency-sensitive data lakes and modern file services.",
  watchouts: [
    "Plan for high-throughput networking (100/200GbE) to avoid bottlenecks.",
    "Separate metadata services from data movers for predictable performance under mixed workloads.",
    "Validate protection policy requirements when consolidating backup and analytics on the same platform.",
  ],
  walkthrough: [
    {
      id: "fb-step-1",
      title: "Parallel clients",
      script: "Start with the AI/analytics clients generating high-concurrency file and object traffic.",
      nodeIds: ["client-nodes"],
    },
    {
      id: "fb-step-2",
      title: "Protocol front-end",
      script: "Data movers handle NFS/SMB/S3 sessions before fanning traffic into the chassis.",
      nodeIds: ["data-movers"],
      edgeIds: ["client-to-movers"],
    },
    {
      id: "fb-step-3",
      title: "FlashBlade//S core",
      script: "Highlight the FlashBlade//S chassis delivering parallel IO at scale.",
      nodeIds: ["flashblade-s"],
      edgeIds: ["movers-to-blades"],
    },
    {
      id: "fb-step-4",
      title: "Metadata control plane",
      script: "Metadata services keep namespaces, snapshots, and policy aligned.",
      nodeIds: ["metadata-services"],
      edgeIds: ["metadata-to-blades"],
    },
    {
      id: "fb-step-5",
      title: "Ops automation",
      script: "Ops and automation teams drive provisioning and governance flows.",
      nodeIds: ["admin-ops"],
      edgeIds: ["ops-to-metadata"],
    },
  ],
  spec: {
    nodes: [
      {
        id: "client-nodes",
        kind: "compute",
        label: "AI/Analytics Clients",
        description: "GPU and analytics hosts running parallel reads/writes.",
      },
      {
        id: "data-movers",
        kind: "service",
        label: "Data Movers",
        description: "Front-end services handling NFS/SMB/S3 data paths.",
      },
      {
        id: "metadata-services",
        kind: "service",
        label: "Metadata Services",
        description: "Namespace, snapshots, and policy orchestration.",
      },
      {
        id: "flashblade-s",
        kind: "storage",
        label: "FlashBlade//S Chassis",
        description: "Scale-out storage blades with NVMe flash.",
      },
      {
        id: "admin-ops",
        kind: "external",
        label: "Ops & Automation",
        description: "Admins and automation tooling for monitoring and provisioning.",
      },
    ],
    edges: [
      {
        id: "client-to-movers",
        from: "client-nodes",
        to: "data-movers",
        label: "NFS/SMB/S3",
      },
      {
        id: "movers-to-blades",
        from: "data-movers",
        to: "flashblade-s",
        label: "Parallel IO",
      },
      {
        id: "metadata-to-blades",
        from: "metadata-services",
        to: "flashblade-s",
        label: "Metadata + policy",
      },
      {
        id: "ops-to-metadata",
        from: "admin-ops",
        to: "metadata-services",
        label: "Provisioning",
      },
    ],
    flows: [
      {
        id: "flashblade-data-channel",
        channel: "data",
        from: "client-nodes",
        to: "flashblade-s",
        path: ["client-nodes", "data-movers", "flashblade-s"],
        description: "READ/WRITE data channel for datasets and checkpoints.",
      },
      {
        id: "flashblade-metadata-channel",
        channel: "metadata",
        from: "client-nodes",
        to: "metadata-services",
        path: ["client-nodes", "data-movers", "metadata-services"],
        description: "CREATE/LIST metadata channel for namespaces and snapshots.",
      },
      {
        id: "flashblade-ops-channel",
        channel: "mgmt",
        from: "admin-ops",
        to: "metadata-services",
        path: ["admin-ops", "metadata-services"],
        description: "Policy updates, monitoring, and automation workflows.",
      },
    ],
  },
};
