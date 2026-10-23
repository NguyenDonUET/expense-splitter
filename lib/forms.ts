import type { Split, SplitType } from "@/lib/domain";
import { formatMoney, fromMinor, minorDigits } from "@/lib/money";
import { exactSplitsValid, percentagesValid, splitByPercentage, splitByShares, splitEqual, sumSplitMinor } from "@/lib/splits";

export interface FormIssue {
  error: string;
  vars?: Record<string, string | number>;
}

export function parseAmount(raw: string, currency: string, allowZero = false): { value: number } | FormIssue {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return { error: "forms.enterAmount" };
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { error: "forms.validAmount" };
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    return { error: "forms.validAmount" };
  }
  const digits = minorDigits(currency);
  const scaled = value * 10 ** digits;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
    return digits === 0 ? { error: "forms.noDecimals" } : { error: "forms.maxDecimals", vars: { digits } };
  }
  return { value: Math.round(scaled) / 10 ** digits };
}

export interface SplitDraft {
  splitType: SplitType;
  included: string[];
  exact: Record<string, string>;
  percentage: Record<string, string>;
  shares: Record<string, string>;
  payerId: string;
  amount: number;
  currency: string;
}

export function draftSplits(draft: SplitDraft): { splits: Split[] } | FormIssue {
  if (draft.included.length === 0) return { error: "forms.choosePeople" };

  if (draft.splitType === "equal") {
    return { splits: splitEqual(draft.amount, draft.currency, draft.included, draft.payerId) };
  }

  if (draft.splitType === "exact") {
    const splits: Split[] = [];
    for (const memberId of draft.included) {
      const parsed = parseAmount(draft.exact[memberId] ?? "", draft.currency, true);
      if ("error" in parsed) return { error: "forms.exactEach" };
      splits.push({ memberId, amount: parsed.value });
    }
    if (!exactSplitsValid(draft.amount, draft.currency, splits)) {
      const current = formatMoney(fromMinor(sumSplitMinor(splits, draft.currency), draft.currency), draft.currency);
      return {
        error: "forms.exactSum",
        vars: { expected: formatMoney(draft.amount, draft.currency), current },
      };
    }
    return { splits };
  }

  if (draft.splitType === "percentage") {
    const entries: { memberId: string; percentage: number }[] = [];
    for (const memberId of draft.included) {
      const percentage = Number(draft.percentage[memberId]);
      if (!Number.isFinite(percentage) || percentage < 0) return { error: "forms.percentEach" };
      entries.push({ memberId, percentage });
    }
    const total = entries.reduce((sum, entry) => sum + entry.percentage, 0);
    if (!percentagesValid(entries.map((entry) => entry.percentage))) {
      return { error: "forms.percentSum", vars: { total } };
    }
    return { splits: splitByPercentage(draft.amount, draft.currency, entries, draft.payerId) };
  }

  const entries: { memberId: string; shares: number }[] = [];
  for (const memberId of draft.included) {
    const shares = Number(draft.shares[memberId]);
    if (!Number.isInteger(shares) || shares < 0) return { error: "forms.sharesEach" };
    entries.push({ memberId, shares });
  }
  if (entries.every((entry) => entry.shares === 0)) return { error: "forms.sharesAtLeastOne" };
  return { splits: splitByShares(draft.amount, draft.currency, entries, draft.payerId) };
}
