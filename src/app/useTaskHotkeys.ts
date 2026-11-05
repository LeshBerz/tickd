import { useEffect } from "react";
import { useStore } from "react-redux";
import { useNavigate } from "react-router";
import { type Filter, filterPaths } from "../features/tasks/filter.ts";
import { restoreDeletedTaskWithFocus } from "../features/tasks/restoreWithFocus.ts";
import { ADD_TASK_INPUT_ID } from "../features/tasks/taskFormIds.ts";
import { useRouteFilter } from "../features/tasks/useRouteFilter.ts";
import { useAppDispatch } from "./hooks.ts";
import type { RootState } from "./store.ts";

const FILTER_KEYS: Record<string, Filter> = {
  "1": "all",
  "2": "active",
  "3": "completed",
};

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(EDITABLE_SELECTOR) !== null;
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

function focusAddField(): void {
  document.getElementById(ADD_TASK_INPUT_ID)?.focus();
}

export function useTaskHotkeys(): void {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const filter = useRouteFilter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (hasModifier(event) || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key;

      if (key === "/" || key.toLowerCase() === "n") {
        event.preventDefault();
        focusAddField();
        return;
      }

      const filterKey = FILTER_KEYS[key];
      if (filterKey !== undefined) {
        event.preventDefault();
        navigate(filterPaths[filterKey]);
        return;
      }

      if (key.toLowerCase() === "z") {
        const hadUndo = store.getState().tasks.lastRemoved !== null;
        if (!hadUndo) {
          return;
        }
        event.preventDefault();
        restoreDeletedTaskWithFocus(dispatch, () => store.getState(), filter);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch, filter, navigate, store]);
}
