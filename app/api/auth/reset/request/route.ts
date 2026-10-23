import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "MongoDB is not configured. Set DATABASE_URL to reset a password." }, { status: 503 });
  const body = (await request.json()) as { email?: string };
  const email = body.email?.toLowerCase().trim() ?? "";
  const user = email ? await db.collection("users").findOne({ email }) : null;
  let resetUrl: string | undefined;
  if (user) {
    const token = randomBytes(24).toString("hex");
    await db.collection("passwordResets").insertOne({
      email,
      tokenHash: hashToken(token),
      expires: new Date(Date.now() + 1000 * 60 * 30),
    });
    if (process.env.NODE_ENV !== "production") {
      resetUrl = `/reset-password?token=${token}`;
    }
  }
  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link is ready.",
    resetUrl,
  });
}
