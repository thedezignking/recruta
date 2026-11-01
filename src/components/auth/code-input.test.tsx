// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CodeInput } from "./code-input";

afterEach(cleanup);

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <CodeInput value={value} onChange={setValue} onComplete={onComplete} />
  );
}

const boxes = () => screen.getAllByRole("textbox") as HTMLInputElement[];

it("moves forward as digits are typed and submits when full", () => {
  const onComplete = vi.fn();
  render(<Harness onComplete={onComplete} />);
  "123456"
    .split("")
    .forEach((digit, index) =>
      fireEvent.change(boxes()[index], { target: { value: digit } }),
    );
  expect(
    boxes()
      .map((box) => box.value)
      .join(""),
  ).toBe("123456");
  expect(onComplete).toHaveBeenCalledWith("123456");
});

it("fills every box from a pasted code, ignoring spaces and dashes", () => {
  const onComplete = vi.fn();
  render(<Harness onComplete={onComplete} />);
  fireEvent.paste(boxes()[0], {
    clipboardData: { getData: () => "123-456" },
  });
  expect(
    boxes()
      .map((box) => box.value)
      .join(""),
  ).toBe("123456");
  expect(onComplete).toHaveBeenCalledWith("123456");
});

it("ignores letters and steps back on Backspace", () => {
  const onComplete = vi.fn();
  render(<Harness onComplete={onComplete} />);
  fireEvent.change(boxes()[0], { target: { value: "a" } });
  expect(boxes()[0].value).toBe("");
  fireEvent.change(boxes()[0], { target: { value: "7" } });
  fireEvent.keyDown(boxes()[1], { key: "Backspace" });
  expect(boxes()[0].value).toBe("");
  expect(onComplete).not.toHaveBeenCalled();
});

it("offers the phone's suggested code on the first box", () => {
  render(<Harness onComplete={vi.fn()} />);
  expect(boxes()[0].getAttribute("autocomplete")).toBe("one-time-code");
  expect(boxes()[1].getAttribute("autocomplete")).toBe("off");
});
