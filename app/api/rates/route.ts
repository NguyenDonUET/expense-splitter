import { NextResponse } from "next/server";
import { isSupportedCurrency } from "@/lib/catalog";
import { getRateTable } from "@/lib/rates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base = new URL(request.url).searchParams.get("base") ?? "USD";
  if (!isSupportedCurrency(base)) {
    return NextResponse.json({ error: "That currency is not supported." }, { status: 400 });
  }
  const table = await getRateTable(base);
  if (!table) {
    return NextResponse.json({ error: "Rates are unavailable. You can enter a rate manually.", stale: true }, { status: 503 });
  }
  return NextResponse.json({ base, rates: table.rates, fetchedAt: table.fetchedAt, stale: table.stale });
}
