import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "MongoDB is not configured. Set DATABASE_URL to create an account." }, { status: 503 });
  const body = (await request.json()) as { name?: string; email?: string; password?: string };
  const name = body.name?.trim() ?? "";
  const email = body.email?.toLowerCase().trim() ?? "";
  const password = body.password ?? "";
  if (!name || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ error: "Use your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
  }
  const existing = await db.collection("users").findOne({ email });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  const inserted = await db.collection("users").insertOne({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date(),
  });
  await db.collection("preferences").updateOne(
    { _id: inserted.insertedId },
    { $setOnInsert: { defaultCurrency: "USD", notifications: false } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
