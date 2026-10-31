import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  Buildings2Icon,
  CaseRoundIcon,
  ChatRoundDotsIcon,
  DocumentTextIcon,
  HeadphonesRoundIcon,
  HospitalIcon,
  InboxIcon,
  LaptopMinimalisticIcon,
  ShieldCheckIcon,
  ShopIcon,
  UserCheckRoundedIcon,
  UsersGroupTwoRoundedIcon,
} from "@solar-icons/react/linear";
import {
  ClientsMock,
  EvidenceMock,
  FeedbackMock,
  PhoneMock,
  PipelineChartMock,
} from "@/components/marketing/feature-mocks";
import { Reveal, TypedEyebrow } from "@/components/marketing/motion";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { RecrutaLogo } from "@/components/shared/recruta-mark";
import { cn } from "cn";

export const metadata: Metadata = {
  title: { absolute: "Recruta · Recruitment software for agencies" },
  description:
    "Recruta handles the admin around every job and applicant, so your recruiters spend their time placing people.",
};

const rule = "border-[#EBEBEB]";

/** A full-width rule with the content column framed by side rails. */
function Frame({
  id,
  label,
  className,
  children,
}: {
  id?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={cn("scroll-mt-16 border-t", rule)}
    >
      <div
        className={cn(
          "relative mx-auto max-w-[1240px] border-x",
          rule,
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

function HatchBand() {
  return (
    <div aria-hidden="true" className={cn("border-t", rule)}>
      <div
        className={cn("mk-hatch mx-auto h-12 max-w-[1240px] border-x", rule)}
      />
    </div>
  );
}

function Accent({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[#5C5AED] underline decoration-[#5C5AED]/45 decoration-dashed decoration-2 underline-offset-[0.18em]">
      {children}
    </span>
  );
}

const primaryCta =
  "mk-press inline-flex h-11 items-center gap-2 rounded-lg bg-[#5C5AED] px-5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.15),0_1px_2px_rgb(23_24_43_/_0.15)] outline-none hover:bg-[#4E4CE0] focus-visible:ring-3 focus-visible:ring-[#5C5AED]/40";
const secondaryCta =
  "mk-press inline-flex h-11 items-center rounded-lg border border-[#E4E4E7] bg-white px-5 text-sm font-medium shadow-[0_1px_2px_rgb(17_17_17_/_0.05)] outline-none hover:bg-[#F8F8F8] focus-visible:ring-3 focus-visible:ring-[#5C5AED]/40";

const agencyTypes = [
  {
    icon: UsersGroupTwoRoundedIcon,
    name: "Staffing firms",
    line: "Volume hiring across many sites",
  },
  {
    icon: CaseRoundIcon,
    name: "Specialist agencies",
    line: "Sales, finance and leadership roles",
  },
  {
    icon: HospitalIcon,
    name: "Healthcare recruiters",
    line: "Nurses, carers and clinical staff",
  },
  {
    icon: HeadphonesRoundIcon,
    name: "Contact-centre hiring",
    line: "High volume, fast screening",
  },
  {
    icon: LaptopMinimalisticIcon,
    name: "Tech recruiters",
    line: "Engineers, data and product",
  },
  {
    icon: ShopIcon,
    name: "Retail and hospitality",
    line: "Seasonal and branch hiring",
  },
];

const facts = [
  { value: "0", label: "accounts candidates need to apply" },
  { value: "1", label: "job for any number of openings" },
  { value: "100%", label: "of screening results quote the CV" },
  { value: "0", label: "candidates rejected automatically" },
];

const safeguards = [
  {
    icon: UserCheckRoundedIcon,
    title: "No silent rejections",
    body: "Screening never moves a candidate or sends an email on its own.",
  },
  {
    icon: DocumentTextIcon,
    title: "Every result shows its source",
    body: "Each finding quotes the CV line it came from, and recruiters can correct it.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by default",
    body: "CVs open through short-lived links, and each agency's data is kept separate.",
  },
  {
    icon: ChatRoundDotsIcon,
    title: "A full history",
    body: "Stage changes, notes and emails are recorded with who did what and when.",
  },
];

const faqs = [
  {
    q: "Who is Recruta for?",
    a: "Recruitment and staffing agencies that hire for several client companies at once, from boutique teams to volume hiring desks.",
  },
  {
    q: "Do candidates need an account to apply?",
    a: "No. They open the job link, fill in a short form, upload a CV and apply from any phone.",
  },
  {
    q: "Does the AI decide who gets hired?",
    a: "No. It reads CVs against the job's requirements, quotes the evidence and flags gaps. Your recruiters make every decision.",
  },
  {
    q: "Can our clients see candidates?",
    a: "Only the candidates you share, on the jobs you give them access to. They never see internal notes or other applicants.",
  },
  {
    q: "How quickly can we start?",
    a: "Create a workspace, add a client while you open the job, and publish. Most teams post their first job the same day.",
  },
];

const nav = [
  ["Product", "#product"],
  ["Features", "#features"],
  ["Trust", "#trust"],
  ["FAQ", "#faq"],
];

export default function Home() {
  return (
    <div className="mk min-h-dvh bg-white text-foreground">
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md",
          rule,
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 border-x px-5",
            rule,
          )}
        >
          <Link
            href="/"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
          >
            <RecrutaLogo />
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1 text-sm text-muted-foreground">
              {nav.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="rounded-md px-3 py-2 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="mk-press hidden h-9 items-center rounded-lg border border-[#E4E4E7] px-3.5 text-sm font-medium outline-none hover:bg-[#F8F8F8] focus-visible:ring-2 focus-visible:ring-[#5C5AED] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="mk-press inline-flex h-9 items-center rounded-lg bg-[#5C5AED] px-3.5 text-sm font-medium text-white outline-none hover:bg-[#4E4CE0] focus-visible:ring-3 focus-visible:ring-[#5C5AED]/40"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section aria-labelledby="hero-heading">
          <div
            className={cn(
              "relative mx-auto max-w-[1240px] overflow-hidden border-x",
              rule,
            )}
          >
            <div
              aria-hidden="true"
              className="mk-halftone pointer-events-none absolute inset-0"
            />
            <div className="relative px-5 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
              <Reveal>
                <h1
                  id="hero-heading"
                  className="mx-auto max-w-4xl text-[40px] leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-[60px]"
                >
                  Turn every job into a <Accent>placement</Accent>
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mx-auto mt-6 max-w-xl text-[17px] leading-7 text-muted-foreground">
                  Recruta runs the admin around every job and applicant, from
                  the application page to the client shortlist, so your
                  recruiters spend their day placing people.
                </p>
              </Reveal>
              <Reveal delay={220}>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <a href="#product" className={secondaryCta}>
                    See how it works
                  </a>
                  <Link href="/signup" className={primaryCta}>
                    Create your workspace
                    <ArrowRightIcon aria-hidden="true" size={16} />
                  </Link>
                </div>
                <p className="mt-5 font-mono text-[11px] text-muted-foreground">
                  No candidate accounts · Works on any phone · AI that shows its
                  evidence
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <Frame id="product" label="Product tour">
          <ProductShowcase />
        </Frame>

        <HatchBand />

        <Frame label="Who it's for">
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)]">
            <div className={cn("p-8 sm:p-10 lg:border-r", rule)}>
              <TypedEyebrow text="who it's for" />
              <h2 className="mt-4 text-[26px] leading-tight font-semibold tracking-[-0.03em]">
                Built for agencies that hire{" "}
                <span className="text-muted-foreground">
                  for other companies.
                </span>
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                One workspace for every client, job and candidate, from a
                three-person boutique to a volume desk filling hundreds of roles
                a month.
              </p>
            </div>
            <ul className="grid gap-px bg-[#EBEBEB] sm:grid-cols-2 lg:grid-cols-3">
              {agencyTypes.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.name} className="bg-white">
                    <Reveal delay={index * 60} className="h-full p-6 sm:p-7">
                      <span className="grid size-10 place-items-center rounded-[10px] bg-[#F4F4FE] text-[#5C5AED]">
                        <Icon aria-hidden="true" size={20} />
                      </span>
                      <p className="mt-5 text-[15px] font-semibold">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.line}
                      </p>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </Frame>

        <Frame label="The problem" className="overflow-hidden">
          <div
            aria-hidden="true"
            className="mk-halftone pointer-events-none absolute inset-0"
          />
          <div className="relative px-5 pt-24 pb-20 text-center sm:pt-32">
            <TypedEyebrow text="the problem" />
            <Reveal>
              <h2 className="mx-auto mt-5 max-w-3xl text-[34px] leading-[1.1] font-semibold tracking-[-0.04em] text-balance sm:text-[48px]">
                Most of a recruiter&rsquo;s week isn&rsquo;t recruiting.{" "}
                <Accent>Recruta takes the admin.</Accent>
              </h2>
            </Reveal>
          </div>
          <dl
            className={cn(
              "relative grid grid-cols-2 gap-px border-t bg-[#EBEBEB] lg:grid-cols-4",
              rule,
            )}
          >
            {facts.map((fact, index) => (
              <div key={fact.label} className="bg-white p-6 sm:p-8">
                <Reveal delay={index * 80}>
                  <dd className="text-[34px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                    {fact.value}
                  </dd>
                  <dt className="mt-3 text-sm text-muted-foreground">
                    {fact.label}
                  </dt>
                </Reveal>
              </div>
            ))}
          </dl>
        </Frame>

        <HatchBand />

        <Frame id="features" label="Features">
          <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
            <div>
              <TypedEyebrow text="platform" />
              <Reveal>
                <h2 className="mt-4 text-[34px] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-[44px]">
                  Everything an agency needs to <Accent>place faster</Accent>
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="mt-5 max-w-xl text-[17px] leading-8 text-muted-foreground">
                  Publish a <InlineIcon icon={CaseRoundIcon} /> job, collect{" "}
                  <InlineIcon icon={InboxIcon} /> applications in one inbox, and
                  send <InlineIcon icon={Buildings2Icon} /> clients a shortlist
                  they can act on.
                </p>
              </Reveal>
            </div>
            <Reveal delay={160} className="flex gap-3 lg:justify-end">
              <a href="#faq" className={secondaryCta}>
                Read the FAQ
              </a>
              <Link href="/signup" className={primaryCta}>
                Create your workspace
              </Link>
            </Reveal>
          </div>
          <div
            className={cn(
              "grid gap-px border-t bg-[#EBEBEB] md:grid-cols-2",
              rule,
            )}
          >
            <FeatureCell
              title="Screening you can check"
              rest="against every requirement"
              body="Each CV is read against the job. Findings quote the line they came from; gaps are flagged, never used to reject."
              mock={<EvidenceMock />}
            />
            <FeatureCell
              title="Every applicant counted"
              rest="and every review tracked"
              body="See what came in and what your team has reviewed, job by job, week by week."
              mock={<PipelineChartMock />}
            />
            <FeatureCell
              title="Apply from any phone"
              rest="with no account"
              body="A short, fast form that works on a weak connection. CVs go straight to the right job."
              mock={<PhoneMock />}
              centered
            />
            <FeatureCell
              title="Every client in one workspace"
              rest="with their own jobs"
              body="Add a client while you open their job, and keep their roles, requests and contacts together."
              mock={<ClientsMock />}
            />
            <FeatureCell
              title="Shortlists clients act on"
              rest="without the email thread"
              body="Share a summary and optionally the CV. Hiring managers see only that job and reply with structured feedback."
              mock={<FeedbackMock />}
              wide
            />
          </div>
        </Frame>

        <Frame label="The value">
          <div className="grid lg:grid-cols-2">
            <div className={cn("p-8 sm:p-12 lg:border-r", rule)}>
              <TypedEyebrow text="the value" />
              <Reveal>
                <h2 className="mt-4 text-[34px] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-[44px]">
                  One extra placement{" "}
                  <span className="text-muted-foreground">
                    pays for a lot of software.
                  </span>
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <p className="mt-5 max-w-md text-[17px] leading-7 text-muted-foreground">
                  Agencies earn when they place someone. Every hour Recruta
                  takes off admin goes back into sourcing, client calls and
                  faster shortlists.
                </p>
              </Reveal>
            </div>
            <div className="mk-dots flex items-center justify-center p-8 sm:p-12">
              <Reveal className="w-full max-w-sm">
                <figure className="rounded-[14px] border border-[#E7E7EA] bg-white p-6 shadow-[0_18px_40px_-24px_rgb(43_41_146_/_0.35)] sm:p-8">
                  <figcaption className="font-mono text-[11px] text-[#5C5AED]">
                    example placement fee
                  </figcaption>
                  <dl className="mt-5 flex flex-col gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Annual salary</dt>
                      <dd className="font-mono tabular-nums">₦9,600,000</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Agency fee</dt>
                      <dd className="font-mono tabular-nums">× 20%</dd>
                    </div>
                  </dl>
                  <p className="mt-6 text-[44px] leading-none font-semibold tracking-[-0.05em] tabular-nums">
                    ₦1,920,000
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    from one more filled role
                  </p>
                </figure>
              </Reveal>
            </div>
          </div>
        </Frame>

        <HatchBand />

        <Frame id="trust" label="Trust">
          <div className="p-8 sm:p-12">
            <TypedEyebrow text="trust" />
            <Reveal>
              <h2 className="mt-4 text-[34px] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-[44px]">
                Automation prepares.{" "}
                <span className="text-muted-foreground">People decide.</span>
              </h2>
            </Reveal>
          </div>
          <ul
            className={cn(
              "grid gap-px border-t bg-[#EBEBEB] sm:grid-cols-2 lg:grid-cols-4",
              rule,
            )}
          >
            {safeguards.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="relative bg-white">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgb(92_90_237_/_0.07),transparent_55%)]"
                  />
                  <Reveal delay={index * 70} className="relative p-7">
                    <Icon
                      aria-hidden="true"
                      size={22}
                      className="text-[#5C5AED]"
                    />
                    <h3 className="mt-6 text-[15px] font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.body}
                    </p>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </Frame>

        <Frame id="faq" label="Questions">
          <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className={cn("p-8 sm:p-12 lg:border-r", rule)}>
              <TypedEyebrow text="faq" />
              <h2 className="mt-4 text-[34px] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-[44px]">
                Questions
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                What agency owners ask before moving their jobs to Recruta.
              </p>
            </div>
            <div className="divide-y divide-[#EBEBEB]">
              {faqs.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-8 py-5 text-[15px] font-medium outline-none hover:bg-[#FAFAFB] focus-visible:bg-[#F7F7FE] sm:px-10 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </summary>
                  <p className="max-w-xl px-8 pb-6 text-[15px] leading-7 text-muted-foreground sm:px-10">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Frame>

        <Frame label="Get started" className="p-3 sm:p-4">
          <div className="relative grid overflow-hidden rounded-[6px] bg-[#2B2992] text-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255_/_0.12)_1px,transparent_1.2px)] [background-size:10px_10px] [mask-image:radial-gradient(ellipse_70%_80%_at_80%_60%,#000,transparent)]"
            />
            <div className="relative p-8 sm:p-12">
              <h2 className="text-[30px] leading-tight font-semibold tracking-[-0.035em] sm:text-[38px]">
                Post your first job today
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-7 text-white/75">
                Create a workspace, add a client and publish a job candidates
                can apply to from their phone.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="mk-press inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-[#2B2992] outline-none hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/50"
                >
                  Create your workspace
                  <ArrowRightIcon aria-hidden="true" size={16} />
                </Link>
                <Link
                  href="/login"
                  className="mk-press inline-flex h-11 items-center rounded-lg border border-white/30 px-5 text-sm font-medium outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/50"
                >
                  Sign in
                </Link>
              </div>
            </div>
            <div className="relative hidden items-end justify-end overflow-hidden pt-10 pl-10 lg:flex">
              <div className="translate-x-10 translate-y-6">
                <PipelineChartMock />
              </div>
            </div>
          </div>
        </Frame>
      </main>

      <footer className={cn("border-t", rule)}>
        <div
          className={cn(
            "mx-auto grid max-w-[1240px] gap-10 border-x px-8 py-12 sm:grid-cols-2 sm:px-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]",
            rule,
          )}
        >
          <div>
            <RecrutaLogo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Recruitment software for agencies that hire for other companies.
            </p>
          </div>
          {[
            ["Product", nav.slice(0, 3)],
            ["Help", [["FAQ", "#faq"]]],
            [
              "Account",
              [
                ["Create workspace", "/signup"],
                ["Sign in", "/login"],
              ],
            ],
          ].map(([heading, links]) => (
            <div key={heading as string}>
              <p className="text-sm font-semibold">{heading as string}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
                {(links as string[][]).map(([label, href]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={cn("border-t", rule)}>
          <div
            className={cn(
              "mx-auto flex max-w-[1240px] items-center justify-between gap-4 border-x px-8 py-5 text-xs text-muted-foreground sm:px-12",
              rule,
            )}
          >
            <span>© 2026 Evenkore</span>
            <span>Recruta</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InlineIcon({ icon: Icon }: { icon: typeof CaseRoundIcon }) {
  return (
    <span
      aria-hidden="true"
      className="mx-0.5 inline-grid size-6 translate-y-1 place-items-center rounded-md border border-[#E4E4E7] bg-white text-[#5C5AED] shadow-[0_1px_2px_rgb(17_17_17_/_0.06)]"
    >
      <Icon size={13} />
    </span>
  );
}

function FeatureCell({
  title,
  rest,
  body,
  mock,
  centered = false,
  wide = false,
}: {
  title: string;
  rest: string;
  body: string;
  mock: React.ReactNode;
  centered?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-white",
        wide && "md:col-span-2 md:grid md:grid-cols-2",
      )}
    >
      <Reveal className="p-8 sm:p-10">
        <h3 className="text-[22px] leading-snug font-semibold tracking-[-0.025em]">
          {title} <span className="block text-muted-foreground">{rest}</span>
        </h3>
        <p className="mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">
          {body}
        </p>
      </Reveal>
      <Reveal
        delay={120}
        className={cn(
          "mk-dots relative mt-auto flex min-h-[260px] overflow-hidden pt-8",
          centered ? "justify-center" : "pl-8 sm:pl-10",
          wide && "md:mt-0 md:items-center md:pt-0",
        )}
      >
        <div
          className={cn(
            "shrink-0",
            centered ? "translate-y-6" : "translate-y-4",
            wide && "md:translate-y-0",
          )}
        >
          {mock}
        </div>
      </Reveal>
    </div>
  );
}
