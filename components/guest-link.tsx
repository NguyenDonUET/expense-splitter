"use client";

import Link from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { GUEST_COOKIE } from "@/lib/store/types";

export const GuestLink = forwardRef<HTMLAnchorElement, Omit<ComponentPropsWithoutRef<typeof Link>, "href">>(function GuestLink(
  { className, children, onClick, ...props },
  ref,
) {
  return (
    <Link
      ref={ref}
      href="/groups"
      className={className}
      onClick={(event) => {
        document.cookie = `${GUEST_COOKIE}=1; path=/; max-age=2592000; samesite=lax`;
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
});
