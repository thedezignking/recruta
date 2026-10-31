"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { processingSettingsSchema } from "@/lib/applicant-processing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function ProcessingSettings({
  agencyId,
  initial,
  available,
}: {
  agencyId: string;
  initial: z.infer<typeof processingSettingsSchema>;
  available: { screening: boolean; email: boolean; automations: boolean };
}) {
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const payload = processingSettingsSchema.parse(settings);
      const response = await fetch("/api/v1/agency/processing", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Settings could not be saved.",
        );
      setNotice("Processing settings saved.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Settings could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Card
      id="processing"
      size="sm"
      className="scroll-mt-20 gap-0 py-0 shadow-none"
    >
      <CardHeader className="border-b border-border px-4 pt-3">
        <CardTitle>Applicant processing</CardTitle>
        <CardDescription>
          Choose what happens after an application arrives.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={save}>
          <FieldGroup>
            {!available.screening && (
              <p className="text-sm text-muted-foreground">
                AI requires an evaluated model, privacy approval, and a
                configured worker before activation.
              </p>
            )}
            <Field>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={settings.screeningEnabled}
                  disabled={pending || !available.screening}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      screeningEnabled: event.target.checked,
                      automaticScreening:
                        event.target.checked && settings.automaticScreening,
                    })
                  }
                />
                Enable AI screening
              </label>
              <FieldDescription>
                Recruiters can request screening. AI cannot change an
                application’s stage or send email.
              </FieldDescription>
            </Field>
            <Field>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={settings.automaticScreening}
                  disabled={
                    pending ||
                    !available.screening ||
                    !settings.screeningEnabled
                  }
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      automaticScreening: event.target.checked,
                    })
                  }
                />
                Screen new applications automatically
              </label>
              <FieldDescription>
                Runs after intake when the automation worker is enabled.
                Disabling stops new automatic requests.
              </FieldDescription>
            </Field>
            <Field>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={settings.acknowledgeApplications}
                  disabled={pending}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      acknowledgeApplications: event.target.checked,
                    })
                  }
                />
                Email application acknowledgements
              </label>
              <FieldDescription>
                {available.email && available.automations
                  ? "Queued after a new application. No rejection or status email runs automatically."
                  : "Saved as a preference. Email and automation workers must be configured before delivery."}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="review-reminder-hours">
                Flag unreviewed applications after
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="review-reminder-hours"
                  type="number"
                  min={1}
                  max={720}
                  value={settings.reviewReminderHours}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      reviewReminderHours: Number(event.target.value),
                    })
                  }
                  disabled={pending}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <FieldDescription>
                Appears in Needs attention. No candidate message is sent.
              </FieldDescription>
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
            <div>
              <Button type="submit" variant="outline" disabled={pending}>
                {pending ? "Saving…" : "Save processing settings"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
