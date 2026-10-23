"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Appearance = "light" | "dark";

function readAppearance(): Appearance {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [appearance, setAppearance] = useState<Appearance | null>(null);

  useEffect(() => {
    const sync = () => setAppearance(readAppearance());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const next: Appearance = appearance === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setAppearance(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={appearance ? `Switch to ${next} theme` : "Switch color theme"}
      className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text-primary"
    >
      {appearance ? `Switch to ${next} theme` : "Switch theme"}
    </button>
  );
}
