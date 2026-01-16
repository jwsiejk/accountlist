export type CaseStudySection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  callouts?: string[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  heroSummary: string;
  industry: string;
  workloads: string[];
  tags: string[];
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
    stack: {
      before: "PowerMax + Commvault",
      after: "FlashArray/FlashBlade + Rubrik",
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
        body: "The health system needed to modernize storage and backup while keeping Epic and PACS available 24/7. The refresh prioritized cyber resilience, AI-ready performance, and predictable growth for imaging archives.",
      },
      {
        id: "challenges",
        title: "Challenges",
        bullets: [
          "Legacy SAN and backup tooling struggled with imaging growth and ransomware risk.",
          "Strict clinical uptime requirements limited maintenance windows.",
          "Archive retention mandates demanded a scalable tiering strategy.",
        ],
      },
      {
        id: "solution",
        title: "Solution",
        body: "The team deployed FlashArray for Epic and FlashBlade for PACS, paired with Rubrik for policy-driven, immutable protection. Automation standardized snapshot policies and archive tiering to reduce manual effort.",
        callouts: [
          "Built-in immutable snapshots with cyber recovery workflows.",
          "High-throughput NAS for imaging AI workloads.",
        ],
      },
      {
        id: "results",
        title: "Results",
        bullets: [
          "Improved recovery confidence with isolated, immutable copies.",
          "Accelerated PACS ingestion and AI processing throughput.",
          "Consistent archive tiering aligned to retention policies.",
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
