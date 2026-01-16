import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyHero } from "@/components/case-studies/CaseStudyHero";
import { CaseStudyRail } from "@/components/case-studies/CaseStudyRail";
import { CaseStudySection } from "@/components/case-studies/CaseStudySection";
import { CalloutCard } from "@/components/case-studies/CalloutCard";
import { ArchitectureDiagramSvg } from "@/components/case-studies/ArchitectureDiagramSvg";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCaseStudyBySlug,
  getCaseStudyOgImage,
  getCaseStudySlugs,
} from "@/lib/case-studies";

type CaseStudyPageProps = {
  params: {
    slug: string;
  };
};

const beforeAfterCards = [
  {
    title: "Before",
    description: "PowerMax + Commvault",
    accent: "from-rose-500/10 via-rose-500/5 to-transparent",
  },
  {
    title: "After",
    description: "FlashArray + FlashBlade//S + FlashBlade//E + Rubrik",
    accent: "from-emerald-500/15 via-emerald-500/5 to-transparent",
  },
];

const cyberResilienceTiles = [
  {
    title: "Immutable backups",
    description: "Policy-driven snapshots with locked retention windows.",
  },
  {
    title: "Credential isolation",
    description: "Separation of duties with cyber vault access controls.",
  },
  {
    title: "Anomaly detection",
    description: "Signal-based alerting across backup and storage layers.",
  },
  {
    title: "Rapid recovery",
    description: "Tiered recovery plans tested against clinical RTOs.",
  },
];

const pacsTieringTiles = [
  {
    title: "FlashBlade//S",
    description: "AI + performance tier for real-time imaging workflows.",
  },
  {
    title: "FlashBlade//E",
    description: "Archive tier optimized for long-term PACS retention.",
  },
];

const migrationPlan = [
  {
    phase: "Discovery",
    deliverables: [
      "App dependency mapping",
      "Cyber recovery risk assessment",
    ],
  },
  {
    phase: "Build",
    deliverables: [
      "FlashArray + FlashBlade landing zones",
      "Rubrik policies and recovery lanes",
    ],
  },
  {
    phase: "Migration",
    deliverables: [
      "Epic and PACS workload cutover waves",
      "Archive tiering automation",
    ],
  },
  {
    phase: "Prove Recovery",
    deliverables: [
      "Tabletop and failover drills",
      "Operational runbook sign-off",
    ],
  },
];

export function generateMetadata({ params }: CaseStudyPageProps): Metadata {
  const caseStudy = getCaseStudyBySlug(params.slug);

  if (!caseStudy) {
    notFound();
  }

  const title = `${caseStudy.title} Case Study`;
  const description = caseStudy.heroSummary;
  const ogImage = getCaseStudyOgImage(caseStudy);
  const url = `/partner-hub/case-studies/${caseStudy.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    keywords: [caseStudy.industry, ...caseStudy.tags],
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: [
        {
          url: ogImage,
          alt: `${caseStudy.title} preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function CaseStudyPage({ params }: CaseStudyPageProps) {
  const caseStudy = getCaseStudyBySlug(params.slug);

  if (!caseStudy) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <CaseStudyHero caseStudy={caseStudy} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <CaseStudySection title="Executive overview" eyebrow="Engagement summary">
            {caseStudy.sections.slice(0, 1).map((section) => (
              <p key={section.id}>{section.body}</p>
            ))}
          </CaseStudySection>

          <CaseStudySection title="Architecture" eyebrow="Reference design">
            <p>
              A tiered storage and backup architecture anchors Epic and PACS
              workloads while isolating recovery lanes for cyber resilience.
            </p>
            {params.slug === "healthcare-data-center-refresh" ? (
              <Card className="border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Reference Architecture</CardTitle>
                  <p className="text-sm text-white/70">
                    Tier-0 Epic on FlashArray; PACS + AI on FlashBlade//S; archive on
                    FlashBlade//E; Rubrik for policy-based NAS protection and cyber
                    recovery.
                  </p>
                </CardHeader>
                <ArchitectureDiagramSvg />
              </Card>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    Epic + Clinical Apps
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    FlashArray (Tier-0)
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    Rubrik Cyber Vault
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    PACS + Imaging AI
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    FlashBlade//S
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                    FlashBlade//E Archive
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/50">
                  Secure lanes separate clinical operations from immutable recovery
                  stores.
                </p>
              </div>
            )}
          </CaseStudySection>

          <CaseStudySection title="Before → After" eyebrow="Transformation">
            <div className="grid gap-4 md:grid-cols-2">
              {beforeAfterCards.map((card) => (
                <CalloutCard
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  accent={card.accent}
                />
              ))}
            </div>
          </CaseStudySection>

          <CaseStudySection
            title="Cyber Resilience Posture"
            eyebrow="Security outcomes"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {cyberResilienceTiles.map((tile) => (
                <CalloutCard
                  key={tile.title}
                  title={tile.title}
                  description={tile.description}
                />
              ))}
            </div>
          </CaseStudySection>

          <CaseStudySection title="PACS tiering" eyebrow="Imaging strategy">
            <div className="grid gap-4 md:grid-cols-2">
              {pacsTieringTiles.map((tile) => (
                <CalloutCard
                  key={tile.title}
                  title={tile.title}
                  description={tile.description}
                  accent="from-sky-500/15 via-sky-500/5 to-transparent"
                />
              ))}
            </div>
          </CaseStudySection>

          <CaseStudySection title="Migration plan" eyebrow="Timeline">
            <div className="space-y-6">
              {migrationPlan.map((step, index) => (
                <div key={step.phase} className="relative pl-6">
                  <div className="absolute left-0 top-1 h-full w-px bg-border/70" />
                  <div className="absolute left-[-5px] top-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      Phase {index + 1}: {step.phase}
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {step.deliverables.map((deliverable) => (
                        <li key={deliverable}>{deliverable}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CaseStudySection>

          {caseStudy.sections.slice(1).map((section) => (
            <CaseStudySection key={section.id} title={section.title}>
              {section.body ? <p>{section.body}</p> : null}
              {section.bullets ? (
                <ul className="list-disc space-y-1 pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.callouts ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {section.callouts.map((callout) => (
                    <CalloutCard
                      key={callout}
                      title="Highlight"
                      description={callout}
                    />
                  ))}
                </div>
              ) : null}
            </CaseStudySection>
          ))}

          <CaseStudySection title="Sources / Evidence" eyebrow="Citations">
            <Card className="border-border/70 p-4">
              <ul className="space-y-2 text-sm">
                {caseStudy.citations.map((citation) => (
                  <li key={citation.href}>
                    <a
                      href={citation.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {citation.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </CaseStudySection>
        </div>

        <CaseStudyRail caseStudy={caseStudy} />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return getCaseStudySlugs();
}
