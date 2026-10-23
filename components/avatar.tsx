import { initials } from "@/lib/ids";

export function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#0A0D13]"
      style={{ background: color }}
    >
      {initials(name)}
    </span>
  );
}
