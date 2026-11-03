import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderApp } from "../test/renderApp.tsx";
import type { makeStore } from "./store.ts";

const UNAVAILABLE_COPY = "Can't save tasks — browser storage is unavailable.";
const QUOTA_COPY = "Can't save tasks — browser storage is full.";
const DISCARDED_COPY = "Couldn't restore saved tasks. Starting fresh.";

type PersistenceState = {
  available: boolean;
  loadDiscarded: boolean;
  saveError: "quota" | "unavailable" | null;
  availabilityDismissed: boolean;
};

function persistenceFrom(store: ReturnType<typeof makeStore>): PersistenceState {
  const persistence = (store.getState() as { persistence?: PersistenceState }).persistence;
  if (persistence === undefined) {
    throw new Error("persistence state is missing");
  }
  return persistence;
}

function expectBefore(earlier: HTMLElement, later: HTMLElement): void {
  expect(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

test("renders the responsive application shell", () => {
  renderApp({ tasks: [] });

  expect(screen.getAllByRole("heading", { level: 1, name: "Tickd" })).toHaveLength(2);
  expect(screen.getAllByRole("navigation", { name: "Filter tasks" })).toHaveLength(2);
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
});

test("shows a discarded-load banner above the view and starts fresh", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("tickd:tasks", "{not json");
  renderApp();

  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent(DISCARDED_COPY);
  const heading = screen.getByRole("heading", { level: 2, name: "All tasks" });

  expectBefore(banner, heading);
  expect(screen.getByText("All caught up!")).toBeInTheDocument();
  expect(localStorage.getItem("tickd:tasks")).toBe("{not json");
});

test("dismisses a discarded-load banner without deleting the stored bytes", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("tickd:tasks", "{not json");
  const { user } = renderApp();

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  expect(localStorage.getItem("tickd:tasks")).toBe("{not json");
});

test("shows unavailable storage in a status banner when the probe fails", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  renderApp();

  expect(screen.getByRole("status")).toHaveTextContent(UNAVAILABLE_COPY);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("dismissing unavailable storage hides the notice and keeps storage unavailable", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const { store, user } = renderApp();

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();
  expect(persistenceFrom(store)).toMatchObject({
    available: false,
    availabilityDismissed: true,
  });
});

test("shows a quota alert when saving fails because storage is full", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const { user } = renderApp({ tasks: [] });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  });

  await user.type(screen.getByRole("textbox", { name: "Add a task" }), "Still added");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByText("Still added")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(QUOTA_COPY);
});

test("dismisses a quota alert", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const { user } = renderApp({ tasks: [] });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  });

  await user.type(screen.getByRole("textbox", { name: "Add a task" }), "Still added");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(QUOTA_COPY)).not.toBeInTheDocument();
  expect(screen.getByText("Still added")).toBeInTheDocument();
});

test("shows an alert when a later save fails because storage is blocked", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const { user } = renderApp({ tasks: [] });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });

  await user.type(screen.getByRole("textbox", { name: "Add a task" }), "Still added");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByRole("alert")).toHaveTextContent(UNAVAILABLE_COPY);
});

test("shows one storage message at a time, quota then discarded load then unavailable", async () => {
  const { user } = renderApp({
    tasks: [],
    persistence: {
      available: false,
      loadDiscarded: true,
      saveError: "quota",
      availabilityDismissed: false,
    },
  });

  expect(screen.getByRole("alert")).toHaveTextContent(QUOTA_COPY);
  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(DISCARDED_COPY);
  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(UNAVAILABLE_COPY);

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
});

test("shows a discarded-load banner above the active view", () => {
  renderApp({
    path: "/active",
    tasks: [],
    persistence: {
      available: true,
      loadDiscarded: true,
      saveError: null,
      availabilityDismissed: false,
    },
  });

  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent(DISCARDED_COPY);
  const heading = screen.getByRole("heading", { level: 2, name: "Active" });

  expectBefore(banner, heading);
});
