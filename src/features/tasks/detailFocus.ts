import { ADD_TASK_INPUT_ID } from "./taskFormIds.ts";

let pendingTaskId: string | null = null;

/** Ask the list to focus this task's title button once the detail route is left. */
export function requestListFocus(taskId: string): void {
  pendingTaskId = taskId;
}

/** Read and clear the pending focus request. */
export function consumeListFocusRequest(): string | null {
  const taskId = pendingTaskId;
  pendingTaskId = null;
  return taskId;
}

/** Focus the task title button, or the add field when the row is not rendered. */
export function focusTaskInList(taskId: string): void {
  const titleButton = document.querySelector<HTMLButtonElement>(
    `button[data-task-id="${CSS.escape(taskId)}"]`,
  );
  if (titleButton !== null) {
    titleButton.focus();
    return;
  }
  document.getElementById(ADD_TASK_INPUT_ID)?.focus();
}
