"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  NewJobForm,
  type FormValues,
  type DraftFormState,
} from "./new-job-form";

type ClientOption = {
  id: string;
  name: string;
  website?: string;
  location?: string;
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
  initialDraft,
  initialStep,
}: {
  agencyId: string;
  lookupClientId?: string;
  clients: ClientOption[];
  workflows: {
    id: string;
    name: string;
    stages?: {
      name: string;
      stage_type?: string;
      requires_approval?: boolean;
    }[];
  }[];
  recruiters: { userId: string; name: string; role: string }[];
  currentUserId: string;
  initialClientId?: string;
  returnTo?: string;
  initialDraft?: { id: string; updatedAt: string; values: FormValues };
  initialStep?: 1 | 4;
}) {
  const router = useRouter();
  const dismissing = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const formState = useRef<DraftFormState | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const receiveFormState = useCallback((state: DraftFormState) => {
    if (!dismissing.current) formState.current = state;
  }, []);
  function dismiss() {
    dismissing.current = true;
    formState.current = null;
    setConfirmClose(false);
    setDismissed(true);
    router.replace(returnTo);
  }
  function requestClose() {
    if (dismissing.current) return;
    if (formState.current?.pending) return;
    if (formState.current?.dirty) setConfirmClose(true);
    else dismiss();
  }
  const [startMode, setStartMode] = useState<"choice" | "template" | "form">(
    initialDraft ? "form" : "choice",
  );
  const [starter, setStarter] = useState<Pick<
    FormValues,
    "title" | "description"
  > | null>(null);
  const templates = [
    {
      title: "Software engineer",
      description:
        "Build and maintain software that solves customer problems. Work with product and design partners to turn requirements into reliable features.\n\nYou will design, develop, test, and improve applications; review code with teammates; and help keep systems secure and dependable.\n\nWe are looking for someone who can communicate technical decisions clearly, collaborate across teams, and take ownership of their work.",
    },
    {
      title: "Sales representative",
      description:
        "Help prospective customers understand how our product meets their needs. Build relationships, manage opportunities, and guide people through a thoughtful buying process.\n\nYou will identify and qualify leads, run discovery conversations, present solutions, and keep accurate records of progress.\n\nWe are looking for someone who listens well, communicates clearly, and follows through on commitments.",
    },
    {
      title: "Operations coordinator",
      description:
        "Keep day-to-day operations organized and running smoothly. Coordinate people, information, and processes so teams can deliver their work on time.\n\nYou will track requests, maintain records, resolve routine issues, and improve the way recurring work is handled.\n\nWe are looking for someone who is organized, dependable, and comfortable working with several teams.",
    },
  ];
  if (dismissed) return null;
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/35" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[min(92vh,920px)] w-[calc(100%-1.5rem)] max-w-[1400px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[10px] border border-border bg-white p-1 shadow-2xl outline-none">
          <Dialog.Close
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={initialDraft ? "Close edit draft" : "Close new job"}
                className="absolute top-2 right-2 z-10"
              />
            }
          >
            <CloseIcon aria-hidden="true" />
          </Dialog.Close>
          {startMode !== "form" ? (
            <div className="flex h-full flex-col bg-white">
              <div className="flex items-center justify-between px-7 py-5">
                <Dialog.Title className="text-sm font-semibold">
                  Create a job
                </Dialog.Title>
                <span className="mr-10 h-1 w-24 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full w-1/4 rounded-full bg-primary" />
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
                <div className="w-full max-w-3xl">
                  <h2 className="font-heading text-2xl font-semibold tracking-tight">
                    {startMode === "choice"
                      ? "How would you like to start?"
                      : "Choose a starting template"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {startMode === "choice"
                      ? "Build the role from scratch or start with an editable example."
                      : "These are starting points. You can change every detail before publishing."}
                  </p>
                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    {startMode === "choice" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setStartMode("form")}
                          className="rounded-[10px] border border-border p-6 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-lg font-semibold text-primary">
                            1
                          </span>
                          <span className="mt-5 block text-base font-semibold">
                            Create it myself
                          </span>
                          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                            Start with an empty role and add only the details
                            you need.
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStartMode("template")}
                          className="rounded-[10px] border border-border p-6 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-lg font-semibold text-primary">
                            2
                          </span>
                          <span className="mt-5 block text-base font-semibold">
                            Use a template
                          </span>
                          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                            Start with a sample description, then tailor it to
                            the role.
                          </span>
                        </button>
                      </>
                    ) : (
                      templates.map((template) => (
                        <button
                          key={template.title}
                          type="button"
                          onClick={() => {
                            setStarter(template);
                            setStartMode("form");
                          }}
                          className="rounded-[10px] border border-border p-5 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="block text-sm font-semibold">
                            {template.title}
                          </span>
                          <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                            Editable role description and responsibilities
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-between border-t border-border px-7 py-4">
                {startMode === "template" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStartMode("choice")}
                  >
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="button" variant="ghost" onClick={dismiss}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <NewJobForm
              agencyId={agencyId}
              lookupClientId={lookupClientId}
              clients={clients}
              workflows={workflows}
              recruiters={recruiters}
              currentUserId={currentUserId}
              initialClientId={initialClientId}
              initialDraft={initialDraft}
              initialStep={initialStep}
              starter={starter}
              onDraftStateChange={receiveFormState}
              onSaved={() => {
                formState.current = null;
              }}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
      <Dialog.Root open={confirmClose} onOpenChange={setConfirmClose}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-60 bg-[#111111]/35" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-60 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-border bg-white p-5 shadow-xl">
            <Dialog.Title className="text-base font-semibold">
              Save your job before leaving?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Save a draft to finish later. Discarding removes the changes you
              have not saved.
            </Dialog.Description>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmClose(false)}
              >
                Keep editing
              </Button>
              <Button type="button" variant="destructive" onClick={dismiss}>
                Discard changes
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmClose(false);
                  formState.current?.save();
                }}
              >
                Save draft
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
}
