export type Domain = "Storage" | "Compute" | "Network";

export type ViewMode = "overview" | "topology" | "flows";

export type FlowChannel = "data" | "metadata" | "mgmt";

export type NodeKind =
  | "system"
  | "service"
  | "database"
  | "storage"
  | "compute"
  | "network"
  | "external";

export interface VendorPack {
  id: string;
  domain: Domain;
  vendor: string;
  product: string;
  model: string;
  pitch: string;
  positioning: string;
  watchouts: string[];
  spec: ArchitectureSpec;
  tags?: string[];
  walkthrough?: WalkthroughStep[];
}

export interface ArchitectureSpec {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  flows: ArchitectureFlow[];
}

export interface ArchitectureNode {
  id: string;
  kind: NodeKind;
  label: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface ArchitectureEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  metadata?: Record<string, string>;
}

export interface ArchitectureFlow {
  id: string;
  channel: FlowChannel;
  from: string;
  to: string;
  path?: string[];
  description?: string;
  metadata?: Record<string, string>;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  script: string;
  nodeIds?: string[];
  edgeIds?: string[];
}
