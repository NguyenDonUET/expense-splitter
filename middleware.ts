import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth(() => NextResponse.next());

export const config = {
  matcher: ["/groups/:path*"],
};
