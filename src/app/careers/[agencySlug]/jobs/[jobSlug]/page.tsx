import Link from "next/link";
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

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
) {
  if (min === null && max === null) return null;
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
  if (min !== null && max !== null)
    return `${formatter.format(min)}–${formatter.format(max)}`;
  return min !== null
    ? `From ${formatter.format(min)}`
    : `Up to ${formatter.format(max ?? 0)}`;
}

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
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

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
          <section aria-labelledby="about-role">
            <h2
              id="about-role"
              className="mt-2 text-2xl font-semibold tracking-[-0.035em]"
            >
              About the role
            </h2>
            <div className="mt-5 max-w-[70ch] whitespace-pre-wrap text-base leading-8 text-muted-foreground">
              {job.description}
            </div>
          </section>
          {job.job_requirements.length ? (
            <section
              aria-labelledby="requirements"
              className="mt-12 border-t border-foreground/10 pt-10"
            >
              <h2
                id="requirements"
                className="text-2xl font-semibold tracking-[-0.035em]"
              >
                Requirements
              </h2>
              <ul className="mt-5 flex flex-col gap-4">
                {job.job_requirements.map((requirement) => (
                  <li
                    key={requirement.id}
                    className="grid grid-cols-[8px_minmax(0,1fr)] gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2.5 size-1.5 rounded-full bg-primary"
                    />
                    <div>
                      <p className="font-medium">{requirement.label}</p>
                      {requirement.description ? (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {requirement.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section
            aria-label="Role details"
            className="mt-12 grid gap-4 border-t border-foreground/10 pt-10 sm:grid-cols-2"
          >
            <div className="rounded-xl bg-white p-5 ring-1 ring-foreground/8">
              <p className="text-xs text-muted-foreground">
                Working arrangement
              </p>
              <p className="mt-2 font-medium capitalize">
                {job.work_arrangement?.replace("_", "-") ||
                  "Discussed during the process"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 ring-1 ring-foreground/8">
              <p className="text-xs text-muted-foreground">Compensation</p>
              <p className="mt-2 font-medium">
                {salary || "Shared during the process"}
              </p>
            </div>
          </section>
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
