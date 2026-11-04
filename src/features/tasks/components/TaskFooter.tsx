import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import type { RootState } from "../../../app/store.ts";
import { formatItemsLeft } from "../formatItemsLeft.ts";
import { selectTaskCounts, selectVisibleTasks } from "../selectors.ts";
import { ADD_TASK_INPUT_ID } from "../taskFormIds.ts";
import { clearCompleted } from "../tasksSlice.ts";
import { useRouteFilter } from "../useRouteFilter.ts";

type Props = { variant: "desktop" | "mobile" };

const CLEAR_BUTTON_CLASS =
  "text-sm font-bold text-text-muted hover:text-text disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded px-2 py-1 transition-colors min-h-[44px]";

const VARIANT_CLASS: Record<Props["variant"], string> = {
  desktop: "hidden lg:flex mt-4 pl-5 pr-2 justify-between items-center",
  mobile:
    "lg:hidden border-t border-border bg-surface px-4 py-4 flex justify-between items-center shrink-0 z-10 w-full",
};

export function TaskFooter({ variant }: Props): React.JSX.Element | null {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const filter = useRouteFilter();
  const counts = useAppSelector(selectTaskCounts);

  if (counts.all === 0) {
    return null;
  }

  const handleClear = () => {
    if (counts.completed === 0) {
      return;
    }
    dispatch(clearCompleted());
    const visible = selectVisibleTasks(store.getState(), filter);
    if (visible.length === 0) {
      const input = document.getElementById(ADD_TASK_INPUT_ID);
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
  };

  return (
    <footer className={VARIANT_CLASS[variant]}>
      <span className="text-sm font-bold text-text-muted">{formatItemsLeft(counts.active)}</span>
      <button
        type="button"
        disabled={counts.completed === 0}
        onClick={handleClear}
        className={CLEAR_BUTTON_CLASS}
      >
        Clear completed
      </button>
    </footer>
  );
}
