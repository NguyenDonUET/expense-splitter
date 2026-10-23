const MINOR_DIGITS: Record<string, number> = {
  JPY: 0,
  VND: 0,
};

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  VND: "vi-VN",
  CAD: "en-CA",
  AUD: "en-AU",
  CHF: "de-CH",
  CNY: "zh-CN",
  INR: "en-IN",
  MXN: "es-MX",
};

export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency] ?? 2;
}

export function formatMoney(amount: number, currency: string): string {
  const digits = minorDigits(currency);
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function minorFactor(currency: string): number {
  return 10 ** minorDigits(currency);
}

export function toMinor(amount: number, currency: string): number {
  return Math.round(amount * minorFactor(currency));
}

export function fromMinor(minor: number, currency: string): number {
  return minor / minorFactor(currency);
}

export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? "en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/** One minor unit or less is too small to treat as a real balance. */
export function isDust(minor: number): boolean {
  return Math.abs(minor) <= 1;
}
