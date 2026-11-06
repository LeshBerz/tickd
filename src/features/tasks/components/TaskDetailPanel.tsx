import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import { requestListFocus } from "../detailFocus.ts";
import { filterPaths } from "../filter.ts";
import {
  clampNotesLength,
  NOTES_MAX_HEIGHT,
  NOTES_MAX_LENGTH,
  NOTES_MIN_HEIGHT,
  notesFieldHeight,
} from "../notes.ts";
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
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [notesHeight, setNotesHeight] = useState(NOTES_MIN_HEIGHT);
  const headingId = useId();
  const notesId = useId();
  const notes = task?.notes ?? "";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  /**
   * Measure the content with the height released, then clamp and hand the value back to
   * React. Both writes happen in the same layout effect, so nothing flickers on screen.
   * `notes` is the trigger: the field remounts per task (the panel is keyed by id).
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the note text is the trigger, the DOM is read through the ref
  useLayoutEffect(() => {
    const field = notesRef.current;
    if (field === null) {
      return;
    }
    const measure = () => {
      const border = field.offsetHeight - field.clientHeight;
      const applied = field.style.height;
      field.style.height = "auto";
      const contentHeight = field.scrollHeight + border;
      field.style.height = applied;
      setNotesHeight(notesFieldHeight(contentHeight));
    };
    measure();

    // A narrower panel re-wraps the same text, so the height must be measured again.
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [notes]);

  if (task === null) {
    return <Navigate to={filterPaths[filter]} replace />;
  }

  const handleBack = () => {
    requestListFocus(taskId);
    navigate(filterPaths[filter]);
  };

  // From `xl` the list column keeps its full width, so the card absorbs whatever is left;
  // between `lg` and `xl` the card keeps a comfortable minimum and the list yields room.
  return (
    <aside
      aria-labelledby={headingId}
      className="animate-rise w-full flex flex-col gap-6 px-4 xl:px-5 2xl:px-8 py-6 lg:py-10 max-lg:min-h-full lg:shrink-0 lg:grow lg:basis-0 lg:min-w-[20rem] xl:min-w-[12rem] lg:max-w-[46rem]"
    >
      <button
        type="button"
        onClick={handleBack}
        className="group/back self-start -ml-2 flex items-center gap-2 px-2 py-1.5 rounded-card text-sm font-bold text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none min-h-[44px]"
      >
        <svg
          className="w-4 h-4 transition-transform motion-reduce:transition-none group-hover/back:-translate-x-0.5"
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
          ref={notesRef}
          id={notesId}
          name="notes"
          value={notes}
          maxLength={NOTES_MAX_LENGTH}
          placeholder={t("detail.notesPlaceholder")}
          onChange={(event) => {
            dispatch(updateNotes(task.id, clampNotesLength(event.target.value)));
          }}
          style={{ height: notesHeight, maxHeight: NOTES_MAX_HEIGHT }}
          className="w-full bg-surface border-2 border-border-ui rounded-card p-4 text-text placeholder:text-text-muted resize-none overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-colors motion-reduce:transition-none font-medium"
        />
        <div className="flex justify-end">
          <p aria-hidden="true" className="text-sm font-medium text-text-muted">
            {task.notes.length} / {NOTES_MAX_LENGTH}
          </p>
        </div>
      </div>
    </aside>
  );
}
