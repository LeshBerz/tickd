import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { useAppDispatch, useAppSelector } from "../../app/hooks.ts";
import { completeGuide } from "../preferences/preferencesSlice.ts";
import { ADD_TASK_INPUT_ID } from "../tasks/taskFormIds.ts";
import { closeGuide } from "./guideSlice.ts";
import { placeCard, type Rect, spotlightRect, VIEWPORT_MARGIN, type Viewport } from "./layout.ts";
import { hasLayout, type ResolvedStep, resolveGuideSteps } from "./resolve.ts";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function measuredRect(element: HTMLElement): Rect | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function sameSteps(a: ResolvedStep[], b: ResolvedStep[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, index) => item.step === b[index]?.step && item.element === b[index]?.element)
  );
}

/**
 * Steps are resolved from the live DOM. They are re-resolved on route changes (a replay
 * begins with a navigation) and on DOM mutations, so the tour follows the settled screen.
 * Steps whose target never appears are dropped, so the overlay is never left broken.
 */
function useGuideSteps(pathname: string): ResolvedStep[] {
  const [steps, setSteps] = useState<ResolvedStep[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a route change re-resolves the DOM targets
  useEffect(() => {
    const update = () => {
      const next = resolveGuideSteps();
      setSteps((previous) => (sameSteps(previous, next) ? previous : next));
    };
    update();

    if (typeof MutationObserver !== "function") {
      return;
    }
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return steps;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

function scrollIntoView(element: HTMLElement): void {
  if (typeof element.scrollIntoView !== "function") {
    return;
  }
  element.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

function viewportSize(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Focus returns to whatever opened the tour, or to the add field if that node is gone. */
function restoreFocus(target: HTMLElement | null): void {
  if (target?.isConnected === true && target !== document.body) {
    target.focus();
    return;
  }
  document.getElementById(ADD_TASK_INPUT_ID)?.focus();
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

type GuideDialogProps = { onFinish: () => void };

function GuideDialog({ onFinish }: GuideDialogProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const steps = useGuideSteps(location.pathname);
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<Viewport>(viewportSize);
  const [cardHeight, setCardHeight] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Capture the trigger first: the next layout effect moves focus into the dialog.
  useLayoutEffect(() => {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement ? active : null;
  }, []);

  useEffect(() => {
    return () => {
      restoreFocus(returnFocusRef.current);
    };
  }, []);

  const stepCount = steps.length;
  const safeIndex = stepCount === 0 ? 0 : Math.min(index, stepCount - 1);
  const current = steps[safeIndex] ?? null;
  const element = current?.element ?? null;

  useLayoutEffect(() => {
    if (safeIndex !== index) {
      setIndex(safeIndex);
    }
  }, [index, safeIndex]);

  useLayoutEffect(() => {
    if (current !== null) {
      dialogRef.current?.focus();
    }
  }, [current]);

  useLayoutEffect(() => {
    if (element !== null) {
      scrollIntoView(element);
    }
    const measure = () => {
      const nextViewport = viewportSize();
      setViewport((previous) =>
        previous.width === nextViewport.width && previous.height === nextViewport.height
          ? previous
          : nextViewport,
      );
      const nextAnchor = element === null || !hasLayout() ? null : measuredRect(element);
      setAnchor((previous) => (sameRect(previous, nextAnchor) ? previous : nextAnchor));
      const card = dialogRef.current;
      if (card !== null) {
        // The whole card is measured, including its actions, so it never overflows the viewport.
        const height = card.getBoundingClientRect().height;
        setCardHeight((previous) => (previous === height ? previous : height));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [element]);

  // A disappearing control (Back on the first step) must not leave focus outside the dialog.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check focus after every step change
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.contains(document.activeElement)) {
      dialog.focus();
    }
  }, [safeIndex, stepCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onFinish();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = dialogRef.current;
      if (dialog === null) {
        return;
      }
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onFinish]);

  if (current === null) {
    return null;
  }

  const isLast = safeIndex === stepCount - 1;
  const isFirst = safeIndex === 0;
  const highlighted = anchor === null ? null : spotlightRect(anchor, viewport);
  const position = placeCard(anchor, viewport, cardHeight);
  const titleId = "tickd-guide-title";
  const bodyId = "tickd-guide-body";

  const goNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    setIndex(safeIndex + 1);
  };

  return (
    <>
      {highlighted === null ? (
        <div aria-hidden="true" className="fixed inset-0 z-40 bg-scrim" />
      ) : (
        <div
          aria-hidden="true"
          data-guide-spotlight={current.step.id}
          className="fixed z-40 rounded-card guide-spotlight transition-all duration-200 motion-reduce:transition-none"
          style={{
            top: highlighted.top,
            left: highlighted.left,
            width: highlighted.width,
            height: highlighted.height,
          }}
        />
      )}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onFinish}
        className="fixed inset-0 z-40 cursor-default bg-transparent focus:outline-none"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="fixed z-50 bg-card border border-border rounded-card shadow-2xl p-5 flex flex-col gap-4 overflow-y-auto animate-card-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          // Long copy at a short viewport scrolls inside the card instead of leaving the screen.
          maxHeight: `calc(100dvh - ${VIEWPORT_MARGIN * 2}px)`,
        }}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
            {t("guide.stepProgress", { current: safeIndex + 1, total: stepCount })}
          </p>
          <div aria-live="polite" className="flex flex-col gap-2">
            <h3 id={titleId} className="text-lg font-extrabold text-text">
              {t(current.step.titleKey)}
            </h3>
            <p id={bodyId} className="text-sm font-medium text-text-muted">
              {t(current.step.bodyKey)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onFinish}
            className="text-sm font-bold text-text-muted hover:text-text rounded px-2 py-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none"
          >
            {t("guide.skip")}
          </button>
          <div className="flex items-center gap-2">
            {isFirst ? null : (
              <button
                type="button"
                onClick={() => setIndex(Math.max(0, safeIndex - 1))}
                className="text-sm font-bold text-text border-2 border-border-ui rounded-pill px-4 py-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none"
              >
                {t("guide.back")}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="text-sm font-bold bg-accent text-accent-text rounded-pill px-5 py-2 min-h-[44px] shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all motion-reduce:transition-none"
            >
              {isLast ? t("guide.done") : t("guide.next")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function GuideTour() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.guide.open);

  if (!open) {
    return null;
  }

  return (
    <GuideDialog
      onFinish={() => {
        dispatch(completeGuide());
        dispatch(closeGuide());
      }}
    />
  );
}
