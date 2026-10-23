import type { Expense, Group, PairDebt, Settlement } from "@/lib/domain";
import { fromMinor, isDust, toMinor } from "@/lib/money";
import { allocateMinor } from "@/lib/splits";

export interface MemberBalance {
  memberId: string;
  /** Minor units of the group currency. Positive means the group owes this member. */
  minor: number;
  amount: number;
}

export interface GroupBalances {
  members: MemberBalance[];
  pairs: PairDebt[];
  totalSpent: number;
}

function add(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

/** Convert one expense into group-currency minor units. Shares sum to the total. */
export function expenseToGroupMinor(expense: Expense, groupCurrency: string): {
  totalMinor: number;
  shares: Map<string, number>;
} {
  const totalMinor = toMinor(expense.amount * expense.exchangeRate, groupCurrency);
  const shares = allocateMinor(
    totalMinor,
    expense.splits.map((split) => ({ memberId: split.memberId, weight: split.amount })),
    expense.paidBy,
  );
  return { totalMinor, shares };
}

export function settlementToGroupMinor(settlement: Settlement, groupCurrency: string): number {
  return toMinor(settlement.amount * settlement.exchangeRate, groupCurrency);
}

function involvedIds(group: Group): string[] {
  const ids = new Set<string>(group.members.map((member) => member.id));
  for (const expense of group.expenses) {
    ids.add(expense.paidBy);
    for (const split of expense.splits) ids.add(split.memberId);
  }
  for (const settlement of group.settlements) {
    ids.add(settlement.from);
    ids.add(settlement.to);
  }
  return [...ids];
}

/** Fewest payments that clear the net balances. Leftovers of one minor unit are dropped. */
export function suggestPairs(members: MemberBalance[], currency: string): PairDebt[] {
  const debtors = members
    .filter((member) => member.minor < 0 && !isDust(member.minor))
    .map((member) => ({ id: member.memberId, minor: -member.minor }))
    .sort((a, b) => b.minor - a.minor || a.id.localeCompare(b.id));
  const creditors = members
    .filter((member) => member.minor > 0 && !isDust(member.minor))
    .map((member) => ({ id: member.memberId, minor: member.minor }))
    .sort((a, b) => b.minor - a.minor || a.id.localeCompare(b.id));

  const pairs: PairDebt[] = [];
  let debtor = 0;
  let creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const pay = Math.min(debtors[debtor].minor, creditors[creditor].minor);
    if (!isDust(pay)) {
      pairs.push({
        fromId: debtors[debtor].id,
        toId: creditors[creditor].id,
        amount: fromMinor(pay, currency),
      });
    }
    debtors[debtor].minor -= pay;
    creditors[creditor].minor -= pay;
    if (isDust(debtors[debtor].minor)) debtor += 1;
    if (isDust(creditors[creditor].minor)) creditor += 1;
  }
  return pairs;
}

export function computeBalances(group: Group): GroupBalances {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const expense of group.expenses) {
    const converted = expenseToGroupMinor(expense, group.currency);
    add(paid, expense.paidBy, converted.totalMinor);
    for (const [memberId, share] of converted.shares) {
      add(owed, memberId, share);
    }
  }

  for (const settlement of group.settlements) {
    const minor = settlementToGroupMinor(settlement, group.currency);
    add(paid, settlement.from, minor);
    add(owed, settlement.to, minor);
  }

  const members = involvedIds(group).map((memberId) => {
    const minor = (paid.get(memberId) ?? 0) - (owed.get(memberId) ?? 0);
    return { memberId, minor, amount: fromMinor(minor, group.currency) };
  });

  const pairs = suggestPairs(members, group.currency);

  const totalSpentMinor = group.expenses.reduce(
    (sum, expense) => sum + expenseToGroupMinor(expense, group.currency).totalMinor,
    0,
  );

  return { members, pairs, totalSpent: fromMinor(totalSpentMinor, group.currency) };
}

export function memberBalance(group: Group, memberId: string): MemberBalance {
  return (
    computeBalances(group).members.find((member) => member.memberId === memberId) ?? {
      memberId,
      minor: 0,
      amount: 0,
    }
  );
}

export function pairDebtAmount(group: Group, fromId: string, toId: string): number {
  return computeBalances(group).pairs.find((pair) => pair.fromId === fromId && pair.toId === toId)?.amount ?? 0;
}

export function balanceMinorSum(group: Group): number {
  return computeBalances(group).members.reduce((sum, member) => sum + member.minor, 0);
}

export function paidByMember(group: Group, memberId: string): number {
  const minor = group.expenses.reduce((sum, expense) => {
    if (expense.paidBy !== memberId) return sum;
    return sum + expenseToGroupMinor(expense, group.currency).totalMinor;
  }, 0);
  return fromMinor(minor, group.currency);
}

export function shareForMember(group: Group, memberId: string): number {
  const minor = group.expenses.reduce((sum, expense) => {
    return sum + (expenseToGroupMinor(expense, group.currency).shares.get(memberId) ?? 0);
  }, 0);
  return fromMinor(minor, group.currency);
}
