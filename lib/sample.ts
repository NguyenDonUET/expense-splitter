import type { Group } from "@/lib/domain";
import { isSupportedCurrency } from "@/lib/catalog";
import sample from "@/data/sample-groups.json";

export function cloneGroups(groups: Group[]): Group[] {
  return structuredClone(groups);
}

export function sampleGroups(): Group[] {
  return cloneGroups(
    (sample as { groups: Group[] }).groups.map((group) => {
      if (!isSupportedCurrency(group.currency)) {
        throw new Error(`Sample group ${group.name} uses unsupported currency ${group.currency}`);
      }
      for (const expense of group.expenses) {
        if (!isSupportedCurrency(expense.currency)) {
          throw new Error(`${group.name} / ${expense.description} uses ${expense.currency}`);
        }
      }
      return group;
    }),
  );
}

/** `conversionRates` comes from latest/{groupCurrency}. Returns expense currency into the group currency. */
export function rateIntoGroup(conversionRates: Record<string, number>, expenseCurrency: string, groupCurrency: string): number {
  if (expenseCurrency === groupCurrency) return 1;
  const quoted = conversionRates[expenseCurrency];
  if (!quoted || !Number.isFinite(quoted) || quoted <= 0) {
    throw new Error(`No rate for ${expenseCurrency}`);
  }
  return 1 / quoted;
}
