import { ClipboardListIcon } from "@solar-icons/react/bold";
import { AddIcon, ArrowRightIcon } from "@solar-icons/react/linear";
import { ButtonLink } from "@/components/shared/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StageRail } from "@/components/shared/stage-rail";
import { StatusBadge } from "@/components/shared/status-badge";
import { requestStages, requests } from "@/lib/demo-data";

export default function PortalHome() {
  const featured = requests[1];
  return (
    <div>
      <PageHeader
        eyebrow="Meridian Systems"
        title="Overview"
        actions={
          <ButtonLink href="/portal/requests/new">
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            New hiring request
          </ButtonLink>
        }
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle>Request in progress</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Your team owns the next step.
              </p>
            </div>
            <StatusBadge status={featured.status} />
          </CardHeader>
          <CardContent>
            <p className="font-medium">{featured.title}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {featured.reference}
            </p>
            <div className="mt-6">
              <StageRail
                stages={requestStages.map((s, i) => ({
                  ...s,
                  active: i === 1,
                  complete: i === 0,
                }))}
              />
            </div>
            <ButtonLink
              variant="outline"
              className="mt-5"
              href={`/portal/requests/${featured.id}`}
            >
              Respond to clarification
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </ButtonLink>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <ClipboardListIcon aria-hidden="true" size={24} />
            </span>
            <p className="mt-4 text-3xl font-semibold">3</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Active hiring requests
            </p>
            <ButtonLink variant="link" href="/portal/requests">
              View all requests
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
