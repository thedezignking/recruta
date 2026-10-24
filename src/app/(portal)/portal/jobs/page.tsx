import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { jobs } from "@/lib/demo-data";
export default function PortalJobsPage() {
  return (
    <div>
      <PageHeader
        title="Authorized jobs"
        description="Progress on jobs your team has permission to view."
      />
      <div className="mt-6 grid gap-3">
        {jobs.slice(0, 2).map((job) => (
          <Link key={job.id} href={`/app/jobs/${job.id}`}>
            <Card className="shadow-none">
              <CardContent className="flex items-center justify-between gap-4 px-4">
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {job.reference} · {job.filled}/{job.positions} filled
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
