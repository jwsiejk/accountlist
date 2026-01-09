import { Domain, VendorPack } from "./types";

export const PACKS: VendorPack[] = [];

const DOMAINS: Domain[] = ["Storage", "Compute", "Network"];

export const listDomains = (): Domain[] => [...DOMAINS];

export const packsByDomain = (domain: Domain): VendorPack[] =>
  PACKS.filter((pack) => pack.domain === domain);

type GroupedPacks = Record<
  string,
  Record<string, Record<string, VendorPack>>
>;

export const groupPacks = (domain: Domain): GroupedPacks => {
  return packsByDomain(domain).reduce<GroupedPacks>((acc, pack) => {
    if (!acc[pack.vendor]) {
      acc[pack.vendor] = {};
    }

    if (!acc[pack.vendor][pack.product]) {
      acc[pack.vendor][pack.product] = {};
    }

    acc[pack.vendor][pack.product][pack.model] = pack;

    return acc;
  }, {});
};
