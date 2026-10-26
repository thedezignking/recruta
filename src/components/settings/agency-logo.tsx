"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryIcon } from "@solar-icons/react/linear/gallery";
import { Button } from "@/components/ui/button";
import { agencyLogoFileError } from "@/lib/agency-logo";

export function AgencyLogo({
  agencyId,
  initialPath,
  initialUrl,
}: {
  agencyId: string;
  initialPath: string | null;
  initialUrl: string | null;
}) {
  const [logo, setLogo] = useState({ path: initialPath, url: initialUrl });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  async function save(file: File | null) {
    setError(null);
    setMessage("");
    if (file) {
      const invalid = agencyLogoFileError(file);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    setPending(true);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      if (logo.path) form.set("expectedPath", logo.path);
      const response = await fetch("/api/v1/agency/logo", {
        method: file ? "POST" : "DELETE",
        headers: {
          "x-agency-id": agencyId,
          ...(!file ? { "content-type": "application/json" } : {}),
        },
        body: file ? form : JSON.stringify({ expectedPath: logo.path }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "The logo could not be saved.",
        );
      setLogo(result.data);
      setMessage(file ? "Logo updated." : "Logo removed.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The logo could not be saved.",
      );
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section aria-label="Agency logo" className="mb-6">
      <div className="flex items-center gap-4">
        <div className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {/* User-uploaded raster assets use their immutable Storage URL. */}
          {logo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.url}
              alt="Agency logo"
              className="size-full object-contain p-1"
            />
          ) : (
            <GalleryIcon
              size={24}
              aria-hidden="true"
              className="text-muted-foreground"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Agency logo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Public image · PNG, JPG or WebP · Up to 2 MB
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload agency logo"
              className="sr-only"
              tabIndex={-1}
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void save(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              {pending ? "Saving…" : logo.url ? "Replace logo" : "Upload logo"}
            </Button>
            {logo.url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => void save(null)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p role="status" className="mt-2 text-xs text-muted-foreground">
        {message}
      </p>
    </section>
  );
}
