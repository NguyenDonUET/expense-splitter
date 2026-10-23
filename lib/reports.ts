import { expenseToGroupMinor } from "@/lib/balances";
import type { Expense, Group } from "@/lib/domain";
import { fromMinor } from "@/lib/money";

export interface ExpenseFilters {
  category: string;
  memberId: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: ExpenseFilters = { category: "all", memberId: "all", from: "", to: "" };

export interface CategoryRow {
  category: string;
  amount: number;
  percent: number;
}

export interface MemberSpend {
  memberId: string;
  paid: number;
  share: number;
}

export function filteredExpenses(group: Group, filters: ExpenseFilters): Expense[] {
  return group.expenses
    .filter((expense) => {
      if (filters.category !== "all" && expense.category !== filters.category) return false;
      const day = expense.date.slice(0, 10);
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
      if (filters.memberId !== "all") {
        const involved =
          expense.paidBy === filters.memberId || expense.splits.some((split) => split.memberId === filters.memberId);
        if (!involved) return false;
      }
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function categoryBreakdown(group: Group, expenses: Expense[]): { total: number; rows: CategoryRow[] } {
  const totals = new Map<string, number>();
  let totalMinor = 0;
  for (const expense of expenses) {
    const minor = expenseToGroupMinor(expense, group.currency).totalMinor;
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + minor);
    totalMinor += minor;
  }
  return {
    total: fromMinor(totalMinor, group.currency),
    rows: [...totals.entries()]
      .map(([category, minor]) => ({
        category,
        amount: fromMinor(minor, group.currency),
        percent: totalMinor === 0 ? 0 : (minor / totalMinor) * 100,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export function memberSpending(group: Group, expenses: Expense[]): MemberSpend[] {
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const expense of expenses) {
    const converted = expenseToGroupMinor(expense, group.currency);
    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + converted.totalMinor);
    for (const [memberId, minor] of converted.shares) share.set(memberId, (share.get(memberId) ?? 0) + minor);
  }
  return [...new Set([...paid.keys(), ...share.keys()])]
    .map((memberId) => ({
      memberId,
      paid: fromMinor(paid.get(memberId) ?? 0, group.currency),
      share: fromMinor(share.get(memberId) ?? 0, group.currency),
    }))
    .sort((a, b) => b.paid - a.paid);
}

export function monthRange(which: "this" | "last", now = new Date()): { from: string; to: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + (which === "this" ? 0 : -1);
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}
