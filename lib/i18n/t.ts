import type { Locale } from "@/lib/i18n/locale";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

export const catalogs = { en, vi } as const;

export type Messages = typeof en;

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

function lookup(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, messages);
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (vars[name] === undefined ? match : String(vars[name])));
}

export function t(messages: Messages, key: string, vars?: Record<string, string | number>): string {
  const value = lookup(messages, key);
  if (typeof value !== "string") return key;
  return interpolate(value, vars);
}

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}

export function translateCategory(translate: Translate, category: string): string {
  const result = translate(`categories.${category}`);
  return result === `categories.${category}` ? category : result;
}
