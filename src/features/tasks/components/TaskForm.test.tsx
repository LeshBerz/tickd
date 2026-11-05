import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";

describe("TaskForm", () => {
  test("adds a task with the Add button", async () => {
    const { user } = renderApp({ tasks: [] });

    await user.type(screen.getByRole("textbox", { name: "Add a task" }), "Write tests");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  test("adds a task with Enter", async () => {
    const { user } = renderApp({ tasks: [] });

    await user.type(screen.getByRole("textbox", { name: "Add a task" }), "Ship feature{Enter}");

    expect(screen.getByText("Ship feature")).toBeInTheDocument();
  });

  test("trims a task title before adding it", async () => {
    const { user } = renderApp({ tasks: [] });

    await user.type(screen.getByRole("textbox", { name: "Add a task" }), "  Review changes  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Review changes")).toBeInTheDocument();
    expect(screen.queryByText("  Review changes  ")).not.toBeInTheDocument();
  });

  test.each([
    ["empty", ""],
    ["whitespace-only", "   "],
  ])("rejects an %s task and preserves the input", async (_case, value) => {
    const { store, user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    if (value) await user.type(input, value);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Task can't be empty")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue(value);
    expect(input).toHaveFocus();
    expect(store.getState().tasks.items).toHaveLength(0);
  });

  test("clears the validation error when the input is edited", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(input, "W");

    expect(screen.queryByText("Task can't be empty")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  test("caps the add field at 200 characters", () => {
    renderApp({ tasks: [] });

    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveAttribute("maxLength", "200");
  });

  test("shows a length counter after typing and hides it when the field is empty", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    expect(screen.queryByText(/\/ 200$/)).not.toBeInTheDocument();

    await user.type(input, "ab");

    const counter = screen.getByText("2 / 200");
    expect(counter).toHaveClass("text-text-muted", "text-sm");
    expect(counter).not.toHaveClass("text-danger");
  });

  test("hides the length counter when the field is cleared", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.type(input, "a");
    expect(screen.getByText("1 / 200")).toBeInTheDocument();

    await user.clear(input);

    expect(screen.queryByText("1 / 200")).not.toBeInTheDocument();
    expect(screen.queryByText("0 / 200")).not.toBeInTheDocument();
  });

  test("marks the counter when the title reaches 200 characters", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(input);
    await user.paste("a".repeat(200));

    expect(input).toHaveValue("a".repeat(200));
    expect(screen.getByText("200 / 200")).toHaveClass("text-danger");
  });

  test("turns a multi-line paste into a single line", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(input);
    await user.paste("a\n\nb");

    expect(input).toHaveValue("a b");
  });

  test("inserts a normalized paste at the caret", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.type(input, "ac");
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Add field is not an input");
    }
    input.setSelectionRange(1, 1);
    await user.paste("\n");

    expect(input).toHaveValue("a c");
  });

  test("replaces the selection with a normalized paste", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.type(input, "abcd");
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Add field is not an input");
    }
    input.setSelectionRange(1, 3);
    await user.paste("X\nY");

    expect(input).toHaveValue("aX Yd");
  });

  test("does not let a paste exceed 200 characters", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(input);
    await user.paste("b".repeat(250));

    expect(input).toHaveValue("b".repeat(200));
    expect(screen.getByText("200 / 200")).toBeInTheDocument();
  });

  test("clamps a paste that would push existing text past 200 characters", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(input);
    await user.paste("a".repeat(150));
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Add field is not an input");
    }
    input.setSelectionRange(150, 150);
    await user.paste("b".repeat(100));

    expect(input).toHaveValue(`${"a".repeat(150)}${"b".repeat(50)}`);
  });

  test("keeps double spaces that were typed", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.type(input, "a  b");

    expect(input).toHaveValue("a  b");
  });

  test("rejects a paste that normalizes to whitespace", async () => {
    const { store, user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(input);
    await user.paste("\n\n  \t");

    expect(input).toHaveValue(" ");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Task can't be empty")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(store.getState().tasks.items).toHaveLength(0);
  });

  test("clears the empty-task error when text is pasted", async () => {
    const { user } = renderApp({ tasks: [] });
    const input = screen.getByRole("textbox", { name: "Add a task" });

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(input);
    await user.paste("a\nb");

    expect(screen.queryByText("Task can't be empty")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue("a b");
  });

  test("persists an added task and restores it in a fresh store", async () => {
    const firstRender = renderApp({ tasks: [] });

    await firstRender.user.type(
      screen.getByRole("textbox", { name: "Add a task" }),
      "Persistent task",
    );
    await firstRender.user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("tickd:tasks") ?? "null")).toMatchObject({
        version: 2,
        tasks: [{ title: "Persistent task", completed: false }],
      });
    });

    firstRender.unmount();
    renderApp();

    expect(screen.getByText("Persistent task")).toBeInTheDocument();
  });

  test("shows a decorative N hint beside Add when keyboard hints are on", () => {
    renderApp({
      tasks: [{ id: "1", title: "Existing", completed: false, createdAt: 1, notes: "" }],
    });

    const form = screen.getByRole("button", { name: "Add" }).closest("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("add form is missing");
    }
    const kbd = form.querySelector("kbd");
    if (!(kbd instanceof HTMLElement)) {
      throw new Error("add shortcut hint is missing");
    }
    const addButton = screen.getByRole("button", { name: "Add" });

    expect(kbd.textContent).toBe("N");
    expect(kbd).toHaveAttribute("aria-hidden", "true");
    expect(kbd.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(elementHidesUntilFinePointer(kbd, form)).toBe(true);
  });
});

function elementHidesUntilFinePointer(element: Element, root: Element): boolean {
  let current: Element | null = element;
  while (current !== null) {
    const tokens = (current.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((token) => token !== "");
    const shownOnFinePointer = tokens.some((token) => {
      if (token.includes("group-hover:") || token.includes("group-focus")) {
        return false;
      }
      const marker = "fine-pointer:";
      const index = token.lastIndexOf(marker);
      if (index === -1) {
        return false;
      }
      const variant = token.slice(index + marker.length);
      return variant !== "" && !variant.startsWith("hidden");
    });
    if (tokens.includes("hidden") && shownOnFinePointer) {
      return true;
    }
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }
  return false;
}
