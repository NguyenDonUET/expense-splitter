import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locale";
import { messagesFor, t, type Messages } from "@/lib/i18n/t";

export async function localeFromParams(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

export async function messagesFromParams(params: Promise<{ locale: string }>): Promise<{ locale: Locale; messages: Messages }> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return { locale, messages: messagesFor(locale) };
}

export async function titleFromParams(params: Promise<{ locale: string }>, key: string): Promise<string> {
  const { messages } = await messagesFromParams(params);
  return t(messages, key);
}
