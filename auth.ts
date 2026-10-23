import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getDb, getMongoClientPromise } from "@/lib/mongo";

const adapter = process.env.DATABASE_URL ? MongoDBAdapter(getMongoClientPromise()) : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const db = await getDb();
        if (!db) return null;
        const user = await db.collection("users").findOne({ email });
        if (!user?.passwordHash || typeof user.passwordHash !== "string") return null;
        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) return null;
        return { id: String(user._id), email, name: typeof user.name === "string" ? user.name : email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
