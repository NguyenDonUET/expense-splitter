import { getDb } from "@/lib/mongo";
import { isSupportedCurrency } from "@/lib/catalog";

export interface RateTable {
  rates: Record<string, number>;
  fetchedAt: number;
  stale: boolean;
}

const memory = new Map<string, { rates: Record<string, number>; fetchedAt: number }>();
const HOUR = 60 * 60 * 1000;

async function readMongo(base: string) {
  const db = await getDb().catch(() => null);
  if (!db) return null;
  const doc = await db.collection<{ _id: string; rates: Record<string, number>; fetchedAt: number }>("rateCache").findOne({ _id: base });
  return doc ? { rates: doc.rates, fetchedAt: doc.fetchedAt } : null;
}

async function writeMongo(base: string, rates: Record<string, number>, fetchedAt: number) {
  const db = await getDb().catch(() => null);
  if (!db) return;
  await db.collection<{ _id: string; rates: Record<string, number>; fetchedAt: number }>("rateCache").updateOne({ _id: base }, { $set: { rates, fetchedAt } }, { upsert: true });
}

export async function getRateTable(base: string): Promise<RateTable | null> {
  if (!isSupportedCurrency(base)) return null;
  const cached = memory.get(base) ?? (await readMongo(base));
  if (cached) memory.set(base, cached);
  if (cached && Date.now() - cached.fetchedAt < HOUR) {
    return { ...cached, stale: false };
  }

  const key = process.env.CURRENCY_API_KEY;
  const root = (process.env.CURRENCY_API_BASE_URL || "https://v6.exchangerate-api.com/v6").replace(/\/$/, "");
  try {
    if (!key) throw new Error("missing key");
    const response = await fetch(`${root}/${key}/latest/${base}`, { cache: "no-store" });
    if (!response.ok) throw new Error("rate http");
    const body = (await response.json()) as { result?: string; conversion_rates?: Record<string, number> };
    if (body.result !== "success" || !body.conversion_rates) throw new Error("rate result");
    const fresh = { rates: body.conversion_rates, fetchedAt: Date.now() };
    memory.set(base, fresh);
    await writeMongo(base, fresh.rates, fresh.fetchedAt);
    return { ...fresh, stale: false };
  } catch {
    if (!cached) return null;
    return { ...cached, stale: true };
  }
}
