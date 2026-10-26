import { Resend } from "resend";
import { z } from "zod";
import { apiError, ApiError, ok, requestId } from "@/lib/api";
import { getDeliveryEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const config = getDeliveryEnv();
    if (!config.webhookSecret)
      throw new ApiError(
        503,
        "WEBHOOK_NOT_CONFIGURED",
        "Webhook verification is not configured.",
      );
    const payload = await request.text();
    if (payload.length > 1000000)
      throw new ApiError(
        413,
        "PAYLOAD_TOO_LARGE",
        "Webhook payload too large.",
      );
    let verified;
    try {
      verified = new Resend(config.apiKey).webhooks.verify({
        payload,
        webhookSecret: config.webhookSecret,
        headers: {
          id: request.headers.get("svix-id") ?? "",
          timestamp: request.headers.get("svix-timestamp") ?? "",
          signature: request.headers.get("svix-signature") ?? "",
        },
      });
    } catch {
      throw new ApiError(
        400,
        "INVALID_SIGNATURE",
        "Webhook verification failed.",
      );
    }
    const event = z
      .object({
        type: z.string(),
        created_at: z.iso.datetime({ offset: true }),
        data: z.object({ email_id: z.string().min(1) }),
      })
      .parse(verified);
    const status =
      event.type === "email.delivered"
        ? "delivered"
        : ["email.bounced", "email.complained", "email.failed"].includes(
              event.type,
            )
          ? "permanent_failure"
          : event.type === "email.sent"
            ? "sent"
            : null;
    if (status) {
      const result = await createAdminClient().rpc("record_email_event", {
        p_event_id: request.headers.get("svix-id") ?? "",
        p_provider_id: event.data.email_id,
        p_status: status,
        p_at: event.created_at,
        p_suppress: ["email.bounced", "email.complained"].includes(event.type),
      });
      if (result.error || !result.data)
        throw new ApiError(
          503,
          "EVENT_NOT_READY",
          "Delivery record is not ready. Retry this event.",
        );
    }
    return ok({ received: true });
  } catch (error) {
    return apiError(error, id);
  }
}
