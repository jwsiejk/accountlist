import assert from "node:assert/strict";
import test from "node:test";

import { companyDomain, normalizeCompany, planSendRounds, type PlanContact } from "./sendPlan";

let nextId = 1;
const c = (email: string, company?: string): PlanContact => ({ id: nextId++, email, company });

function assertNoCompanyRepeats(rounds: PlanContact[][]) {
  for (const r of rounds) {
    const domains = r.map((x) => companyDomain(x.email)).filter(Boolean);
    const companies = r.map((x) => normalizeCompany(x.company)).filter(Boolean);
    assert.equal(new Set(domains).size, domains.length, `domain repeated in a round: ${domains}`);
    assert.equal(new Set(companies).size, companies.length, `company repeated in a round: ${companies}`);
  }
}

test("no two people from the same company land in the same round", () => {
  const list = [
    c("a1@acme.com"), c("a2@acme.com"), c("a3@acme.com"),
    c("b1@beta.io"), c("b2@beta.io"),
    c("x@one.com"), c("y@two.com"), c("z@three.com"), c("w@four.com"),
  ];
  const rounds = planSendRounds(list, 5);
  assertNoCompanyRepeats(rounds);
  assert.deepEqual(rounds.map((r) => r.length), [5, 3, 1]);
  assert.equal(rounds.flat().length, list.length);
  assert.equal(new Set(rounds.flat().map((x) => x.id)).size, list.length);
});

test("the biggest company is spread first so it doesn't pile up at the end", () => {
  const list = [
    ...Array.from({ length: 4 }, (_, i) => c(`p${i}@solo${i}.com`)),
    ...Array.from({ length: 4 }, (_, i) => c(`n${i}@big.com`)),
  ];
  const rounds = planSendRounds(list, 2);
  assertNoCompanyRepeats(rounds);
  assert.equal(rounds.length, 4); // big.com once per round, paired with a solo contact
  assert.ok(rounds.every((r) => r.length === 2));
});

test("same company on different domains, or written differently, still counts as one", () => {
  const list = [c("a@nvidia.com", "NVIDIA Corporation"), c("b@nvidia.co.uk", "Nvidia Corp."), c("x@other.com", "Other")];
  const rounds = planSendRounds(list, 5);
  assertNoCompanyRepeats(rounds);
  assert.equal(rounds.length, 2);
});

test("free-mail addresses aren't treated as one company", () => {
  const list = [c("a@gmail.com"), c("b@gmail.com"), c("c@gmail.com")];
  assert.deepEqual(planSendRounds(list, 5).map((r) => r.length), [3]);
  assert.equal(companyDomain("x@Gmail.com"), null);
  assert.equal(companyDomain("x@DDN.com"), "ddn.com");
});

test("round size is respected and an empty list gives no rounds", () => {
  const list = Array.from({ length: 12 }, (_, i) => c(`u${i}@co${i}.com`));
  assert.deepEqual(planSendRounds(list, 5).map((r) => r.length), [5, 5, 2]);
  assert.deepEqual(planSendRounds([], 5), []);
});
