import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { expect, test } from "vitest";
import { makeStore, type RootState } from "../../../app/store.ts";
import { type PersistencePreload, renderApp } from "../../../test/renderApp.tsx";
import { StorageBanner } from "./StorageBanner.tsx";

const UNAVAILABLE_COPY = "Can't save tasks — browser storage is unavailable.";
const QUOTA_COPY = "Can't save tasks — browser storage is full.";
const DISCARDED_COPY = "Couldn't restore saved tasks. Starting fresh.";

const healthy: PersistencePreload = {
  available: true,
  loadDiscarded: false,
  saveError: null,
  availabilityDismissed: false,
};

function persistenceFrom(store: ReturnType<typeof makeStore>): PersistencePreload {
  const persistence = (store.getState() as { persistence?: PersistencePreload }).persistence;
  if (persistence === undefined) {
    throw new Error("persistence state is missing");
  }
  return persistence;
}

function hasDangerTone(banner: HTMLElement): boolean {
  if (banner.classList.contains("text-danger")) return true;
  return [...banner.querySelectorAll("*")].some((element) =>
    element.classList.contains("text-danger"),
  );
}

function expectBanner(role: "alert" | "status", copy: string, tone: "danger" | "neutral") {
  // status/alert announce from contents; Biome forbids aria-label on these roles.
  const banner = screen.getByRole(role);
  expect(banner).toHaveTextContent(copy);
  expect(banner).toContainElement(screen.getByRole("button", { name: "Dismiss" }));
  expect(hasDangerTone(banner)).toBe(tone === "danger");
  return banner;
}

function renderBanner(persistence: PersistencePreload) {
  const store = makeStore({
    tasks: { items: [] },
    persistence,
  } as Partial<RootState>);
  const user = userEvent.setup();
  const view = render(
    <Provider store={store}>
      <StorageBanner />
    </Provider>,
  );

  return { ...view, store, user };
}

test("renders nothing when there is no storage message", () => {
  renderBanner(healthy);

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
});

test("explains unavailable storage in a status banner", () => {
  renderBanner({ ...healthy, available: false });

  expectBanner("status", UNAVAILABLE_COPY, "neutral");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("explains a full storage quota in an alert", () => {
  renderBanner({ ...healthy, saveError: "quota" });

  expectBanner("alert", QUOTA_COPY, "danger");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("explains a failed save in an alert when storage is blocked", () => {
  renderBanner({ ...healthy, saveError: "unavailable" });

  expectBanner("alert", UNAVAILABLE_COPY, "danger");
});

test("explains a discarded load in a status banner", () => {
  renderBanner({ ...healthy, loadDiscarded: true });

  expectBanner("status", DISCARDED_COPY, "neutral");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("stays hidden after unavailable storage was dismissed", () => {
  renderBanner({ ...healthy, available: false, availabilityDismissed: true });

  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
});

test("shows a discarded load ahead of unavailable storage", () => {
  renderBanner({ ...healthy, available: false, loadDiscarded: true });

  expectBanner("status", DISCARDED_COPY, "neutral");
  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();
});

test("shows a save error ahead of a discarded load", () => {
  renderBanner({ ...healthy, loadDiscarded: true, saveError: "unavailable" });

  expectBanner("alert", UNAVAILABLE_COPY, "danger");
  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
});

test("dismissing unavailable storage hides it and keeps storage unavailable", async () => {
  const { store, user } = renderBanner({ ...healthy, available: false });

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(UNAVAILABLE_COPY)).not.toBeInTheDocument();
  expect(persistenceFrom(store)).toMatchObject({
    available: false,
    availabilityDismissed: true,
  });
});

test("dismissing a quota alert clears only the save error", async () => {
  const { store, user } = renderBanner({
    ...healthy,
    loadDiscarded: true,
    saveError: "quota",
  });

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(QUOTA_COPY)).not.toBeInTheDocument();
  expect(persistenceFrom(store)).toMatchObject({
    saveError: null,
    loadDiscarded: true,
  });
});

test("dismissing a discarded load clears only that notice", async () => {
  const { store, user } = renderBanner({ ...healthy, loadDiscarded: true });

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
  expect(persistenceFrom(store).loadDiscarded).toBe(false);
});

test("shows the banner above the view heading on a filter route", () => {
  renderApp({
    path: "/completed",
    tasks: [],
    persistence: { ...healthy, loadDiscarded: true },
  });

  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent(DISCARDED_COPY);
  const heading = screen.getByRole("heading", { level: 2, name: "Completed" });

  expect(banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});
