import Link from "next/link";
import { arrangementLabels } from "@/lib/job-content";
import { Buildings2Icon } from "@solar-icons/react/bold";
import {
  ArrowRightIcon,
  CaseRoundIcon,
  MapPointIcon,
} from "@solar-icons/react/linear";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getPublicCareerSite } from "@/server/services/public-jobs";

export default async function CareerSitePage({
  params,
}: {
  params: Promise<{ agencySlug: string }>;
}) {
  const { agencySlug } = await params;
  let site;
  try {
    site = await getPublicCareerSite(agencySlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#f8f8fb]">
      <header className="border-b border-foreground/8 bg-white">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href={`/careers/${site.agency.slug}`}
            className="flex items-center gap-3 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-white">
              <Buildings2Icon aria-hidden="true" size={18} />
            </span>
            {site.agency.name}
          </Link>
          <a
            href={`mailto:${site.agency.contact_email}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Contact us
          </a>
        </div>
      </header>

      <section className="overflow-hidden border-b border-foreground/8 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.055em]">
              Careers
            </h1>
            {site.agency.primary_specialization && (
              <p className="mt-3 text-sm text-muted-foreground">
                {site.agency.primary_specialization}
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="open-roles"
        className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="open-roles"
              className="mt-2 text-3xl font-semibold tracking-[-0.04em]"
            >
              Open roles
            </h2>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          {site.jobs.length ? (
            site.jobs.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${site.agency.slug}/jobs/${job.public_slug}`}
                className="group grid gap-5 rounded-2xl bg-white p-5 shadow-[0_1px_0_rgb(23_24_43_/_0.06)] ring-1 ring-foreground/8 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgb(23_24_43_/_0.08)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CaseRoundIcon aria-hidden="true" size={15} />
                    <span>{job.clients?.name}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-[-0.025em] group-hover:text-primary">
                    {job.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPointIcon aria-hidden="true" size={15} />
                      {job.location || "Location flexible"}
                    </span>
                    <span>
                      {job.work_arrangement?.replace("_", "-") ||
                        "Arrangement discussed"}
                    </span>
                    <span>
                      {arrangementLabels[job.employment_arrangement ?? ""] ||
                        job.employment_type ||
                        "Arrangement discussed"}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  View role <ArrowRightIcon aria-hidden="true" size={16} />
                </span>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-foreground/8">
              <h3 className="font-semibold">No open roles today</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back soon for new opportunities.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
