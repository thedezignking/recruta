"use client";

import { useState } from "react";
import { Panel } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  offerStatusLabels,
  placementStatusLabels,
  salaryPeriods,
} from "@/lib/pipeline";
import type { ApplicationPipeline } from "@/server/services/pipeline";
import { cn } from "cn";
import { usePipelineAction } from "./use-pipeline-action";

type Offer = ApplicationPipeline["offers"][number];
type Placement = ApplicationPipeline["placements"][number];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25";
const label = "flex flex-col gap-1 text-xs text-muted-foreground";

const periodUnits: Record<string, string> = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  monthly: "month",
  annually: "year",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPay(offer: Offer) {
  if (offer.salary_amount == null) return null;
  const amount = new Intl.NumberFormat("en", {
    style: offer.currency ? "currency" : "decimal",
    currency: offer.currency ?? undefined,
    maximumFractionDigits: 0,
  }).format(offer.salary_amount);
  const unit = offer.salary_period ? periodUnits[offer.salary_period] : null;
  return unit ? `${amount} / ${unit}` : amount;
}

export function OfferCard({
  agencyId,
  applicationId,
  status,
  updatedAt,
  offers,
  placements,
  canRecordFee,
  defaultCurrency,
}: {
  agencyId: string;
  applicationId: string;
  status: string;
  updatedAt: string;
  offers: Offer[];
  placements: Placement[];
  canRecordFee: boolean;
  defaultCurrency: string | null;
}) {
  const { run, pending, error, busy } = usePipelineAction(
    agencyId,
    applicationId,
  );
  const live = offers.find((o) =>
    ["draft", "extended", "accepted"].includes(o.status),
  );
  const placement = placements.find((p) => p.status !== "fell_through");
  const closed = offers.filter((o) => o !== live);
  const [mode, setMode] = useState<
    null | "edit" | "accept" | "decline" | "withdraw" | "place" | "fell"
  >(null);
  const [text, setText] = useState("");
  const [date, setDate] = useState(live?.start_date ?? "");
  const [fee, setFee] = useState("");
  const [returnTo, setReturnTo] = useState<"offer" | "withdrawn">("withdrawn");

  if (!["interview", "offer", "placed"].includes(status) && !offers.length)
    return null;

  const reset = () => {
    setMode(null);
    setText("");
  };

  return (
    <Panel
      title={placement ? "Placement" : "Offer"}
      actions={
        live ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              placement || live.status === "accepted"
                ? "bg-success/10 text-success"
                : "bg-[#F4F4FE] text-[#4644D6]",
            )}
          >
            {placement
              ? placementStatusLabels[placement.status]
              : offerStatusLabels[live.status]}
          </span>
        ) : null
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!live && mode !== "edit" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Record the terms you&apos;re offering. Nothing is sent to the
            candidate.
          </p>
          {["interview", "offer"].includes(status) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode("edit")}
            >
              Draft offer
            </Button>
          )}
        </div>
      )}

      {mode === "edit" && (
        <OfferForm
          offer={live}
          defaultCurrency={defaultCurrency}
          busy={busy}
          pending={pending === "save_offer"}
          onCancel={reset}
          onSave={async (values) => {
            if (await run({ action: "save_offer", ...values })) reset();
          }}
        />
      )}

      {live && mode !== "edit" && (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
            <Term label="Pay" value={formatPay(live)} />
            <Term label="Start date" value={formatDate(live.start_date)} />
            {live.status !== "accepted" && (
              <Term label="Respond by" value={formatDate(live.expires_at)} />
            )}
            {placement && (
              <Term label="Opening" value={`#${placement.opening_number}`} />
            )}
          </dl>
          {live.notes && (
            <p className="mt-2.5 text-xs whitespace-pre-wrap text-muted-foreground">
              {live.notes}
            </p>
          )}

          {!mode && (
            <div className="mt-4 flex flex-col gap-2">
              {live.status === "draft" && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run({
                        action: "extend_offer",
                        id: live.id,
                        expectedUpdatedAt: updatedAt,
                      })
                    }
                  >
                    {pending === "extend_offer"
                      ? "Saving…"
                      : "Mark offer as extended"}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setMode("edit")}
                    >
                      Edit terms
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => setMode("withdraw")}
                    >
                      Withdraw
                    </Button>
                  </div>
                </>
              )}
              {live.status === "extended" && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setMode("accept")}
                  >
                    Candidate accepted
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setMode("decline")}
                    >
                      Declined
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setMode("edit")}
                    >
                      Edit terms
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setMode("withdraw")}
                  >
                    Withdraw offer
                  </Button>
                </>
              )}
              {live.status === "accepted" && !placement && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDate(live.start_date ?? "");
                    setMode("place");
                  }}
                >
                  Record placement
                </Button>
              )}
              {placement?.status === "pending_start" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run({ action: "start_placement", id: placement.id })
                  }
                >
                  {pending === "start_placement"
                    ? "Saving…"
                    : "Candidate has started"}
                </Button>
              )}
              {placement && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setMode("fell")}
                >
                  Placement fell through
                </Button>
              )}
            </div>
          )}

          {mode === "accept" && (
            <ActionForm
              busy={busy}
              submitLabel={
                pending === "decide_offer" ? "Saving…" : "Record acceptance"
              }
              disabled={!date}
              onBack={reset}
              onSubmit={async () => {
                if (
                  await run({
                    action: "decide_offer",
                    id: live.id,
                    decision: "accepted",
                    startDate: date,
                  })
                )
                  reset();
              }}
            >
              <label className={label}>
                Confirmed start date
                <Input
                  type="date"
                  value={date}
                  required
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </ActionForm>
          )}

          {(mode === "decline" || mode === "withdraw") && (
            <ActionForm
              busy={busy}
              destructive
              submitLabel={
                pending === "decide_offer"
                  ? "Saving…"
                  : mode === "decline"
                    ? "Record decline"
                    : "Withdraw offer"
              }
              disabled={text.trim().length < 5}
              onBack={reset}
              onSubmit={async () => {
                if (
                  await run({
                    action: "decide_offer",
                    id: live.id,
                    decision: mode === "decline" ? "declined" : "withdrawn",
                    reason: text,
                  })
                )
                  reset();
              }}
            >
              <label className={label}>
                Reason (required)
                <Textarea
                  value={text}
                  rows={2}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                The application stays at Offer. Move it on from Review when
                you&apos;re ready.
              </p>
            </ActionForm>
          )}

          {mode === "place" && (
            <ActionForm
              busy={busy}
              submitLabel={
                pending === "record_placement" ? "Saving…" : "Record placement"
              }
              disabled={!date}
              onBack={reset}
              onSubmit={async () => {
                if (
                  await run({
                    action: "record_placement",
                    id: crypto.randomUUID(),
                    offerId: live.id,
                    startDate: date,
                    feeAmount: fee,
                    feeCurrency: live.currency ?? defaultCurrency ?? "",
                    expectedUpdatedAt: updatedAt,
                  })
                )
                  reset();
              }}
            >
              <label className={label}>
                Start date
                <Input
                  type="date"
                  value={date}
                  required
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              {canRecordFee && (
                <label className={label}>
                  Placement fee{" "}
                  {(live.currency ?? defaultCurrency)
                    ? `(${live.currency ?? defaultCurrency}, optional)`
                    : "(optional)"}
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                Moves the application to Placed and fills the next opening. The
                job closes when every opening is filled.
              </p>
            </ActionForm>
          )}

          {mode === "fell" && placement && (
            <ActionForm
              busy={busy}
              destructive
              submitLabel={
                pending === "placement_fell_through"
                  ? "Saving…"
                  : "Reopen the opening"
              }
              disabled={text.trim().length < 5}
              onBack={reset}
              onSubmit={async () => {
                if (
                  await run({
                    action: "placement_fell_through",
                    id: placement.id,
                    reason: text,
                    returnTo,
                    expectedUpdatedAt: updatedAt,
                  })
                )
                  reset();
              }}
            >
              <label className={label}>
                What happened? (required)
                <Textarea
                  value={text}
                  rows={2}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <label className={label}>
                Move the application to
                <select
                  className={selectClass}
                  value={returnTo}
                  onChange={(e) =>
                    setReturnTo(e.target.value as typeof returnTo)
                  }
                >
                  <option value="withdrawn">Withdrawn</option>
                  <option value="offer">Offer</option>
                </select>
              </label>
            </ActionForm>
          )}
        </>
      )}

      {closed.length > 0 && (
        <details className="group mt-4 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Earlier offers ({closed.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {closed.map((offer) => (
              <li key={offer.id} className="text-muted-foreground">
                {offerStatusLabels[offer.status]}
                {formatPay(offer) ? ` · ${formatPay(offer)}` : ""}
                {offer.decision_reason ? ` · “${offer.decision_reason}”` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

function Term({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function ActionForm({
  children,
  busy,
  disabled,
  destructive,
  submitLabel,
  onBack,
  onSubmit,
}: {
  children: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  destructive?: boolean;
  submitLabel: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          size="sm"
          variant={destructive ? "destructive" : "default"}
          disabled={busy || disabled}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function OfferForm({
  offer,
  defaultCurrency,
  busy,
  pending,
  onCancel,
  onSave,
}: {
  offer?: Offer;
  defaultCurrency: string | null;
  busy: boolean;
  pending: boolean;
  onCancel: () => void;
  onSave: (values: {
    id: string;
    salaryAmount: string;
    currency: string;
    salaryPeriod: "" | (typeof salaryPeriods)[number];
    startDate: string;
    expiresAt: string;
    notes: string;
  }) => void;
}) {
  const [id] = useState(() => offer?.id ?? crypto.randomUUID());
  const [amount, setAmount] = useState(
    offer?.salary_amount != null ? String(offer.salary_amount) : "",
  );
  const [currency, setCurrency] = useState(
    offer?.currency ?? defaultCurrency ?? "",
  );
  const [period, setPeriod] = useState<"" | (typeof salaryPeriods)[number]>(
    (offer?.salary_period as (typeof salaryPeriods)[number]) ?? "annually",
  );
  const [start, setStart] = useState(offer?.start_date ?? "");
  const [expires, setExpires] = useState(offer?.expires_at ?? "");
  const [notes, setNotes] = useState(offer?.notes ?? "");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          id,
          salaryAmount: amount,
          currency,
          salaryPeriod: period,
          startDate: start,
          expiresAt: expires,
          notes,
        });
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
        <label className={label}>
          Pay
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className={label}>
          Currency
          <Input
            value={currency}
            maxLength={3}
            placeholder="NGN"
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
        </label>
      </div>
      <label className={label}>
        Per
        <select
          className={selectClass}
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
        >
          {salaryPeriods.map((value) => (
            <option key={value} value={value}>
              {periodUnits[value].charAt(0).toUpperCase() +
                periodUnits[value].slice(1)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>
          Start date
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className={label}>
          Respond by
          <Input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </label>
      </div>
      <label className={label}>
        Notes (optional)
        <Textarea
          value={notes}
          rows={2}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {pending ? "Saving…" : "Save offer"}
        </Button>
      </div>
    </form>
  );
}
