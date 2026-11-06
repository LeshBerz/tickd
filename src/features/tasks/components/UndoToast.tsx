import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import type { RootState } from "../../../app/store.ts";
import { restoreDeletedTaskWithFocus } from "../restoreWithFocus.ts";
import { clearLastRemoved } from "../tasksSlice.ts";
import { useRouteFilter } from "../useRouteFilter.ts";
import { useRouteTaskId } from "../useRouteTaskId.ts";

const AUTO_HIDE_MS = 5000;

/** The list column published by the layout; the toast centres on it while a card is open. */
const TASK_COLUMN_SELECTOR = "[data-task-column]";

/**
 * Positions the toast layer over the visible task area: the list column while a card is
 * open and `<main>` otherwise. Measured values are published as CSS custom properties,
 * so no magic breakpoint offsets are involved:
 *
 * - `--toast-left` / `--toast-width` — the horizontal target area;
 * - `--toast-bottom` — the mobile offset, so the toast clears the task footer;
 * - `--toast-height` — the toast itself, so the scrollable column can reserve room for it.
 */
function useToastAnchor(active: boolean, detailOpen: boolean) {
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!active || layer === null) {
      return;
    }
    const main = layer.closest("main");
    const shell = layer.closest<HTMLElement>("[data-app-shell]");
    const toast = layer.firstElementChild;

    const measure = () => {
      const mainRect = main?.getBoundingClientRect();
      if (mainRect === undefined) {
        return;
      }
      const target = detailOpen ? document.querySelector<HTMLElement>(TASK_COLUMN_SELECTOR) : main;
      const rect = (target ?? main)?.getBoundingClientRect();
      if (rect === undefined) {
        return;
      }
      // The layer is absolutely positioned inside `main`, so the offsets are main-relative.
      layer.style.setProperty("--toast-left", `${rect.left - mainRect.left}px`);
      layer.style.setProperty("--toast-width", `${rect.width}px`);

      // On mobile the layer is fixed, so `bottom` is viewport-relative: keep the toast
      // above the visible task footer instead of covering it.
      const mobile = window.matchMedia?.("(max-width: 1023px)").matches ?? false;
      if (!mobile || main === null) {
        layer.style.removeProperty("--toast-bottom");
        return;
      }
      const footerTop = Math.min(
        ...Array.from(main.querySelectorAll("footer"), (footer) => {
          const footerRect = footer.getBoundingClientRect();
          return footerRect.height > 0 ? footerRect.top : Number.POSITIVE_INFINITY;
        }),
      );
      const gap = 16;
      const bottom = Number.isFinite(footerTop)
        ? Math.max(gap, window.innerHeight - footerTop + gap)
        : gap;
      layer.style.setProperty("--toast-bottom", `${Math.round(bottom)}px`);
    };

    const measureHeight = () => {
      if (toast === null || shell === null) {
        return;
      }
      const { height } = toast.getBoundingClientRect();
      if (height > 0) {
        shell.style.setProperty("--toast-height", `${Math.ceil(height)}px`);
      }
    };

    measure();
    measureHeight();
    window.addEventListener("resize", measure);
    window.addEventListener("resize", measureHeight);

    const disposers: (() => void)[] = [
      () => {
        window.removeEventListener("resize", measure);
        window.removeEventListener("resize", measureHeight);
      },
    ];
    if (typeof ResizeObserver === "function") {
      const layoutObserver = new ResizeObserver(measure);
      if (main !== null) {
        layoutObserver.observe(main);
      }
      const heightObserver = new ResizeObserver(measureHeight);
      if (toast !== null) {
        heightObserver.observe(toast);
      }
      disposers.push(() => {
        layoutObserver.disconnect();
        heightObserver.disconnect();
      });
    }

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
      shell?.style.removeProperty("--toast-height");
    };
  }, [active, detailOpen]);

  return layerRef;
}

export function UndoToast() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const lastRemoved = useAppSelector((state) => state.tasks.lastRemoved);
  const filter = useRouteFilter();
  const detailOpen = useRouteTaskId() !== null;
  const layerRef = useToastAnchor(lastRemoved != null, detailOpen);

  useEffect(() => {
    if (lastRemoved == null) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch(clearLastRemoved());
    }, AUTO_HIDE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dispatch, lastRemoved]);

  if (lastRemoved == null) {
    return null;
  }

  const handleUndo = () => {
    restoreDeletedTaskWithFocus(dispatch, () => store.getState(), filter);
  };

  return (
    <div ref={layerRef} className="toast-layer">
      <div
        role="status"
        className="animate-toast-in flex w-full max-w-sm bg-surface border border-border shadow-2xl rounded-card p-4 items-center justify-between"
      >
        <span className="font-bold text-text">{t("tasks.deleted")}</span>
        <button
          type="button"
          onClick={handleUndo}
          className="text-accent font-extrabold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1 transition-colors min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 flex items-center justify-center"
        >
          {t("tasks.undo")}
        </button>
      </div>
    </div>
  );
}
