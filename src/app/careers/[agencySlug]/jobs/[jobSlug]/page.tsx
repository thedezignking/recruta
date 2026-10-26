import Link from "next/link";
import { JobRoleDetails } from "@/components/jobs/job-role-details";
import { Buildings2Icon } from "@solar-icons/react/bold";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CaseRoundIcon,
  MapPointIcon,
} from "@solar-icons/react/linear";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/shared/button-link";
import { ApiError } from "@/lib/api";
import { getPublicJob } from "@/server/services/public-jobs";

export default async function PublicJobPage({
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
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href={`/careers/${agencySlug}`}
            className="flex items-center gap-3 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-white">
              <Buildings2Icon aria-hidden="true" size={18} />
            </span>
            {job.agencies.name}
          </Link>
          <Link
            href={`/careers/${agencySlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" size={16} /> All roles
          </Link>
        </div>
      </header>

      <section className="border-b border-foreground/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-16">
          <Badge variant="secondary">{job.clients?.name}</Badge>
          <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {job.title}
          </h1>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPointIcon aria-hidden="true" size={17} />
              {job.location || "Location flexible"}
            </span>
            <span className="inline-flex items-center gap-2">
              <CaseRoundIcon aria-hidden="true" size={17} />
              {job.employment_type || "Employment type discussed"}
            </span>
            {job.deadline_at ? (
              <span className="inline-flex items-center gap-2">
                <CalendarIcon aria-hidden="true" size={17} />
                Apply by{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(job.deadline_at),
                )}
              </span>
            ) : null}
          </div>
          <Link
            href={`/careers/${agencySlug}/jobs/${jobSlug}/apply`}
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,box-shadow,transform] duration-150 hover:bg-primary/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Apply now
            <ArrowRightIcon aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:py-16">
        <article className="min-w-0">
          <JobRoleDetails
            description={job.description}
            department={job.department}
            location={job.location}
            employmentType={job.employment_type}
            workArrangement={job.work_arrangement}
            positions={job.positions_required}
            salaryMin={job.salary_min}
            salaryMax={job.salary_max}
            currency={job.currency}
            deadline={job.deadline_at}
            requirements={job.job_requirements.map((r) => ({
              label: r.label,
              description: r.description,
              type: r.requirement_type,
            }))}
          />
        </article>
        <aside className="rounded-2xl bg-white p-6 ring-1 ring-foreground/8 lg:sticky lg:top-6 sm:p-8">
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
            Send your application
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {job.application_form_intro ||
              "Share your profile and resume with the recruitment team."}
          </p>
          <ButtonLink
            href={`/careers/${agencySlug}/jobs/${jobSlug}/apply`}
            variant="outline"
            size="lg"
            className="mt-6 h-11 w-full"
          >
            Apply for this role
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </ButtonLink>
        </aside>
      </div>
    </main>
  );
}
