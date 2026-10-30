import { arrangementLabels } from "@/lib/job-content";
export type JobRoleDetailsProps = {
  employmentArrangement?: string | null;
  workingHours?: string | null;
  contractDuration?: string | null;
  remoteEligibility?: string | null;
  remoteDetails?: string | null;
  salaryVisibility?: string | null;
  salaryBasis?: string | null;
  description: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  workArrangement?: string | null;
  experienceMinYears?: number | null;
  seniorityLevel?: string | null;
  positions: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  salaryPeriod?: string | null;
  deadline?: string | null;
  requirements: { label: string; description?: string | null; type: string }[];
};
export function formatJobSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency?: string | null,
) {
  if (min == null && max == null) return null;
  const f = new Intl.NumberFormat("en", {
    style: "currency",
    currency:
      currency && /^[A-Za-z]{3}$/.test(currency)
        ? currency.toUpperCase()
        : "USD",
    maximumFractionDigits: 0,
  });
  return min != null && max != null
    ? `${f.format(min)}–${f.format(max)}`
    : min != null
      ? `From ${f.format(min)}`
      : `Up to ${f.format(max ?? 0)}`;
}

function inlineDescription(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function JobDescription({ description }: { description: string }) {
  if (!description.trim())
    return (
      <p className="text-sm text-muted-foreground">Add the role description.</p>
    );
  return (
    <div className="space-y-2 text-sm leading-7 text-muted-foreground">
      {description.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;
        if (trimmed.startsWith("## "))
          return (
            <h3 key={index} className="pt-2 font-semibold text-foreground">
              {inlineDescription(trimmed.slice(3))}
            </h3>
          );
        if (trimmed.startsWith("### "))
          return (
            <h4 key={index} className="pt-1 font-semibold text-foreground">
              {inlineDescription(trimmed.slice(4))}
            </h4>
          );
        const list = trimmed.match(/^(- |\d+\. )(.*)$/);
        if (list)
          return (
            <p key={index} className="pl-4">
              <span aria-hidden="true" className="mr-2">
                {list[1] === "- " ? "•" : list[1].trim()}
              </span>
              {inlineDescription(list[2])}
            </p>
          );
        return <p key={index}>{inlineDescription(line)}</p>;
      })}
    </div>
  );
}

export function JobRoleDetails(p: JobRoleDetailsProps) {
  const salaryAmount =
    p.salaryVisibility === "hidden" || p.salaryVisibility === "negotiable"
      ? null
      : formatJobSalary(p.salaryMin, p.salaryMax, p.currency);
  const salaryUnit = p.salaryPeriod
    ? {
        hourly: "hour",
        daily: "day",
        weekly: "week",
        monthly: "month",
        annually: "year",
      }[p.salaryPeriod]
    : undefined;
  const salary = salaryAmount
    ? `${salaryAmount}${salaryUnit ? ` / ${salaryUnit}` : ""}`
    : null;
  return (
    <div className="space-y-6">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {[
          ["Openings", p.positions],
          ["Department", p.department],
          ["Location", p.workArrangement === "remote" ? null : p.location],
          [
            "Employment arrangement",
            p.employmentArrangement
              ? arrangementLabels[p.employmentArrangement]
              : null,
          ],
          [
            "Working hours",
            p.workingHours && p.workingHours !== "not_specified"
              ? p.workingHours.replaceAll("_", "-")
              : null,
          ],
          [
            "Legacy employment detail",
            !p.employmentArrangement &&
            !["full-time", "part-time"].includes(
              p.employmentType?.toLowerCase() ?? "",
            )
              ? p.employmentType
              : null,
          ],
          [
            "Contract duration",
            ["fixed_term", "temporary"].includes(p.employmentArrangement ?? "")
              ? p.contractDuration
              : null,
          ],
          [
            "Remote eligibility",
            p.workArrangement === "remote"
              ? p.remoteEligibility === "anywhere"
                ? "Work from anywhere"
                : p.remoteDetails
              : null,
          ],
          [
            "Remote working details",
            p.workArrangement === "remote" && p.remoteEligibility === "anywhere"
              ? p.remoteDetails
              : null,
          ],
          ["Workplace type", p.workArrangement?.replaceAll("_", "-")],
          [
            "Experience",
            p.experienceMinYears == null
              ? null
              : `${p.experienceMinYears}+ ${p.experienceMinYears === 1 ? "year" : "years"}`,
          ],
          [
            "Seniority",
            p.seniorityLevel
              ? p.seniorityLevel.charAt(0).toUpperCase() +
                p.seniorityLevel.slice(1)
              : null,
          ],
          [
            "Salary",
            p.salaryVisibility === "negotiable"
              ? "Salary negotiable"
              : salary
                ? `${salary}${p.salaryBasis && p.salaryBasis !== "not_specified" ? ` · ${p.salaryBasis}` : ""}`
                : null,
          ],
          [
            "Apply by",
            p.deadline
              ? new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(p.deadline))
              : null,
          ],
        ]
          .filter(([, value]) => value != null && value !== "")
          .map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 capitalize">{value}</dd>
            </div>
          ))}
      </dl>
      <section>
        <h2 className="text-base font-semibold">About the role</h2>
        <div className="mt-3">
          <JobDescription description={p.description} />
        </div>
      </section>
      {p.requirements.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">Requirements</h2>
          <ul className="mt-3 space-y-3">
            {p.requirements.map((r, i) => (
              <li key={i} className="text-sm">
                <p>
                  {r.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.type === "preferred" ? "Preferred" : "Required"}
                  </span>
                </p>
                {r.description && (
                  <p className="mt-1 text-muted-foreground">{r.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
