"use client";
import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";

export function KeyboardShortcuts({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 shadow-xl outline-none">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-base font-semibold">
              Keyboard shortcuts
            </Dialog.Title>
            <Dialog.Close
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Close keyboard shortcuts"
                />
              }
            >
              <CloseIcon aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Navigate Recruta with your keyboard.
          </Dialog.Description>
          <dl className="mt-5 flex flex-col gap-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Focus workspace search</dt>
              <dd className="font-mono text-xs text-muted-foreground">
                ⌘ K / Ctrl K
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Move through search results</dt>
              <dd className="font-mono text-xs text-muted-foreground">↑ ↓</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Open selected result</dt>
              <dd className="font-mono text-xs text-muted-foreground">Enter</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Close a menu or panel</dt>
              <dd className="font-mono text-xs text-muted-foreground">Esc</dd>
            </div>
          </dl>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
