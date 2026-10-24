import { CaseRoundIcon } from "@solar-icons/react/bold";
import { cn } from "cn";

export function RecrutaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(92,90,237,0.28)]",
        className,
      )}
    >
      <CaseRoundIcon size={20} />
    </span>
  );
}

export function RecrutaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <RecrutaMark />
      {!compact && (
        <span className="text-[17px] font-semibold tracking-[-0.025em]">
          Recruta
        </span>
      )}
    </div>
  );
}
