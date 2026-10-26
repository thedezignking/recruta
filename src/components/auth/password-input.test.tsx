// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./password-input";
import { TooltipProvider } from "@/components/ui/tooltip";

afterEach(cleanup);

describe("password visibility", () => {
  it("reveals and hides the existing password without submitting or changing form data", () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <TooltipProvider>
        <form aria-label="Sign in" onSubmit={submit}>
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
          />
        </form>
      </TooltipProvider>,
    );
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Example-password-123" } });
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("Example-password-123");
    expect(input.autocomplete).toBe("current-password");
    expect(
      new FormData(screen.getByRole("form") as HTMLFormElement).get("password"),
    ).toBe("Example-password-123");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
    expect(submit).not.toHaveBeenCalled();
  });

  it("disables the visibility control with its input", () => {
    render(
      <TooltipProvider>
        <PasswordInput aria-label="Password" disabled />
      </TooltipProvider>,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Show password",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
