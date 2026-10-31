import { redirect } from "next/navigation";
import { requireAgencyPageContext } from "@/server/auth/context";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
import { AttentionQueue } from "@/components/applications/attention-queue";
import { getAttentionQueue } from "@/server/services/application-automations";
export default async function AttentionPage() {
  const c = await requireAgencyPageContext().catch(() => null);
  if (!c) redirect("/login");
  const items = await getAttentionQueue(c.supabase, c.agencyId);
  return (
    <div className="flex flex-col gap-4 pb-20">
      <PageHeader title="Needs attention" className="mb-2" />
      <SectionHeader title="Outstanding work" count={items.length} />
      <AttentionQueue items={items} limit={80} />
      <p className="text-xs text-muted-foreground">
        Up to 20 oldest items per category. Outstanding work stays visible
        regardless of the Overview date filter.
      </p>
    </div>
  );
}
