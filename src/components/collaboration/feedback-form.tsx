"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
export function FeedbackForm({
  submissionId,
  clientId,
}: {
  submissionId: string;
  clientId: string;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState("discuss");
  const [saved, setSaved] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    key.current ??= crypto.randomUUID();
    try {
      const r = await fetch(
        `/api/v1/portal/submissions/${submissionId}/feedback`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-client-id": clientId,
          },
          body: JSON.stringify({
            feedbackId: key.current,
            recommendation,
            strengths: data.get("strengths"),
            concerns: data.get("concerns"),
            comment: data.get("comment"),
          }),
        },
      );
      const result = await r.json();
      if (!r.ok)
        throw new Error(
          result.error?.message ?? "Feedback could not be saved.",
        );
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  if (saved)
    return (
      <p role="status" className="text-sm">
        Feedback shared with your agency.
      </p>
    );
  return (
    <form onSubmit={submit} aria-label="Candidate feedback">
      <FieldGroup>
        <Field>
          <FieldLabel>Recommendation</FieldLabel>
          <Select
            value={recommendation}
            onValueChange={(v) => setRecommendation(v ?? "discuss")}
            items={[
              { value: "proceed", label: "Proceed" },
              { value: "discuss", label: "Discuss" },
              { value: "pass", label: "Pass" },
            ]}
          >
            <SelectTrigger aria-label="Recommendation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="proceed">Proceed</SelectItem>
                <SelectItem value="discuss">Discuss</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`strengths-${submissionId}`}>
            Strengths
          </FieldLabel>
          <Textarea
            id={`strengths-${submissionId}`}
            name="strengths"
            maxLength={3000}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`concerns-${submissionId}`}>Concerns</FieldLabel>
          <Textarea
            id={`concerns-${submissionId}`}
            name="concerns"
            maxLength={3000}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`comment-${submissionId}`}>Feedback</FieldLabel>
          <Textarea
            id={`comment-${submissionId}`}
            name="comment"
            required
            minLength={5}
            maxLength={5000}
          />
        </Field>
        {error && <FieldError role="alert">{error}</FieldError>}
        <Button disabled={pending} type="submit">
          {pending ? "Sharing…" : "Share feedback"}
        </Button>
      </FieldGroup>
    </form>
  );
}
