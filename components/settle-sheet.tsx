"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { SUPPORTED_CURRENCIES } from "@/lib/catalog";
import type { Group, Settlement } from "@/lib/domain";
import { addSettlement, memberName } from "@/lib/group-actions";
import { dateToIso } from "@/lib/dates";
import { formatError } from "@/lib/i18n/format-error";
import { createId } from "@/lib/ids";
import { currencySymbol, formatMoney } from "@/lib/money";
import { pairDebtAmount } from "@/lib/balances";
import { rateIntoGroup } from "@/lib/sample";
import { useAppStore, viewerId } from "@/stores/app-store";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SettleSheet({ group }: { group: Group }) {
  const t = useT();
  const sheet = useAppStore((state) => state.sheet);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const closeSheet = useAppStore((state) => state.closeSheet);
  const commit = useAppStore((state) => state.commit);
  const presetFrom = sheet.kind === "settle" ? sheet.fromId : undefined;
  const presetTo = sheet.kind === "settle" ? sheet.toId : undefined;
  const viewer = viewerId(group, viewingAs);
  const [fromId, setFromId] = useState(presetFrom ?? viewer);
  const [toId, setToId] = useState(presetTo ?? group.members.find((member) => member.id !== (presetFrom ?? viewer))?.id ?? "");
  const debt = pairDebtAmount(group, fromId, toId);
  const [amount, setAmount] = useState(debt > 0 ? String(debt) : "");
  const [currency, setCurrency] = useState(group.currency);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rateText, setRateText] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateNote, setRateNote] = useState<string | null>(null);

  useEffect(() => {
    setAmount(debt > 0 ? String(debt) : "");
  }, [fromId, toId, debt]);

  const owedLabel = useMemo(() => {
    const from = memberName(group, fromId);
    const to = memberName(group, toId);
    if (debt <= 0) return t("settle.doesNotOwe", { from, to });
    return t("settle.owes", { from, to, amount: formatMoney(debt, group.currency) });
  }, [debt, fromId, group, t, toId]);

  async function onCurrency(next: string) {
    setCurrency(next);
    if (next === group.currency) {
      setRateText("1");
      setRateNote(null);
      return;
    }
    setRateNote(t("settle.rateFetching"));
    try {
      const response = await fetch(`/api/rates?base=${group.currency}`);
      const body = (await response.json()) as { rates?: Record<string, number>; stale?: boolean };
      if (!response.ok || !body.rates) {
        setRateNote(t("settle.rateMissing"));
        return;
      }
      setRateText(String(rateIntoGroup(body.rates, next, group.currency)));
      setRateNote(body.stale ? t("settle.rateStale") : null);
    } catch {
      setRateNote(t("settle.rateMissing"));
    }
  }

  async function save() {
    const value = Number(amount);
    const rate = Number(rateText);
    if (!fromId || !toId || fromId === toId) {
      setError(t("settle.chooseTwo"));
      return;
    }
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(rate) || rate <= 0) {
      setError(t("settle.paymentZero"));
      return;
    }
    const settlement: Settlement = {
      id: createId("stl"),
      from: fromId,
      to: toId,
      amount: value,
      currency,
      exchangeRate: currency === group.currency ? 1 : rate,
      date: dateToIso(date),
    };
    try {
      const next = addSettlement(group, settlement, viewer || fromId);
      setSaving(true);
      await commit(
        next,
        t("status.settlementRecorded", {
          from: memberName(group, fromId),
          to: memberName(group, toId),
          amount: formatMoney(value, currency),
        }),
      );
      closeSheet();
    } catch (caught) {
      setError(formatError(caught, t, "errors.recordPayment"));
      setSaving(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p>
        {owedLabel} {t("settle.partialHint")}
      </p>
      <Field id="settle-from" label={t("settle.whoPaid")}>
        <AppSelect
          id="settle-from"
          value={fromId}
          onValueChange={(value) => {
            setFromId(value);
            setAmount("");
          }}
          items={group.members.map((member) => ({ value: member.id, label: member.name }))}
        />
      </Field>
      <Field id="settle-to" label={t("settle.paidTo")}>
        <AppSelect
          id="settle-to"
          value={toId}
          onValueChange={setToId}
          items={group.members.map((member) => ({ value: member.id, label: member.name }))}
        />
      </Field>
      <Field id="settle-amount" label={t("settle.amount")} error={error}>
        <Input
          id="settle-amount"
          className="font-mono"
          inputMode="decimal"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "settle-amount-error" : undefined}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settle-currency" label={t("settle.currency")}>
          <AppSelect
            id="settle-currency"
            value={currency}
            onValueChange={(value) => void onCurrency(value)}
            items={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: `${currencySymbol(code)} ${code}` }))}
          />
        </Field>
        <Field id="settle-date" label={t("settle.date")}>
          <Input id="settle-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
      </div>
      {currency !== group.currency ? (
        <Field id="settle-rate" label={t("settle.rateInto", { currency: group.currency })} hint={rateNote ?? undefined}>
          <Input id="settle-rate" className="font-mono" inputMode="decimal" value={rateText} onChange={(event) => setRateText(event.target.value)} />
        </Field>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("settle.saving") : t("settle.recordPayment")}
        </Button>
        <Button variant="outline" onClick={closeSheet}>
          {t("settle.cancel")}
        </Button>
      </div>
    </form>
  );
}
