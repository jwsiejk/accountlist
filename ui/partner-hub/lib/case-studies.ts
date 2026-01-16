import { caseStudies, type CaseStudy } from "@/data/case-studies";

const defaultOgImage = "/partner-hub/opengraph-image.png";

export const getCaseStudyBySlug = (slug: string): CaseStudy | undefined =>
  caseStudies.find((study) => study.slug === slug);

export const getCaseStudyOgImage = (caseStudy: CaseStudy): string =>
  caseStudy.ogImage ?? caseStudy.assets?.heroTile ?? defaultOgImage;

export const getCaseStudySlugs = (): { slug: string }[] =>
  caseStudies.map((study) => ({ slug: study.slug }));

const getSortedCaseStudies = (): CaseStudy[] => {
  const hasExplicitSort = caseStudies.some(
    (study) =>
      typeof study.sortOrder === "number" ||
      typeof (study as { order?: number }).order === "number"
  );

  if (!hasExplicitSort) {
    return caseStudies;
  }

  const indexMap = new Map(caseStudies.map((study, index) => [study.slug, index]));

  return [...caseStudies].sort((a, b) => {
    const aIndex = indexMap.get(a.slug) ?? 0;
    const bIndex = indexMap.get(b.slug) ?? 0;
    const aSort = a.sortOrder ?? (a as { order?: number }).order ?? aIndex;
    const bSort = b.sortOrder ?? (b as { order?: number }).order ?? bIndex;

    if (aSort === bSort) {
      return aIndex - bIndex;
    }

    return aSort - bSort;
  });
};

export const getAdjacentCaseStudies = (
  slug: string
): { prev?: CaseStudy; next?: CaseStudy } => {
  const sortedCaseStudies = getSortedCaseStudies();
  const currentIndex = sortedCaseStudies.findIndex((study) => study.slug === slug);

  if (currentIndex === -1) {
    return {};
  }

  return {
    prev: currentIndex > 0 ? sortedCaseStudies[currentIndex - 1] : undefined,
    next:
      currentIndex < sortedCaseStudies.length - 1
        ? sortedCaseStudies[currentIndex + 1]
        : undefined,
  };
};
