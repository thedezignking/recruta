"use client";
import { manualJobSchema } from "@/lib/validation";
import type { FormValues } from "./new-job-form";
export function publicationIssues(
  values: FormValues,
  workflowReady: boolean,
  ownerReady: boolean,
) {
  const parsed = manualJobSchema.safeParse({ ...values, publish: true });
  return [
    ...(parsed.success
      ? []
      : parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }))),
    ...(!workflowReady
      ? [
          {
            path: "workflowTemplateId",
            message: "Choose a workflow with at least one stage.",
          },
        ]
      : []),
    ...(!ownerReady
      ? [
          {
            path: "primaryRecruiterId",
            message: "Choose an active lead recruiter.",
          },
        ]
      : []),
  ];
}
export function PublicationReadiness({
  values,
  workflowReady,
  ownerReady,
  onIssue,
}: {
  values: FormValues;
  workflowReady: boolean;
  ownerReady: boolean;
  onIssue: (path: string) => void;
}) {
  const issues = publicationIssues(values, workflowReady, ownerReady);
  return (
    <section
      className="rounded-[10px] border border-border bg-white p-4"
      aria-label="Publication readiness"
    >
      <h2 className="text-sm font-semibold">Publication readiness</h2>
      {issues.length ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete these before publishing. You can save a draft at any time.
          </p>
          <ul className="mt-3 space-y-2">
            {issues.map((i, n) => (
              <li key={`${i.path}-${n}`}>
                <button
                  type="button"
                  onClick={() => onIssue(i.path)}
                  className="text-left text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {i.message}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm">
          Ready to publish: role details, location eligibility, recruiter,
          workflow and screening questions checked.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Hiring brief and priority stay internal. Optional criteria and questions
        never reject candidates automatically.
      </p>
    </section>
  );
}
