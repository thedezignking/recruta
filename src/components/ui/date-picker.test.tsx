// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker";

afterEach(cleanup);

it("selects a deadline through the calendar", async () => {
  const onChange = vi.fn();
  render(
    <DatePicker
      id="deadline"
      value="2099-06-15"
      minDate={new Date(2099, 5, 1)}
      onChange={onChange}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /jun 15, 2099/i }));
  fireEvent.click(
    await screen.findByRole("button", { name: /june 20, 2099/i }),
  );
  expect(onChange).toHaveBeenCalledWith("2099-06-20");
});
