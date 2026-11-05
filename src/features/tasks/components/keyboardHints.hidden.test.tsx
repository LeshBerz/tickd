import { screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";

vi.mock("../../preferences/selectShowKeyboardHints.ts", () => ({
  selectShowKeyboardHints: () => false,
}));

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

test("hides Press N, the add hint, and filter numbers when keyboard hints are off", () => {
  renderApp({ tasks: [] });

  expect(screen.queryByText("Press N to add a task.")).not.toBeInTheDocument();
  const coarse = screen.getByText("Add your first task above.");
  expect(coarse).not.toHaveClass("fine-pointer:hidden");

  const form = screen.getByRole("button", { name: "Add" }).closest("form");
  expect(form?.querySelector("kbd")).toBeNull();
  expect(filterNav("sidebar").querySelector("kbd")).toBeNull();
  expect(filterNav("bar").querySelector("kbd")).toBeNull();
});

test("hides Enter and Esc hints while editing when keyboard hints are off", async () => {
  const { user } = renderApp({
    tasks: [{ id: "1", title: "Task 1", completed: false, createdAt: 1 }],
  });

  await user.dblClick(screen.getByRole("button", { name: "Task 1" }));
  const editor = await screen.findByRole("textbox", { name: "Edit task" });
  const form = editor.closest("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("edit form is missing");
  }

  expect(form.querySelector("kbd")).toBeNull();
  expect(form).not.toHaveTextContent("to save");
  expect(form).not.toHaveTextContent("to cancel");
});
