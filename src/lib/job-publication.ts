export function isAcceptingPublicApplications(job: {
  status: string;
  public_slug: string | null;
  published_at: string | null;
  accepting_applications: boolean;
}) {
  return (
    job.status === "open" &&
    Boolean(job.public_slug && job.published_at) &&
    job.accepting_applications
  );
}
