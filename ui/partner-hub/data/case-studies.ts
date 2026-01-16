export type CaseStudySection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  callouts?: string[];
};

export type OutcomeLabelType = "target" | "referenced" | "observed";

export type CaseStudyOutcome = {
  text: string;
  labelType: OutcomeLabelType;
  citationIds?: string[];
};

export type CaseStudySourceCategory = "vendor" | "third-party";

export type CaseStudySource = {
  id: string;
  title: string;
  url: string;
  category: CaseStudySourceCategory;
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
  outcomes: CaseStudyOutcome[];
  sections: CaseStudySection[];
  assets?: {
    heroTile?: string;
    architecture?: string;
  };
  sources: CaseStudySource[];
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
      {
        text: "Immutable backups and rapid cyber recovery for Epic and imaging workflows.",
        labelType: "referenced",
      },
      {
        text: "Lower RPO/RTO for clinical systems with policy-based snapshots.",
        labelType: "referenced",
      },
      {
        text: "Tiered archive strategy for long-term imaging retention.",
        labelType: "referenced",
      },
      {
        text: "High-throughput storage for AI imaging pipelines and PACS growth.",
        labelType: "referenced",
      },
      {
        text: "Simplified operations with unified monitoring and automation.",
        labelType: "referenced",
      },
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
    sources: [
      {
        id: "epic",
        title: "Epic Systems",
        url: "https://www.epic.com/",
        category: "vendor",
      },
      {
        id: "rubrik",
        title: "Rubrik",
        url: "https://www.rubrik.com/",
        category: "vendor",
      },
      {
        id: "pure-flasharray",
        title: "Pure Storage FlashArray",
        url: "https://www.purestorage.com/products/flasharray.html",
        category: "vendor",
      },
      {
        id: "pure-flashblade",
        title: "Pure Storage FlashBlade",
        url: "https://www.purestorage.com/products/flashblade.html",
        category: "vendor",
      },
      {
        id: "hipaa-security-rule",
        title: "HIPAA Security Rule (HHS)",
        url: "https://www.hhs.gov/hipaa/for-professionals/security/index.html",
        category: "third-party",
      },
    ],
  },
];
