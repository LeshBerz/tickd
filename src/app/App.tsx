import { Outlet } from "react-router";
import { FilterNav } from "../features/tasks/components/FilterNav.tsx";
import { TaskFooter } from "../features/tasks/components/TaskFooter.tsx";
import { UndoToast } from "../features/tasks/components/UndoToast.tsx";
import { useRouteTaskId } from "../features/tasks/useRouteTaskId.ts";
import { useAppSelector } from "./hooks.ts";
import { useTaskHotkeys } from "./useTaskHotkeys.ts";

export function App() {
  useTaskHotkeys();
  const hasUndoToast = useAppSelector((state) => state.tasks.lastRemoved != null);
  const hasDetail = useRouteTaskId() !== null;

  return (
    <div
      className={`min-h-dvh flex flex-col lg:flex-row lg:h-dvh lg:overflow-hidden${hasUndoToast ? " has-toast" : ""}`}
    >
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-bg shrink-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-accent">Tickd</h1>
      </header>

      <div className="lg:hidden px-4 pb-3 bg-bg shrink-0 w-full overflow-hidden">
        <FilterNav variant="bar" />
      </div>

      <aside className="hidden lg:flex w-64 bg-sidebar border-r border-border flex-col shrink-0">
        <div className="p-6 shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-accent">Tickd</h1>
        </div>
        <div className="px-4 pb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
          Tasks
        </div>
        <FilterNav variant="sidebar" />
      </aside>

      <main className="flex-1 flex flex-col bg-bg lg:bg-surface relative lg:overflow-hidden">
        <Outlet />
        {hasDetail ? null : <TaskFooter variant="mobile" />}
        <UndoToast />
      </main>
    </div>
  );
}
