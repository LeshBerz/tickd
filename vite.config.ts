import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; CI passes that path in BASE_PATH.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/setupTests.ts"],
    restoreMocks: true,
  },
});
