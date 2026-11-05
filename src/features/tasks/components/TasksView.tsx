import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Filter } from "../filter.ts";
import { useRouteFilter } from "../useRouteFilter.ts";
import { TaskFooter } from "./TaskFooter.tsx";
import { TaskForm } from "./TaskForm.tsx";
import { TaskList } from "./TaskList.tsx";

const VIEW_TITLE_KEYS: Record<Filter, string> = {
  all: "tasks.titleAll",
  active: "tasks.titleActive",
  completed: "tasks.titleCompleted",
};

export function TasksView() {
  const { t } = useTranslation();
  const filter = useRouteFilter();
  const addInputRef = useRef<HTMLInputElement>(null);
  const title = t(VIEW_TITLE_KEYS[filter]);

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-text">{title}</h2>
      </header>
      <TaskForm inputRef={addInputRef} />
      <div className="flex-1 flex flex-col relative">
        <TaskList filter={filter} addInputRef={addInputRef} />
        <TaskFooter variant="desktop" />
      </div>
    </>
  );
}
