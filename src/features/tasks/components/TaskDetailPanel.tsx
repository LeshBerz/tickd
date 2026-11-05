import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import { requestListFocus } from "../detailFocus.ts";
import { filterPaths } from "../filter.ts";
import { clampNotesLength, NOTES_MAX_LENGTH } from "../notes.ts";
import { selectTaskById } from "../selectors.ts";
import { updateNotes } from "../tasksSlice.ts";
import { useRouteFilter } from "../useRouteFilter.ts";

type Props = {
  taskId: string;
};

export function TaskDetailPanel({ taskId }: Props) {
  const { t } = useTranslation();
  const task = useAppSelector((state) => selectTaskById(state, taskId));
  const filter = useRouteFilter();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const notesId = useId();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (task === null) {
    return <Navigate to={filterPaths[filter]} replace />;
  }

  const handleBack = () => {
    requestListFocus(taskId);
    navigate(filterPaths[filter]);
  };

  return (
    <aside
      aria-labelledby={headingId}
      className="w-full lg:w-[24rem] shrink-0 flex flex-col gap-6 px-4 lg:px-8 py-6 lg:py-10 max-lg:min-h-full"
    >
      <button
        type="button"
        onClick={handleBack}
        className="self-start -ml-2 flex items-center gap-2 px-2 py-1.5 rounded-card text-sm font-bold text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none min-h-[44px]"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("detail.back")}
      </button>

      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="text-2xl font-extrabold text-text break-words focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {task.title}
      </h2>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={notesId}
          className="text-xs font-bold text-text-muted uppercase tracking-wider"
        >
          {t("detail.notes")}
        </label>
        <textarea
          id={notesId}
          name="notes"
          value={task.notes}
          maxLength={NOTES_MAX_LENGTH}
          placeholder={t("detail.notesPlaceholder")}
          onChange={(event) => {
            dispatch(updateNotes(task.id, clampNotesLength(event.target.value)));
          }}
          className="w-full h-64 bg-surface border-2 border-border-ui rounded-card p-4 text-text placeholder:text-text-muted resize-none overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all motion-reduce:transition-none font-medium"
        />
        <p aria-hidden="true" className="text-right text-sm text-text-muted">
          {task.notes.length} / {NOTES_MAX_LENGTH}
        </p>
      </div>
    </aside>
  );
}
