import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router/dom";
import { createAppRouter } from "./app/router.tsx";
import { makeStore } from "./app/store.ts";
import { applyLanguage } from "./i18n/index.ts";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

const store = makeStore();

// Apply the stored language before the first render so the UI never flashes another one.
applyLanguage(store.getState().preferences.language);

const router = createAppRouter();

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
