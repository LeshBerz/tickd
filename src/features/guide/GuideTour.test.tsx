import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../test/renderApp.tsx";
import type { Task } from "../tasks/schema.ts";
import { resolveGuideSteps } from "./resolve.ts";

function task(id: string, completed = false): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id), notes: "" };
}

function dialog(): HTMLElement {
  return screen.getByRole("dialog");
}

describe("first visit", () => {
  test("opens on the welcome step for a user who has never seen the tour", async () => {
    renderApp({ tasks: [], guideCompleted: false });

    const tour = await screen.findByRole("dialog");
    expect(within(tour).getByText("Step 1 of 5")).toBeInTheDocument();
    expect(within(tour).getByRole("heading", { name: "Welcome to Tickd" })).toBeInTheDocument();
    expect(within(tour).getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  test("stays closed when the tour was already completed", () => {
    renderApp({ tasks: [], guideCompleted: true });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("does not reopen after it is skipped, even when tasks change", async () => {
    const { store, user } = renderApp({ tasks: [], guideCompleted: false });

    await screen.findByRole("dialog");
    await user.click(within(dialog()).getByRole("button", { name: "Skip" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Add a task" }), "New task");
    await user.keyboard("{Enter}");

    expect(store.getState().preferences.guideCompleted).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^New task$/ })).toBeInTheDocument();
  });

  test("persists completion under the preferences key only", async () => {
    const { user } = renderApp({ tasks: [], guideCompleted: false });

    await screen.findByRole("dialog");
    await user.click(within(dialog()).getByRole("button", { name: "Skip" }));

    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      version: 2,
      guideCompleted: true,
    });
    expect(localStorage.getItem("tickd:tasks")).toBeNull();
  });
});

describe("progression", () => {
  test("walks through five steps on an empty list and finishes with Done", async () => {
    const { store, user } = renderApp({ tasks: [], guideCompleted: false });

    await screen.findByRole("dialog");
    expect(within(dialog()).getByText("Step 1 of 5")).toBeInTheDocument();
    expect(within(dialog()).getByRole("heading", { name: "Welcome to Tickd" })).toBeInTheDocument();

    await user.click(within(dialog()).getByRole("button", { name: "Next" }));
    expect(within(dialog()).getByText("Step 2 of 5")).toBeInTheDocument();
    expect(within(dialog()).getByRole("heading", { name: "Switch between views" })).toBeVisible();

    await user.click(within(dialog()).getByRole("button", { name: "Next" }));
    expect(within(dialog()).getByRole("heading", { name: "Add a task" })).toBeVisible();

    await user.click(within(dialog()).getByRole("button", { name: "Next" }));
    expect(within(dialog()).getByRole("heading", { name: "Start with examples" })).toBeVisible();

    await user.click(within(dialog()).getByRole("button", { name: "Next" }));
    const last = dialog();
    expect(within(last).getByText("Step 5 of 5")).toBeInTheDocument();
    expect(within(last).getByRole("heading", { name: "Make it yours" })).toBeVisible();
    expect(within(last).queryByRole("button", { name: "Next" })).not.toBeInTheDocument();

    await user.click(within(last).getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(store.getState().preferences.guideCompleted).toBe(true);
    expect(store.getState().guide.open).toBe(false);
  });

  test("describes an existing task instead of the sample button on a populated list", async () => {
    const { user } = renderApp({ tasks: [task("1")], guideCompleted: false });

    await screen.findByRole("dialog");
    for (let step = 0; step < 3; step += 1) {
      await user.click(within(dialog()).getByRole("button", { name: "Next" }));
    }

    expect(within(dialog()).getByText("Step 4 of 5")).toBeInTheDocument();
    expect(within(dialog()).getByRole("heading", { name: "Open a task" })).toBeVisible();
    expect(within(dialog()).queryByRole("heading", { name: "Start with examples" })).toBeNull();
  });

  test("returns to the previous step and hides Back on the first one", async () => {
    const { user } = renderApp({ tasks: [task("1")], guideCompleted: false });

    await screen.findByRole("dialog");
    expect(within(dialog()).queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

    await user.click(within(dialog()).getByRole("button", { name: "Next" }));
    expect(within(dialog()).getByText("Step 2 of 5")).toBeInTheDocument();
    await user.click(within(dialog()).getByRole("button", { name: "Back" }));

    expect(within(dialog()).getByText("Step 1 of 5")).toBeInTheDocument();
  });
});

describe("dismissing", () => {
  test("Escape closes the tour and marks it completed", async () => {
    const { store, user } = renderApp({ tasks: [], guideCompleted: false });

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(store.getState().preferences.guideCompleted).toBe(true);
    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      guideCompleted: true,
    });
  });

  test("Escape leaves task data untouched", async () => {
    const { store, user } = renderApp({ tasks: [task("1")], guideCompleted: false });
    const items = store.getState().tasks.items;

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(store.getState().tasks.items).toBe(items);
    expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
  });

  test("the skip button closes the tour without changing tasks", async () => {
    const { store, user } = renderApp({ tasks: [task("1")], guideCompleted: false });

    await screen.findByRole("dialog");
    await user.click(within(dialog()).getByRole("button", { name: "Skip" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(store.getState().tasks.items).toHaveLength(1);
  });

  test("single-key shortcuts are inert while the tour is open", async () => {
    const { router, user } = renderApp({ tasks: [task("1")], guideCompleted: false });

    await screen.findByRole("dialog");
    await user.keyboard("2");
    await user.keyboard("n");

    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("textbox", { name: "Add a task" })).not.toHaveFocus();
  });
});

describe("focus management", () => {
  test("focuses the dialog, and focus returns to the add field when the trigger navigated away", async () => {
    const { user } = renderApp({ path: "/settings", guideCompleted: true });
    const replay = screen.getByRole("button", { name: "Replay the tour" });
    replay.focus();

    await user.click(replay);

    // Replay moves to the task list, so the settings button no longer exists on close.
    const tour = await screen.findByRole("dialog");
    await waitFor(() => expect(tour).toHaveFocus());

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("focuses the dialog on a first visit", async () => {
    renderApp({ tasks: [task("1")], guideCompleted: false });

    const tour = await screen.findByRole("dialog");
    await waitFor(() => expect(tour).toHaveFocus());
  });

  test("keeps Tab inside the dialog on a middle step", async () => {
    const { user } = renderApp({ tasks: [], guideCompleted: false });

    const tour = await screen.findByRole("dialog");
    await waitFor(() => expect(tour).toHaveFocus());

    await user.click(within(tour).getByRole("button", { name: "Next" }));
    await user.click(within(tour).getByRole("button", { name: "Next" }));

    await user.tab();
    expect(within(tour).getByRole("button", { name: "Skip" })).toHaveFocus();
    await user.tab();
    expect(within(tour).getByRole("button", { name: "Back" })).toHaveFocus();
    await user.tab();
    expect(within(tour).getByRole("button", { name: "Next" })).toHaveFocus();
    await user.tab();
    expect(within(tour).getByRole("button", { name: "Skip" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(tour).getByRole("button", { name: "Next" })).toHaveFocus();
  });

  test("exposes a modal dialog with a name and description", async () => {
    renderApp({ tasks: [], guideCompleted: false });

    const tour = await screen.findByRole("dialog");
    expect(tour).toHaveAttribute("aria-modal", "true");
    expect(tour).toHaveAccessibleName("Welcome to Tickd");
    expect(tour).toHaveAccessibleDescription(
      "A quick look at the main screens. You can skip this any time.",
    );
  });
});

describe("fallbacks", () => {
  test("skips steps whose target is missing instead of misplacing the overlay", () => {
    const host = document.createElement("div");
    host.innerHTML = '<form data-guide="add-form"></form>';

    const steps = resolveGuideSteps(host, false);

    expect(steps.map((item) => item.step.id)).toEqual(["welcome", "add"]);
  });

  test("keeps the welcome card when nothing else can be resolved", () => {
    const host = document.createElement("div");

    const steps = resolveGuideSteps(host, false);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.step.id).toBe("welcome");
    expect(steps[0]?.element).toBeNull();
  });

  test("prefers the visible variant when a selector matches several nodes", () => {
    const host = document.createElement("div");
    host.innerHTML =
      '<header><a data-guide="settings" href="/settings">a</a></header>' +
      '<aside><a data-guide="settings" href="/settings">b</a></aside>';

    // Mirror a real layout: the mobile header link has no box, the sidebar one does.
    const links = Array.from(host.querySelectorAll("a"));
    const [mobile, desktop] = links;
    if (mobile === undefined || desktop === undefined) {
      throw new Error("fixture markup is missing a settings link");
    }
    mobile.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
    desktop.getBoundingClientRect = () => new DOMRect(0, 0, 120, 44);

    const steps = resolveGuideSteps(host, true);
    const settings = steps.find((item) => item.step.id === "settings");

    expect(settings?.element).toBe(desktop);
  });
});

describe("replay", () => {
  test("reopens the tour from settings and returns to the task list", async () => {
    const { router, store, user } = renderApp({
      path: "/settings",
      preferences: { theme: "dark", accent: "rose", showKeyboardHints: false },
      guideCompleted: true,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Replay the tour" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(store.getState().preferences).toMatchObject({
      theme: "dark",
      accent: "rose",
      showKeyboardHints: false,
      guideCompleted: true,
    });
    expect(screen.getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
  });

  test("keeps the tour completed when a replay is skipped", async () => {
    const { user } = renderApp({ path: "/settings", guideCompleted: true });

    await user.click(screen.getByRole("button", { name: "Replay the tour" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Skip" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      guideCompleted: true,
    });
  });
});

describe("localization", () => {
  test("translates every tour string into Russian", async () => {
    const { user } = renderApp({ path: "/settings", guideCompleted: true });

    await user.click(screen.getByRole("radio", { name: "Русский" }));
    await user.click(screen.getByRole("button", { name: "Пройти знакомство заново" }));

    const tour = await screen.findByRole("dialog");
    expect(within(tour).getByText("Шаг 1 из 5")).toBeInTheDocument();
    expect(
      within(tour).getByRole("heading", { name: "Добро пожаловать в Tickd" }),
    ).toBeInTheDocument();
    expect(within(tour).getByRole("button", { name: "Далее" })).toBeInTheDocument();
    expect(within(tour).getByRole("button", { name: "Пропустить" })).toBeInTheDocument();

    await user.click(within(tour).getByRole("button", { name: "Пропустить" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Все задачи" })).toBeInTheDocument();
  });
});

test("the tour can be dismissed right after a first visit", async () => {
  const { store, user } = renderApp({ tasks: [], guideCompleted: false });

  await screen.findByRole("dialog");
  await user.keyboard("{Escape}");

  expect(store.getState().guide.open).toBe(false);
});
