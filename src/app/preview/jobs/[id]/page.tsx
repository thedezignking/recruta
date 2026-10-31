import { notFound, redirect } from "next/navigation";
import { ApplicationForm } from "@/components/public/application-form";
import { ApplicationIntro } from "@/components/public/application-intro";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { getJob } from "@/server/services/jobs";
import { requireAgencyPageContext } from "@/server/auth/context";

export default async function DraftApplicationPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const job = await getJob(context.supabase, id).catch(() => null);
  if (!job || job.agency_id !== context.agencyId || job.status !== "draft") {
    notFound();
  }
  const { data: agency } = await context.supabase
    .from("agencies")
    .select("name,slug,logo_path")
    .eq("id", context.agencyId)
    .single();
  const agencyName = agency?.name ?? "Recruitment team";

  return (
    <div className="min-h-screen bg-white">
      <PublicSiteHeader
        agency={{
          name: agencyName,
          slug: agency?.slug ?? "",
          logo_path: agency?.logo_path,
        }}
        back={{ href: `/app/jobs/${job.id}`, label: "Back to job" }}
      />
      <div className="border-b border-primary/15 bg-primary/[0.05] px-4 py-2 text-center text-xs font-medium text-primary">
        Draft preview · This page is visible only to your team
      </div>
      <main id="main-content" className="mx-auto max-w-xl px-4 py-12 sm:py-16">
        <ApplicationIntro
          title={job.title}
          organization={job.clients?.name}
          intro={job.application_form_intro}
          location={job.location}
        />
        <ApplicationForm
          agencySlug="preview"
          jobSlug={job.id}
          jobTitle={job.title}
          agencyName={agencyName}
          questions={job.job_application_questions}
          preview
        />
      </main>
    </div>
  );
}
