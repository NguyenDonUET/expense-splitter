import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <main id="main" className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="text-text-secondary">Your groups are stored in MongoDB and stay available when you come back.</p>
      <SignUpForm />
    </main>
  );
}
