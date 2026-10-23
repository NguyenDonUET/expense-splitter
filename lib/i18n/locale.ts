export const LOCALES = ["en", "vi"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "expense-splitter-locale";

export const LOCALE_HEADER = "x-expense-splitter-locale";

export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "vi";
}

export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((left, right) => right.q - left.q);
  for (const { tag } of parts) {
    if (tag.startsWith("vi")) return "vi";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): { locale: Locale; persist: boolean } {
  if (isLocale(cookie)) return { locale: cookie, persist: false };
  return { locale: parseAcceptLanguage(acceptLanguage), persist: true };
}

export function localeCookieValue(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_MAX_AGE}; SameSite=Lax`;
}

export function intlLocale(locale: Locale): string {
  return locale === "vi" ? "vi-VN" : "en";
}
