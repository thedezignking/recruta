import "server-only";

import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

export type ApplicationEmail = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
};

export async function sendApplicationEmail(message: ApplicationEmail) {
  const env = getServerEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    {
      from: env.RECRUTA_EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
    },
    message.idempotencyKey
      ? { idempotencyKey: message.idempotencyKey }
      : undefined,
  );

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
