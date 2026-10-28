"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NewJobForm } from "./new-job-form";

type ClientOption = {
  id: string;
  name: string;
  website?: string;
  logoUrl?: string;
};

export function NewJobDialog({
  agencyId,
  lookupClientId,
  clients,
  workflows,
  recruiters,
  currentUserId,
  initialClientId,
  returnTo = "/app/jobs",
}: {
  agencyId: string;
  lookupClientId?: string;
  clients: ClientOption[];
  workflows: { id: string; name: string }[];
  recruiters: { userId: string; name: string; role: string }[];
  currentUserId: string;
  initialClientId?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) router.replace(returnTo);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/35" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[min(82vh,760px)] w-[calc(100%-1.5rem)] max-w-[940px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[10px] border border-border bg-[#F8F8F8] p-1 shadow-2xl outline-none">
          <Dialog.Close
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Close new job"
                className="absolute top-2 right-2 z-10"
                onClick={() => router.replace(returnTo)}
              />
            }
          >
            <CloseIcon aria-hidden="true" />
          </Dialog.Close>
          <NewJobForm
            agencyId={agencyId}
            lookupClientId={lookupClientId}
            clients={clients}
            workflows={workflows}
            recruiters={recruiters}
            currentUserId={currentUserId}
            initialClientId={initialClientId}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
