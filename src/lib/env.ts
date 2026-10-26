import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RECRUTA_EMAIL_FROM: z.string().min(3),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export function getPublicEnv(): PublicEnv {
  return publicSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    ...getPublicEnv(),
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RECRUTA_EMAIL_FROM: process.env.RECRUTA_EMAIL_FROM,
  });
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getCompanyLookupEnv() {
  return z
    .object({
      clientId: z.string().trim().max(200).optional(),
      apiKey: z.string().trim().max(500).optional(),
      persistenceAllowed: z.boolean(),
    })
    .parse({
      // Public client IDs may be supplied from server configuration as a prop.
      // This alias supports the existing Vercel setting without exposing API keys.
      clientId:
        process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID?.trim() ||
        process.env.BRANDFETCH_CLIENT_ID?.trim() ||
        undefined,
      apiKey: process.env.BRANDFETCH_API_KEY,
      persistenceAllowed: process.env.BRANDFETCH_PERSISTENCE_ALLOWED === "true",
    });
}

export function getScreeningEnv() {
  return z
    .object({
      enabled: z.boolean(),
      dataUseApproved: z.boolean(),
      apiKey: z.string().trim().min(1).optional(),
      model: z.string().trim().min(1).max(100).optional(),
      workerSecret: z.string().min(32).optional(),
    })
    .parse({
      enabled: process.env.RECRUTA_AI_ENABLED === "true",
      dataUseApproved: process.env.RECRUTA_AI_DATA_USE_APPROVED === "true",
      apiKey: process.env.OPENAI_API_KEY || undefined,
      model: process.env.OPENAI_SCREENING_MODEL || undefined,
      workerSecret: process.env.SCREENING_WORKER_SECRET || undefined,
    });
}

export function getDeliveryEnv() {
  return z
    .object({
      enabled: z.boolean(),
      automationsEnabled: z.boolean(),
      apiKey: z.string().min(1).optional(),
      from: z.string().min(3).optional(),
      workerSecret: z.string().min(32).optional(),
      webhookSecret: z.string().min(1).optional(),
    })
    .parse({
      enabled: process.env.RECRUTA_CANDIDATE_EMAIL_ENABLED === "true",
      automationsEnabled: process.env.RECRUTA_AUTOMATIONS_ENABLED === "true",
      apiKey: process.env.RESEND_API_KEY || undefined,
      from: process.env.RECRUTA_EMAIL_FROM || undefined,
      workerSecret: process.env.AUTOMATION_WORKER_SECRET || undefined,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET || undefined,
    });
}
