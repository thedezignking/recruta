"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ConvertRequestForm({
  requestId,
  workflows,
  recruiters,
}: {
  requestId: string;
  workflows: Array<{ id: string; name: string }>;
  recruiters: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [workflowTemplateId, setWorkflowTemplateId] = useState(
    workflows[0]?.id ?? "",
  );
  const [primaryRecruiterId, setPrimaryRecruiterId] = useState(
    recruiters[0]?.id ?? "",
  );
  const [priority, setPriority] = useState("normal");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/hiring-requests/${requestId}/convert-to-job`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            workflowTemplateId,
            primaryRecruiterId,
            priority,
            deadlineAt,
          }),
        },
      );
      const result = (await response.json()) as {
        data?: { job?: { jobId?: string } };
        error?: { message?: string };
      };
      if (!response.ok || !result.data?.job?.jobId) {
        setError(
          result.error?.message ?? "The request could not be converted.",
        );
        return;
      }
      router.push(`/app/jobs/${result.data.job.jobId}`);
      router.refresh();
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mt-6 shadow-none">
      <CardHeader className="border-b pb-5">
        <CardTitle>Job setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit}>
          <FieldGroup>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Field>
              <FieldLabel htmlFor="workflow">Workflow</FieldLabel>
              <select
                id="workflow"
                value={workflowTemplateId}
                onChange={(event) => setWorkflowTemplateId(event.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                required
              >
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
              <FieldDescription>
                Stages are copied into the job so later template changes cannot
                rewrite active work.
              </FieldDescription>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="deadline">Target deadline</FieldLabel>
                <Input
                  id="deadline"
                  type="date"
                  value={deadlineAt}
                  onChange={(event) => setDeadlineAt(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="priority">Priority</FieldLabel>
                <select
                  id="priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="recruiter">Lead recruiter</FieldLabel>
              <select
                id="recruiter"
                value={primaryRecruiterId}
                onChange={(event) => setPrimaryRecruiterId(event.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                required
              >
                {recruiters.map((recruiter) => (
                  <option key={recruiter.id} value={recruiter.id}>
                    {recruiter.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <div className="flex gap-3">
                <CheckCircleIcon
                  aria-hidden="true"
                  size={20}
                  className="mt-0.5 text-success"
                />
                <div>
                  <p className="text-sm font-medium">Ready to create</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    The approved revision and workflow become an immutable job
                    snapshot. You can publish its application page next.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating job…" : "Create job"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
