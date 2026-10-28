// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ActivityChart } from "./activity-chart";

afterEach(cleanup);

it("reveals the exact activity count and time window on hover and keyboard focus", () => {
  render(
    <ActivityChart
      values={[2, 0]}
      periods={[
        {
          since: "2026-10-01T00:00:00Z",
          until: "2026-10-08T00:00:00Z",
        },
        {
          since: "2026-10-08T00:00:00Z",
          until: "2026-10-15T00:00:00Z",
        },
      ]}
      range="all"
      activityLabel="Applications submitted"
    />,
  );
  const first = screen.getByRole("button", {
    name: /2 Applications submitted, Oct 1–Oct 8/,
  });
  fireEvent.pointerEnter(first);
  expect(screen.getByRole("status").textContent).toContain(
    "2 · Applications submitted",
  );
  fireEvent.pointerLeave(first.parentElement!.parentElement!);
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.focus(
    screen.getByRole("button", { name: /0 Applications submitted/ }),
  );
  expect(screen.getByRole("status").textContent).toContain(
    "0 · Applications submitted",
  );
  fireEvent.keyDown(first, { key: "ArrowRight" });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: /0 Applications submitted/ }),
  );
});
