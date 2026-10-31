import { redirect } from "next/navigation";

export default async function PublicJobApplicationPage({
  params,
}: {
  params: Promise<{ agencySlug: string; jobSlug: string }>;
}) {
  const { agencySlug, jobSlug } = await params;
  redirect(
    `/careers/${encodeURIComponent(agencySlug)}/jobs/${encodeURIComponent(jobSlug)}?apply=1`,
  );
}
