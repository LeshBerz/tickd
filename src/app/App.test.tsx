import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderApp } from "../test/renderApp.tsx";

test("renders the responsive application shell", () => {
  renderApp({ tasks: [] });

  expect(screen.getAllByRole("heading", { level: 1, name: "Tickd" })).toHaveLength(2);
  expect(screen.getAllByRole("navigation", { name: "Filter tasks" })).toHaveLength(2);
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
});
