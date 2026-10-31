import { requirePortalPageContext } from "@/server/auth/portal-context";
import { listPortalJobs } from "@/server/services/portal";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
export default async function PortalJobs({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const c = await requirePortalPageContext();
  const result = await listPortalJobs(
    c.supabase,
    c.clientId,
    (await searchParams).cursor,
  );
  return (
    <div className="space-y-6">
      <PageHeader standalone title="Jobs" />
      {result.items.length ? (
        result.items.map((j) => (
          <Card key={j.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <ButtonLink
                  variant="link"
                  className="px-0"
                  href={`/portal/jobs/${j.id}`}
                >
                  {j.title}
                </ButtonLink>
                <p className="text-xs text-muted-foreground">
                  {j.positions_required} openings ·{" "}
                  {j.location || "Location to be agreed"}
                </p>
              </div>
              <StatusBadge status={j.status} />
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No jobs have been shared with you.
            </p>
          </CardContent>
        </Card>
      )}
      {result.nextCursor && (
        <ButtonLink
          variant="outline"
          href={`/portal/jobs?cursor=${encodeURIComponent(result.nextCursor)}`}
        >
          Older jobs
        </ButtonLink>
      )}
    </div>
  );
}
