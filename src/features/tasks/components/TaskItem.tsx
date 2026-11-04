import { type Ref, useEffect, useId, useRef, useState } from "react";
import type { Task } from "../schema.ts";
import { clampTitleLength, normalizePastedTitle, TITLE_MAX_LENGTH } from "../title.ts";

type BlurSuppressRef = { current: boolean };

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  checkboxRef?: Ref<HTMLInputElement>;
  removeRef?: Ref<HTMLButtonElement>;
  titleRef?: Ref<HTMLButtonElement>;
  isEditing?: boolean;
  onStartEdit?: (id: string) => void;
  onTitleMouseDown?: (id: string) => void;
  onSaveEdit?: (id: string, title: string) => void;
  onCancelEdit?: (id: string) => void;
  onDraftChange?: (value: string) => void;
  /** Set true before a programmatic exit so the following input blur is ignored. */
  suppressBlurSaveRef?: BlurSuppressRef;
};

const noopBlurSuppressRef: BlurSuppressRef = { current: false };

export function TaskItem({
  task,
  onToggle,
  onRemove,
  checkboxRef,
  removeRef,
  titleRef,
  isEditing = false,
  onStartEdit = () => {},
  onTitleMouseDown = () => {},
  onSaveEdit = () => {},
  onCancelEdit = () => {},
  onDraftChange = () => {},
  suppressBlurSaveRef = noopBlurSuppressRef,
}: Props) {
  const [editValue, setEditValue] = useState(task.title);
  const [error, setError] = useState(false);
  const [wasEditing, setWasEditing] = useState(isEditing);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editInputId = useId();
  const errorId = useId();

  if (isEditing !== wasEditing) {
    setWasEditing(isEditing);
    if (isEditing) {
      setEditValue(task.title);
      setError(false);
    }
  }

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    editInputRef.current?.focus();
  }, [isEditing]);

  const setDraft = (value: string) => {
    setEditValue(value);
    onDraftChange(value);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editValue.trim() === "") {
      setError(true);
      editInputRef.current?.focus();
      return;
    }
    suppressBlurSaveRef.current = true;
    onSaveEdit(task.id, editValue);
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    if (error) {
      setError(false);
    }
  };

  const handleEditPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = normalizePastedTitle(event.clipboardData.getData("text/plain"));
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const next = clampTitleLength(editValue.slice(0, start) + pasted + editValue.slice(end));
    const caret = Math.min(start + pasted.length, next.length);
    setDraft(next);
    if (error) {
      setError(false);
    }
    queueMicrotask(() => {
      input.setSelectionRange(caret, caret);
    });
  };

  const handleEditBlur = () => {
    if (suppressBlurSaveRef.current) {
      suppressBlurSaveRef.current = false;
      return;
    }
    if (editValue.trim() === "") {
      onCancelEdit(task.id);
      return;
    }
    onSaveEdit(task.id, editValue);
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      suppressBlurSaveRef.current = true;
      onCancelEdit(task.id);
    }
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onStartEdit(task.id);
    }
    if (event.key === " ") {
      event.preventDefault();
    }
  };

  if (isEditing) {
    return (
      <li className="bg-card border-2 border-accent shadow-md rounded-card p-3 flex flex-col gap-2 transition-colors motion-reduce:transition-none">
        <form className="flex-1 flex flex-col w-full relative" onSubmit={handleEditSubmit}>
          <label htmlFor={editInputId} className="sr-only">
            Edit task
          </label>
          <input
            ref={editInputRef}
            type="text"
            id={editInputId}
            name="title"
            value={editValue}
            maxLength={TITLE_MAX_LENGTH}
            onChange={handleEditChange}
            onPaste={handleEditPaste}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? "true" : undefined}
            className={`w-full bg-surface border rounded-lg px-3 py-3 text-lg font-bold text-text focus:outline-none focus-visible:ring-2 transition-all motion-reduce:transition-none ${
              error
                ? "border-danger focus-visible:ring-danger"
                : "border-border-ui focus-visible:ring-ring"
            }`}
          />
          <span className="hidden fine-pointer:flex text-xs text-text-muted font-bold px-2 mt-2 gap-3">
            <span className="flex items-center">
              <kbd className="inline-block font-sans text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted shadow-sm mr-1">
                Enter
              </kbd>
              to save
            </span>
            <span className="flex items-center">
              <kbd className="inline-block font-sans text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted shadow-sm mr-1">
                Esc
              </kbd>
              to cancel
            </span>
          </span>
          <div
            id={errorId}
            aria-live="polite"
            className="text-danger text-sm font-bold mt-2 ml-1 empty:mt-0"
          >
            {error ? "Task can't be empty" : ""}
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group relative bg-card hover:bg-card-hover border border-border shadow-sm rounded-card p-2 lg:p-3.5 flex items-center gap-2 lg:gap-3 transition-colors motion-reduce:transition-none">
      <label className="relative flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] lg:min-w-[32px] lg:min-h-[32px]">
        <input
          ref={checkboxRef}
          type="checkbox"
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          aria-label={`Mark ${task.title} as completed`}
        />
        <div className="pointer-events-none w-7 h-7 rounded-full border-2 border-border-ui peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card transition-all motion-reduce:transition-none flex items-center justify-center">
          <svg
            className="w-4 h-4 text-accent-text opacity-0 [.peer:checked~*_&]:opacity-100 transition-opacity motion-reduce:transition-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </label>

      <button
        ref={titleRef}
        type="button"
        onMouseDown={() => onTitleMouseDown(task.id)}
        onDoubleClick={() => onStartEdit(task.id)}
        onKeyDown={handleTitleKeyDown}
        className={`flex-1 text-lg font-semibold px-2 lg:px-0 transition-colors motion-reduce:transition-none min-w-0 break-words text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded ${
          task.completed ? "line-through text-text-muted" : "text-text"
        }`}
      >
        {task.title}
      </button>

      <button
        ref={removeRef}
        type="button"
        aria-label={`Delete task: ${task.title}`}
        onClick={() => onRemove(task.id)}
        className="opacity-100 lg:opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100 text-text-muted hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:text-danger rounded-full p-2 transition-all motion-reduce:transition-none flex items-center justify-center min-w-[44px] min-h-[44px] lg:min-w-[36px] lg:min-h-[36px]"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  );
}
