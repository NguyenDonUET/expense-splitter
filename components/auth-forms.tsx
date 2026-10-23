"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { GuestLink } from "@/components/guest-link";
import { IMPORT_FLAG, GROUPS_STORAGE_KEY } from "@/lib/store/types";
import { Button, controlClass, Field } from "@/components/ui";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      setError("Email or password is incorrect, or the database is not configured.");
      return;
    }
    router.push(params.get("callbackUrl") || "/groups");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field id="sign-in-email" label="Email">
        <input id="sign-in-email" type="email" autoComplete="email" required className={controlClass} value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field id="sign-in-password" label="Password">
        <input id="sign-in-password" type="password" autoComplete="current-password" required className={controlClass} value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-sm text-text-secondary">
        <Link href="/reset-password" className="underline">
          Forgot password
        </Link>
        {" · "}
        <Link href="/sign-up" className="underline">
          Create an account
        </Link>
      </p>
      <GuestLink className="text-sm font-medium underline">Try as guest</GuestLink>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    if (typeof window !== "undefined" && sessionStorage.getItem(GROUPS_STORAGE_KEY)) {
      sessionStorage.setItem(IMPORT_FLAG, "1");
    }
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setPending(false);
      setError(body.error ?? "Could not create the account.");
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      setError("Account created. Sign in to continue.");
      router.push("/sign-in");
      return;
    }
    router.push("/groups");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field id="sign-up-name" label="Name">
        <input id="sign-up-name" required className={controlClass} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id="sign-up-email" label="Email">
        <input id="sign-up-email" type="email" autoComplete="email" required className={controlClass} value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field id="sign-up-password" label="Password" hint="At least 8 characters.">
        <input id="sign-up-password" type="password" autoComplete="new-password" required minLength={8} className={controlClass} value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/auth/reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await response.json()) as { error?: string; message?: string; resetUrl?: string };
    if (!response.ok) {
      setError(body.error ?? "Could not start a reset.");
      return;
    }
    setMessage(body.message ?? "Check your email.");
    setResetUrl(body.resetUrl ?? null);
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Could not reset the password.");
      return;
    }
    setMessage("Password updated. You can sign in.");
  }

  if (token) {
    return (
      <form className="grid gap-4" onSubmit={confirm}>
        <Field id="new-password" label="New password">
          <input id="new-password" type="password" minLength={8} required className={controlClass} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <Button type="submit">Update password</Button>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={requestLink}>
      <Field id="reset-email" label="Email">
        <input id="reset-email" type="email" required className={controlClass} value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      {resetUrl ? (
        <p>
          <Link href={resetUrl} className="underline">
            Continue to choose a new password
          </Link>
        </p>
      ) : null}
      <Button type="submit">Send reset link</Button>
    </form>
  );
}
