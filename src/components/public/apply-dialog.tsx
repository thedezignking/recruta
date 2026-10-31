"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowRightIcon, CloseIcon } from "@solar-icons/react/linear";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { ApplicationForm } from "./application-form";

type Question = Parameters<typeof ApplicationForm>[0]["questions"][number];

export function ApplyDialog({
  agencySlug,
  jobSlug,
  jobTitle,
  agencyName,
  organization,
  questions,
  defaultOpen = false,
  className,
}: {
  agencySlug: string;
  jobSlug: string;
  jobTitle: string;
  agencyName: string;
  organization?: string | null;
  questions: Question[];
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Drop ?apply=1 so closing and reloading leaves the role page as-is.
        if (!next && new URLSearchParams(window.location.search).has("apply"))
          router.replace(pathname, { scroll: false });
      }}
    >
      <Dialog.Trigger
        render={<Button size="lg" className={cn("h-11 px-5", className)} />}
      >
        Apply now
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/25 backdrop-blur-[3px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[14px] bg-white shadow-2xl outline-none transition-[transform,opacity] duration-200 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[14px] sm:data-[ending-style]:-translate-y-[48%] sm:data-[starting-style]:-translate-y-[48%] motion-reduce:transition-none">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold tracking-[-0.03em]">
                Apply for {jobTitle}
              </Dialog.Title>
              {organization && (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {organization}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close application"
                />
              }
            >
              <CloseIcon aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 pb-6">
            <ApplicationForm
              agencySlug={agencySlug}
              jobSlug={jobSlug}
              jobTitle={jobTitle}
              agencyName={agencyName}
              questions={questions}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
