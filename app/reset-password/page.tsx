import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <main id="main" className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
