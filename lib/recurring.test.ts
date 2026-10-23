import { describe, expect, it } from "vitest";
import type { Expense, Group, Member } from "@/lib/domain";
import { upsertExpense } from "@/lib/group-actions";
import {
  addFrequency,
  confirmOccurrence,
  dueRecurrences,
  latestOccurrence,
  nextOccurrenceDate,
  recurringTemplates,
  setRecurrencePaused,
} from "@/lib/recurring";

const alex: Member = { id: "mem_a", name: "Alex", avatarColor: "#111" };
const ben: Member = { id: "mem_b", name: "Ben", avatarColor: "#222" };

const rent: Expense = {
  id: "exp_rent",
  description: "Rent",
  amount: 3000,
  currency: "USD",
  exchangeRate: 1,
  paidBy: "mem_a",
  splitType: "equal",
  splits: [
    { memberId: "mem_a", amount: 1500 },
    { memberId: "mem_b", amount: 1500 },
  ],
  date: "2026-01-01T12:00:00.000Z",
  category: "Housing",
  recurring: "monthly",
};

function group(expenses: Expense[] = [rent]): Group {
  return {
    id: "grp_1",
    name: "Apt",
    description: "",
    currency: "USD",
    createdAt: "2026-01-01T00:00:00Z",
    members: [alex, ben],
    expenses,
    settlements: [],
  };
}

describe("recurring expenses", () => {
  it("adds a month for monthly frequency", () => {
    expect(addFrequency("2026-01-01T12:00:00.000Z", "monthly")).toBe("2026-02-01T12:00:00.000Z");
    expect(addFrequency("2026-01-01T12:00:00.000Z", "weekly")).toBe("2026-01-08T12:00:00.000Z");
    expect(addFrequency("2026-01-01T12:00:00.000Z", "biweekly")).toBe("2026-01-15T12:00:00.000Z");
  });

  it("prompts for the next occurrence and records it without changing the template", () => {
    const current = group();
    const next = nextOccurrenceDate(current, rent);
    expect(next).toBe("2026-02-01T12:00:00.000Z");
    expect(dueRecurrences(current, new Date("2026-03-01T00:00:00Z"))).toHaveLength(1);

    const withCopy = confirmOccurrence(current, rent.id, next!, "mem_a");
    expect(withCopy.expenses).toHaveLength(2);
    const copy = withCopy.expenses.find((expense) => expense.recurringTemplateId === rent.id);
    expect(copy?.amount).toBe(3000);
    expect(withCopy.expenses.find((expense) => expense.id === rent.id)?.amount).toBe(3000);
    expect(withCopy.activity?.[0]?.kind).toBe("expense.added");
    expect(latestOccurrence(withCopy, rent).id).toBe(copy?.id);
  });

  it("keeps a one-off edit on the occurrence", () => {
    const next = confirmOccurrence(group(), rent.id, "2026-02-01T12:00:00.000Z", "mem_a");
    const copy = next.expenses.find((expense) => expense.recurringTemplateId === rent.id)!;
    const edited = upsertExpense(
      next,
      { ...copy, amount: 3100, splits: [{ memberId: "mem_a", amount: 1550 }, { memberId: "mem_b", amount: 1550 }] },
      "mem_a",
      "edit",
    );
    expect(edited.expenses.find((expense) => expense.id === rent.id)?.amount).toBe(3000);
    expect(edited.expenses.find((expense) => expense.id === copy.id)?.amount).toBe(3100);
  });

  it("pauses due prompts and resumes them", () => {
    const paused = setRecurrencePaused(group(), rent.id, true);
    expect(recurringTemplates(paused)[0]?.recurrencePaused).toBe(true);
    expect(dueRecurrences(paused, new Date("2026-03-01T00:00:00Z"))).toHaveLength(0);
    const resumed = setRecurrencePaused(paused, rent.id, false);
    expect(dueRecurrences(resumed, new Date("2026-03-01T00:00:00Z"))).toHaveLength(1);
  });
});
