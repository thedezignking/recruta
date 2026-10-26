export type JobRoleDetailsProps = {
  description: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  workArrangement?: string | null;
  positions: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
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
export function JobRoleDetails(p: JobRoleDetailsProps) {
  const salary = formatJobSalary(p.salaryMin, p.salaryMax, p.currency);
  return (
    <div className="space-y-6">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {[
          ["Openings", p.positions],
          ["Department", p.department],
          ["Location", p.location || "Location flexible"],
          ["Employment", p.employmentType || "Employment type discussed"],
          ["Work arrangement", p.workArrangement?.replaceAll("_", " ")],
          ["Salary", salary],
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
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
          {p.description || "Add the role description."}
        </p>
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
