import { AppError, isMessageKey } from "@/lib/errors";
import type { Translate } from "@/lib/i18n/t";

export function formatError(error: unknown, translate: Translate, fallback = "errors.generic"): string {
  if (error instanceof AppError) return translate(error.code, error.vars);
  if (error instanceof Error && isMessageKey(error.message)) return translate(error.message);
  if (typeof error === "string" && isMessageKey(error)) return translate(error);
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return translate(fallback);
}

export function formatStatus(message: string | null, translate: Translate): string | null {
  if (!message) return null;
  if (isMessageKey(message)) return translate(message);
  return message;
}
