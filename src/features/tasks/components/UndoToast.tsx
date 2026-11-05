import { useEffect } from "react";
import { useStore } from "react-redux";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import type { RootState } from "../../../app/store.ts";
import { restoreDeletedTaskWithFocus } from "../restoreWithFocus.ts";
import { clearLastRemoved } from "../tasksSlice.ts";
import { useRouteFilter } from "../useRouteFilter.ts";

const AUTO_HIDE_MS = 5000;

export function UndoToast() {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const lastRemoved = useAppSelector((state) => state.tasks.lastRemoved);
  const filter = useRouteFilter();

  useEffect(() => {
    if (lastRemoved == null) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch(clearLastRemoved());
    }, AUTO_HIDE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dispatch, lastRemoved]);

  if (lastRemoved == null) {
    return null;
  }

  const handleUndo = () => {
    restoreDeletedTaskWithFocus(dispatch, () => store.getState(), filter);
  };

  return (
    <div
      role="status"
      className="flex fixed lg:absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 left-1/2 lg:left-[26rem] xl:left-[30rem] -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-surface border border-border shadow-2xl rounded-card p-4 items-center justify-between z-40 transition-transform duration-300"
    >
      <span className="font-bold text-text">Task deleted</span>
      <button
        type="button"
        onClick={handleUndo}
        className="text-accent font-extrabold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1 transition-colors min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 flex items-center justify-center"
      >
        Undo
      </button>
    </div>
  );
}
