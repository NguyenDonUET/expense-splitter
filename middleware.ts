import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isLocale, LOCALE_COOKIE, localeCookieValue, resolveLocale } from "@/lib/i18n/locale";

const { auth } = NextAuth(authConfig);

function rewriteToLocale(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    const stripped = pathname.slice(first.length + 1) || "/";
    const url = request.nextUrl.clone();
    url.pathname = stripped;
    const response = NextResponse.redirect(url);
    response.headers.append("Set-Cookie", localeCookieValue(first));
    return response;
  }

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const { locale, persist } = resolveLocale(cookie, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  const response = NextResponse.rewrite(url);
  if (persist) response.headers.append("Set-Cookie", localeCookieValue(locale));
  return response;
}

export default auth((request) => rewriteToLocale(request));

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
