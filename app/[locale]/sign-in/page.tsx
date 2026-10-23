import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth-forms";
import { SignInHeading } from "@/components/auth-headings";
import { titleFromParams } from "@/lib/i18n/params";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: await titleFromParams(params, "meta.signIn") };
}

export default function SignInPage() {
  return (
    <main id="main" className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <SignInHeading />
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
