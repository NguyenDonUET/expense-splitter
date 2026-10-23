"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { GUEST_COOKIE, GROUPS_STORAGE_KEY, IMPORT_FLAG } from "@/lib/store/types";

export function AccountMenu() {
  const { data, status } = useSession();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(document.cookie.split("; ").some((item) => item.startsWith(`${GUEST_COOKIE}=1`)));
  }, []);

  if (status === "authenticated" && data?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-40 truncate text-sm text-text-secondary">{data.user.email ?? data.user.name}</span>
        <button
          type="button"
          className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {guest ? <span className="text-sm text-text-secondary">Guest</span> : null}
      <Link
        href="/sign-up"
        className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
        onClick={() => {
          if (sessionStorage.getItem(GROUPS_STORAGE_KEY)) sessionStorage.setItem(IMPORT_FLAG, "1");
        }}
      >
        Sign up
      </Link>
      <Link href="/sign-in" className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline">
        Sign in
      </Link>
    </div>
  );
}
