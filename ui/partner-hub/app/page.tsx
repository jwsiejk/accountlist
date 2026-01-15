import Link from "next/link";
import { ArrowUpRight, Download, Mail, Linkedin } from "lucide-react";
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
    title: "Architecture Explorer",
    description: "Navigate reference architectures and validated design patterns.",
    href: "/tools/architecture-explorer",
  },
  {
    title: "Account Mapping",
    description: "Normalize and match account lists to streamline partner alignment.",
    href: "/estimator",
  },
  {
    title: "Energy Tool",
    description: "Model power and cooling impact for data center refreshes.",
    href: "/tools/energy",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-10 shadow-sm dark:via-slate-900">
        <div className="space-y-5">
          <p className="text-sm font-medium text-primary">Senior Solutions Architect / Presales Engineer</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            James Siejk — Senior Solutions Architect / Presales Engineer
          </h1>
          <p className="max-w-3xl text-base text-foreground/70">
            30+ years in enterprise infrastructure. I own the technical side of sales campaigns:
            discovery, architecture, validation, demos, and technical decision support across data
            center and cloud.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/resume/James_Siejk_Resume.pdf"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-foreground shadow transition hover:bg-primary/90"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download Resume
            </Link>
            <Link
              href="https://www.linkedin.com/in/james-siejk"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Linkedin className="h-4 w-4" aria-hidden />
              View LinkedIn
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Contact
            </Link>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {credibilityChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground/70"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            How I Work
          </p>
          <h2 className="text-2xl font-semibold">A focused operating model for presales delivery</h2>
          <p className="max-w-3xl text-sm text-foreground/70">
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

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Selected Impact
          </p>
          <h2 className="text-2xl font-semibold">Recent outcomes that build credibility</h2>
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
          <h2 className="text-2xl font-semibold">Case studies and supporting artifacts</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {caseStudies.map((study) => (
            <Card key={study.title} className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">{study.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-foreground/70">
                <p>
                  <span className="font-semibold text-foreground">Problem:</span> {study.summary.problem}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Approach:</span> {study.summary.approach}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Outcome:</span> {study.summary.outcome}
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
              <p className="text-sm text-foreground/70">
                Tools I build to reduce friction, standardize execution, and speed up technical
                decisions.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-foreground/50">
              Supporting artifacts
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toolCards.map((card) => (
              <Card key={card.title}>
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
