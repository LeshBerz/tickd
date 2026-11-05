import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";

function checkedRadio(group: string): HTMLInputElement {
  const fieldset = screen.getByRole("group", { name: group });
  const radios = within(fieldset)
    .getAllByRole("radio")
    .filter((radio): radio is HTMLInputElement => radio instanceof HTMLInputElement);
  const checked = radios.filter((radio) => radio.checked);
  if (checked.length !== 1 || checked[0] === undefined) {
    throw new Error(`${group} must have exactly one checked option`);
  }
  return checked[0];
}

describe("settings route", () => {
  test("renders the settings page from /settings", () => {
    renderApp({ path: "/settings" });

    expect(screen.getByRole("heading", { level: 2, name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Accent color" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Show keyboard shortcut hints" })).toBeChecked();
  });

  test("links to settings from both the mobile header and the sidebar", () => {
    renderApp({ path: "/" });

    const links = screen.getAllByRole("link", { name: "Settings" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/settings");
    }
  });

  test("marks the settings link as current and keeps filter links intact", async () => {
    const { user } = renderApp({ tasks: [] });

    await user.click(screen.getAllByRole("link", { name: "Settings" })[0] as HTMLElement);

    expect(screen.getByRole("heading", { level: 2, name: "Settings" })).toBeInTheDocument();
    const current = screen
      .getAllByRole("link", { name: "Settings" })
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /^All/ }).length).toBeGreaterThan(0);
  });

  test("does not render the task footer or the add form on settings", () => {
    renderApp({ path: "/settings", tasks: [] });

    expect(screen.queryByRole("textbox", { name: "Add a task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear completed" })).not.toBeInTheDocument();
  });

  test("redirects an unknown settings sub-route to the task list", () => {
    const { router } = renderApp({ path: "/settings/missing" });

    expect(router.state.location.pathname).toBe("/");
  });
});

describe("theme selection", () => {
  test("defaults to the system theme", () => {
    renderApp({ path: "/settings" });

    expect(checkedRadio("Theme").value).toBe("system");
  });

  test("applies the dark class immediately and persists the choice", async () => {
    const { store, user } = renderApp({ path: "/settings" });

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(store.getState().preferences.theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(checkedRadio("Theme").value).toBe("dark");
    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      version: 1,
      theme: "dark",
    });
  });

  test("an explicit light choice overrides the system preference", async () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia;

    const { user } = renderApp({ path: "/settings", preferences: { theme: "system" } });
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("radio", { name: "Light" }));

    expect(document.documentElement).not.toHaveClass("dark");
  });

  test("restores a stored dark theme on startup", () => {
    renderApp({ path: "/settings", preferences: { theme: "dark" } });

    expect(document.documentElement).toHaveClass("dark");
    expect(checkedRadio("Theme").value).toBe("dark");
  });
});

describe("accent selection", () => {
  test("defaults to teal and applies the palette attribute", () => {
    renderApp({ path: "/settings" });

    expect(checkedRadio("Accent color").value).toBe("teal");
    expect(document.documentElement).toHaveAttribute("data-accent", "teal");
  });

  test("applies and persists a chosen palette", async () => {
    const { store, user } = renderApp({ path: "/settings" });

    await user.click(screen.getByRole("radio", { name: "Rose" }));

    expect(store.getState().preferences.accent).toBe("rose");
    expect(document.documentElement).toHaveAttribute("data-accent", "rose");
    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      accent: "rose",
    });
  });
});

describe("language selection", () => {
  test("defaults to English", () => {
    renderApp({ path: "/settings" });

    expect(checkedRadio("Language").value).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  test("switches the whole interface to Russian", async () => {
    const { store, user } = renderApp({ path: "/settings", tasks: [] });

    await user.click(screen.getByRole("radio", { name: "Русский" }));

    expect(store.getState().preferences.language).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
    expect(screen.getByRole("heading", { level: 2, name: "Настройки" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Тема" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Все 0" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      language: "ru",
    });
  });

  test("does not leave a mixed-language interface after switching", async () => {
    const { user } = renderApp({ path: "/settings" });

    await user.click(screen.getByRole("radio", { name: "Русский" }));

    expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
    expect(screen.queryByText("Show keyboard shortcut hints")).not.toBeInTheDocument();
    expect(screen.getByText("Оформление")).toBeInTheDocument();
  });
});

describe("keyboard hint preference", () => {
  test("toggling the checkbox hides hints immediately", async () => {
    const { store, user } = renderApp({ path: "/settings" });
    const checkbox = screen.getByRole("checkbox", { name: "Show keyboard shortcut hints" });

    await user.click(checkbox);

    expect(store.getState().preferences.showKeyboardHints).toBe(false);
    expect(checkbox).not.toBeChecked();
    expect(JSON.parse(localStorage.getItem("tickd:preferences") ?? "null")).toMatchObject({
      showKeyboardHints: false,
    });
  });

  test("hides every hint on the task list once disabled", async () => {
    const { user } = renderApp({ path: "/settings" });

    await user.click(screen.getByRole("checkbox", { name: "Show keyboard shortcut hints" }));
    await user.click(screen.getAllByRole("link", { name: /^All/ })[0] as HTMLElement);

    const addForm = screen.getByRole("button", { name: "Add" }).closest("form");
    expect(addForm?.querySelector("kbd")).toBeNull();
    for (const nav of screen.getAllByRole("navigation", { name: "Filter tasks" })) {
      expect(nav.querySelector("kbd")).toBeNull();
    }
    expect(screen.queryByText("Press N to add a task.")).not.toBeInTheDocument();
    expect(screen.getByText("Add your first task above.")).toBeInTheDocument();
  });
});
