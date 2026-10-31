import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Recruta — Make more placements. Spend less time on admin. A Recruta workspace showing jobs and applications.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = join(process.cwd(), "node_modules/geist/dist/fonts");
const [semibold, regular, mono] = await Promise.all([
  readFile(join(fonts, "geist-sans/Geist-SemiBold.ttf")),
  readFile(join(fonts, "geist-sans/Geist-Regular.ttf")),
  readFile(join(fonts, "geist-mono/GeistMono-Regular.ttf")),
]);

const ink = "#17182B";
const muted = "#686978";
const rule = "#EBEBEB";
const violet = "#5C5AED";
const peach = "#F2A57F";
const railLeft = 72;
const railRight = 1128;

// The landing page's product-tour bar field, made deterministic.
const bars = Array.from({ length: 84 }, (_, i) => {
  const wave = Math.sin(i * 0.22) * 0.22 + Math.sin(i * 0.85) * 0.12;
  return Math.max(0.45, Math.min(1, 0.74 + wave + (i % 7) * 0.025));
});
const tints = ["#C9C8FA", "#A9A7F6", "#8E8CF3", "#7472F0", "#5C5AED"];

const metrics = [
  { label: "Active jobs", value: "14", delta: "+3 vs last 30 days" },
  { label: "Applications", value: "386", delta: "+52 vs last 30 days" },
  { label: "In review", value: "61", delta: "+9 vs last 30 days" },
  { label: "Shortlisted", value: "23", delta: "+6 vs last 30 days" },
];

const jobs = [
  { title: "Area Sales Manager", org: "Brightline Foods", progress: 72 },
  { title: "Staff Nurse (ICU)", org: "Lakeside Hospital", progress: 45 },
  { title: "Dispatch Rider", org: "Swiftly Logistics", progress: 30 },
];

function Mark({ size: px }: { size: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="10" fill="#272A32" />
      <path
        fill="#F4F7F2"
        fillRule="evenodd"
        d="M10 12a2 2 0 0 1 2-2h12v5h-9v9h-5V12Zm20 16a2 2 0 0 1-2 2H16v-5h9v-9h5v12Z"
      />
    </svg>
  );
}

function Line(style: React.CSSProperties) {
  return <div style={{ position: "absolute", background: rule, ...style }} />;
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#FFFFFF",
          fontFamily: "Geist",
          color: ink,
        }}
      >
        {/* Bar field under the product window */}
        <div
          style={{
            position: "absolute",
            left: railLeft + 3,
            width: railRight - railLeft - 6,
            bottom: 0,
            height: 300,
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          {bars.map((height, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column-reverse",
                gap: 2,
                flex: 1,
                height: `${height * 100}%`,
              }}
            >
              {tints.map((tint, t) => (
                <div
                  key={tint}
                  style={{
                    flex: 1,
                    borderRadius: 1.5,
                    background: tints[tints.length - 1 - t],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 160,
            width: 1200,
            height: 140,
            backgroundImage:
              "linear-gradient(to bottom, #FFFFFF, rgba(255,255,255,0))",
          }}
        />

        {/* Hatch band and frame */}
        <div
          style={{
            position: "absolute",
            left: railLeft,
            top: 0,
            width: railRight - railLeft,
            height: 18,
            backgroundImage:
              "repeating-linear-gradient(-45deg, #E6E6E6 0px, #E6E6E6 1px, transparent 1px, transparent 7px)",
          }}
        />
        <Line left={0} top={18} width={1200} height={1} />
        <Line left={0} top={64} width={1200} height={1} />
        <Line left={railLeft} top={0} width={1} height={630} />
        <Line left={railRight} top={0} width={1} height={630} />

        {/* Nav */}
        <div
          style={{
            position: "absolute",
            left: railLeft + 24,
            right: 1200 - railRight + 24,
            top: 18,
            height: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mark size={26} />
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.035em",
              }}
            >
              Recruta
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 30,
              padding: "0 14px",
              borderRadius: 7,
              background: violet,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Create workspace
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 1200,
            top: 92,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 58,
              fontWeight: 600,
              letterSpacing: "-0.045em",
              lineHeight: 1.06,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div style={{ display: "flex" }}>Make more&nbsp;</div>
              <div
                style={{
                  display: "flex",
                  color: violet,
                  borderBottom: "4px dashed rgba(92,90,237,0.5)",
                  paddingBottom: 2,
                }}
              >
                placements
              </div>
            </div>
            <div style={{ display: "flex", color: "#8A8B99" }}>
              Spend less time on admin
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontFamily: "Geist Mono",
              fontSize: 17,
              color: muted,
            }}
          >
            post → screen → shortlist → place
          </div>
        </div>

        {/* Product window */}
        <div
          style={{
            position: "absolute",
            left: 180,
            right: 180,
            top: 316,
            bottom: -40,
            display: "flex",
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #E4E4E7",
            boxShadow: "0 30px 80px -30px rgba(43,41,146,0.45)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 150,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: 14,
              background: "#F8F8F8",
              fontSize: 13,
              color: muted,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 8,
                color: ink,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: violet,
                  color: "#FFFFFF",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                N
              </div>
              Northbridge
            </div>
            {["Overview", "Jobs", "Applications", "Organizations"].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    padding: "6px 8px",
                    borderRadius: 6,
                    ...(item === "Overview"
                      ? {
                          background: "#FFFFFF",
                          color: ink,
                          fontWeight: 600,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }
                      : {}),
                  }}
                >
                  {item}
                </div>
              ),
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                height: 40,
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                borderBottom: "1px solid #EFEFEF",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Overview
            </div>
            <div style={{ display: "flex", padding: 18 }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  borderRadius: 10,
                  border: "1px solid #EFEFEF",
                }}
              >
                {metrics.map((metric, i) => (
                  <div
                    key={metric.label}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      padding: 14,
                      borderLeft: i > 0 ? "1px solid #EFEFEF" : "none",
                    }}
                  >
                    <div
                      style={{ display: "flex", fontSize: 12, color: muted }}
                    >
                      {metric.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginTop: 6,
                        fontSize: 26,
                        fontWeight: 600,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {metric.value}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginTop: 4,
                        fontSize: 11,
                        color: "#15803D",
                      }}
                    >
                      {metric.delta}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 3,
                        height: 34,
                        marginTop: 12,
                      }}
                    >
                      {Array.from({ length: 12 }, (_, k) => (
                        <div
                          key={k}
                          style={{
                            flex: 1,
                            borderRadius: 2,
                            height: `${30 + ((k * 37 + i * 13) % 70)}%`,
                            background: i % 2 ? peach : "#7D7BF0",
                            opacity: 0.35 + (k / 11) * 0.65,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                margin: "0 18px",
                borderRadius: 10,
                border: "1px solid #EFEFEF",
                fontSize: 13,
              }}
            >
              {jobs.map((job, i) => (
                <div
                  key={job.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "10px 14px",
                    borderTop: i > 0 ? "1px solid #F3F3F3" : "none",
                  }}
                >
                  <div style={{ display: "flex", width: 190, fontWeight: 600 }}>
                    {job.title}
                  </div>
                  <div style={{ display: "flex", width: 150, color: muted }}>
                    {job.org}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      height: 6,
                      borderRadius: 99,
                      background: "#EFEFEF",
                    }}
                  >
                    <div
                      style={{
                        width: `${job.progress}%`,
                        borderRadius: 99,
                        background: violet,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      padding: "2px 8px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#15803D",
                      background: "rgba(21,128,61,0.1)",
                    }}
                  >
                    Open
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
