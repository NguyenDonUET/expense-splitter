import { describe, expect, it } from "vitest";
import { activityFeed, formatActivityItem, formatRelative } from "@/lib/activity";
import type { Group } from "@/lib/domain";
import { t } from "@/lib/i18n/t";
import vi from "@/messages/vi.json";

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
      description: "Ramen",
      amount: 20,
      currency: "USD",
      exchangeRate: 1,
      paidBy: "mem_a",
      splitType: "equal",
      splits: [
        { memberId: "mem_a", amount: 10 },
        { memberId: "mem_b", amount: 10 },
      ],
      date: "2026-01-02T00:00:00Z",
      category: "Food & Drink",
    },
  ],
  settlements: [],
};

describe("activity locale", () => {
  it("formats stored kinds in Vietnamese", () => {
    const item = activityFeed(group).find((entry) => entry.kind === "expense.added");
    expect(item).toBeDefined();
    expect(formatActivityItem(group, item!, (key, vars) => t(vi, key, vars))).toBe("Alex đã thêm “Ramen”");
  });

  it("uses the UI locale for relative time", () => {
    const now = Date.parse("2026-01-02T00:00:30Z");
    expect(formatRelative("2026-01-02T00:00:00Z", "en", now)).toMatch(/second|ago/i);
    expect(formatRelative("2026-01-02T00:00:00Z", "vi", now)).toMatch(/giây/i);
  });
});
