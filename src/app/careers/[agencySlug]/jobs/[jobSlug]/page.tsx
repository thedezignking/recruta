import { notFound } from "next/navigation";
import {
  JobRoleDetails,
  jobRoleFacts,
} from "@/components/jobs/job-role-details";
import { Reveal } from "@/components/marketing/motion";
import { ApplyDialog } from "@/components/public/apply-dialog";
import {
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
import { getPublicJob } from "@/server/services/public-jobs";
import { cn } from "cn";

export default async function PublicJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ agencySlug: string; jobSlug: string }>;
  searchParams?: Promise<{ apply?: string }>;
}) {
  const { agencySlug, jobSlug } = await params;
  const applyOpen = (await searchParams)?.apply === "1";
  let job;
  try {
    job = await getPublicJob(agencySlug, jobSlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const role = {
    description: job.description,
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
    experienceMinYears: job.experience_min_years,
    seniorityLevel: job.seniority_level,
    positions: job.positions_required,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    currency: job.currency,
    salaryPeriod: job.salary_period,
    deadline: job.deadline_at,
    requirements: job.job_requirements.map((r) => ({
      label: r.label,
      description: r.description,
      type: r.requirement_type,
    })),
  };

  return (
    <div className="mk flex min-h-dvh flex-col bg-white">
      <PublicSiteHeader
        agency={job.agencies}
        back={{ href: `/careers/${agencySlug}`, label: "All roles" }}
      />
      <main id="main-content" className="flex flex-1 flex-col">
        <section aria-labelledby="role-heading">
          <div
            className={cn("relative overflow-hidden", careerRails, careerRule)}
          >
            <div
              aria-hidden="true"
              className="mk-halftone pointer-events-none absolute inset-0"
            />
            <Reveal className="relative mx-auto flex max-w-[880px] flex-col gap-6 px-5 pt-12 pb-12 sm:flex-row sm:items-center sm:justify-between sm:pt-20 sm:pb-16">
              <div className="min-w-0">
                {job.clients?.name && (
                  <p className="text-sm font-medium text-[#5C5AED]">
                    {job.clients.name}
                  </p>
                )}
                <h1
                  id="role-heading"
                  className="mt-2 text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance sm:text-[44px] sm:tracking-[-0.04em]"
                >
                  {job.title}
                </h1>
                <RoleTags
                  facts={jobRoleFacts(role)}
                  include={[
                    "Location",
                    "Workplace type",
                    "Remote eligibility",
                    "Employment arrangement",
                    "Working hours",
                    "Salary",
                    "Apply by",
                  ]}
                  className="mt-5"
                />
              </div>
              <ApplyDialog
                agencySlug={agencySlug}
                jobSlug={jobSlug}
                jobTitle={job.title}
                agency={job.agencies}
                organization={job.clients?.name}
                questions={job.job_application_questions}
                defaultOpen={applyOpen}
                className="shrink-0 max-sm:w-full"
              />
            </Reveal>
          </div>
        </section>

        <CareerHatch />

        <CareerFrame label="About the role">
          <article className="mx-auto max-w-[720px] px-5 py-12 sm:py-16">
            <JobRoleDetails {...role} hideFacts />
          </article>
        </CareerFrame>

        <CareerHatch />
        <CareerFill />
      </main>
      <CareerFooter agencyName={job.agencies.name} />
    </div>
  );
}
