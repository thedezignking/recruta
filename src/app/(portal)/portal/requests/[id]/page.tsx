import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePortalPageContext } from "@/server/auth/portal-context";
import {
  getHiringRequest,
  listRequestMessages,
} from "@/server/services/hiring-requests";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PortalRequestForm } from "@/components/portal/request-form";
import { PortalRequestActions } from "@/components/portal/request-actions";
import { AttachmentDownload } from "@/components/portal/attachment-download";
import { ApiError } from "@/lib/api";
export default async function PortalRequest({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await requirePortalPageContext();
  const r = await getHiringRequest(c.supabase, id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  if (r.client_id !== c.clientId) notFound();
  const messages = await listRequestMessages(c.supabase, id);
  const editable =
    c.role !== "reviewer" &&
    ["draft", "clarification_requested"].includes(r.status);
  return (
    <div className="space-y-6">
      <PageHeader
        standalone
        title={r.title}
        actions={<StatusBadge status={r.status} />}
      />
      <Card>
        <CardContent>
          {editable ? (
            <PortalRequestForm clientId={c.clientId} draft={r} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {r.positions_required} openings · {r.location}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {r.description}
              </p>
              {r.hiring_request_requirements.map((q) => (
                <p key={q.id} className="text-sm">
                  {q.label}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {r.hiring_request_attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            {r.hiring_request_attachments.map((a) => (
              <AttachmentDownload
                key={a.id}
                requestId={id}
                id={a.id}
                name={a.file_name}
              />
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.items.length ? (
            messages.items
              .filter((m) => m.visibility === "client_visible")
              .map((m) => (
                <div key={m.id} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                  <time
                    dateTime={m.created_at}
                    className="mt-2 block text-xs text-muted-foreground"
                  >
                    {new Date(m.created_at).toLocaleDateString("en")}
                  </time>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Messages from your agency will appear here.
            </p>
          )}
          {c.role !== "reviewer" && (
            <PortalRequestActions
              clientId={c.clientId}
              requestId={id}
              status={r.status}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
