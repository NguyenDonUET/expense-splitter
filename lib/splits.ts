import type { CurrencyCode, Split } from "@/lib/domain";
import { fromMinor, toMinor } from "@/lib/money";

export interface WeightedPart {
  memberId: string;
  weight: number;
}

/**
 * Split an integer total across parts. Leftover minor units go to the payer
 * when they have a share, then to the other participants in list order.
 */
export function allocateMinor(totalMinor: number, parts: WeightedPart[], payerId: string): Map<string, number> {
  const result = new Map<string, number>();
  if (parts.length === 0) return result;

  const weightSum = parts.reduce((sum, part) => sum + Math.max(0, part.weight), 0);
  const bases = parts.map((part) => {
    if (weightSum <= 0 || part.weight <= 0) return { memberId: part.memberId, base: 0 };
    const exact = (totalMinor * part.weight) / weightSum;
    return { memberId: part.memberId, base: Math.floor(exact) };
  });

  let remainder = totalMinor - bases.reduce((sum, part) => sum + part.base, 0);
  const order = parts
    .filter((part) => part.weight > 0)
    .sort((a, b) => {
      if (a.memberId === payerId && b.memberId !== payerId) return -1;
      if (b.memberId === payerId && a.memberId !== payerId) return 1;
      return 0;
    });

  const extra = new Map<string, number>();
  for (const part of order) {
    if (remainder <= 0) break;
    extra.set(part.memberId, (extra.get(part.memberId) ?? 0) + 1);
    remainder -= 1;
  }

  for (const part of bases) {
    result.set(part.memberId, part.base + (extra.get(part.memberId) ?? 0));
  }
  return result;
}

export function splitEqual(amount: number, currency: CurrencyCode, memberIds: string[], payerId: string): Split[] {
  const shares = allocateMinor(
    toMinor(amount, currency),
    memberIds.map((memberId) => ({ memberId, weight: 1 })),
    payerId,
  );
  return memberIds.map((memberId) => ({
    memberId,
    amount: fromMinor(shares.get(memberId) ?? 0, currency),
  }));
}

export function splitByPercentage(
  amount: number,
  currency: CurrencyCode,
  entries: { memberId: string; percentage: number }[],
  payerId: string,
): Split[] {
  const shares = allocateMinor(
    toMinor(amount, currency),
    entries.map((entry) => ({ memberId: entry.memberId, weight: entry.percentage })),
    payerId,
  );
  return entries.map((entry) => ({
    memberId: entry.memberId,
    percentage: entry.percentage,
    amount: fromMinor(shares.get(entry.memberId) ?? 0, currency),
  }));
}

export function splitByShares(
  amount: number,
  currency: CurrencyCode,
  entries: { memberId: string; shares: number }[],
  payerId: string,
): Split[] {
  const shares = allocateMinor(
    toMinor(amount, currency),
    entries.map((entry) => ({ memberId: entry.memberId, weight: entry.shares })),
    payerId,
  );
  return entries.map((entry) => ({
    memberId: entry.memberId,
    shares: entry.shares,
    amount: fromMinor(shares.get(entry.memberId) ?? 0, currency),
  }));
}

export function sumSplitMinor(splits: Split[], currency: string): number {
  return splits.reduce((sum, split) => sum + toMinor(split.amount, currency), 0);
}

export function exactSplitsValid(amount: number, currency: string, splits: Split[]): boolean {
  return sumSplitMinor(splits, currency) === toMinor(amount, currency);
}

export function percentagesValid(values: number[]): boolean {
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.abs(total - 100) < 0.001;
}
