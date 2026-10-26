import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear";
import { ButtonLink } from "@/components/shared/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { requests } from "@/lib/demo-data";

export default function PortalRequestsPage() {
  return (
    <div>
      <PageHeader
        title="Hiring requests"
        actions={
          <ButtonLink href="/portal/requests/new">
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            New request
          </ButtonLink>
        }
      />
      <div className="mt-6 grid gap-3">
        {requests.slice(0, 3).map((r) => (
          <Link key={r.id} href={`/portal/requests/${r.id}`}>
            <Card className="shadow-none transition-colors hover:border-primary/30">
              <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {r.reference} · {r.positions} positions · {r.location}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
