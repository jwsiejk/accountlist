import { caseStudies, type CaseStudy } from "@/data/case-studies";

const defaultOgImage = "/partner-hub/opengraph-image.png";

export const getCaseStudyBySlug = (slug: string): CaseStudy | undefined =>
  caseStudies.find((study) => study.slug === slug);

export const getCaseStudyOgImage = (caseStudy: CaseStudy): string =>
  caseStudy.ogImage ?? caseStudy.assets?.heroTile ?? defaultOgImage;

export const getCaseStudySlugs = (): { slug: string }[] =>
  caseStudies.map((study) => ({ slug: study.slug }));
