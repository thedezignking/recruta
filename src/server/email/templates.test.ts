import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { candidateEmail, textToEmailHtml } = await import("./templates");

describe("textToEmailHtml", () => {
  it("renders paragraphs, subheadings and lists from plain text", () => {
    const html = textToEmailHtml(
      "Hi Ada,\n\nApplication details\n\n* Position: Analyst\n* Company: Acme\n\nBest regards,\nEvenkore Recruitment Team",
    );
    expect(html).toContain(">Hi Ada,</p>");
    expect(html).toContain("font-weight:600");
    expect(html).toContain('<li style="margin:0 0 6px">Position: Analyst</li>');
    expect(html).toContain("Best regards,<br>Evenkore Recruitment Team");
  });

  it("escapes candidate-controlled text", () => {
    expect(textToEmailHtml("Hi <script>,")).toContain("Hi &lt;script&gt;,");
  });

  it("keeps Recruta in the footer of candidate email", () => {
    expect(candidateEmail({ preview: "x", body: "Hi," })).toContain(
      "Application managed through Recruta.",
    );
  });
});
