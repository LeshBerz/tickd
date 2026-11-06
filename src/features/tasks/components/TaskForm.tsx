import { type Ref, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import { selectShowKeyboardHints } from "../../preferences/selectShowKeyboardHints.ts";
import { ADD_TASK_INPUT_ID } from "../taskFormIds.ts";
import { add } from "../tasksSlice.ts";
import { clampTitleLength, normalizePastedTitle, TITLE_MAX_LENGTH } from "../title.ts";

type Props = {
  inputRef?: Ref<HTMLInputElement>;
};

export function TaskForm({ inputRef }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const dispatch = useAppDispatch();
  const showHints = useAppSelector(selectShowKeyboardHints);
  const errorId = useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem("title");
    if (field instanceof HTMLInputElement) {
      field.focus();
    }
    if (value.trim() === "") {
      setError(true);
      return;
    }
    dispatch(add(value));
    setValue("");
    setError(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    if (error) {
      setError(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = normalizePastedTitle(event.clipboardData.getData("text/plain"));
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const next = clampTitleLength(value.slice(0, start) + pasted + value.slice(end));
    const caret = Math.min(start + pasted.length, next.length);
    setValue(next);
    if (error) {
      setError(false);
    }
    queueMicrotask(() => {
      input.setSelectionRange(caret, caret);
    });
  };

  return (
    <form className="mb-6 relative" data-guide="add-form" onSubmit={handleSubmit}>
      <label htmlFor={ADD_TASK_INPUT_ID} className="sr-only">
        {t("tasks.addLabel")}
      </label>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={ADD_TASK_INPUT_ID}
          name="title"
          value={value}
          maxLength={TITLE_MAX_LENGTH}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={t("tasks.addPlaceholder")}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? "true" : undefined}
          className={`w-full bg-surface lg:bg-bg border-2 rounded-pill py-3 lg:py-3.5 pl-5 lg:pl-6 pr-20 lg:pr-28 text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:border-transparent transition-all motion-reduce:transition-none font-medium ${
            error
              ? "border-danger focus-visible:ring-danger"
              : "border-border-ui focus-visible:ring-ring"
          }`}
        />
        {showHints ? (
          <div className="absolute right-24 mr-2 hidden fine-pointer:block">
            {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: decorative shortcut hint */}
            <kbd
              aria-hidden="true"
              className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted shadow-sm"
            >
              N
            </kbd>
          </div>
        ) : null}
        <button
          type="submit"
          className="absolute right-1.5 bg-accent text-accent-text hover:opacity-90 rounded-pill px-4 lg:px-5 py-2 lg:py-2.5 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:focus-visible:ring-offset-bg transition-all motion-reduce:transition-none shadow-sm min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0"
        >
          {t("tasks.add")}
        </button>
      </div>
      {value.length > 0 ? (
        <p
          aria-hidden="true"
          className={`text-right text-sm mt-1 mr-4 ${
            value.length === TITLE_MAX_LENGTH ? "text-danger" : "text-text-muted"
          }`}
        >
          {value.length} / {TITLE_MAX_LENGTH}
        </p>
      ) : null}
      <div
        id={errorId}
        aria-live="polite"
        className="text-danger text-sm font-bold mt-2 ml-4 empty:mt-0"
      >
        {error ? t("tasks.emptyLabel") : ""}
      </div>
    </form>
  );
}
