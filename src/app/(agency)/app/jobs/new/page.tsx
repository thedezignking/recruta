import { redirect } from "next/navigation";
export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  redirect(
    `/app/jobs?new=1${clientId ? `&clientId=${encodeURIComponent(clientId)}` : ""}`,
  );
}
