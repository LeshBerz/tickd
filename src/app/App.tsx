import { Outlet } from "react-router";
import { FilterNav } from "../features/tasks/components/FilterNav.tsx";
import { StorageBanner } from "../features/tasks/components/StorageBanner.tsx";
import { TaskFooter } from "../features/tasks/components/TaskFooter.tsx";
import { UndoToast } from "../features/tasks/components/UndoToast.tsx";
import { useAppSelector } from "./hooks.ts";

export function App() {
  const hasUndoToast = useAppSelector((state) => state.tasks.lastRemoved != null);

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
        <div className="flex-1 lg:overflow-y-auto flex flex-col items-center lg:items-start w-full lg:pl-16 xl:pl-24 lg:pr-8">
          <div className="w-full max-w-[44rem] flex flex-col min-h-full px-4 lg:px-0 py-6 lg:py-10">
            <StorageBanner />
            <Outlet />
          </div>
        </div>
        <TaskFooter variant="mobile" />
        <UndoToast />
      </main>
    </div>
  );
}
