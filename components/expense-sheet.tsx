"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { categoriesForGroup, SUPPORTED_CURRENCIES } from "@/lib/catalog";
import type { Expense, Group, RecurringFrequency, SplitType } from "@/lib/domain";
import { draftSplits, parseAmount } from "@/lib/forms";
import { dateInputValue, dateToIso, todayInput } from "@/lib/dates";
import { formatError } from "@/lib/i18n/format-error";
import { translateCategory } from "@/lib/i18n/t";
import { createId } from "@/lib/ids";
import { currencySymbol, formatMoney } from "@/lib/money";
import { rateIntoGroup } from "@/lib/sample";
import { deleteExpense, upsertExpense } from "@/lib/group-actions";
import { useAppStore, viewerId } from "@/stores/app-store";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ExpenseSheet({ group }: { group: Group }) {
  const t = useT();
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
  const splitTypes: { id: SplitType; label: string }[] = [
    { id: "equal", label: t("split.equal") },
    { id: "exact", label: t("split.exact") },
    { id: "percentage", label: t("split.percentage") },
    { id: "shares", label: t("split.shares") },
  ];

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
      setFieldError(t("expense.enterDescription"));
      return;
    }
    if ("error" in parsedAmount) {
      setFieldError(t(parsedAmount.error, parsedAmount.vars));
      return;
    }
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setFieldError(t("expense.enterRate"));
      return;
    }
    if ("error" in preview) {
      setFieldError(t(preview.error, preview.vars));
      return;
    }
    const chosenCategory = category === "__custom" ? customCategory.trim() : category;
    if (!chosenCategory) {
      setFieldError(t("expense.chooseCategory"));
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
      await commit(next, existing ? "status.expenseUpdated" : "status.expenseSaved");
      closeSheet();
    } catch (error) {
      setFieldError(formatError(error, t, "errors.saveExpense"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const next = deleteExpense(group, existing?.id ?? "", viewer || paidBy);
    setSaving(true);
    try {
      await commit(next, "status.expenseDeleted");
      closeSheet();
    } catch (error) {
      setFieldError(formatError(error, t, "errors.deleteExpense"));
      setSaving(false);
    }
  }

  const selectedCount = t("expense.selectedCount", { included: included.length, total: group.members.length });
  const splitError = "error" in preview && amount ? t(preview.error, preview.vars) : null;
  const splitErrorId = `${formId}-split-error`;
  const amountError = "error" in parsedAmount && amount ? t(parsedAmount.error, parsedAmount.vars) : null;
  const equalPreview =
    splitType === "equal" && "splits" in preview && !("error" in parsedAmount)
      ? included.length === 1
        ? t("expense.equalPreview", { amount: formatMoney(parsedAmount.value, currency), count: included.length })
        : t("expense.equalPreviewMany", { amount: formatMoney(parsedAmount.value, currency), count: included.length })
      : null;
  const rateHint =
    rateStatus === "loading"
      ? t("expense.rateFetching")
      : rateStatus === "stale"
        ? t("expense.rateStale")
        : rateStatus === "missing"
          ? t("expense.rateMissing")
          : t("expense.rateHint");

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Field id={`${formId}-amount`} label={t("expense.amount")} error={amountError}>
        <Input
          id={`${formId}-amount`}
          className="font-mono text-lg"
          inputMode="decimal"
          autoComplete="off"
          aria-required="true"
          aria-invalid={Boolean(amountError)}
          aria-describedby={amountError ? `${formId}-amount-error` : undefined}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>

      <Field id={`${formId}-description`} label={t("expense.description")}>
        <Input id={`${formId}-description`} aria-required="true" value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{t("expense.whoPaid")}</legend>
        <div className="flex flex-wrap gap-2">
          {group.members.map((member) => {
            const selected = paidBy === member.id;
            return (
              <Button
                key={member.id}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                className="rounded-full"
                onClick={() => setPaidBy(member.id)}
              >
                {member.name}
              </Button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${formId}-currency`} label={t("expense.currency")}>
          <AppSelect
            id={`${formId}-currency`}
            value={currency}
            onValueChange={setCurrency}
            items={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: `${currencySymbol(code)} ${code}` }))}
          />
        </Field>
        <Field id={`${formId}-date`} label={t("expense.date")}>
          <Input id={`${formId}-date`} type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
      </div>

      {currency !== group.currency ? (
        <Field id={`${formId}-rate`} label={t("expense.rateInto", { currency: group.currency })} hint={rateHint}>
          <Input
            id={`${formId}-rate`}
            className="font-mono"
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

      <Field id={`${formId}-category`} label={t("expense.category")}>
        <AppSelect
          id={`${formId}-category`}
          value={category}
          onValueChange={setCategory}
          items={[
            ...categories.map((item) => ({ value: item, label: translateCategory(t, item) })),
            { value: "__custom", label: t("expense.customCategory") },
          ]}
        />
      </Field>
      {category === "__custom" ? (
        <Field id={`${formId}-custom`} label={t("expense.customCategoryName")}>
          <Input id={`${formId}-custom`} value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} />
        </Field>
      ) : null}

      <fieldset className="grid gap-3" aria-describedby={splitError ? splitErrorId : undefined}>
        <legend className="text-sm font-medium">{t("expense.split")}</legend>
        <ToggleGroup
          type="single"
          value={splitType}
          onValueChange={(value) => {
            if (value) setSplitType(value as SplitType);
          }}
          variant="outline"
          spacing={2}
          className="grid w-full grid-cols-2 sm:grid-cols-4"
          aria-label={t("expense.splitType")}
        >
          {splitTypes.map((type) => (
            <ToggleGroupItem key={type.id} value={type.id} className="min-h-11">
              {type.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-text-secondary">{selectedCount}</p>
        <ul className="grid gap-2">
          {group.members.map((member) => {
            const on = included.includes(member.id);
            return (
              <li key={member.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <Button type="button" variant={on ? "outline" : "ghost"} aria-pressed={on} className="justify-start" onClick={() => toggleMember(member.id)}>
                  {member.name}
                </Button>
                {splitType === "exact" && on ? (
                  <Input
                    aria-label={t("expense.exactAmountFor", { name: member.name })}
                    className="w-28 font-mono"
                    inputMode="decimal"
                    aria-invalid={Boolean(splitError)}
                    aria-describedby={splitError ? splitErrorId : undefined}
                    value={exact[member.id] ?? ""}
                    onChange={(event) => setExact({ ...exact, [member.id]: event.target.value })}
                  />
                ) : null}
                {splitType === "percentage" && on ? (
                  <Input
                    aria-label={t("expense.percentageFor", { name: member.name })}
                    className="w-24 font-mono"
                    inputMode="decimal"
                    aria-invalid={Boolean(splitError)}
                    aria-describedby={splitError ? splitErrorId : undefined}
                    value={percentage[member.id] ?? ""}
                    onChange={(event) => setPercentage({ ...percentage, [member.id]: event.target.value })}
                  />
                ) : null}
                {splitType === "shares" && on ? (
                  <Input
                    aria-label={t("expense.sharesFor", { name: member.name })}
                    className="w-24 font-mono"
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

      <Field id={`${formId}-recurring`} label={t("expense.repeat")} hint={occurrence ? t("expense.occurrenceHint") : undefined}>
        <AppSelect
          id={`${formId}-recurring`}
          value={recurring || "none"}
          disabled={occurrence}
          onValueChange={(value) => setRecurring(value === "none" ? "" : (value as RecurringFrequency))}
          items={[
            { value: "none", label: t("expense.doesNotRepeat") },
            { value: "weekly", label: t("expense.weekly") },
            { value: "biweekly", label: t("expense.biweekly") },
            { value: "monthly", label: t("expense.monthly") },
          ]}
        />
      </Field>

      <Field id={`${formId}-notes`} label={t("expense.notes")}>
        <Textarea id={`${formId}-notes`} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>

      {fieldError ? (
        <p className="text-sm text-error" role="alert">
          {fieldError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("expense.saving") : existing ? t("expense.saveChanges") : t("expense.addExpense")}
        </Button>
        <Button variant="outline" onClick={closeSheet}>
          {t("expense.cancel")}
        </Button>
        {existing && !confirmDelete ? (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            {t("expense.delete")}
          </Button>
        ) : null}
      </div>
      {confirmDelete ? (
        <div className="grid gap-3 rounded-md border border-border bg-bg-secondary p-3">
          <p>{t("expense.confirmDelete", { description: existing?.description ?? "" })}</p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => void remove()}>
              {t("expense.deleteExpense")}
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("expense.keepIt")}
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
