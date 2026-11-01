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
  agency,
  organization,
  questions,
  defaultOpen = false,
  className,
}: {
  agencySlug: string;
  jobSlug: string;
  jobTitle: string;
  agency: { name: string };
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
        className={cn(
          "mk-press inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.15),0_1px_2px_rgb(23_24_43_/_0.15)] outline-none hover:bg-[#4E4CE0] focus-visible:ring-3 focus-visible:ring-[#5C5AED]/40",
          className,
        )}
      >
        Apply for this role
        <ArrowRightIcon aria-hidden="true" size={16} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/25 backdrop-blur-[3px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[14px] bg-white shadow-2xl outline-none transition-[transform,opacity] duration-200 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[14px] sm:data-[ending-style]:-translate-y-[48%] sm:data-[starting-style]:-translate-y-[48%] motion-reduce:transition-none">
          <div className="relative overflow-hidden border-b border-[#EBEBEB]">
            <div
              aria-hidden="true"
              className="mk-halftone pointer-events-none absolute inset-0 opacity-70"
            />
            <div className="relative flex items-start justify-between gap-4 px-6 pt-6 pb-5">
              <div className="min-w-0">
                <Dialog.Description className="text-xs font-medium text-[#5C5AED]">
                  {organization ?? agency.name}
                </Dialog.Description>
                <Dialog.Title className="mt-1 text-xl font-semibold tracking-[-0.03em] text-balance">
                  Apply for {jobTitle}
                </Dialog.Title>
              </div>
              <Dialog.Close
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Close application"
                    className="shrink-0 rounded-full bg-white"
                  />
                }
              >
                <CloseIcon aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <div className="overflow-y-auto px-6 pt-6 pb-6">
            <ApplicationForm
              agencySlug={agencySlug}
              jobSlug={jobSlug}
              jobTitle={jobTitle}
              agencyName={agency.name}
              questions={questions}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
