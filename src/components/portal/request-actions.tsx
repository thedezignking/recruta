"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
export function PortalRequestActions({
  clientId,
  requestId,
  status,
}: {
  clientId: string;
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function post(action: string, payload?: unknown) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const r = await fetch(`/api/v1/portal/requests/${requestId}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify(payload ?? {}),
      });
      const b = await r.json();
      if (!r.ok)
        throw new Error(
          b.error?.message ?? "The request could not be updated.",
        );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return (
    <div className="space-y-5">
      {["draft", "clarification_requested"].includes(status) && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} onClick={() => void post("submit")}>
            {status === "draft" ? "Submit request" : "Resubmit request"}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  "Cancel this hiring request? Your agency will retain its history.",
                )
              )
                void post("cancel");
            }}
          >
            Cancel request
          </Button>
        </div>
      )}
      {!["cancelled", "declined", "approved"].includes(status) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post("messages", {
              message: new FormData(e.currentTarget).get("message"),
            });
          }}
          className="space-y-3"
        >
          <Field>
            <FieldLabel htmlFor="request-response">
              Message to your agency
            </FieldLabel>
            <Textarea
              id="request-response"
              name="message"
              required
              maxLength={5000}
            />
          </Field>
          <Button variant="outline" type="submit" disabled={pending}>
            Send message
          </Button>
        </form>
      )}
      {["draft", "clarification_requested"].includes(status) && (
        <Field>
          <FieldLabel htmlFor="portal-request-files">
            Attach PDF or DOCX documents
          </FieldLabel>
          <input
            id="portal-request-files"
            type="file"
            accept=".pdf,.docx"
            disabled={pending}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || busy.current) return;
              busy.current = true;
              setPending(true);
              setError("");
              try {
                const r = await fetch(
                  `/api/v1/hiring-requests/${requestId}/attachments`,
                  {
                    method: "POST",
                    headers: {
                      "content-type": "application/json",
                      "x-client-id": clientId,
                    },
                    body: JSON.stringify({
                      fileName: file.name,
                      contentType: file.type,
                      sizeBytes: file.size,
                    }),
                  },
                );
                const b = await r.json();
                if (!r.ok)
                  throw new Error(
                    b.error?.message ?? "Upload could not start.",
                  );
                const result = await createClient()
                  .storage.from("hiring-request-attachments")
                  .uploadToSignedUrl(
                    b.data.upload.path,
                    b.data.upload.token,
                    file,
                  );
                if (result.error)
                  throw new Error(
                    "Upload failed. Retry before submitting the request.",
                  );
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setPending(false);
                busy.current = false;
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Up to five files, 10 MiB each.
          </p>
        </Field>
      )}
      {error && <FieldError role="alert">{error}</FieldError>}
    </div>
  );
}
