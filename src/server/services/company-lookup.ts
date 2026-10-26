import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { getCompanyLookupEnv } from "@/lib/env";
import { organizationDetailsSchema } from "@/lib/organization";

const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  logos: z
    .array(
      z.object({
        type: z.string(),
        formats: z.array(
          z.object({ src: z.string().url(), format: z.string().optional() }),
        ),
      }),
    )
    .optional(),
  company: z
    .object({
      industries: z.array(z.object({ name: z.string() })).nullish(),
      location: z
        .object({
          city: z.string().nullish(),
          country: z.string().nullish(),
          countryCode: z.string().nullish(),
          region: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
});
// Only a domain goes to the fixed provider endpoint: never arbitrary URLs or contacts.
export const companyLookupSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/),
});
export async function lookupCompany(input: unknown) {
  const { domain } = companyLookupSchema.parse(input);
  const env = getCompanyLookupEnv();
  if (!env.apiKey || !env.persistenceAllowed)
    throw new ApiError(
      503,
      "COMPANY_LOOKUP_UNAVAILABLE",
      "Company lookup is unavailable. Enter the details manually.",
    );
  let response: Response;
  try {
    response = await fetch(
      `https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(domain)}`,
      {
        headers: { Authorization: `Bearer ${env.apiKey}` },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
  } catch {
    throw new ApiError(
      503,
      "COMPANY_LOOKUP_UNAVAILABLE",
      "Company details could not be loaded. Enter them manually or try again.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 404 ? 404 : 503,
      "COMPANY_LOOKUP_FAILED",
      "No company details are available. You can enter them manually.",
    );
  const parsed = brandSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success)
    throw new ApiError(
      503,
      "COMPANY_LOOKUP_FAILED",
      "Company details could not be read. Enter them manually.",
    );
  const brand = parsed.data;
  const location = brand.company?.location;
  const formats = (
    brand.logos?.find((item) => item.type === "icon") ?? brand.logos?.[0]
  )?.formats;
  const logo = (formats?.find((item) => item.format === "png") ?? formats?.[0])
    ?.src;
  const details = organizationDetailsSchema.safeParse({
    name: brand.name,
    website: `https://${brand.domain}`,
    industry: brand.company?.industries?.[0]?.name ?? "",
    location: [location?.city, location?.region, location?.country]
      .filter(Boolean)
      .join(", "),
    countryCode: location?.countryCode ?? "",
    companyProfile: {
      provider: "brandfetch",
      providerId: brand.id,
      logoUrl: logo ?? "",
      address: "",
    },
  });
  if (!details.success)
    throw new ApiError(
      503,
      "COMPANY_LOOKUP_FAILED",
      "Company details could not be read. Enter them manually.",
    );
  return details.data;
}
