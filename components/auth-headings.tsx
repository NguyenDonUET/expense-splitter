"use client";

import { useT } from "@/components/i18n-provider";

export function SignInHeading() {
  const t = useT();
  return <h1 className="text-2xl font-bold">{t("auth.signIn")}</h1>;
}

export function SignUpHeading() {
  const t = useT();
  return (
    <>
      <h1 className="text-2xl font-bold">{t("auth.signUp")}</h1>
      <p className="text-text-secondary">{t("auth.signUpBody")}</p>
    </>
  );
}

export function ResetHeading() {
  const t = useT();
  return <h1 className="text-2xl font-bold">{t("auth.reset")}</h1>;
}
