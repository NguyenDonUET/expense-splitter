"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { GuestLink } from "@/components/guest-link";
import { useT } from "@/components/i18n-provider";
import { formatError } from "@/lib/i18n/format-error";
import { IMPORT_FLAG, GROUPS_STORAGE_KEY } from "@/lib/store/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const t = useT();
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
      setError(t("auth.signInError"));
      return;
    }
    router.push(params.get("callbackUrl") || "/groups");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field id="sign-in-email" label={t("auth.email")}>
        <Input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field id="sign-in-password" label={t("auth.password")}>
        <Input id="sign-in-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      <p className="text-sm text-text-secondary">
        <Link href="/reset-password" className="underline">
          {t("auth.forgot")}
        </Link>
        {" · "}
        <Link href="/sign-up" className="underline">
          {t("auth.createAccount")}
        </Link>
      </p>
      <GuestLink className="text-sm font-medium underline">{t("auth.tryGuest")}</GuestLink>
    </form>
  );
}

export function SignUpForm() {
  const t = useT();
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
      setError(formatError(body.error ?? "errors.createAccount", t, "errors.createAccount"));
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      setError(t("auth.createdSignIn"));
      router.push("/sign-in");
      return;
    }
    router.push("/groups");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field id="sign-up-name" label={t("auth.name")}>
        <Input id="sign-up-name" required value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id="sign-up-email" label={t("auth.email")}>
        <Input id="sign-up-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field id="sign-up-password" label={t("auth.password")} hint={t("auth.passwordHint")}>
        <Input id="sign-up-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("auth.creating") : t("auth.signUp")}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useT();
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
      setError(formatError(body.error ?? "errors.resetStart", t, "errors.resetStart"));
      return;
    }
    setMessage(formatError(body.message ?? "authApi.resetIfExists", t, "authApi.resetIfExists"));
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
      setError(formatError(body.error ?? "errors.resetFailed", t, "errors.resetFailed"));
      return;
    }
    setMessage(t("auth.passwordUpdated"));
  }

  if (token) {
    return (
      <form className="grid gap-4" onSubmit={confirm}>
        <Field id="new-password" label={t("auth.newPassword")}>
          <Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <Button type="submit">{t("auth.updatePassword")}</Button>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={requestLink}>
      <Field id="reset-email" label={t("auth.email")}>
        <Input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      {resetUrl ? (
        <p>
          <Link href={resetUrl} className="underline">
            {t("auth.continueReset")}
          </Link>
        </p>
      ) : null}
      <Button type="submit">{t("auth.sendReset")}</Button>
    </form>
  );
}
