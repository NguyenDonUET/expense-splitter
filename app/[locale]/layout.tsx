import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SkipLink } from "@/components/skip-link";
import { LOCALES, isLocale } from "@/lib/i18n/locale";
import { messagesFromParams } from "@/lib/i18n/params";
import { t } from "@/lib/i18n/t";
import { themeInitScript } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "../globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-manrope",
  display: "swap",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { messages } = await messagesFromParams(params);
  return {
    title: {
      default: t(messages, "meta.title"),
      template: t(messages, "meta.titleTemplate"),
    },
    description: t(messages, "meta.description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={cn(manrope.variable, plex.variable, "font-sans")} suppressHydrationWarning>
      <body className="bg-bg-primary text-text-primary antialiased" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers locale={locale}>
          <SkipLink />
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
