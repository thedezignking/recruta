import "server-only";

/** RFC 5545 text escaping. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

/** Fold lines at 75 octets, as calendar clients expect. */
function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function stamp(value: string | Date) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * A single-event calendar invite. The UID is stable per interview and the
 * sequence grows with each change, so a reschedule or cancellation updates
 * the event already in the candidate's calendar.
 */
export function interviewInvite(input: {
  interviewId: string;
  updatedAt: string;
  startsAt: string;
  endsAt: string;
  title: string;
  description: string;
  location?: string | null;
  organizerName: string;
  organizerEmail: string;
  attendeeEmail: string;
  cancelled?: boolean;
}) {
  const method = input.cancelled ? "CANCEL" : "REQUEST";
  const sequence = Math.max(
    0,
    Math.floor(
      (new Date(input.updatedAt).getTime() - Date.UTC(2026, 0, 1)) / 1000,
    ),
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recruta//Interviews//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${input.interviewId}@recruta`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    ...(input.location ? [`LOCATION:${escapeText(input.location)}`] : []),
    `ORGANIZER;CN=${escapeText(input.organizerName)}:mailto:${input.organizerEmail}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${input.attendeeEmail}`,
    `STATUS:${input.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    method,
    content: `${lines.map(fold).join("\r\n")}\r\n`,
  };
}
