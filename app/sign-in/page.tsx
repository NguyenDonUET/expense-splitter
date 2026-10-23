import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main id="main" className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
