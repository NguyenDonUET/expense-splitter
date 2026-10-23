"use client";

import { useEffect, useMemo, useState } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/catalog";
import type { Group, Settlement } from "@/lib/domain";
import { addSettlement, memberName } from "@/lib/group-actions";
import { dateToIso } from "@/lib/dates";
import { createId } from "@/lib/ids";
import { currencySymbol, formatMoney } from "@/lib/money";
import { pairDebtAmount } from "@/lib/balances";
import { rateIntoGroup } from "@/lib/sample";
import { useAppStore, viewerId } from "@/stores/app-store";
import { Button, controlClass, Field } from "@/components/ui";

export function SettleSheet({ group }: { group: Group }) {
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
    if (debt <= 0) return `${memberName(group, fromId)} does not owe ${memberName(group, toId)}.`;
    return `${memberName(group, fromId)} owes ${memberName(group, toId)} ${formatMoney(debt, group.currency)}.`;
  }, [debt, fromId, group, toId]);

  async function onCurrency(next: string) {
    setCurrency(next);
    if (next === group.currency) {
      setRateText("1");
      setRateNote(null);
      return;
    }
    setRateNote("Fetching exchange rates...");
    try {
      const response = await fetch(`/api/rates?base=${group.currency}`);
      const body = (await response.json()) as { rates?: Record<string, number>; stale?: boolean };
      if (!response.ok || !body.rates) {
        setRateNote("Live rates are unavailable. Enter a rate to continue.");
        return;
      }
      setRateText(String(rateIntoGroup(body.rates, next, group.currency)));
      setRateNote(body.stale ? "Rates may be outdated." : null);
    } catch {
      setRateNote("Live rates are unavailable. Enter a rate to continue.");
    }
  }

  async function save() {
    const value = Number(amount);
    const rate = Number(rateText);
    if (!fromId || !toId || fromId === toId) {
      setError("Choose two different people.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(rate) || rate <= 0) {
      setError("Enter a payment greater than zero.");
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
      await commit(next, `Settlement recorded: ${memberName(group, fromId)} paid ${memberName(group, toId)} ${formatMoney(value, currency)}.`);
      closeSheet();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record that payment.");
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
      <p>{owedLabel} A smaller amount is a partial payment.</p>
      <Field id="settle-from" label="Who paid">
        <select
          id="settle-from"
          className={controlClass}
          value={fromId}
          onChange={(event) => {
            setFromId(event.target.value);
            setAmount("");
          }}
        >
          {group.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="settle-to" label="Paid to">
        <select id="settle-to" className={controlClass} value={toId} onChange={(event) => setToId(event.target.value)}>
          {group.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="settle-amount" label="Amount" error={error}>
        <input
          id="settle-amount"
          className={`${controlClass} font-mono`}
          inputMode="decimal"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "settle-amount-error" : undefined}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settle-currency" label="Currency">
          <select id="settle-currency" className={controlClass} value={currency} onChange={(event) => void onCurrency(event.target.value)}>
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {currencySymbol(code)} {code}
              </option>
            ))}
          </select>
        </Field>
        <Field id="settle-date" label="Date">
          <input id="settle-date" type="date" className={controlClass} value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
      </div>
      {currency !== group.currency ? (
        <Field id="settle-rate" label={`Rate into ${group.currency}`} hint={rateNote ?? undefined}>
          <input id="settle-rate" className={`${controlClass} font-mono`} inputMode="decimal" value={rateText} onChange={(event) => setRateText(event.target.value)} />
        </Field>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Record payment"}
        </Button>
        <Button variant="quiet" onClick={closeSheet}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
