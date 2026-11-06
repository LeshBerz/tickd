import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useAppSelector } from "../../../app/hooks.ts";
import { selectShowKeyboardHints } from "../../preferences/selectShowKeyboardHints.ts";
import type { Filter } from "../filter.ts";
import { FILTERS, filterPaths } from "../filter.ts";
import { selectTaskCounts } from "../selectors.ts";

type Props = {
  variant: "sidebar" | "bar";
};

const LABEL_KEYS: Record<Filter, string> = {
  all: "nav.all",
  active: "nav.active",
  completed: "nav.completed",
};

const icons: Record<Filter, ReactNode> = {
  all: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  active: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  completed: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 4L12 14.01l-3-3" />
    </svg>
  ),
};

const FILTER_HINT_KEYS = ["1", "2", "3"] as const;

export function FilterNav({ variant }: Props) {
  const { t } = useTranslation();
  const counts = useAppSelector(selectTaskCounts);
  const showHints = useAppSelector(selectShowKeyboardHints);

  if (variant === "bar") {
    return (
      <nav
        aria-label={t("nav.filterLabel")}
        data-guide="filters"
        className="flex p-1 bg-bg rounded-pill border border-border shadow-inner w-full max-w-full"
      >
        {FILTERS.map((filter) => (
          <NavLink
            key={filter}
            to={filterPaths[filter]}
            end
            className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-pill font-bold transition-all motion-reduce:transition-none aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:shadow-sm text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] truncate flex items-center justify-center"
          >
            {t(LABEL_KEYS[filter])}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("nav.filterLabel")}
      data-guide="filters"
      className="flex-1 px-3 flex flex-col gap-1"
    >
      {FILTERS.map((filter, index) => (
        <NavLink
          key={filter}
          to={filterPaths[filter]}
          end
          className="group flex items-center justify-between px-3 py-2 rounded-card font-bold transition-all motion-reduce:transition-none aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:shadow-sm text-text-muted hover:text-text hover:bg-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
        >
          <span className="flex items-center gap-3">
            {icons[filter]}
            {t(LABEL_KEYS[filter])}
          </span>
          <div className="flex items-center relative">
            {showHints ? (
              // biome-ignore lint/a11y/noAriaHiddenOnFocusable: decorative shortcut hint
              <kbd
                aria-hidden="true"
                className="hidden fine-pointer:inline-block absolute right-full mr-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity motion-reduce:transition-none font-sans text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted shadow-sm"
              >
                {FILTER_HINT_KEYS[index]}
              </kbd>
            ) : null}
            <span className="bg-border/50 text-text-muted px-2 py-0.5 rounded-pill text-xs">
              {counts[filter]}
            </span>
          </div>
        </NavLink>
      ))}
    </nav>
  );
}
