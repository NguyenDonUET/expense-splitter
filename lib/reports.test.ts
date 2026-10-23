import { describe, expect, it } from "vitest";
import type { Group } from "@/lib/domain";
import { memberSpending, monthRange } from "@/lib/reports";

const group: Group = {
  id: "grp_1",
  name: "Trip",
  description: "",
  currency: "USD",
  createdAt: "2026-01-01T00:00:00Z",
  members: [
    { id: "mem_a", name: "Alex", avatarColor: "#111" },
    { id: "mem_b", name: "Ben", avatarColor: "#222" },
  ],
  expenses: [
    {
      id: "exp_1",
      description: "Hotel",
      amount: 100,
      currency: "USD",
      exchangeRate: 1,
      paidBy: "mem_a",
      splitType: "equal",
      splits: [
        { memberId: "mem_a", amount: 50 },
        { memberId: "mem_b", amount: 50 },
      ],
      date: "2026-01-02T12:00:00Z",
      category: "Accommodation",
    },
  ],
  settlements: [],
};

describe("spending summary", () => {
  it("shows who paid more than their share", () => {
    const rows = memberSpending(group, group.expenses);
    expect(rows.find((row) => row.memberId === "mem_a")).toMatchObject({ paid: 100, share: 50, net: 50 });
    expect(rows.find((row) => row.memberId === "mem_b")).toMatchObject({ paid: 0, share: 50, net: -50 });
  });

  it("uses local calendar days for this month and last month", () => {
    const now = new Date(2026, 9, 23);
    expect(monthRange("this", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange("last", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
});
