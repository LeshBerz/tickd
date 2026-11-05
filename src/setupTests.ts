import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import { applyLanguage } from "./i18n/index.ts";

expect.extend(matchers);

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-accent");
  document.documentElement.lang = "en";
  applyLanguage("en");
});
