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

  test("persists an added task and restores it in a fresh store", async () => {
    const firstRender = renderApp({ tasks: [] });

    await firstRender.user.type(
      screen.getByRole("textbox", { name: "Add a task" }),
      "Persistent task",
    );
    await firstRender.user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("tickd:tasks") ?? "null")).toMatchObject({
        version: 1,
        tasks: [{ title: "Persistent task", completed: false }],
      });
    });

    firstRender.unmount();
    renderApp();

    expect(screen.getByText("Persistent task")).toBeInTheDocument();
  });
});
