import Link from "next/link";
import { Buildings2Icon } from "@solar-icons/react/bold";
import {
  ArrowRightIcon,
  CaseRoundIcon,
  MapPointIcon,
} from "@solar-icons/react/linear";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
            Talk to our team
          </a>
        </div>
      </header>

      <section className="overflow-hidden border-b border-foreground/8 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.25fr_.75fr] lg:py-24">
          <div>
            <Badge variant="secondary">Careers at {site.agency.name}</Badge>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
              Work worth doing, with teams worth joining.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Explore open roles selected by our recruitment team. Apply once
              with clear expectations and direct communication throughout the
              process.
            </p>
          </div>
          <div className="self-end rounded-2xl bg-foreground p-6 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">
              Our focus
            </p>
            <p className="mt-3 text-xl font-medium leading-8">
              {site.agency.primary_specialization ||
                "Thoughtful recruitment for growing organizations."}
            </p>
            <p className="mt-8 text-sm text-white/60">
              {site.jobs.length} open{" "}
              {site.jobs.length === 1 ? "role" : "roles"}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="open-roles"
        className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              Current opportunities
            </p>
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
                      {job.employment_type || "Employment type discussed"}
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
