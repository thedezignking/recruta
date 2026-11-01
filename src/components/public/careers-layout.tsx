import Link from "next/link";
import {
  CalendarIcon,
  CaseRoundIcon,
  ClockCircleIcon,
  GlobalIcon,
  Home2Icon,
  MapPointIcon,
  WalletMoneyIcon,
} from "@solar-icons/react/linear";
import { RecrutaMark } from "@/components/shared/recruta-mark";
import { cn } from "cn";

/**
 * Careers pages share the landing page's frame: hairline rails around a
 * fixed content column, a halftone hero and hatched bands between sections.
 */
export const careerRule = "border-[#EBEBEB]";
export const careerRails =
  "mx-auto w-[calc(100%-24px)] max-w-[1080px] border-x sm:w-[calc(100%-48px)]";

export function CareerFrame({
  className,
  children,
  label,
  labelledBy,
}: {
  className?: string;
  children: React.ReactNode;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn("border-t", careerRule)}
    >
      <div className={cn("relative", careerRails, careerRule, className)}>
        {children}
      </div>
    </section>
  );
}

export function CareerHatch() {
  return (
    <div aria-hidden="true" className={cn("border-t", careerRule)}>
      <div className={cn("mk-hatch h-10", careerRails, careerRule)} />
    </div>
  );
}

export function CareerAccent({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[#5C5AED] underline decoration-[#5C5AED]/45 decoration-dashed decoration-2 underline-offset-[0.18em]">
      {children}
    </span>
  );
}

export function CareerFooter({ agencyName }: { agencyName: string }) {
  return (
    <footer className={cn("border-y", careerRule)}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground",
          careerRails,
          careerRule,
        )}
      >
        <span>© {agencyName}</span>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
        >
          <RecrutaMark className="size-4" />
          Hiring with Recruta
        </Link>
      </div>
    </footer>
  );
}

const tagIcons: Record<string, typeof MapPointIcon> = {
  Location: MapPointIcon,
  "Workplace type": Home2Icon,
  "Remote eligibility": GlobalIcon,
  "Employment arrangement": CaseRoundIcon,
  "Working hours": ClockCircleIcon,
  Salary: WalletMoneyIcon,
  "Apply by": CalendarIcon,
};

/** The few role facts candidates scan first, as icon tags. */
export function RoleTags({
  facts,
  include = Object.keys(tagIcons),
  className,
}: {
  facts: [string, string | number][];
  include?: string[];
  className?: string;
}) {
  const hasArrangement = facts.some(
    ([label]) => label === "Employment arrangement",
  );
  const tags = facts.filter(
    ([label]) =>
      include.includes(label) && !(label === "Working hours" && hasArrangement),
  );
  if (!tags.length) return null;
  return (
    <ul
      aria-label="Role details"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {tags.map(([label, value]) => {
        const Icon = tagIcons[label];
        return (
          <li
            key={label}
            title={label}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-white px-2.5 text-xs font-medium text-foreground/85"
          >
            <Icon
              aria-hidden="true"
              size={13}
              className="text-muted-foreground"
            />
            <span className="sr-only">{label}: </span>
            <span className="first-letter:uppercase">
              {label === "Apply by" ? `Apply by ${value}` : value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Carries the rails down to the footer on short pages. */
export function CareerFill() {
  return (
    <div
      aria-hidden="true"
      className={cn("min-h-16 flex-1", careerRails, careerRule)}
    />
  );
}
