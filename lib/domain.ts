export type CurrencyCode = string;

export type SplitType = "equal" | "exact" | "percentage" | "shares";

export type RecurringFrequency = "weekly" | "biweekly" | "monthly";

export interface Member {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  /** Present when this member is a registered account. Name-only guests omit it. */
  userId?: string;
}

export interface Split {
  memberId: string;
  amount: number;
  shares?: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  exchangeRateIsUserSet?: boolean;
  paidBy: string;
  splitType: SplitType;
  splits: Split[];
  date: string;
  category: string;
  notes?: string;
  recurring?: RecurringFrequency;
  /** Set on a generated occurrence. The template expense omits this. */
  recurringTemplateId?: string;
  recurrencePaused?: boolean;
}

export type ActivityKind =
  | "expense.added"
  | "expense.edited"
  | "expense.deleted"
  | "settlement.recorded"
  | "member.added"
  | "member.removed";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  actorId?: string;
  summary: string;
  /** Proper noun used when formatting the event in the UI locale (expense description or member name). */
  label?: string;
  expenseId?: string;
  settlementId?: string;
  memberId?: string;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  date: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  currency: CurrencyCode;
  createdAt: string;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  customCategories?: string[];
  activity?: ActivityEvent[];
}

export interface PairDebt {
  fromId: string;
  toId: string;
  amount: number;
}

export interface SampleData {
  groups: Group[];
}
