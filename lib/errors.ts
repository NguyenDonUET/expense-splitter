export class AppError extends Error {
  readonly code: string;
  readonly vars?: Record<string, string | number>;

  constructor(code: string, vars?: Record<string, string | number>) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.vars = vars;
  }
}

export function isMessageKey(value: string): boolean {
  return /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9][a-zA-Z0-9 &-]*)+$/.test(value);
}
