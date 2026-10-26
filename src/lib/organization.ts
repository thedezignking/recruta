import { z } from "zod";

export const companyProfileSchema = z.object({
  address: z.string().trim().max(500).optional(),
  logoUrl: z
    .string()
    .max(2048)
    .url()
    .refine((value) => value.startsWith("https://"), "Use an HTTPS image URL.")
    .optional()
    .or(z.literal("")),
  provider: z.enum(["manual", "brandfetch"]).optional(),
  providerId: z.string().max(120).optional(),
});
export const organizationDetailsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  industry: z.string().trim().max(120).optional(),
  website: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Use an HTTP or HTTPS website.",
    )
    .optional()
    .or(z.literal("")),
  countryCode: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/)
    .optional()
    .or(z.literal("")),
  location: z.string().trim().max(160).optional(),
  companyProfile: companyProfileSchema.optional(),
});
export type OrganizationDetails = z.infer<typeof organizationDetailsSchema>;
export type OrganizationOption = OrganizationDetails & { id: string };

export function companyDomain(website?: string | null) {
  try {
    return new URL(website ?? "").hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
