import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Download, Linkedin, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const credibilityChips = [
  "Partner enablement",
  "POCs & demos",
  "Solution verification & BOM reviews",
  "Executive engagement",
  "Applied AI tooling",
];

const howIWork = [
  {
    title: "Discovery & Qualification",
    description:
      "Align early on business goals, technical constraints, and mutual success criteria to scope the right path.",
    deliverables: ["requirements map", "risk register"],
  },
  {
    title: "Architecture & Validation",
    description:
      "Translate needs into reference architectures, validate assumptions, and de-risk the technical decision.",
    deliverables: ["reference architecture", "solution validation plan"],
  },
  {
    title: "Demos / POCs / Confidence Building",
    description:
      "Prove feasibility quickly with hands-on demos and partner-lab POCs that build stakeholder confidence.",
    deliverables: ["POC plan", "demo narrative & script"],
  },
  {
    title: "Operationalization & Enablement",
    description:
      "Operationalize the win by enabling sellers, partners, and customer teams to execute at scale.",
    deliverables: ["enablement workshop", "go-live readiness checklist"],
  },
];

const impactHighlights = [
  "Primary technical enablement and escalation point for national partners.",
  "Built and validated partner-lab POCs; ran hands-on demos and delivered workshops.",
  "Aligned GTM across field teams, partners, and customers by simplifying messaging and delivery.",
  "Supported complex partner-led deals through architectural validation and confidence building.",
  "Built internal AI-driven tools to accelerate enablement and execution.",
];

const caseStudies = [
  {
    title: "Partner technical enablement at scale",
    summary: {
      problem: "Partners needed repeatable technical plays across enterprise accounts.",
      approach: "Built enablement assets, lab POCs, and guided field execution.",
      outcome: "Improved partner confidence and accelerated campaign readiness.",
    },
    href: "/case-studies",
  },
  {
    title: "Complex deal technical validation",
    summary: {
      problem: "High-stakes enterprise deal required rigorous validation and risk mitigation.",
      approach: "Led architecture reviews, BOM checks, and proof points.",
      outcome: "Delivered technical confidence to decision makers and partners.",
    },
    href: "/case-studies",
  },
  {
    title: "Territory build + competitive displacement",
    summary: {
      problem: "Needed to establish footprint in competitive accounts (2014–2017).",
      approach: "Co-developed partner strategies and executed hands-on demos.",
      outcome: "Expanded pipeline and positioned differentiated architecture wins.",
    },
    href: "/case-studies",
  },
];

const toolCards = [
  {
    title: "Skin Image Review",
    description: "Upload a skin image for local dermatology-focused visual ranking and red-flag review.",
    href: "/skin-review",
  },
  {
    title: "Account Mapping",
    description: "Normalize and match account lists to streamline partner alignment.",
    href: "/accountmap",
  },
  {
    title: "Energy Tool",
    description: "Model power and cooling impact for data center refreshes.",
    href: "/tools/energy",
  },
  {
    title: "Office Schedule",
    description: "Browse offices and book time slots.",
    href: "/offices/schedule",
  },
];

export default function HomePage() {
  const hpcLabEnabled = process.env.NEXT_PUBLIC_ENABLE_HPC_LAB === "true";
  const visibleToolCards = hpcLabEnabled
    ? [
        ...toolCards,
        {
          title: "HPC Lab",
          description: "Explore HPC and AI infrastructure lab configurations before simulation execution.",
          href: "/hpc-lab",
        },
      ]
    : toolCards;

  return (
    <div className="space-y-10 md:space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-10 shadow-sm dark:via-slate-900 md:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06)_1px,_transparent_1px)] [background-size:20px_20px] opacity-25" />
        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div className="space-y-6 lg:max-w-2xl">
            <p className="text-sm font-medium text-primary">
              Boyertown, PA • Enterprise Infrastructure • Partner GTM
            </p>
            <h1 className="text-4xl font-semibold leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
              James Siejk
            </h1>
            <h2 className="text-xl font-semibold text-foreground/80 sm:text-2xl">
              Senior Solutions Architect / Sales Engineer
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-foreground/70">
              I lead discovery, architecture, validation, and demos—helping sales teams and
              partners de-risk decisions and move deals forward.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/resume/James_Siejk_Resume.pdf"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-button-primary px-4 text-sm font-semibold text-button-primary-foreground shadow-sm transition hover:bg-button-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download Resume
              </Link>
              <Link
                href="https://www.linkedin.com/in/james-siejk-b93a2481/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border/70 bg-background/80 px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <Linkedin className="h-4 w-4" aria-hidden />
                View LinkedIn
              </Link>
              <Link
                href="mailto:jwsiejk@gmail.com"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border/70 bg-background/80 px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Contact
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {credibilityChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-foreground/70 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/60"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <Card className="border-border/70 bg-background/90 shadow-md backdrop-blur lg:mt-10">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold text-foreground">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    30+ years
                  </p>
                  <p className="text-sm font-semibold text-foreground">Enterprise infrastructure</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    Partner GTM
                  </p>
                  <p className="text-sm font-semibold text-foreground">Enablement at scale</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    POCs & demos
                  </p>
                  <p className="text-sm font-semibold text-foreground">Hands-on validation</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    BOM reviews
                  </p>
                  <p className="text-sm font-semibold text-foreground">Solution confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            How I Work
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            A focused operating model for solution delivery
          </h2>
          <p className="max-w-2xl text-base text-foreground/70">
            I move from discovery to enablement with clear artifacts that build confidence, shorten
            sales cycles, and reduce technical risk for partners and customers.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {howIWork.map((step) => (
            <Card key={step.title} className="border-border/70">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">{step.title}</CardTitle>
                <p className="text-sm text-foreground/70">{step.description}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  Deliverables
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {step.deliverables.map((deliverable) => (
                    <li key={deliverable}>{deliverable}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Selected Impact
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Recent outcomes that build credibility
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {impactHighlights.map((item) => (
            <Card key={item} className="border-border/70">
              <CardContent className="flex h-full items-start gap-3 py-4 text-sm text-foreground/70">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" aria-hidden />
                <p>{item}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Featured Work
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Case studies and supporting artifacts
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {caseStudies.map((study) => (
            <Card
              key={study.title}
              className="border-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{study.title}</CardTitle>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <BadgeCheck className="h-3 w-3" aria-hidden />
                    Case study
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-foreground/70">
                <p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Problem:
                  </span>{" "}
                  {study.summary.problem}
                </p>
                <p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Approach:
                  </span>{" "}
                  {study.summary.approach}
                </p>
                <p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Outcome:
                  </span>{" "}
                  {study.summary.outcome}
                </p>
                <Link
                  href={study.href}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                >
                  Read case study
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Operational accelerators</h3>
              <p className="max-w-2xl text-base text-foreground/70">
                Tools I build to reduce friction, standardize execution, and speed up technical
                decisions.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-foreground/50">
              Supporting artifacts
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleToolCards.map((card) => (
              <Card
                key={card.title}
                className="transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{card.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-foreground/40" aria-hidden />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-foreground/70">
                  <p>{card.description}</p>
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    Open tool
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
