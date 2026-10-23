"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Toggle } from "@/components/ui/toggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Appearance = "light" | "dark";

function readAppearance(): Appearance {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const t = useT();
  const [appearance, setAppearance] = useState<Appearance | null>(null);

  useEffect(() => {
    const sync = () => setAppearance(readAppearance());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function apply(next: Appearance) {
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setAppearance(next);
  }

  const dark = appearance === "dark";
  const label = appearance ? (dark ? t("theme.toLight") : t("theme.toDark")) : t("theme.label");

  return (
    <Toggle
      variant="outline"
      pressed={dark}
      onPressedChange={(on) => apply(on ? "dark" : "light")}
      aria-label={label}
      title={label}
    >
      {dark ? <Sun aria-hidden="true" size={16} strokeWidth={1.75} /> : <Moon aria-hidden="true" size={16} strokeWidth={1.75} />}
    </Toggle>
  );
}
