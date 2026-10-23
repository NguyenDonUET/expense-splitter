import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth-forms";
import { ResetHeading } from "@/components/auth-headings";
import { titleFromParams } from "@/lib/i18n/params";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: await titleFromParams(params, "meta.resetPassword") };
}

export default function ResetPasswordPage() {
  return (
    <main id="main" className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <ResetHeading />
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
