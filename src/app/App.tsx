import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router";
import { GuideTour } from "../features/guide/GuideTour.tsx";
import { useFirstVisitGuide } from "../features/guide/useFirstVisitGuide.ts";
import { useApplyPreferences } from "../features/preferences/useApplyPreferences.ts";
import { FilterNav } from "../features/tasks/components/FilterNav.tsx";
import { TaskFooter } from "../features/tasks/components/TaskFooter.tsx";
import { UndoToast } from "../features/tasks/components/UndoToast.tsx";
import { useRouteTaskId } from "../features/tasks/useRouteTaskId.ts";
import { useAppSelector } from "./hooks.ts";
import { Logo } from "./Logo.tsx";
import { SETTINGS_PATH } from "./paths.ts";
import { useTaskHotkeys } from "./useTaskHotkeys.ts";

const SETTINGS_LINK_CLASS =
  "flex items-center gap-3 px-3 py-2 rounded-card font-bold transition-all motion-reduce:transition-none aria-[current=page]:bg-surface aria-[current=page]:text-text aria-[current=page]:shadow-sm text-text-muted hover:text-text hover:bg-surface/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]";

function GearIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  );
}

export function App() {
  useTaskHotkeys();
  useApplyPreferences();
  useFirstVisitGuide();
  const { t } = useTranslation();
  const location = useLocation();
  const hasUndoToast = useAppSelector((state) => state.tasks.lastRemoved != null);
  const hasDetail = useRouteTaskId() !== null;
  const isSettings = location.pathname === SETTINGS_PATH;
  const showMobileFooter = !hasDetail && !isSettings;

  return (
    <div
      data-app-shell=""
      className={`min-h-dvh flex flex-col lg:flex-row lg:h-dvh lg:overflow-hidden${hasUndoToast ? " has-toast" : ""}`}
    >
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-bg shrink-0">
        <h1 className="text-2xl">
          <Logo />
        </h1>
        <NavLink
          to={SETTINGS_PATH}
          data-guide="settings"
          aria-label={t("nav.settings")}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-card text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none"
        >
          <GearIcon />
        </NavLink>
      </header>

      {!isSettings ? (
        <div className="lg:hidden px-4 pb-3 bg-bg shrink-0 w-full overflow-hidden">
          <FilterNav variant="bar" />
        </div>
      ) : null}

      <aside className="hidden lg:flex w-64 bg-sidebar border-r border-border flex-col shrink-0">
        <div className="p-6 shrink-0">
          <h1 className="text-3xl">
            <Logo />
          </h1>
        </div>
        <div className="px-4 pb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
          {t("nav.tasks")}
        </div>
        <FilterNav variant="sidebar" />
        <nav aria-label={t("nav.settings")} className="px-3 pb-4 mt-auto">
          <NavLink to={SETTINGS_PATH} data-guide="settings" className={SETTINGS_LINK_CLASS}>
            <GearIcon />
            {t("nav.settings")}
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col bg-bg lg:bg-surface relative lg:overflow-hidden">
        <Outlet />
        {showMobileFooter ? <TaskFooter variant="mobile" /> : null}
        <UndoToast />
      </main>
      <GuideTour />
    </div>
  );
}
