"use client";

import Link from "next/link";
import { GUEST_COOKIE } from "@/lib/store/types";

export function GuestLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link
      href="/groups"
      className={className}
      onClick={() => {
        document.cookie = `${GUEST_COOKIE}=1; path=/; max-age=2592000; samesite=lax`;
      }}
    >
      {children}
    </Link>
  );
}
