import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import SearchBar from "@/components/SearchBar";

describe("SearchBar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("searches once typing pauses", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "kath" } });
    fireEvent.change(input, { target: { value: "kathmandu" } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("kathmandu");
  });

  it("shows a value changed elsewhere, such as a filter reset", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchBar value="kathmandu" onChange={onChange} />);
    rerender(<SearchBar value="" onChange={onChange} />);

    expect(screen.getByRole("textbox")).toHaveValue("");
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).not.toHaveBeenCalled();
  });
});
