import { initials } from "@/lib/ids";
import { Avatar as AvatarRoot, AvatarFallback } from "@/components/ui/avatar";

export function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <AvatarRoot aria-hidden="true">
      <AvatarFallback className="text-xs font-semibold text-[#0A0D13]" style={{ background: color }}>
        {initials(name)}
      </AvatarFallback>
    </AvatarRoot>
  );
}
