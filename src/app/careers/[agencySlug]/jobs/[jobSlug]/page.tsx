import {
  JobRoleDetails,
  jobRoleFacts,
} from "@/components/jobs/job-role-details";
import { notFound } from "next/navigation";
import {
  CalendarIcon,
  CaseRoundIcon,
  ClockCircleIcon,
  GlobalIcon,
  Home2Icon,
  MapPointIcon,
  WalletMoneyIcon,
} from "@solar-icons/react/linear";
import { ApplyDialog } from "@/components/public/apply-dialog";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { ApiError } from "@/lib/api";
import { getPublicJob } from "@/server/services/public-jobs";

const tagIcons: Record<string, typeof MapPointIcon> = {
  "Employment arrangement": CaseRoundIcon,
  "Working hours": ClockCircleIcon,
  "Remote eligibility": GlobalIcon,
  "Workplace type": Home2Icon,
  Salary: WalletMoneyIcon,
};

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
  const facts = jobRoleFacts(role);
  const hasArrangement = facts.some(
    ([label]) => label === "Employment arrangement",
  );
  const tags = facts.filter(([label]) =>
    [
      "Workplace type",
      "Remote eligibility",
      "Employment arrangement",
      hasArrangement ? null : "Working hours",
      "Salary",
    ].includes(label),
  );
  const location =
    job.work_arrangement === "remote" ? null : (job.location ?? null);
  const deadline = job.deadline_at
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(job.deadline_at))
    : null;

  return (
    <div className="min-h-screen bg-white">
      <PublicSiteHeader
        agency={job.agencies}
        back={{ href: `/careers/${agencySlug}`, label: "All roles" }}
      />
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16"
      >
        <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {job.clients?.name && (
              <p className="text-sm font-medium text-primary">
                {job.clients.name}
              </p>
            )}
            <h1 className="mt-2 text-balance text-[32px] leading-[1.1] font-semibold tracking-[-0.045em] sm:text-[44px]">
              {job.title}
            </h1>
            <ul aria-label="Role details" className="mt-5 flex flex-wrap gap-2">
              {location && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F3F5] px-3 py-1 text-xs font-medium">
                  <MapPointIcon aria-hidden="true" size={13} />
                  {location}
                </li>
              )}
              {tags.map(([label, value]) => {
                const Icon = tagIcons[label];
                return (
                  <li
                    key={label}
                    title={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F3F5] px-3 py-1 text-xs font-medium"
                  >
                    {Icon && <Icon aria-hidden="true" size={13} />}
                    <span className="sr-only">{label}: </span>
                    <span className="first-letter:uppercase">{value}</span>
                  </li>
                );
              })}
              {deadline && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F3F5] px-3 py-1 text-xs font-medium">
                  <CalendarIcon aria-hidden="true" size={13} />
                  Apply by {deadline}
                </li>
              )}
            </ul>
          </div>
          <ApplyDialog
            agencySlug={agencySlug}
            jobSlug={jobSlug}
            jobTitle={job.title}
            agencyName={job.agencies.name}
            organization={job.clients?.name}
            questions={job.job_application_questions}
            defaultOpen={applyOpen}
            className="shrink-0"
          />
        </header>

        <article>
          <JobRoleDetails {...role} hideFacts />
        </article>
      </main>
    </div>
  );
}
