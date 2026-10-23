import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "MongoDB is not configured. Set DATABASE_URL to reset a password." }, { status: 503 });
  const body = (await request.json()) as { token?: string; password?: string };
  const token = body.token ?? "";
  const password = body.password ?? "";
  if (password.length < 8) return NextResponse.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const reset = await db.collection("passwordResets").findOne({ tokenHash, expires: { $gt: new Date() } });
  if (!reset || typeof reset.email !== "string") {
    return NextResponse.json({ error: "That reset link is invalid or expired." }, { status: 400 });
  }
  await db.collection("users").updateOne({ email: reset.email }, { $set: { passwordHash: await bcrypt.hash(password, 12) } });
  await db.collection("passwordResets").deleteMany({ email: reset.email });
  return NextResponse.json({ ok: true });
}
