"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CodeInput } from "./code-input";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * Confirms an email address with the 6-digit code Recruta emails, used after
 * sign-up and when someone signs in before confirming.
 */
export function EmailCodeStep({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const busy = useRef(false);
  const errorId = useId();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function verify(token: string) {
    if (busy.current || token.length !== CODE_LENGTH) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setNotice(null);
    const { error: verifyError } = await createClient().auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    busy.current = false;
    setPending(false);
    if (verifyError) {
      setCode("");
      setError(
        /expired/i.test(verifyError.message)
          ? "That code has expired. Send a new one below."
          : "That code isn't right. Check the latest email and try again.",
      );
      return;
    }
    onVerified();
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
    });
    if (resendError) {
      setError(
        /second|rate|limit/i.test(resendError.message)
          ? "Please wait a moment before asking for another code."
          : "The code couldn't be sent. Try again.",
      );
      return;
    }
    setCode("");
    setCooldown(RESEND_SECONDS);
    setNotice("A new code is on its way.");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void verify(code);
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          Check your email
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>. It
          expires in 15 minutes.
        </p>
      </div>
      <CodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        onComplete={(full) => void verify(full)}
        length={CODE_LENGTH}
        disabled={pending}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="-mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="-mt-2 text-sm text-success">
          {notice}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending || code.length !== CODE_LENGTH}
      >
        {pending ? "Checking…" : "Continue"}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0}
          className="rounded-md font-medium text-[#5C5AED] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:font-normal disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Can&apos;t find it? Check spam or promotions for an email from Recruta.
      </p>
    </form>
  );
}
