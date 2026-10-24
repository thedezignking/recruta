"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { RecrutaLogo } from "@/components/shared/recruta-mark";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-sm text-center">
            <div className="flex justify-center">
              <RecrutaLogo />
            </div>
            <h1 className="mt-7 text-2xl font-semibold">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The incident has been recorded. Try again, or return to the
              workspace.
            </p>
            <Button className="mt-5" onClick={reset}>
              Try again
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
