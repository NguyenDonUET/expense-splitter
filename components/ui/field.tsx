import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  id: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-sm font-normal text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={errorId} className="text-sm font-normal text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
