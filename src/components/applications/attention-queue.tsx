import Link from "next/link";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export type AttentionItem = {
  id: string;
  applicationId: string | null;
  label: string;
  detail: string;
  at: string;
};
export function AttentionQueue({
  items,
  limit = 8,
}: {
  items: AttentionItem[];
  limit?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-2">
        {items.length ? (
          items.slice(0, limit).map((item) => (
            <Link
              key={item.id}
              href={`/app/applications/${item.applicationId}${item.id.startsWith("email:") ? "#messages" : item.id.startsWith("screening:") ? "#screening" : ""}`}
              className="flex items-start justify-between gap-3 rounded-lg px-3 py-3 hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
              <AltArrowRightIcon aria-hidden="true" size={16} />
            </Link>
          ))
        ) : (
          <p className="px-3 pb-3 text-sm text-muted-foreground">
            Nothing needs attention.
          </p>
        )}
        {items.length > limit && (
          <Link
            href="/app/attention"
            className="px-3 py-2 text-sm hover:underline"
          >
            View attention queue
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
