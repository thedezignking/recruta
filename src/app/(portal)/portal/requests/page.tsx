import { requirePortalPageContext } from "@/server/auth/portal-context";
import { listHiringRequests } from "@/server/services/hiring-requests";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
export default async function PortalRequests({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const c = await requirePortalPageContext();
  const result = await listHiringRequests(
    c.supabase,
    { clientId: c.clientId },
    (await searchParams).cursor,
  );
  return (
    <div className="space-y-6">
      <PageHeader
        standalone
        title="Hiring requests"
        actions={
          c.role !== "reviewer" ? (
            <ButtonLink href="/portal/requests/new">New request</ButtonLink>
          ) : undefined
        }
      />
      {result.items.length ? (
        result.items.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <ButtonLink
                  href={`/portal/requests/${r.id}`}
                  variant="link"
                  className="px-0"
                >
                  {r.title}
                </ButtonLink>
                <p className="text-xs text-muted-foreground">
                  {r.positions_required} openings ·{" "}
                  {r.location || "Location to be agreed"}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No hiring requests yet.
            </p>
          </CardContent>
        </Card>
      )}
      {result.nextCursor && (
        <ButtonLink
          variant="outline"
          href={`/portal/requests?cursor=${encodeURIComponent(result.nextCursor)}`}
        >
          Older requests
        </ButtonLink>
      )}
    </div>
  );
}
