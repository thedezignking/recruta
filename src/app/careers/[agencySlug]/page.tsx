import Link from "next/link";
import { arrangementLabels } from "@/lib/job-content";
import {
  ArrowRightIcon,
  CaseRoundIcon,
  MapPointIcon,
} from "@solar-icons/react/linear";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { PublicSiteHeader } from "@/components/public/public-site-header";
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
    <div className="min-h-screen bg-white">
      <PublicSiteHeader
        agency={site.agency}
        back={{
          href: `mailto:${site.agency.contact_email}`,
          label: "Contact us",
          external: true,
        }}
      />
      <main id="main-content">
        <section>
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="text-xs font-medium text-primary">Careers</p>
            <h1 className="mt-2 max-w-3xl text-balance text-[32px] leading-[1.1] font-semibold tracking-[-0.045em] sm:text-[44px]">
              Work with {site.agency.name}
            </h1>
            {site.agency.primary_specialization && (
              <p className="mt-3 text-sm text-muted-foreground">
                {site.agency.primary_specialization}
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="open-roles"
          className="mx-auto max-w-3xl px-4 pb-16 sm:px-6"
        >
          <div className="flex items-center gap-2">
            <h2 id="open-roles" className="text-[15px] font-semibold">
              Open roles
            </h2>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border">
              {site.jobs.length}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {site.jobs.length ? (
              site.jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${site.agency.slug}/jobs/${job.public_slug}`}
                  className="group grid gap-4 rounded-[10px] border border-border bg-white p-5 outline-none transition-[border-color,box-shadow] duration-150 hover:border-primary/30 hover:shadow-[0_8px_24px_rgb(23_24_43_/_0.06)] focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CaseRoundIcon aria-hidden="true" size={15} />
                      <span>{job.clients?.name}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] group-hover:text-primary">
                      {job.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground capitalize">
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
              <div className="rounded-[10px] border border-border bg-white px-6 py-12 text-center">
                <h3 className="font-semibold">No open roles today</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back soon for new opportunities.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
