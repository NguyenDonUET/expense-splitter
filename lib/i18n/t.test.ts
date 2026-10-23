import { describe, expect, it } from "vitest";
import { interpolate, t } from "@/lib/i18n/t";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return prefix ? [prefix] : [];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => keysOf(nested, prefix ? `${prefix}.${key}` : key));
}

describe("t", () => {
  it("interpolates named placeholders", () => {
    expect(interpolate("You owe {name} {amount}", { name: "Alex", amount: "$4" })).toBe("You owe Alex $4");
    expect(t(en, "dashboard.youOwePerson", { name: "Alex", amount: "$4.00" })).toBe("You owe Alex $4.00");
  });

  it("keeps English and Vietnamese catalogs aligned", () => {
    expect(keysOf(vi).sort()).toEqual(keysOf(en).sort());
  });
});
