import Link from "next/link";
import { ArrowLeftIcon, LetterIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { StageRail } from "@/components/shared/stage-rail";
import { StatusBadge } from "@/components/shared/status-badge";
import { requestStages, requests } from "@/lib/demo-data";

export default async function PortalRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = requests.find((x) => x.id === id) ?? requests[0];
  return (
    <div>
      <Link
        href="/portal/requests"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} />
        Requests
      </Link>
      <PageHeader
        eyebrow={r.reference}
        title={r.title}
        description={`${r.department} · ${r.positions} positions · ${r.location}`}
        actions={<StatusBadge status={r.status} />}
      />
      <Card className="mt-6 shadow-none">
        <CardContent className="py-5">
          <StageRail stages={requestStages} />
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="shadow-none">
          <CardHeader className="border-b pb-4">
            <CardTitle>Your submitted brief</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Build and own platform services that support rapid product growth.
              Partner with product and infrastructure teams, mentor engineers,
              and improve reliability.
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Arrangement</dt>
                <dd className="mt-1 font-medium">{r.workArrangement}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Positions</dt>
                <dd className="mt-1 font-medium">{r.positions}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card className="border-attention/25 shadow-none">
          <CardHeader className="border-b bg-attention/[.04] pb-4">
            <CardTitle>Clarification requested</CardTitle>
            <p className="text-sm text-muted-foreground">
              Maya Bello · 22 Oct, 09:14
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-3 text-sm leading-6">
              Please confirm the approved salary range and whether candidates
              outside Lagos can work remotely.
            </div>
            <form className="mt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="response">Your response</FieldLabel>
                  <Textarea id="response" placeholder="Reply to the agency…" />
                </Field>
                <Button type="submit">
                  <LetterIcon data-icon="inline-start" aria-hidden="true" />
                  Send and resubmit
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
