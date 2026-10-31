"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraAddIcon } from "@solar-icons/react/linear/camera-add";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { agencyLogoFileError } from "@/lib/agency-logo";

export function ProfilePhoto({
  name,
  initialPath,
  initialUrl,
}: {
  name: string;
  initialPath: string | null;
  initialUrl: string | null;
}) {
  const [photo, setPhoto] = useState({ path: initialPath, url: initialUrl });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

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
      if (photo.path) form.set("expectedPath", photo.path);
      const response = await fetch("/api/v1/account/avatar", {
        method: file ? "POST" : "DELETE",
        headers: !file ? { "content-type": "application/json" } : undefined,
        body: file ? form : JSON.stringify({ expectedPath: photo.path }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Your photo could not be saved.",
        );
      setPhoto(result.data);
      setMessage(file ? "Photo updated." : "Photo removed.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your photo could not be saved.",
      );
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section aria-label="Profile photo">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          aria-label={
            photo.url ? "Replace profile photo" : "Upload profile photo"
          }
          className="group relative shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar className="size-16">
            {photo.url && <AvatarImage src={photo.url} alt="" />}
            <AvatarFallback className="bg-[#EDECFD] text-lg font-semibold text-[#4846B8]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full border-2 border-white bg-foreground text-white transition-transform group-hover:scale-105"
          >
            <CameraAddIcon size={12} />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shown to your team · PNG, JPG or WebP · Up to 2 MB
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload profile photo"
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
              {pending ? "Saving…" : photo.url ? "Replace" : "Upload photo"}
            </Button>
            {photo.url ? (
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
