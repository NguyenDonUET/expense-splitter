import type { NextAuthConfig } from "next-auth";

export const authSecret = process.env.AUTH_SECRET || "dev-only-expense-splitter-secret";

export const authConfig = {
  secret: authSecret,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [],
} satisfies NextAuthConfig;
