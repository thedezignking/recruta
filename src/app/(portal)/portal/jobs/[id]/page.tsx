import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePortalPageContext } from "@/server/auth/portal-context";
import { getPortalJob } from "@/server/services/portal";
import { getSubmissions } from "@/server/services/collaboration";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FeedbackForm } from "@/components/collaboration/feedback-form";
import { SharedResume } from "@/components/collaboration/shared-resume";
import { ApiError } from "@/lib/api";
export default async function PortalJob({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await requirePortalPageContext();
  const job = await getPortalJob(c.supabase, c.clientId, id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const [submissions, access] = await Promise.all([
    getSubmissions(c.supabase, { agencyId: c.agencyId, jobId: id }),
    c.supabase
      .from("client_job_access")
      .select("access_role")
      .eq("job_id", id)
      .eq("user_id", c.user.id)
      .maybeSingle(),
  ]);
  if (access.error) throw new Error("Job access could not be verified.");
  if (!access.data) notFound();
  const canFeedback =
    c.role !== "reviewer" && access.data.access_role !== "reviewer";
  return (
    <div className="space-y-6">
      <ButtonLink href="/portal/jobs" variant="ghost">
        Back to jobs
      </ButtonLink>
      <PageHeader
        standalone
        title={job.title}
        actions={<StatusBadge status={job.status} />}
      />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {job.positions_required} openings ·{" "}
            {job.location || "Location to be agreed"}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6">
            {job.description}
          </p>
          {job.job_requirements.map((r) => (
            <p key={r.id} className="text-sm">
              {r.label}
              {r.description ? ` · ${r.description}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
      <h2 className="text-lg font-semibold">Shared candidates</h2>
      {!submissions.length && (
        <p className="text-sm text-muted-foreground">
          Your agency has not submitted any candidates for this job yet.
        </p>
      )}
      {submissions.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle>{s.candidate_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="whitespace-pre-wrap text-sm leading-6">{s.summary}</p>
            {s.document_id && (
              <SharedResume submissionId={s.id} clientId={c.clientId} />
            )}
            <div className="space-y-3">
              {s.submission_feedback.map((f) => (
                <div key={f.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium capitalize">{f.recommendation}</p>
                  <p className="mt-2 whitespace-pre-wrap">{f.comment}</p>
                  {f.strengths && (
                    <p className="mt-2 whitespace-pre-wrap">
                      Strengths: {f.strengths}
                    </p>
                  )}
                  {f.concerns && (
                    <p className="mt-2 whitespace-pre-wrap">
                      Concerns: {f.concerns}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {canFeedback ? (
              <FeedbackForm submissionId={s.id} clientId={c.clientId} />
            ) : (
              <p className="text-xs text-muted-foreground">
                You have read-only access.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
