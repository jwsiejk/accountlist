import type { Edge, Node } from "@xyflow/react";

export type ArchitectureNodeCategory = "Compute" | "Storage" | "Network" | "Security" | "Operations";

export type ArchitectureNodeNotes = {
  what: string;
  why: string;
  alternatives: string[];
  tradeoffs: string[];
};

export type ArchitectureNodeData = {
  label: string;
  category: ArchitectureNodeCategory;
  notes: ArchitectureNodeNotes;
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
        id: "core-switching",
        position: { x: 60, y: 40 },
        data: {
          label: "Core Switching",
          category: "Network",
          notes: {
            what: "Redundant core switching that anchors east-west traffic and inter-VLAN routing.",
            why: "Keeps the refresh anchored on a resilient, high-throughput fabric before modernizing workloads.",
            alternatives: [
              "Collapsed core with spine/leaf fabrics",
              "MPLS core if WAN routing is the primary requirement",
            ],
            tradeoffs: [
              "Higher capex up front to avoid mid-cycle forklift swaps",
              "Requires coordinated cutovers with network/security teams",
            ],
          },
        },
      },
      {
        id: "tor-switching",
        position: { x: 300, y: 40 },
        data: {
          label: "ToR Switching",
          category: "Network",
          notes: {
            what: "Top-of-rack switching for compute and storage racks with consistent VLAN segmentation.",
            why: "Enables predictable latency and simplifies cabling during the hardware refresh phase.",
            alternatives: ["End-of-row switching", "Fully converged fabric with DCB"],
            tradeoffs: [
              "More switches to manage, but shorter cable runs",
              "Needs consistent automation to avoid config drift",
            ],
          },
        },
      },
      {
        id: "compute-cluster",
        position: { x: 560, y: 30 },
        data: {
          label: "Compute Cluster",
          category: "Compute",
          notes: {
            what: "Virtualization or container cluster hosting tier-1 and tier-2 workloads.",
            why: "Consolidates legacy hosts while enabling automation and capacity headroom.",
            alternatives: ["Dedicated bare metal for latency-sensitive apps", "Public cloud burst only"],
            tradeoffs: [
              "Requires careful sizing to avoid over-commit",
              "Cluster upgrades need coordinated maintenance windows",
            ],
          },
        },
      },
      {
        id: "storage-platform",
        position: { x: 560, y: 200 },
        data: {
          label: "SAN / HCI Storage",
          category: "Storage",
          notes: {
            what: "Primary storage platform with block/file services and QoS policies.",
            why: "Balances performance and cost while supporting mixed workload profiles.",
            alternatives: ["Scale-out NAS", "All-flash SAN with tiering"],
            tradeoffs: [
              "SAN requires specialized skills; HCI trades raw performance for simplicity",
              "Growth planning must align with application refresh cycles",
            ],
          },
        },
      },
      {
        id: "backup",
        position: { x: 820, y: 200 },
        data: {
          label: "Backup & Recovery",
          category: "Storage",
          notes: {
            what: "Immutable backups and recovery vault for ransomware resilience.",
            why: "Protects the refreshed environment with modern retention and air-gap policies.",
            alternatives: ["Tape vaulting", "Cloud-only backup repositories"],
            tradeoffs: [
              "Immutable storage adds capacity overhead",
              "Requires periodic recovery testing to validate SLAs",
            ],
          },
        },
      },
      {
        id: "management",
        position: { x: 560, y: 330 },
        data: {
          label: "Management & Monitoring",
          category: "Operations",
          notes: {
            what: "Unified monitoring, ticketing, and automation for the refreshed stack.",
            why: "Gives operations a single pane of glass for the new platform and legacy coexistence.",
            alternatives: ["Tool-by-tool monitoring", "Outsourced NOC"],
            tradeoffs: [
              "Requires integration effort across vendors",
              "Automation needs governance to avoid unintended changes",
            ],
          },
        },
      },
      {
        id: "security-boundary",
        position: { x: 300, y: 200 },
        data: {
          label: "Security Boundary",
          category: "Security",
          notes: {
            what: "Firewalls, segmentation, and zero-trust controls between user, server, and storage zones.",
            why: "Ensures the refresh does not expand the attack surface while introducing new platforms.",
            alternatives: ["Flat network with IDS only", "Service mesh segmentation"],
            tradeoffs: [
              "Tighter segmentation can add latency for east-west flows",
              "Policy design needs app owner input to prevent outages",
            ],
          },
        },
      },
    ],
    edges: [
      { id: "e-core-tor", source: "core-switching", target: "tor-switching" },
      { id: "e-tor-compute", source: "tor-switching", target: "compute-cluster" },
      { id: "e-tor-storage", source: "tor-switching", target: "storage-platform" },
      { id: "e-storage-backup", source: "storage-platform", target: "backup" },
      { id: "e-management-compute", source: "management", target: "compute-cluster" },
      { id: "e-management-storage", source: "management", target: "storage-platform" },
      { id: "e-security-core", source: "security-boundary", target: "core-switching" },
      { id: "e-security-storage", source: "security-boundary", target: "storage-platform" },
    ],
  },
  {
    id: "hybrid-cloud",
    label: "Hybrid Cloud Landing Zone",
    nodes: [
      {
        id: "on-prem",
        position: { x: 40, y: 90 },
        data: {
          label: "On-Prem Cluster",
          category: "Compute",
          notes: {
            what: "Modernized on-prem cluster hosting regulated and latency-sensitive workloads.",
            why: "Keeps data residency and performance requirements anchored on-site.",
            alternatives: ["Colocation private cloud", "Dedicated cloud region only"],
            tradeoffs: [
              "Requires ongoing hardware lifecycle management",
              "Capacity growth planning must align with budget cycles",
            ],
          },
        },
      },
      {
        id: "connectivity",
        position: { x: 300, y: 40 },
        data: {
          label: "Private Connectivity",
          category: "Network",
          notes: {
            what: "Redundant VPN/Direct Connect/ExpressRoute links with QoS.",
            why: "Provides predictable latency and secure transport between on-prem and cloud.",
            alternatives: ["Public internet only", "SD-WAN overlay"],
            tradeoffs: [
              "Carrier lead times can delay go-live",
              "Dual circuits add recurring cost but reduce outage risk",
            ],
          },
        },
      },
      {
        id: "landing-zone",
        position: { x: 560, y: 40 },
        data: {
          label: "Cloud Landing Zone",
          category: "Compute",
          notes: {
            what: "Hardened cloud subscription/account with guardrails, networks, and shared services.",
            why: "Accelerates app migrations while enforcing security and cost controls.",
            alternatives: ["Single shared VPC/VNet", "Manual per-app accounts"],
            tradeoffs: [
              "Requires upfront design effort for guardrails",
              "Too many accounts can slow governance workflows",
            ],
          },
        },
      },
      {
        id: "identity",
        position: { x: 560, y: 200 },
        data: {
          label: "Identity & Access",
          category: "Security",
          notes: {
            what: "Federated identity, MFA, and role-based access for hybrid workloads.",
            why: "Keeps user experience consistent while enforcing least privilege.",
            alternatives: ["Cloud-native identities only", "Separate identities per environment"],
            tradeoffs: [
              "Federation adds dependency on core IdP uptime",
              "Role mapping requires continuous review",
            ],
          },
        },
      },
      {
        id: "monitoring",
        position: { x: 300, y: 220 },
        data: {
          label: "Monitoring & Ops",
          category: "Operations",
          notes: {
            what: "Centralized observability, incident routing, and runbooks across clouds.",
            why: "Ensures hybrid visibility and faster mean time to recovery.",
            alternatives: ["Separate monitoring per environment", "MSSP-only monitoring"],
            tradeoffs: [
              "Integration effort is significant",
              "Tool sprawl can occur without clear ownership",
            ],
          },
        },
      },
      {
        id: "backup-dr",
        position: { x: 820, y: 150 },
        data: {
          label: "Backup & DR Replication",
          category: "Storage",
          notes: {
            what: "Cross-site backup copy and replication to cloud vaults.",
            why: "Meets RPO/RTO targets while enabling cloud-based recovery options.",
            alternatives: ["On-prem only backup", "Active-active multi-cloud"],
            tradeoffs: [
              "Replication bandwidth needs to be sized for growth",
              "Cloud vault storage adds recurring cost",
            ],
          },
        },
      },
    ],
    edges: [
      { id: "e-onprem-connect", source: "on-prem", target: "connectivity" },
      { id: "e-connect-landing", source: "connectivity", target: "landing-zone" },
      { id: "e-identity-onprem", source: "identity", target: "on-prem" },
      { id: "e-identity-landing", source: "identity", target: "landing-zone" },
      { id: "e-monitoring-onprem", source: "monitoring", target: "on-prem" },
      { id: "e-monitoring-landing", source: "monitoring", target: "landing-zone" },
      { id: "e-backup-onprem", source: "backup-dr", target: "on-prem" },
      { id: "e-backup-landing", source: "backup-dr", target: "landing-zone" },
    ],
  },
  {
    id: "dr-bc",
    label: "DR / BC",
    nodes: [
      {
        id: "primary-site",
        position: { x: 40, y: 60 },
        data: {
          label: "Primary Site",
          category: "Compute",
          notes: {
            what: "Production site hosting critical applications and databases.",
            why: "Maintains performance and proximity for core business services.",
            alternatives: ["Active-active dual sites", "Cloud-first production"],
            tradeoffs: [
              "Primary site remains a single point of failure without DR",
              "Higher uptime tiers increase facility costs",
            ],
          },
        },
      },
      {
        id: "replication-fabric",
        position: { x: 300, y: 40 },
        data: {
          label: "Replication Fabric",
          category: "Storage",
          notes: {
            what: "Synchronous/async replication streams with RPO tracking.",
            why: "Aligns data protection with application RPO/RTO targets.",
            alternatives: ["Batch replication windows", "Application-level replication"],
            tradeoffs: [
              "Lower RPOs require more bandwidth and tighter latency",
              "Replication tooling adds licensing overhead",
            ],
          },
        },
      },
      {
        id: "dr-site",
        position: { x: 560, y: 60 },
        data: {
          label: "DR Site",
          category: "Compute",
          notes: {
            what: "Warm standby infrastructure ready for controlled failover.",
            why: "Provides predictable recovery while limiting idle spend.",
            alternatives: ["Cold site with delayed recovery", "Active-active mirroring"],
            tradeoffs: [
              "Warm standby needs periodic patching and testing",
              "Capacity must match peak recovery needs",
            ],
          },
        },
      },
      {
        id: "dns-failover",
        position: { x: 560, y: 220 },
        data: {
          label: "DNS + Failover",
          category: "Network",
          notes: {
            what: "Global DNS and traffic management steering users during failover.",
            why: "Ensures client traffic shifts to the DR site within SLA windows.",
            alternatives: ["Manual DNS updates", "GSLB appliance"],
            tradeoffs: [
              "TTL tuning can impact cache behavior",
              "Automated failover requires rigorous testing",
            ],
          },
        },
      },
      {
        id: "backup-vault",
        position: { x: 300, y: 240 },
        data: {
          label: "Backup Vault",
          category: "Storage",
          notes: {
            what: "Immutable backup vault isolated from production credentials.",
            why: "Guards against ransomware and supports point-in-time restores.",
            alternatives: ["Tape vaults", "Cloud snapshot only"],
            tradeoffs: [
              "Vault capacity grows quickly without tiering",
              "Vault access controls require strict governance",
            ],
          },
        },
      },
      {
        id: "rpo-rto",
        position: { x: 820, y: 140 },
        data: {
          label: "RPO/RTO Targets",
          category: "Operations",
          notes: {
            what: "Business-approved recovery targets tied to runbooks and testing cadence.",
            why: "Aligns technology spend with stakeholder expectations during outages.",
            alternatives: ["Best-effort recovery", "Uniform targets for all apps"],
            tradeoffs: [
              "Aggressive targets increase infrastructure cost",
              "Requires frequent validation exercises",
            ],
          },
        },
      },
    ],
    edges: [
      { id: "e-primary-rep", source: "primary-site", target: "replication-fabric" },
      { id: "e-rep-dr", source: "replication-fabric", target: "dr-site" },
      { id: "e-primary-backup", source: "primary-site", target: "backup-vault" },
      { id: "e-dr-dns", source: "dr-site", target: "dns-failover" },
      { id: "e-primary-dns", source: "primary-site", target: "dns-failover" },
      { id: "e-rpo-rep", source: "rpo-rto", target: "replication-fabric" },
      { id: "e-rpo-backup", source: "rpo-rto", target: "backup-vault" },
    ],
  },
];
