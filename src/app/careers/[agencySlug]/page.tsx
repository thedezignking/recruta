import Link from "next/link";
import { notFound } from "next/navigation";
import { AltArrowRightIcon } from "@solar-icons/react/linear";
import { jobRoleFacts } from "@/components/jobs/job-role-details";
import { Reveal } from "@/components/marketing/motion";
import {
  CareerAccent,
  CareerFill,
  CareerFooter,
  CareerFrame,
  CareerHatch,
  RoleTags,
  careerRails,
  careerRule,
} from "@/components/public/careers-layout";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { ApiError } from "@/lib/api";
import { getPublicCareerSite } from "@/server/services/public-jobs";
import { cn } from "cn";

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
  const count = site.jobs.length;

  return (
    <div className="mk flex min-h-dvh flex-col bg-white">
      <PublicSiteHeader
        agency={site.agency}
        back={{
          href: `mailto:${site.agency.contact_email}`,
          label: "Contact us",
          external: true,
        }}
      />
      <main id="main-content" className="flex flex-1 flex-col">
        <section aria-labelledby="careers-heading">
          <div
            className={cn("relative overflow-hidden", careerRails, careerRule)}
          >
            <div
              aria-hidden="true"
              className="mk-halftone pointer-events-none absolute inset-0"
            />
            <div className="relative px-5 pt-14 pb-14 text-center sm:pt-24 sm:pb-20">
              <Reveal>
                <p className="mx-auto inline-flex h-7 items-center gap-2 rounded-full border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      count ? "bg-success" : "bg-muted-foreground/40",
                    )}
                  />
                  {count
                    ? `${count} open ${count === 1 ? "role" : "roles"}`
                    : "No open roles right now"}
                </p>
                <h1
                  id="careers-heading"
                  className="mx-auto mt-5 max-w-3xl text-[32px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-[52px] sm:leading-[1.05] sm:tracking-[-0.045em]"
                >
                  Find your next role with{" "}
                  <CareerAccent>{site.agency.name}</CareerAccent>
                </h1>
              </Reveal>
              {site.agency.primary_specialization && (
                <Reveal delay={120}>
                  <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[26px] text-pretty text-muted-foreground sm:mt-5 sm:text-[17px]">
                    {site.agency.primary_specialization}
                  </p>
                </Reveal>
              )}
            </div>
          </div>
        </section>

        <CareerHatch />

        <CareerFrame labelledBy="open-roles">
          <div className="flex items-center gap-2 px-5 py-4">
            <h2 id="open-roles" className="text-[13px] font-semibold">
              Open roles
            </h2>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {count}
            </span>
          </div>
          {count ? (
            <ul>
              {site.jobs.map((job) => {
                const facts = jobRoleFacts({
                  description: "",
                  requirements: [],
                  positions: job.positions_required,
                  department: job.department,
                  location: job.location,
                  employmentType: job.employment_type,
                  employmentArrangement: job.employment_arrangement,
                  workingHours: job.working_hours,
                  contractDuration: job.contract_duration,
                  remoteEligibility: job.remote_eligibility,
                  remoteDetails: job.remote_details,
                  salaryVisibility: job.salary_visibility,
                  salaryBasis: job.salary_basis,
                  workArrangement: job.work_arrangement,
                });
                return (
                  <li key={job.id} className={cn("border-t", careerRule)}>
                    <Link
                      href={`/careers/${site.agency.slug}/jobs/${job.public_slug}`}
                      className="group flex items-center gap-4 px-5 py-5 outline-none transition-colors duration-150 hover:bg-[#FAFAFB] focus-visible:bg-[#FAFAFB] focus-visible:ring-2 focus-visible:ring-[#5C5AED] focus-visible:ring-inset sm:py-6"
                    >
                      <div className="min-w-0 flex-1">
                        {job.clients?.name && (
                          <p className="text-xs font-medium text-muted-foreground">
                            {job.clients.name}
                          </p>
                        )}
                        <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] sm:text-lg">
                          {job.title}
                        </h3>
                        <RoleTags
                          facts={facts}
                          include={[
                            "Location",
                            "Workplace type",
                            "Remote eligibility",
                            "Employment arrangement",
                            "Working hours",
                          ]}
                          className="mt-3"
                        />
                      </div>
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-[#E4E4E7] bg-white text-muted-foreground transition-[transform,color,border-color] duration-150 group-hover:translate-x-0.5 group-hover:border-[#5C5AED]/40 group-hover:text-[#5C5AED]"
                      >
                        <AltArrowRightIcon size={16} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className={cn(
                "relative border-t px-5 py-16 text-center",
                careerRule,
              )}
            >
              <div
                aria-hidden="true"
                className="mk-dots pointer-events-none absolute inset-0 opacity-60"
              />
              <div className="relative">
                <h3 className="font-semibold">No open roles today</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  New roles appear here as soon as they open.
                </p>
              </div>
            </div>
          )}
        </CareerFrame>
        <CareerHatch />
        <CareerFill />
      </main>
      <CareerFooter agencyName={site.agency.name} />
    </div>
  );
}
