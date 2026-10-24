import { apiError, ok, readJson, requestId } from "@/lib/api";
import { onboardingSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/context";

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const payload = onboardingSchema.parse(await readJson(request));
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("onboard_agency", {
      p_name: payload.agencyName,
      p_slug: payload.slug,
      p_contact_email: payload.contactEmail,
      p_country_code: payload.countryCode,
      p_timezone: payload.timezone,
      p_full_name: payload.fullName,
      ...(payload.specialization
        ? { p_primary_specialization: payload.specialization }
        : {}),
    });
    if (error) throw error;
    return ok(
      { agencyId: data },
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
