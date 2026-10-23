import { describe, expect, it } from "vitest";
import { addMember, addSettlement, deleteGroupBlockReason, removalBlockReason, removeMember } from "@/lib/group-actions";
import type { Group, Member } from "@/lib/domain";

const alex: Member = { id: "mem_a", name: "Alex", avatarColor: "#6366F1" };
const jordan: Member = { id: "mem_j", name: "Jordan", avatarColor: "#F59E0B" };

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: "grp_test",
    name: "Test",
    description: "",
    currency: "USD",
    createdAt: "2026-01-01T00:00:00Z",
    members: [alex, jordan],
    expenses: [],
    settlements: [],
    ...overrides,
  };
}

describe("member removal", () => {
  it("allows removing a member whose balance is zero, even if they appear in history", () => {
    const current = group({
      expenses: [
        {
          id: "exp_1",
          description: "Coffee",
          amount: 10,
          currency: "USD",
          exchangeRate: 1,
          paidBy: "mem_a",
          splitType: "equal",
          splits: [
            { memberId: "mem_a", amount: 5 },
            { memberId: "mem_j", amount: 5 },
          ],
          date: "2026-01-02T00:00:00Z",
          category: "Food & Drink",
        },
      ],
      settlements: [
        {
          id: "set_1",
          from: "mem_j",
          to: "mem_a",
          amount: 5,
          currency: "USD",
          exchangeRate: 1,
          date: "2026-01-03T00:00:00Z",
        },
      ],
    });
    expect(removalBlockReason(current, "mem_j")).toBeNull();
    expect(removeMember(current, "mem_j", "mem_a").members.map((member) => member.id)).toEqual(["mem_a"]);
  });

  it("blocks removing a member who still has a balance", () => {
    const current = group({
      expenses: [
        {
          id: "exp_1",
          description: "Lunch",
          amount: 20,
          currency: "USD",
          exchangeRate: 1,
          paidBy: "mem_a",
          splitType: "equal",
          splits: [
            { memberId: "mem_a", amount: 10 },
            { memberId: "mem_j", amount: 10 },
          ],
          date: "2026-01-02T00:00:00Z",
          category: "Food & Drink",
        },
      ],
    });
    expect(removalBlockReason(current, "mem_j")).toMatch(/still has a balance/);
    expect(() => removeMember(current, "mem_j", "mem_a")).toThrow(/still has a balance/);
  });
});

describe("group deletion", () => {
  it("blocks deleting a group with open balances", () => {
    const current = group({
      expenses: [
        {
          id: "exp_1",
          description: "Lunch",
          amount: 20,
          currency: "USD",
          exchangeRate: 1,
          paidBy: "mem_a",
          splitType: "equal",
          splits: [
            { memberId: "mem_a", amount: 10 },
            { memberId: "mem_j", amount: 10 },
          ],
          date: "2026-01-02T00:00:00Z",
          category: "Food & Drink",
        },
      ],
    });
    expect(deleteGroupBlockReason(current)).toMatch(/Settle every balance/);
  });

  it("allows deleting a settled group", () => {
    expect(deleteGroupBlockReason(group())).toBeNull();
  });
});

describe("add member", () => {
  it("rejects a duplicate name", () => {
    expect(() => addMember(group(), { ...jordan, id: "mem_new", name: "jordan" }, "mem_a")).toThrow(/already in this group/);
  });
});

describe("settlements", () => {
  const lunch = group({
    expenses: [
      {
        id: "exp_1",
        description: "Lunch",
        amount: 20,
        currency: "USD",
        exchangeRate: 1,
        paidBy: "mem_a",
        splitType: "equal",
        splits: [
          { memberId: "mem_a", amount: 10 },
          { memberId: "mem_j", amount: 10 },
        ],
        date: "2026-01-02T00:00:00Z",
        category: "Food & Drink",
      },
    ],
  });

  it("records a partial payment and rejects the reverse direction", () => {
    const partial = addSettlement(
      lunch,
      { id: "set_1", from: "mem_j", to: "mem_a", amount: 4, currency: "USD", exchangeRate: 1, date: "2026-01-03T00:00:00Z" },
      "mem_a",
    );
    expect(partial.settlements).toHaveLength(1);
    expect(() =>
      addSettlement(
        lunch,
        { id: "set_2", from: "mem_a", to: "mem_j", amount: 4, currency: "USD", exchangeRate: 1, date: "2026-01-03T00:00:00Z" },
        "mem_a",
      ),
    ).toThrow(/does not owe/);
  });
});
