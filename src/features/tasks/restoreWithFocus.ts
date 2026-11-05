import type { AppDispatch, RootState } from "../../app/store.ts";
import type { Filter } from "./filter.ts";
import { selectVisibleTasks } from "./selectors.ts";
import { ADD_TASK_INPUT_ID } from "./taskFormIds.ts";
import { restore } from "./tasksSlice.ts";

export function focusAfterRestore(taskId: string, isVisible: boolean): void {
  if (isVisible) {
    const titleButton = document.querySelector<HTMLButtonElement>(
      `button[data-task-id="${CSS.escape(taskId)}"]`,
    );
    if (titleButton !== null) {
      titleButton.focus();
      return;
    }
  }
  document.getElementById(ADD_TASK_INPUT_ID)?.focus();
}

export function restoreDeletedTaskWithFocus(
  dispatch: AppDispatch,
  getState: () => RootState,
  filter: Filter,
): void {
  const snapshot = getState().tasks.lastRemoved;
  if (snapshot === null) {
    return;
  }
  const taskId = snapshot.task.id;
  dispatch(restore());
  queueMicrotask(() => {
    const visible = selectVisibleTasks(getState(), filter).some((task) => task.id === taskId);
    focusAfterRestore(taskId, visible);
  });
}
