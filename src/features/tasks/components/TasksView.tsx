import { useRef } from "react";
import type { Filter } from "../filter.ts";
import { useRouteFilter } from "../useRouteFilter.ts";
import { TaskForm } from "./TaskForm.tsx";
import { TaskList } from "./TaskList.tsx";

const VIEW_TITLES: Record<Filter, string> = {
  all: "All tasks",
  active: "Active",
  completed: "Completed",
};

export function TasksView() {
  const filter = useRouteFilter();
  const addInputRef = useRef<HTMLInputElement>(null);
  const title = VIEW_TITLES[filter];

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-text">{title}</h2>
      </header>
      <TaskForm inputRef={addInputRef} />
      <div className="flex-1 flex flex-col relative">
        <TaskList filter={filter} addInputRef={addInputRef} />
      </div>
    </>
  );
}
