import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth-forms";
import { SignUpHeading } from "@/components/auth-headings";
import { titleFromParams } from "@/lib/i18n/params";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: await titleFromParams(params, "meta.signUp") };
}

export default function SignUpPage() {
  return (
    <main id="main" className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <SignUpHeading />
      <SignUpForm />
    </main>
  );
}
