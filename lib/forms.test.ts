import { describe, expect, it } from "vitest";
import { draftSplits } from "@/lib/forms";
import { rateIntoGroup } from "@/lib/sample";

const members = ["a", "b", "c"];

describe("draftSplits", () => {
  it("defaults to an equal split among the included members", () => {
    const result = draftSplits({
      splitType: "equal",
      included: members,
      exact: {},
      percentage: {},
      shares: {},
      payerId: "a",
      amount: 100,
      currency: "USD",
    });
    expect("splits" in result).toBe(true);
    if ("splits" in result) {
      expect(result.splits.map((split) => split.amount).sort((left, right) => right - left)).toEqual([33.34, 33.33, 33.33]);
    }
  });

  it("allows a $0 exact share and rejects a sum that is not the total", () => {
    const valid = draftSplits({
      splitType: "exact",
      included: members,
      exact: { a: "60", b: "40", c: "0" },
      percentage: {},
      shares: {},
      payerId: "a",
      amount: 100,
      currency: "USD",
    });
    expect("splits" in valid).toBe(true);

    const invalid = draftSplits({
      splitType: "exact",
      included: members,
      exact: { a: "50", b: "40", c: "0" },
      percentage: {},
      shares: {},
      payerId: "a",
      amount: 100,
      currency: "USD",
    });
    expect("error" in invalid && invalid.error).toMatch(/must add up to/);
  });

  it("rejects percentages that do not add to 100", () => {
    const invalid = draftSplits({
      splitType: "percentage",
      included: members,
      exact: {},
      percentage: { a: "50", b: "30", c: "10" },
      shares: {},
      payerId: "a",
      amount: 80,
      currency: "USD",
    });
    expect("error" in invalid && invalid.error).toMatch(/must add up to 100%/);

    const valid = draftSplits({
      splitType: "percentage",
      included: members,
      exact: {},
      percentage: { a: "50", b: "30", c: "20" },
      shares: {},
      payerId: "a",
      amount: 80,
      currency: "USD",
    });
    expect("splits" in valid).toBe(true);
  });
});

describe("rateIntoGroup", () => {
  it("converts the expense currency into the group currency from latest/{groupCurrency}", () => {
    expect(rateIntoGroup({ USD: 1, EUR: 0.5, JPY: 150 }, "EUR", "USD")).toBe(2);
    expect(rateIntoGroup({ USD: 1, EUR: 0.5 }, "USD", "USD")).toBe(1);
  });
});
