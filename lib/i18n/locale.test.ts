import { describe, expect, it } from "vitest";
import { parseAcceptLanguage, resolveLocale } from "@/lib/i18n/locale";

describe("parseAcceptLanguage", () => {
  it("prefers Vietnamese when it ranks first", () => {
    expect(parseAcceptLanguage("vi-VN,vi;q=0.9,en;q=0.8")).toBe("vi");
  });

  it("falls back to English when Vietnamese is absent", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9")).toBe("en");
    expect(parseAcceptLanguage(null)).toBe("en");
  });
});

describe("resolveLocale", () => {
  it("keeps a stored cookie and does not persist again", () => {
    expect(resolveLocale("vi", "en")).toEqual({ locale: "vi", persist: false });
  });

  it("uses Accept-Language when the cookie is missing", () => {
    expect(resolveLocale(undefined, "vi,en;q=0.8")).toEqual({ locale: "vi", persist: true });
  });
});
