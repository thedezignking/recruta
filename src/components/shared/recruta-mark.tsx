import Image from "next/image";
import { cn } from "cn";

export function RecrutaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-7 shrink-0", className)}
    >
      <Image
        src="/brand/recruta-symbol.svg"
        alt=""
        width={32}
        height={32}
        className="size-full object-contain"
      />
    </span>
  );
}

export function RecrutaLogo({
  compact = false,
  size = "md",
  className,
}: {
  compact?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  if (compact)
    return <RecrutaMark className={size === "sm" ? "size-6" : undefined} />;

  return (
    <span
      role="img"
      aria-label="Recruta"
      className={cn(
        "inline-flex h-8 shrink-0 items-center",
        size === "sm" ? "gap-2" : "gap-2.5",
        className,
      )}
    >
      <RecrutaMark className={size === "sm" ? "size-6" : undefined} />
      <span
        aria-hidden="true"
        className={cn(
          "relative top-px leading-none font-semibold tracking-[-0.035em] text-foreground",
          size === "sm" ? "text-xl" : "text-[22px]",
        )}
      >
        Recruta
      </span>
    </span>
  );
}
