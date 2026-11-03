import type { Ref } from "react";
import type { Task } from "../schema.ts";

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  checkboxRef?: Ref<HTMLInputElement>;
  removeRef?: Ref<HTMLButtonElement>;
};

export function TaskItem({ task, onToggle, onRemove, checkboxRef, removeRef }: Props) {
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

      <span
        className={`flex-1 text-lg font-semibold px-2 lg:px-0 transition-colors motion-reduce:transition-none min-w-0 break-words ${
          task.completed ? "line-through text-text-muted" : "text-text"
        }`}
      >
        {task.title}
      </span>

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
