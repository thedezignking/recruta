import { CheckCircleIcon } from "@solar-icons/react/bold";
import { UploadIcon } from "@solar-icons/react/linear";
import { cn } from "cn";

const card =
  "rounded-[12px] border border-[#E7E7EA] bg-white shadow-[0_18px_40px_-24px_rgb(43_41_146_/_0.35)]";

/** Weekly intake vs reviewed, two-colour stacked bars. */
export function PipelineChartMock() {
  const weeks = [
    [34, 22],
    [41, 30],
    [38, 33],
    [56, 40],
    [49, 44],
    [63, 51],
    [58, 55],
    [72, 60],
    [66, 62],
    [81, 70],
    [77, 71],
    [92, 84],
  ];
  return (
    <div aria-hidden="true" className={cn(card, "w-[520px] p-4")}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold">Applications this quarter</span>
        <span className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[#5C5AED]" />
            Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[#F6B99A]" />
            Reviewed
          </span>
        </span>
      </div>
      <div className="mt-4 flex h-40 items-end gap-2">
        {weeks.map(([received, reviewed], i) => (
          <div key={i} className="flex h-full flex-1 items-end gap-[3px]">
            <span
              className="mk-grow flex-1 rounded-t-[3px] bg-[#5C5AED]"
              style={
                {
                  height: `${received}%`,
                  "--mk-delay": `${i * 45}ms`,
                } as React.CSSProperties
              }
            />
            <span
              className="mk-grow flex-1 rounded-t-[3px] bg-[#F6B99A]"
              style={
                {
                  height: `${reviewed}%`,
                  "--mk-delay": `${i * 45 + 80}ms`,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9.5px] text-muted-foreground">
        <span>Week 1</span>
        <span>Week 12</span>
      </div>
    </div>
  );
}

export function EvidenceMock() {
  const rows = [
    ["4+ years FMCG sales", "Six years selling FMCG into modern trade", true],
    ["Managed a sales team", "Led a team of 8 field reps across Lagos", true],
    ["Valid driver's licence", "Not mentioned in the CV", false],
  ] as const;
  return (
    <div aria-hidden="true" className={cn(card, "w-[460px] p-4")}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-[#EDECFD] text-[10px] font-semibold text-[#4846B8]">
          AO
        </span>
        <div>
          <p className="text-xs font-semibold">Adaeze Okafor</p>
          <p className="text-[10px] text-muted-foreground">
            Area Sales Manager · Brightline Foods
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {rows.map(([label, evidence, met]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 rounded-lg bg-[#F8F8FA] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium">{label}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {met ? `“${evidence}”` : evidence}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[9.5px] font-semibold",
                met
                  ? "bg-success/10 text-success"
                  : "bg-[#FDE7DB] text-[#A04A1C]",
              )}
            >
              {met ? "Met" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhoneMock() {
  return (
    <div
      aria-hidden="true"
      className="w-[230px] rounded-[30px] border-[6px] border-[#111111] bg-white p-3 shadow-[0_24px_50px_-20px_rgb(17_17_17_/_0.45)]"
    >
      <div className="mx-auto h-1.5 w-14 rounded-full bg-[#111111]/80" />
      <p className="mt-4 text-[13px] leading-tight font-semibold">
        Apply for Dispatch Rider
      </p>
      <p className="text-[10px] text-muted-foreground">Swiftly Logistics</p>
      <div className="mt-3 flex flex-col gap-2 text-[10px]">
        {["Full name", "Email address", "Phone"].map((label) => (
          <div key={label}>
            <p className="font-medium">{label}</p>
            <div className="mt-1 h-6 rounded-md border border-[#E4E4E7]" />
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#D4D4D8] bg-[#FAFAFB] p-2">
          <span className="grid size-6 place-items-center rounded-md bg-white text-[#5C5AED] ring-1 ring-[#E4E4E7]">
            <UploadIcon size={12} />
          </span>
          cv-tunde.pdf
        </div>
        <span className="mt-1 rounded-md bg-[#5C5AED] py-1.5 text-center font-medium text-white">
          Submit application
        </span>
      </div>
    </div>
  );
}

export function ClientsMock() {
  const clients = [
    ["B", "Brightline Foods", "FMCG", 4, "#5C5AED"],
    ["L", "Lakeside Hospital", "Healthcare", 2, "#F08A5D"],
    ["S", "Swiftly Logistics", "Logistics", 6, "#2F9E77"],
    ["K", "Kora Telecom", "Telecoms", 3, "#E2A93B"],
  ] as const;
  return (
    <div aria-hidden="true" className={cn(card, "w-[440px] p-2")}>
      {clients.map(([initial, name, industry, jobs, color]) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[11px]"
        >
          <span
            className="grid size-7 place-items-center rounded-md text-[11px] font-semibold text-white"
            style={{ background: color }}
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{name}</span>
            <span className="block text-[10px] text-muted-foreground">
              {industry}
            </span>
          </span>
          <span className="rounded-full bg-[#F3F3F5] px-2 py-0.5 text-[10px] font-medium tabular-nums">
            {jobs} open jobs
          </span>
        </div>
      ))}
    </div>
  );
}

export function FeedbackMock() {
  return (
    <div aria-hidden="true" className={cn(card, "w-[420px] p-4 text-[11px]")}>
      <p className="font-semibold">Shortlist · Area Sales Manager</p>
      <div className="mt-3 rounded-lg bg-[#F8F8FA] p-3">
        <p className="font-medium">Ngozi Adeyemi</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          Strong modern-trade record; managed key accounts in Lagos and Ibadan.
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg border border-[#EFEFEF] px-3 py-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircleIcon size={13} className="text-success" />
          Hiring manager feedback
        </span>
        <span className="font-semibold text-success">Invite to interview</span>
      </div>
    </div>
  );
}
