import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderApp } from "../test/renderApp.tsx";

test("renders the logo as a decorative mark plus the wordmark", () => {
  renderApp({ tasks: [] });

  const headings = screen.getAllByRole("heading", { level: 1, name: "Tickd" });

  expect(headings).toHaveLength(2);
  for (const heading of headings) {
    // The mark is decorative, so the accessible name is exactly the wordmark.
    expect(heading.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(heading.textContent).toBe("Tickd");
  }
});
