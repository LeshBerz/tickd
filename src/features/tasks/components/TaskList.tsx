import { type RefObject, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import type { Filter } from "../filter.ts";
import { selectTaskCounts, selectVisibleTasks } from "../selectors.ts";
import { remove, toggle } from "../tasksSlice.ts";
import { TaskItem } from "./TaskItem.tsx";

type Props = {
  filter: Filter;
  addInputRef: RefObject<HTMLInputElement | null>;
};

type PendingFocus =
  | { kind: "checkbox"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "input" };

const NO_MATCH_SUBTITLE: Record<Exclude<Filter, "all">, string> = {
  active: "No active tasks.",
  completed: "No completed tasks.",
};

export function TaskList({ filter, addInputRef }: Props) {
  const tasks = useAppSelector((state) => selectVisibleTasks(state, filter));
  const counts = useAppSelector(selectTaskCounts);
  const dispatch = useAppDispatch();
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  const [pendingFocus, setPendingFocus] = useState<PendingFocus | null>(null);

  useEffect(() => {
    if (pendingFocus === null) {
      return;
    }
    if (pendingFocus.kind === "input") {
      addInputRef.current?.focus();
    } else if (pendingFocus.kind === "checkbox") {
      checkboxRefs.current.get(pendingFocus.id)?.focus();
    } else {
      removeRefs.current.get(pendingFocus.id)?.focus();
    }
    setPendingFocus(null);
  }, [pendingFocus, addInputRef]);

  const setCheckboxRef = (id: string) => (element: HTMLInputElement | null) => {
    if (element) {
      checkboxRefs.current.set(id, element);
      return () => {
        checkboxRefs.current.delete(id);
      };
    }
    checkboxRefs.current.delete(id);
  };

  const setRemoveRef = (id: string) => (element: HTMLButtonElement | null) => {
    if (element) {
      removeRefs.current.set(id, element);
      return () => {
        removeRefs.current.delete(id);
      };
    }
    removeRefs.current.delete(id);
  };

  const scheduleNeighbourFocus = (id: string, kind: "checkbox" | "remove") => {
    const index = tasks.findIndex((task) => task.id === id);
    const neighbour = tasks[index + 1] ?? tasks[index - 1];
    if (neighbour) {
      setPendingFocus({ kind, id: neighbour.id });
    } else {
      setPendingFocus({ kind: "input" });
    }
  };

  const handleToggle = (id: string) => {
    if (filter === "all") {
      dispatch(toggle(id));
      return;
    }
    scheduleNeighbourFocus(id, "checkbox");
    dispatch(toggle(id));
  };

  const handleRemove = (id: string) => {
    scheduleNeighbourFocus(id, "remove");
    dispatch(remove(id));
  };

  if (counts.all === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 text-text-muted">
        <svg
          className="w-16 h-16 mb-4 text-border-ui opacity-40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-xl font-bold text-text">All caught up!</p>
        <p className="text-base font-medium mt-1">Add your first task above.</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    const subtitle = filter === "all" ? "" : NO_MATCH_SUBTITLE[filter];
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 text-text-muted">
        <p className="text-xl font-bold text-text">Nothing here</p>
        <p className="text-base font-medium mt-1">{subtitle}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 pb-8 lg:pb-0">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={handleToggle}
          onRemove={handleRemove}
          checkboxRef={setCheckboxRef(task.id)}
          removeRef={setRemoveRef(task.id)}
        />
      ))}
    </ul>
  );
}
