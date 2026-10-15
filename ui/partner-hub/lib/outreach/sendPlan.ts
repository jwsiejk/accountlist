/**
 * Splits a send into small rounds so that no round has two people from the
 * same company.
 *
 * Why: a company routes all inbound mail through one gateway (Mimecast,
 * Proofpoint, Microsoft Safe Links). Several near-identical emails hitting
 * the same domain within seconds look like a bulk blast -- more likely to be
 * filtered -- and the gateway's link scanner then "opens"/"clicks" them in a
 * burst, which is harder to tell apart from real people. Spreading a
 * company's contacts across rounds (a minute or more apart) avoids both.
 *
 * "Same company" = same email domain, or the same company name (some
 * companies use more than one domain). Free-mail domains (gmail.com etc.)
 * don't count as a company on their own.
 *
 * Pure function, no DB/DOM -- see sendPlan.test.ts.
 */

export interface PlanContact {
  id: number;
  email: string;
  company?: string | null;
}

const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

/** The email's domain, or null for a free-mail address (which says nothing about the company). */
export function companyDomain(email: string): string | null {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain || FREE_MAIL.has(domain)) return null;
  return domain;
}

/** "NVIDIA Corporation" and "Nvidia Corp." -> "nvidia". */
export function normalizeCompany(company: string | null | undefined): string | null {
  if (!company) return null;
  const n = company
    .toLowerCase()
    .replace(/[.,'"&()]/g, " ")
    .replace(/\b(inc|incorporated|corp|corporation|co|company|llc|ltd|limited|plc|gmbh|ag|sa|group|holdings)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return n || null;
}

/**
 * Rounds of at most `size` contacts, with no two contacts in a round sharing
 * a company domain or company name. Companies with the most contacts are
 * spread first, so they don't pile up into a long tail of one-person rounds
 * at the end. Every contact appears exactly once; order within the input is
 * otherwise kept.
 */
export function planSendRounds<T extends PlanContact>(contacts: T[], size: number): T[][] {
  const max = Math.max(1, Math.floor(size));
  const domainOf = new Map<number, string | null>();
  const companyOf = new Map<number, string | null>();
  const groupCount = new Map<string, number>();
  const groupKey = (c: T) => domainOf.get(c.id) ?? companyOf.get(c.id) ?? `id:${c.id}`;

  for (const c of contacts) {
    domainOf.set(c.id, companyDomain(c.email));
    companyOf.set(c.id, normalizeCompany(c.company));
    groupCount.set(groupKey(c), (groupCount.get(groupKey(c)) ?? 0) + 1);
  }

  let remaining = contacts.map((c, index) => ({ c, index }));
  const rounds: T[][] = [];

  while (remaining.length > 0) {
    // Biggest companies first (stable on original order), so they get one slot in as many rounds as possible.
    remaining.sort((a, b) => (groupCount.get(groupKey(b.c))! - groupCount.get(groupKey(a.c))!) || a.index - b.index);

    const round: T[] = [];
    const usedDomains = new Set<string>();
    const usedCompanies = new Set<string>();
    const left: typeof remaining = [];

    for (const entry of remaining) {
      const d = domainOf.get(entry.c.id);
      const co = companyOf.get(entry.c.id);
      const clash = (d !== null && d !== undefined && usedDomains.has(d)) || (co && usedCompanies.has(co));
      if (round.length < max && !clash) {
        round.push(entry.c);
        if (d) usedDomains.add(d);
        if (co) usedCompanies.add(co);
        groupCount.set(groupKey(entry.c), groupCount.get(groupKey(entry.c))! - 1);
      } else {
        left.push(entry);
      }
    }
    // Keep each round in the original list order (easier to read in progress messages).
    round.sort((a, b) => contacts.indexOf(a) - contacts.indexOf(b));
    rounds.push(round);
    remaining = left;
  }
  return rounds;
}
