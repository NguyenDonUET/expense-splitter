"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { GUEST_COOKIE, GROUPS_STORAGE_KEY, IMPORT_FLAG } from "@/lib/store/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const t = useT();
  const { data, status } = useSession();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(document.cookie.split("; ").some((item) => item.startsWith(`${GUEST_COOKIE}=1`)));
  }, []);

  if (status === "authenticated" && data?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">{data.user.email ?? data.user.name ?? t("account.account")}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("account.signedIn")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: "/" })}>{t("account.signOut")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {guest ? <span className="text-sm text-text-secondary">{t("account.guest")}</span> : null}
      <Button asChild variant="ghost">
        <Link
          href="/sign-up"
          onClick={() => {
            if (sessionStorage.getItem(GROUPS_STORAGE_KEY)) sessionStorage.setItem(IMPORT_FLAG, "1");
          }}
        >
          {t("account.signUp")}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/sign-in">{t("account.signIn")}</Link>
      </Button>
    </div>
  );
}
