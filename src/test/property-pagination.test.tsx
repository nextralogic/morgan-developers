import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PropertyPagination from "@/components/PropertyPagination";

describe("PropertyPagination", () => {
  it("links to real page URLs when given getPageHref", () => {
    render(<PropertyPagination page={1} totalPages={3} onPageChange={() => {}} getPageHref={(p) => `/properties?page=${p}`} />);
    expect(screen.getByText("2").closest("a")).toHaveAttribute("href", "/properties?page=2");
  });

  it("works without getPageHref, as on the admin lists", () => {
    const onPageChange = vi.fn();
    render(<PropertyPagination page={1} totalPages={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("3"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
