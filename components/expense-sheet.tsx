"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { categoriesForGroup, SUPPORTED_CURRENCIES } from "@/lib/catalog";
import type { Expense, Group, RecurringFrequency, SplitType } from "@/lib/domain";
import { draftSplits, parseAmount } from "@/lib/forms";
import { dateInputValue, dateToIso, todayInput } from "@/lib/dates";
import { createId } from "@/lib/ids";
import { currencySymbol, formatMoney } from "@/lib/money";
import { rateIntoGroup } from "@/lib/sample";
import { deleteExpense, upsertExpense } from "@/lib/group-actions";
import { useAppStore, viewerId } from "@/stores/app-store";
import { Button, controlClass, Field } from "@/components/ui";

const SPLIT_TYPES: { id: SplitType; label: string }[] = [
  { id: "equal", label: "Equal" },
  { id: "exact", label: "Exact" },
  { id: "percentage", label: "Percentage" },
  { id: "shares", label: "Shares" },
];

export function ExpenseSheet({ group }: { group: Group }) {
  const viewingAs = useAppStore((state) => state.viewingAs);
  const sheet = useAppStore((state) => state.sheet);
  const closeSheet = useAppStore((state) => state.closeSheet);
  const commit = useAppStore((state) => state.commit);
  const expenseId = sheet.kind === "expense" ? sheet.expenseId : undefined;
  const existing = group.expenses.find((expense) => expense.id === expenseId);
  const viewer = viewerId(group, viewingAs);
  const formId = useId();

  const [description, setDescription] = useState(existing?.description ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [currency, setCurrency] = useState(existing?.currency ?? group.currency);
  const [date, setDate] = useState(existing ? dateInputValue(existing.date) : todayInput());
  const [category, setCategory] = useState(existing?.category ?? "Food & Drink");
  const [customCategory, setCustomCategory] = useState("");
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? viewer);
  const [splitType, setSplitType] = useState<SplitType>(existing?.splitType ?? "equal");
  const [included, setIncluded] = useState<string[]>(
    existing ? existing.splits.map((split) => split.memberId) : group.members.map((member) => member.id),
  );
  const [exact, setExact] = useState<Record<string, string>>(() => objectFrom(existing, "amount"));
  const [percentage, setPercentage] = useState<Record<string, string>>(() => objectFrom(existing, "percentage"));
  const [shares, setShares] = useState<Record<string, string>>(() => objectFrom(existing, "shares"));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [rateText, setRateText] = useState(existing ? String(existing.exchangeRate) : "1");
  const [rateIsUserSet, setRateIsUserSet] = useState(Boolean(existing?.exchangeRateIsUserSet));
  const [recurring, setRecurring] = useState<RecurringFrequency | "">(existing?.recurring ?? "");
  const [rateStatus, setRateStatus] = useState<"idle" | "loading" | "ready" | "stale" | "missing">("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const categories = categoriesForGroup(group.customCategories);
  const occurrence = Boolean(existing?.recurringTemplateId);

  useEffect(() => {
    if (rateIsUserSet) return;
    if (currency === group.currency) {
      setRateText("1");
      setRateStatus("ready");
      return;
    }
    if (existing && currency === existing.currency) {
      setRateText(String(existing.exchangeRate));
      setRateStatus("ready");
      return;
    }
    const controller = new AbortController();
    setRateStatus("loading");
    fetch(`/api/rates?base=${group.currency}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { rates?: Record<string, number>; stale?: boolean; error?: string };
        if (!response.ok || !body.rates) {
          setRateStatus("missing");
          return;
        }
        setRateText(String(rateIntoGroup(body.rates, currency, group.currency)));
        setRateStatus(body.stale ? "stale" : "ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRateStatus("missing");
      });
    return () => controller.abort();
  }, [currency, existing?.currency, existing?.exchangeRate, existing?.id, group.currency, rateIsUserSet]);

  const parsedAmount = parseAmount(amount, currency);
  const parsedRate = Number(rateText);
  const preview = useMemo(() => {
    if ("error" in parsedAmount) return parsedAmount;
    return draftSplits({
      splitType,
      included,
      exact,
      percentage,
      shares,
      payerId: paidBy,
      amount: parsedAmount.value,
      currency,
    });
  }, [parsedAmount, splitType, included, exact, percentage, shares, paidBy, currency]);

  function toggleMember(memberId: string) {
    setIncluded((current) => (current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]));
  }

  async function save() {
    setFieldError(null);
    if (!description.trim()) {
      setFieldError("Enter a description.");
      return;
    }
    if ("error" in parsedAmount) {
      setFieldError(parsedAmount.error);
      return;
    }
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setFieldError("Enter an exchange rate greater than zero.");
      return;
    }
    if ("error" in preview) {
      setFieldError(preview.error);
      return;
    }
    const chosenCategory = category === "__custom" ? customCategory.trim() : category;
    if (!chosenCategory) {
      setFieldError("Choose a category.");
      return;
    }
    const expense: Expense = {
      id: existing?.id ?? createId("exp"),
      description: description.trim(),
      amount: parsedAmount.value,
      currency,
      exchangeRate: currency === group.currency ? 1 : parsedRate,
      exchangeRateIsUserSet: rateIsUserSet || undefined,
      paidBy,
      splitType,
      splits: preview.splits,
      date: dateToIso(date),
      category: chosenCategory,
      notes: notes.trim() || undefined,
      recurring: recurring || undefined,
      recurringTemplateId: existing?.recurringTemplateId,
      recurrencePaused: existing?.recurrencePaused,
    };
    const customCategories =
      category === "__custom" && !categories.includes(chosenCategory)
        ? [...(group.customCategories ?? []), chosenCategory]
        : group.customCategories;
    const next = upsertExpense({ ...group, customCategories }, expense, viewer || paidBy, existing ? "edit" : "add");
    setSaving(true);
    try {
      await commit(next, existing ? "Expense updated." : "Expense saved.");
      closeSheet();
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "Could not save this expense.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const next = deleteExpense(group, existing?.id ?? "", viewer || paidBy);
    setSaving(true);
    try {
      await commit(next, "Expense deleted.");
      closeSheet();
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "Could not delete this expense.");
      setSaving(false);
    }
  }

  const selectedCount = `${included.length} of ${group.members.length} members selected`;
  const splitError = "error" in preview && amount ? preview.error : null;
  const splitErrorId = `${formId}-split-error`;
  const equalPreview =
    splitType === "equal" && "splits" in preview && !("error" in parsedAmount)
      ? `${formatMoney(parsedAmount.value, currency)} split ${included.length} ${included.length === 1 ? "way" : "ways"}`
      : null;

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Field id={`${formId}-amount`} label="Amount" error={"error" in parsedAmount && amount ? parsedAmount.error : null}>
        <input
          id={`${formId}-amount`}
          className={`${controlClass} font-mono text-lg`}
          inputMode="decimal"
          autoComplete="off"
          aria-required="true"
          aria-describedby={"error" in parsedAmount && amount ? `${formId}-amount-error` : undefined}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>

      <Field id={`${formId}-description`} label="Description">
        <input
          id={`${formId}-description`}
          className={controlClass}
          aria-required="true"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Who paid</legend>
        <div className="flex flex-wrap gap-2">
          {group.members.map((member) => {
            const selected = paidBy === member.id;
            return (
              <button
                key={member.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPaidBy(member.id)}
                className={`min-h-11 rounded-full border px-3 text-sm ${selected ? "border-accent bg-accent-subtle text-text-primary" : "border-border text-text-secondary"}`}
              >
                {member.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${formId}-currency`} label="Currency">
          <select id={`${formId}-currency`} className={controlClass} value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {currencySymbol(code)} {code}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${formId}-date`} label="Date">
          <input id={`${formId}-date`} type="date" className={controlClass} value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
      </div>

      {currency !== group.currency ? (
        <Field
          id={`${formId}-rate`}
          label={`Exchange rate into ${group.currency}`}
          hint={
            rateStatus === "loading"
              ? "Fetching exchange rates..."
              : rateStatus === "stale"
                ? "Rates may be outdated. The last cached rate is filled in."
                : rateStatus === "missing"
                  ? "Live rates are unavailable. Enter a rate to continue."
                  : "Saved on this expense so later rate changes do not move the balance."
          }
        >
          <input
            id={`${formId}-rate`}
            className={`${controlClass} font-mono`}
            inputMode="decimal"
            aria-busy={rateStatus === "loading"}
            value={rateText}
            onChange={(event) => {
              setRateIsUserSet(true);
              setRateText(event.target.value);
            }}
          />
        </Field>
      ) : null}

      <Field id={`${formId}-category`} label="Category">
        <select id={`${formId}-category`} className={controlClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value="__custom">Custom category</option>
        </select>
      </Field>
      {category === "__custom" ? (
        <Field id={`${formId}-custom`} label="Custom category name">
          <input id={`${formId}-custom`} className={controlClass} value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} />
        </Field>
      ) : null}

      <fieldset className="grid gap-3" aria-describedby={splitError ? splitErrorId : undefined}>
        <legend className="text-sm font-medium">Split</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Split type">
          {SPLIT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={splitType === type.id}
              onClick={() => setSplitType(type.id)}
              className={`min-h-11 rounded-md border text-sm font-medium ${splitType === type.id ? "border-accent bg-accent-subtle" : "border-border"}`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-text-secondary">{selectedCount}</p>
        <ul className="grid gap-2">
          {group.members.map((member) => {
            const on = included.includes(member.id);
            return (
              <li key={member.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleMember(member.id)}
                  className={`min-h-11 rounded-md border px-3 text-left text-sm ${on ? "border-accent" : "border-border text-text-secondary"}`}
                >
                  {member.name}
                </button>
                {splitType === "exact" && on ? (
                  <input
                    aria-label={`${member.name} exact amount`}
                    className={`${controlClass} w-28 font-mono`}
                    inputMode="decimal"
                    aria-invalid={Boolean(splitError)}
                    aria-describedby={splitError ? splitErrorId : undefined}
                    value={exact[member.id] ?? ""}
                    onChange={(event) => setExact({ ...exact, [member.id]: event.target.value })}
                  />
                ) : null}
                {splitType === "percentage" && on ? (
                  <input
                    aria-label={`${member.name} percentage`}
                    className={`${controlClass} w-24 font-mono`}
                    inputMode="decimal"
                    aria-invalid={Boolean(splitError)}
                    aria-describedby={splitError ? splitErrorId : undefined}
                    value={percentage[member.id] ?? ""}
                    onChange={(event) => setPercentage({ ...percentage, [member.id]: event.target.value })}
                  />
                ) : null}
                {splitType === "shares" && on ? (
                  <input
                    aria-label={`${member.name} shares`}
                    className={`${controlClass} w-24 font-mono`}
                    inputMode="numeric"
                    value={shares[member.id] ?? "1"}
                    onChange={(event) => setShares({ ...shares, [member.id]: event.target.value })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        {equalPreview ? <p className="text-sm text-text-secondary">{equalPreview}</p> : null}
        {"splits" in preview ? (
          <p className="font-mono text-sm text-text-primary">
            {preview.splits
              .map((split) => `${group.members.find((member) => member.id === split.memberId)?.name.split(" ")[0]} ${formatMoney(split.amount, currency)}`)
              .join(" · ")}
          </p>
        ) : null}
        {splitError ? (
          <p id={splitErrorId} className="text-sm text-error" role="alert">
            {splitError}
          </p>
        ) : null}
      </fieldset>

      <Field id={`${formId}-recurring`} label="Repeat" hint={occurrence ? "This is one occurrence. Editing it does not change the series." : undefined}>
        <select
          id={`${formId}-recurring`}
          className={controlClass}
          value={recurring}
          disabled={occurrence}
          onChange={(event) => setRecurring(event.target.value as RecurringFrequency | "")}
        >
          <option value="">Does not repeat</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every two weeks</option>
          <option value="monthly">Monthly</option>
        </select>
      </Field>

      <Field id={`${formId}-notes`} label="Notes">
        <textarea id={`${formId}-notes`} className={`${controlClass} min-h-20 py-2`} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>

      {fieldError ? (
        <p className="text-sm text-error" role="alert">
          {fieldError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : existing ? "Save changes" : "Add expense"}
        </Button>
        <Button variant="quiet" onClick={closeSheet}>
          Cancel
        </Button>
        {existing && !confirmDelete ? (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="grid gap-3 rounded-md border border-border bg-bg-secondary p-3">
          <p>Delete “{existing?.description}”? Balances will update immediately.</p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => void remove()}>
              Delete expense
            </Button>
            <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function objectFrom(expense: Expense | undefined, key: "amount" | "percentage" | "shares"): Record<string, string> {
  const result: Record<string, string> = {};
  for (const split of expense?.splits ?? []) {
    const value = split[key];
    if (value !== undefined) result[split.memberId] = String(value);
  }
  return result;
}
