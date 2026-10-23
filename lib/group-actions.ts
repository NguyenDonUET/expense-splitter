import { AppError } from "@/lib/errors";
import { memberBalance, pairDebtAmount } from "@/lib/balances";
import type { ActivityEvent, Expense, Group, Member, Settlement } from "@/lib/domain";
import { createId } from "@/lib/ids";
import { isDust, toMinor } from "@/lib/money";

export function memberName(group: Group, memberId: string | undefined, unknown = "Someone"): string {
  if (!memberId) return unknown;
  return group.members.find((member) => member.id === memberId)?.name ?? unknown;
}

export function recordActivity(group: Group, event: Omit<ActivityEvent, "id" | "at"> & { at?: string }): Group {
  const entry: ActivityEvent = {
    id: createId("act"),
    at: event.at ?? new Date().toISOString(),
    kind: event.kind,
    actorId: event.actorId,
    summary: event.summary,
    label: event.label,
    expenseId: event.expenseId,
    settlementId: event.settlementId,
    memberId: event.memberId,
  };
  return { ...group, activity: [entry, ...(group.activity ?? [])] };
}

export function removalBlockReason(group: Group, memberId: string): string | null {
  const member = group.members.find((item) => item.id === memberId);
  if (!member) return "errors.memberNotInGroup";
  if (!isDust(memberBalance(group, memberId).minor)) return "errors.memberHasBalance";
  return null;
}

export function deleteGroupBlockReason(group: Group): string | null {
  const open = group.members.some((member) => !isDust(memberBalance(group, member.id).minor));
  if (open) return "errors.groupHasBalances";
  return null;
}

export function upsertExpense(group: Group, expense: Expense, actorId: string | undefined, mode: "add" | "edit"): Group {
  const expenses =
    mode === "add"
      ? [expense, ...group.expenses.filter((item) => item.id !== expense.id)]
      : group.expenses.map((item) => (item.id === expense.id ? expense : item));
  const actor = memberName(group, actorId ?? expense.paidBy);
  const verb = mode === "add" ? "added" : "edited";
  return recordActivity(
    { ...group, expenses },
    {
      kind: mode === "add" ? "expense.added" : "expense.edited",
      actorId,
      expenseId: expense.id,
      label: expense.description,
      summary: `${actor} ${verb} “${expense.description}”`,
    },
  );
}

export function deleteExpense(group: Group, expenseId: string, actorId: string | undefined): Group {
  const expense = group.expenses.find((item) => item.id === expenseId);
  if (!expense) return group;
  return recordActivity(
    { ...group, expenses: group.expenses.filter((item) => item.id !== expenseId) },
    {
      kind: "expense.deleted",
      actorId,
      expenseId,
      label: expense.description,
      summary: `${memberName(group, actorId ?? expense.paidBy)} deleted “${expense.description}”`,
    },
  );
}

export function addSettlement(group: Group, settlement: Settlement, actorId: string | undefined): Group {
  const debt = pairDebtAmount(group, settlement.from, settlement.to);
  const paying = settlement.amount * settlement.exchangeRate;
  const from = memberName(group, settlement.from);
  const to = memberName(group, settlement.to);
  if (toMinor(debt, group.currency) <= 1) {
    throw new AppError("errors.doesNotOwe", { from, to });
  }
  if (paying <= 0) throw new AppError("errors.paymentZero");
  if (toMinor(paying, group.currency) > toMinor(debt, group.currency) + 1) {
    throw new AppError("errors.paymentTooLarge");
  }
  return recordActivity(
    { ...group, settlements: [settlement, ...group.settlements] },
    {
      kind: "settlement.recorded",
      actorId,
      settlementId: settlement.id,
      summary: `${from} paid ${to}`,
    },
  );
}

export function addMember(group: Group, member: Member, actorId: string | undefined): Group {
  if (group.members.some((item) => item.name.toLowerCase() === member.name.toLowerCase())) {
    throw new AppError("errors.memberDuplicate", { name: member.name });
  }
  return recordActivity(
    { ...group, members: [...group.members, member] },
    {
      kind: "member.added",
      actorId,
      memberId: member.id,
      label: member.name,
      summary: `${member.name} joined ${group.name}`,
    },
  );
}

export function removeMember(group: Group, memberId: string, actorId: string | undefined): Group {
  const reason = removalBlockReason(group, memberId);
  if (reason) {
    const name = memberName(group, memberId);
    throw new AppError(reason, reason === "errors.memberHasBalance" ? { name } : undefined);
  }
  const name = memberName(group, memberId);
  return recordActivity(
    { ...group, members: group.members.filter((member) => member.id !== memberId) },
    {
      kind: "member.removed",
      actorId,
      memberId,
      label: name,
      summary: `${name} left ${group.name}`,
    },
  );
}
