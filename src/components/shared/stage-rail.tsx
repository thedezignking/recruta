import { CheckCircleIcon } from "@solar-icons/react/bold";
import { ClockCircleIcon } from "@solar-icons/react/linear";
import { cn } from "cn";
import type { WorkflowStage } from "@/types/domain";

export function StageRail({ stages }: { stages: WorkflowStage[] }) {
  return (
    <ol aria-label="Request progress" className="grid gap-0 md:grid-cols-4">
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="relative flex gap-3 pb-5 md:block md:pb-0"
        >
          {index < stages.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-border md:left-7 md:right-0 md:top-[13px] md:h-px md:w-auto",
                stage.complete && "bg-primary",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground md:mb-3",
              stage.complete &&
                "border-primary bg-primary text-primary-foreground",
              stage.active &&
                "border-primary bg-primary/10 text-primary ring-4 ring-primary/10",
            )}
          >
            {stage.complete ? (
              <CheckCircleIcon aria-hidden="true" size={15} />
            ) : (
              <ClockCircleIcon aria-hidden="true" size={15} strokeWidth={1.7} />
            )}
          </span>
          <div className="min-w-0 md:pr-4">
            <p
              className={cn(
                "text-sm font-medium",
                stage.active && "text-primary",
              )}
            >
              {stage.name}
            </p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {stage.active
                ? `${stage.owner} owns next step`
                : stage.complete
                  ? "Complete"
                  : `${stage.owner} owned stage`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
