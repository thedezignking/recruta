import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  companyLookupSchema,
  lookupCompany,
} from "@/server/services/company-lookup";
import { searchOrganizations } from "@/server/services/search";
import { companyDomain } from "@/lib/organization";

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
      "recruiter",
    ]);
    const input = companyLookupSchema.parse(await readJson(request));
    const matches = await searchOrganizations(supabase, agencyId, input.domain);
    const existing = matches.find(
      (item) =>
        companyDomain(item.website) === input.domain.replace(/^www\./, ""),
    );
    if (existing)
      return ok(
        {
          name: existing.name,
          website: existing.website ?? "",
          industry: existing.industry ?? "",
          location: existing.location ?? "",
          companyProfile: existing.company_profile ?? {},
          existingId: existing.id,
        },
        {
          headers: { "cache-control": "private, no-store", "x-request-id": id },
        },
      );
    return ok(await lookupCompany(input), {
      headers: { "cache-control": "private, no-store", "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
