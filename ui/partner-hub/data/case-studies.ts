export type CaseStudySection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  callouts?: string[];
};

export type CaseStudy = {
  slug: string;
  order?: number;
  sortOrder?: number;
  title: string;
  heroSummary: string;
  industry: string;
  workloads: string[];
  tags: string[];
  ogImage?: string;
  stack: {
    before: string;
    after: string;
  };
  outcomes: string[];
  sections: CaseStudySection[];
  assets?: {
    heroTile?: string;
    architecture?: string;
  };
  citations: {
    label: string;
    href: string;
  }[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "healthcare-data-center-refresh",
    title: "Healthcare Data Center Refresh (Epic + PACS)",
    heroSummary:
      "A regional health system modernized its data center to protect Epic and PACS workloads while enabling faster imaging AI and immutable recovery.",
    industry: "Healthcare",
    workloads: [
      "Epic EHR",
      "PACS imaging",
      "Clinical analytics",
      "VNA archive",
      "VMware virtualization",
    ],
    tags: [
      "immutability",
      "cyber recovery",
      "AI imaging",
      "archive tiering",
      "data center refresh",
      "resilience",
    ],
    ogImage: "/images/case-studies/healthcare-data-center-refresh-hero.png",
    stack: {
      before: "PowerMax + Commvault",
      after: "FlashArray + FlashBlade//S + FlashBlade//E + Rubrik",
    },
    outcomes: [
      "Immutable backups and rapid cyber recovery for Epic and imaging workflows.",
      "Lower RPO/RTO for clinical systems with policy-based snapshots.",
      "Tiered archive strategy for long-term imaging retention.",
      "High-throughput storage for AI imaging pipelines and PACS growth.",
      "Simplified operations with unified monitoring and automation.",
    ],
    sections: [
      {
        id: "overview",
        title: "Overview",
        body: "A regional health system executed a data center refresh to keep Epic and PACS online while reducing exposure to ransomware and operational risk. The program focused on modernizing core storage and backup without disrupting clinical operations.\n\nThe target state emphasized immutable recovery, scalable imaging retention, and performance headroom for AI-enabled imaging workflows. The result is a platform aligned to clinical uptime requirements and predictable archive growth.",
      },
      {
        id: "challenges",
        title: "Challenges",
        bullets: [
          "Legacy SAN and backup tooling were stretched by imaging growth and ransomware risk.",
          "Clinical uptime expectations constrained maintenance windows and change risk.",
          "Retention mandates required scalable, policy-driven archive tiering.",
        ],
      },
      {
        id: "solution",
        title: "Solution",
        body: "Approach",
        bullets: [
          "Deployed FlashArray for Epic workloads and FlashBlade for PACS and imaging analytics.",
          "Standardized backup and recovery with Rubrik policies to enforce immutability.",
          "Automated snapshot and tiering workflows to reduce manual handling.",
        ],
        callouts: [
          "Architecture highlights: immutable snapshots with cyber recovery workflows.",
          "Architecture highlights: high-throughput NAS to support imaging AI pipelines.",
        ],
      },
      {
        id: "results",
        title: "Results",
        body: "Migration plan (timeline)",
        bullets: [
          "Phase 1: Stabilize Epic and PACS storage, then enable policy-based, immutable protection.",
          "Phase 2: Migrate imaging archives and activate tiering aligned to retention policies.",
          "Phase 3: Expand throughput for AI imaging workflows and operational monitoring.",
          "Risks & mitigations: minimize downtime with staged cutovers and predefined rollback paths.",
        ],
      },
    ],
    assets: {
      heroTile: "/images/case-studies/healthcare-data-center-refresh-hero.png",
      architecture:
        "/images/case-studies/healthcare-data-center-refresh-architecture.png",
    },
    citations: [
      { label: "Epic Systems", href: "https://www.epic.com/" },
      { label: "Rubrik", href: "https://www.rubrik.com/" },
      { label: "Pure Storage FlashArray", href: "https://www.purestorage.com/products/flasharray.html" },
      { label: "Pure Storage FlashBlade", href: "https://www.purestorage.com/products/flashblade.html" },
    ],
  },
];
