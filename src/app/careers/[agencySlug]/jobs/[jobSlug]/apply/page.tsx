import Link from "next/link";
import { Buildings2Icon } from "@solar-icons/react/bold";
import { ArrowLeftIcon, LockKeyholeIcon } from "@solar-icons/react/linear";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/public/application-form";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api";
import { getPublicJob } from "@/server/services/public-jobs";

export default async function PublicJobApplicationPage({
  params,
}: {
  params: Promise<{ agencySlug: string; jobSlug: string }>;
}) {
  const { agencySlug, jobSlug } = await params;
  let job;
  try {
    job = await getPublicJob(agencySlug, jobSlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#f8f8fb]">
      <header className="border-b border-foreground/8 bg-white">
        <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link
            href={`/careers/${agencySlug}`}
            className="flex items-center gap-3 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-white">
              <Buildings2Icon aria-hidden="true" size={18} />
            </span>
            <span className="truncate">{job.agencies.name}</span>
          </Link>
          <Link
            href={`/careers/${agencySlug}/jobs/${jobSlug}`}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" size={16} />
            Back to role
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:py-16">
        <aside className="lg:sticky lg:top-8">
          <Badge variant="secondary">{job.clients?.name}</Badge>
          <p className="mt-5 text-sm font-medium text-primary">Application</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            {job.title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {job.application_form_intro ||
              "Share your profile and resume with the recruitment team."}
          </p>
          <div className="mt-7 flex items-start gap-3 border-t border-foreground/10 pt-6 text-xs leading-5 text-muted-foreground">
            <LockKeyholeIcon
              aria-hidden="true"
              size={17}
              className="mt-0.5 shrink-0"
            />
            <p>
              Your information is sent directly to {job.agencies.name} for this
              recruitment process.
            </p>
          </div>
        </aside>

        <ApplicationForm
          agencySlug={agencySlug}
          jobSlug={jobSlug}
          jobTitle={job.title}
          agencyName={job.agencies.name}
          questions={job.job_application_questions}
        />
      </div>
    </main>
  );
}
