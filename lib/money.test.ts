import { describe, expect, it } from "vitest";
import { balanceMinorSum, computeBalances, settlementToGroupMinor } from "@/lib/balances";
import { sampleGroups } from "@/lib/sample";
import { exactSplitsValid, percentagesValid, splitByPercentage, splitByShares, splitEqual } from "@/lib/splits";
import { toMinor } from "@/lib/money";

describe("equal splits", () => {
  it("gives the leftover cent to the payer", () => {
    const splits = splitEqual(100, "USD", ["payer", "b", "c"], "payer");
    expect(splits.map((split) => split.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  it("splits $24.50 four ways into cents that sum to the total", () => {
    const splits = splitEqual(24.5, "USD", ["a", "b", "c", "d"], "a");
    expect(splits.map((split) => split.amount).sort((a, b) => b - a)).toEqual([6.13, 6.13, 6.12, 6.12]);
    expect(toMinor(splits.reduce((sum, split) => sum + split.amount, 0), "USD")).toBe(2450);
  });

  it("splits $142.37 three ways and $34.99 five ways", () => {
    expect(splitEqual(142.37, "USD", ["a", "b", "c"], "a").map((split) => split.amount).sort((a, b) => b - a)).toEqual([
      47.46, 47.46, 47.45,
    ]);
    const five = splitEqual(34.99, "USD", ["a", "b", "c", "d", "e"], "a").map((split) => split.amount);
    expect(five.filter((amount) => amount === 7).length).toBe(4);
    expect(five.filter((amount) => amount === 6.99).length).toBe(1);
  });

  it("keeps yen in whole units and gives the extra yen to the payer", () => {
    const splits = splitEqual(4850, "JPY", ["a", "b", "c", "d"], "b");
    expect(splits.every((split) => Number.isInteger(split.amount))).toBe(true);
    expect(splits.reduce((sum, split) => sum + split.amount, 0)).toBe(4850);
    expect(splits.find((split) => split.memberId === "b")?.amount).toBe(1213);
  });
});

describe("advanced splits", () => {
  it("allocates percentages that sum to the total", () => {
    const splits = splitByPercentage(
      89.2,
      "USD",
      [
        { memberId: "mia", percentage: 30 },
        { memberId: "noah", percentage: 20 },
        { memberId: "priya", percentage: 30 },
        { memberId: "ethan", percentage: 20 },
      ],
      "priya",
    );
    expect(exactSplitsValid(89.2, "USD", splits)).toBe(true);
    expect(splits.find((split) => split.memberId === "priya")?.amount).toBe(26.76);
  });

  it("checks that percentages sum to 100", () => {
    expect(percentagesValid([30, 20, 30])).toBe(false);
    expect(percentagesValid([50, 50])).toBe(true);
  });

  it("splits by shares", () => {
    const splits = splitByShares(
      6000,
      "JPY",
      [
        { memberId: "alex", shares: 2 },
        { memberId: "jordan", shares: 2 },
        { memberId: "sam", shares: 1 },
        { memberId: "taylor", shares: 1 },
      ],
      "alex",
    );
    expect(splits.reduce((sum, split) => sum + split.amount, 0)).toBe(6000);
    expect(splits.find((split) => split.memberId === "sam")?.amount).toBe(1000);
  });

  it("allows a zero exact share when the amounts still sum to the total", () => {
    expect(
      exactSplitsValid(30, "USD", [
        { memberId: "jake", amount: 0 },
        { memberId: "lily", amount: 15 },
        { memberId: "omar", amount: 15 },
      ]),
    ).toBe(true);
  });
});

describe("sample group balances", () => {
  it("sums to zero in every sample group", () => {
    for (const group of sampleGroups()) {
      expect(balanceMinorSum(group), group.name).toBe(0);
    }
  });

  it("applies the Japan trip settlements in USD and JPY", () => {
    const settled = sampleGroups().find((group) => group.id === "grp_japan_2024");
    if (!settled) throw new Error("missing japan group");
    const open = { ...settled, settlements: [] };
    const before = computeBalances(open);
    const after = computeBalances(settled);
    const minorOf = (balances: typeof before, id: string) => balances.members.find((member) => member.memberId === id)?.minor ?? 0;
    const usd = settled.settlements.find((item) => item.id === "stl_001");
    const jpy = settled.settlements.find((item) => item.id === "stl_002");
    if (!usd || !jpy) throw new Error("missing settlements");
    expect(minorOf(after, usd.from) - minorOf(before, usd.from)).toBe(settlementToGroupMinor(usd, settled.currency));
    expect(minorOf(after, jpy.from) - minorOf(before, jpy.from)).toBe(settlementToGroupMinor(jpy, settled.currency));
    expect(after.members.reduce((sum, member) => sum + member.minor, 0)).toBe(0);
  });

  it("leaves one birthday debt: Chloe owes Ben $14.37", () => {
    const group = sampleGroups().find((item) => item.id === "grp_birthday");
    if (!group) throw new Error("missing birthday group");
    const balances = computeBalances(group);
    const amount = (id: string) => balances.members.find((member) => member.memberId === id)?.amount;
    expect(amount("mem_chloe")).toBe(-14.37);
    expect(amount("mem_ben")).toBe(14.37);
    expect(balances.pairs).toEqual([{ fromId: "mem_chloe", toId: "mem_ben", amount: 14.37 }]);
  });
});
