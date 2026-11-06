import { type RefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import { selectShowKeyboardHints } from "../../preferences/selectShowKeyboardHints.ts";
import { type Filter, taskPath } from "../filter.ts";
import { selectHasSampleTasks, selectTaskCounts, selectVisibleTasks } from "../selectors.ts";
import { remove, toggle, updateTitle } from "../tasksSlice.ts";
import { SampleTasksButton } from "./SampleTasksButton.tsx";
import { TaskItem } from "./TaskItem.tsx";

type Props = {
  filter: Filter;
  addInputRef: RefObject<HTMLInputElement | null>;
};

type PendingFocus =
  | { kind: "checkbox"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "title"; id: string }
  | { kind: "input" };

const NO_MATCH_SUBTITLE_KEYS: Record<Exclude<Filter, "all">, string> = {
  active: "tasks.noActive",
  completed: "tasks.noCompleted",
};

export function TaskList({ filter, addInputRef }: Props) {
  const { t } = useTranslation();
  const tasks = useAppSelector((state) => selectVisibleTasks(state, filter));
  const counts = useAppSelector(selectTaskCounts);
  const hasSamples = useAppSelector(selectHasSampleTasks);
  const showKeyboardHints = useAppSelector(selectShowKeyboardHints);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  const titleRefs = useRef(new Map<string, HTMLButtonElement>());
  const suppressBlurSaveRef = useRef(false);
  const editDraftRef = useRef("");
  const editingIdRef = useRef<string | null>(null);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<PendingFocus | null>(null);

  editingIdRef.current = editingId;

  useEffect(() => {
    if (editingId !== null && !tasks.some((task) => task.id === editingId)) {
      setEditingId(null);
    }
  }, [tasks, editingId]);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current !== null) {
        clearTimeout(switchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingFocus === null) {
      return;
    }
    if (pendingFocus.kind === "input") {
      addInputRef.current?.focus();
    } else if (pendingFocus.kind === "checkbox") {
      checkboxRefs.current.get(pendingFocus.id)?.focus();
    } else if (pendingFocus.kind === "title") {
      titleRefs.current.get(pendingFocus.id)?.focus();
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

  const setTitleRef = (id: string) => (element: HTMLButtonElement | null) => {
    if (element) {
      titleRefs.current.set(id, element);
      return () => {
        titleRefs.current.delete(id);
      };
    }
    titleRefs.current.delete(id);
  };

  const handleOpenTask = (id: string) => {
    navigate(taskPath(filter, id));
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

  const clearSwitchTimer = () => {
    if (switchTimerRef.current !== null) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
  };

  const closeEdit = (id: string) => {
    setEditingId(null);
    setPendingFocus({ kind: "title", id });
  };

  const applyBlurPolicy = (id: string, rawTitle: string) => {
    if (rawTitle.trim() === "") {
      closeEdit(id);
      return;
    }
    dispatch(updateTitle(id, rawTitle));
    closeEdit(id);
  };

  const handleTitleMouseDown = (id: string) => {
    const currentId = editingIdRef.current;
    if (currentId === null || currentId === id) {
      return;
    }
    // Suppress the blur that follows this mousedown. If it was only a single click,
    // commit via D18 after the double-click window; dblclick cancels the timer (D16).
    suppressBlurSaveRef.current = true;
    const fromId = currentId;
    const draft = editDraftRef.current;
    clearSwitchTimer();
    switchTimerRef.current = setTimeout(() => {
      switchTimerRef.current = null;
      if (editingIdRef.current !== fromId) {
        return;
      }
      applyBlurPolicy(fromId, draft);
    }, 350);
  };

  const handleStartEdit = (id: string) => {
    clearSwitchTimer();
    if (editingIdRef.current === id) {
      return;
    }
    if (editingIdRef.current !== null) {
      // D16: discard the previous draft (blur was already suppressed on mousedown).
      suppressBlurSaveRef.current = true;
    }
    const task = tasks.find((item) => item.id === id);
    if (task) {
      editDraftRef.current = task.title;
    }
    setEditingId(id);
  };

  const handleSaveEdit = (id: string, title: string) => {
    clearSwitchTimer();
    dispatch(updateTitle(id, title));
    closeEdit(id);
  };

  const handleCancelEdit = (id: string) => {
    clearSwitchTimer();
    closeEdit(id);
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
        <p className="text-xl font-bold text-text">{t("tasks.emptyTitle")}</p>
        {showKeyboardHints ? (
          <p className="text-base font-medium mt-1 hidden fine-pointer:flex items-center justify-center gap-1">
            {t("tasks.emptyHintBefore")}{" "}
            <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted shadow-sm mx-1">
              N
            </kbd>
            {t("tasks.emptyHintAfter")}
          </p>
        ) : null}
        <p
          className={`text-base font-medium mt-1${showKeyboardHints ? " fine-pointer:hidden" : ""}`}
        >
          {t("tasks.emptyFallback")}
        </p>
        {hasSamples ? null : <SampleTasksButton />}
      </div>
    );
  }

  if (tasks.length === 0) {
    const subtitle = filter === "all" ? "" : t(NO_MATCH_SUBTITLE_KEYS[filter]);
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 text-text-muted">
        <p className="text-xl font-bold text-text">{t("tasks.nothingTitle")}</p>
        <p className="text-base font-medium mt-1">{subtitle}</p>
      </div>
    );
  }

  return (
    <ul data-guide="task-list" className="stagger flex flex-col gap-3 pb-8 lg:pb-0">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={handleToggle}
          onRemove={handleRemove}
          checkboxRef={setCheckboxRef(task.id)}
          removeRef={setRemoveRef(task.id)}
          titleRef={setTitleRef(task.id)}
          isEditing={editingId === task.id}
          isAnotherTaskEditing={editingId !== null && editingId !== task.id}
          onStartEdit={handleStartEdit}
          onOpenTask={handleOpenTask}
          onTitleMouseDown={handleTitleMouseDown}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onDraftChange={(value) => {
            editDraftRef.current = value;
          }}
          suppressBlurSaveRef={suppressBlurSaveRef}
          showKeyboardHints={showKeyboardHints}
        />
      ))}
    </ul>
  );
}
