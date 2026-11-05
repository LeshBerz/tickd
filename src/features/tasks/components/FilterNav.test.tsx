import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

function task(id: string, completed: boolean): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id), notes: "" };
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

  test("shows decorative 1, 2, and 3 hints on the sidebar filters", () => {
    renderApp({ tasks: [] });
    const nav = filterNav("sidebar");

    for (const [name, key] of [
      [/^All \d+$/, "1"],
      [/^Active \d+$/, "2"],
      [/^Completed \d+$/, "3"],
    ] as const) {
      const link = within(nav).getByRole("link", { name });
      const kbds = link.querySelectorAll("kbd");
      expect(kbds).toHaveLength(1);
      const kbd = kbds[0];
      if (!(kbd instanceof HTMLElement)) {
        throw new Error(`shortcut hint ${key} is missing`);
      }
      expect(kbd.textContent).toBe(key);
      expect(kbd).toHaveAttribute("aria-hidden", "true");
      expect(sidebarHintIsHoverReveal(kbd, link)).toBe(true);
    }
  });

  test("does not show number hints on the filter bar", () => {
    renderApp({ tasks: [] });

    expect(filterNav("bar").querySelector("kbd")).toBeNull();
  });
});

function filterNav(variant: "sidebar" | "bar"): HTMLElement {
  const name = variant === "sidebar" ? /^All \d+$/ : /^All$/;
  const nav = screen
    .getAllByRole("navigation", { name: "Filter tasks" })
    .find((candidate) => within(candidate).queryByRole("link", { name }));
  if (nav === undefined) {
    throw new Error(`${variant} filter nav is missing`);
  }
  return nav;
}

function sidebarHintIsHoverReveal(element: Element, root: Element): boolean {
  const tokens: string[] = [];
  let current: Element | null = element;
  while (current !== null) {
    tokens.push(
      ...(current.getAttribute("class") ?? "").split(/\s+/).filter((token) => token !== ""),
    );
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }
  return (
    tokens.includes("hidden") &&
    tokens.some((token) => token.includes("fine-pointer:")) &&
    tokens.some((token) => token.includes("group-hover:")) &&
    tokens.some((token) => token.includes("group-focus"))
  );
}
