import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

function task(id: string, completed: boolean): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id) };
}

function sidebarNav() {
  const nav = screen
    .getAllByRole("navigation", { name: "Filter tasks" })
    .find((candidate) => within(candidate).queryByRole("link", { name: /^All \d+$/ }));

  expect(nav).toBeDefined();
  return within(nav as HTMLElement);
}

describe("FilterNav", () => {
  test.each([
    ["/", /^All(?: \d+)?$/],
    ["/active", /^Active(?: \d+)?$/],
    ["/completed", /^Completed(?: \d+)?$/],
  ])("marks only the current filter on %s", (path, currentName) => {
    renderApp({ path, tasks: [] });

    for (const nav of screen.getAllByRole("navigation", { name: "Filter tasks" })) {
      const links = within(nav).getAllByRole("link");
      expect(links.filter((link) => link.getAttribute("aria-current") === "page")).toHaveLength(1);
      expect(within(nav).getByRole("link", { name: currentName })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  });

  test("shows all, active, and completed counts in the sidebar", () => {
    renderApp({
      tasks: [
        task("1", false),
        task("2", true),
        task("3", false),
        task("4", true),
        task("5", false),
        task("6", false),
      ],
    });

    const nav = sidebarNav();
    expect(nav.getByRole("link", { name: "All 6" })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Active 4" })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Completed 2" })).toBeInTheDocument();
  });
});
