"use client";

import { GuestLink } from "@/components/guest-link";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export function LandingPage() {
  const t = useT();
  const features = [
    { title: t("landing.flexibleTitle"), body: t("landing.flexibleBody") },
    { title: t("landing.currencyTitle"), body: t("landing.currencyBody") },
    { title: t("landing.settleTitle"), body: t("landing.settleBody") },
    { title: t("landing.peopleTitle"), body: t("landing.peopleBody") },
  ];

  return (
    <main id="main">
      <section className="mx-auto grid max-w-page gap-8 px-4 py-16 sm:py-24">
        <p className="text-sm font-semibold text-accent">{t("landing.eyebrow")}</p>
        <div className="max-w-content">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("landing.headline")}</h1>
          <p className="mt-4 text-lg text-text-secondary">{t("landing.body")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <GuestLink>{t("landing.openDashboard")}</GuestLink>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">{t("landing.signUp")}</Link>
          </Button>
        </div>
      </section>
      <Separator />
      <section aria-label={t("landing.features")} className="mx-auto max-w-page px-4 py-12">
        <ul className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.title}>
              <Card className="h-full rounded-lg">
                <CardHeader>
                  <CardTitle className="font-semibold">{feature.title}</CardTitle>
                  <CardDescription className="text-text-secondary">{feature.body}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
