import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requirePortalPageContext } from "@/server/auth/portal-context";
import { listPortalJobs } from "@/server/services/portal";
export default async function PortalHome() {
  const c = await requirePortalPageContext();
  const jobs = await listPortalJobs(c.supabase, c.clientId);
  return (
    <div className="space-y-6">
      <PageHeader
        standalone
        title={c.clientName}
        actions={
          c.role !== "reviewer" ? (
            <ButtonLink href="/portal/requests/new">
              New hiring request
            </ButtonLink>
          ) : undefined
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Your hiring work</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.items.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {jobs.items.map((j) => (
                <ButtonLink
                  key={j.id}
                  variant="outline"
                  className="h-auto justify-start px-4 py-4"
                  href={`/portal/jobs/${j.id}`}
                >
                  {j.title}
                </ButtonLink>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Jobs appear here when your agency grants you access.
            </p>
          )}
        </CardContent>
      </Card>
      <ButtonLink variant="outline" href="/portal/requests">
        View hiring requests
      </ButtonLink>
    </div>
  );
}
