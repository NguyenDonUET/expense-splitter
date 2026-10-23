import { describe, expect, it } from "vitest";
import { expensesToCsv } from "@/lib/csv";
import type { Group } from "@/lib/domain";
import { t } from "@/lib/i18n/t";
import en from "@/messages/en.json";

const group: Group = {
  id: "grp_1",
  name: "Trip",
  description: "",
  currency: "USD",
  createdAt: "2026-01-01T00:00:00Z",
  members: [
    { id: "mem_a", name: "Alex", avatarColor: "#111" },
    { id: "mem_b", name: "Ben, Jr.", avatarColor: "#222" },
  ],
  expenses: [
    {
      id: "exp_1",
      description: "Ramen, extra",
      amount: 20,
      currency: "USD",
      exchangeRate: 1,
      paidBy: "mem_a",
      splitType: "equal",
      splits: [
        { memberId: "mem_a", amount: 10 },
        { memberId: "mem_b", amount: 10 },
      ],
      date: "2026-01-02T12:00:00Z",
      category: "Food & Drink",
    },
  ],
  settlements: [],
};

describe("CSV export", () => {
  it("includes the required columns and quotes commas", () => {
    const csv = expensesToCsv(group, (key, vars) => t(en, key, vars));
    const [header, row] = csv.split("\n");
    expect(header).toContain("date,description,amount,currency,category,paid by,split type");
    expect(header).toContain("Alex share");
    expect(header).toContain('"Ben, Jr. share"');
    expect(row).toContain('"Ramen, extra"');
    expect(row).toContain("20");
    expect(row).toContain("equal");
  });
});
