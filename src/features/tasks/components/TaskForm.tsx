import { type Ref, useId, useState } from "react";
import { useAppDispatch } from "../../../app/hooks.ts";
import { add } from "../tasksSlice.ts";

type Props = {
  inputRef?: Ref<HTMLInputElement>;
};

export function TaskForm({ inputRef }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const dispatch = useAppDispatch();
  const id = useId();
  const errorId = `${id}-error`;

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

  return (
    <form className="mb-6 relative" onSubmit={handleSubmit}>
      <label htmlFor={id} className="sr-only">
        Add a task
      </label>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name="title"
          value={value}
          onChange={handleChange}
          placeholder="Add a task..."
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? "true" : undefined}
          className={`w-full bg-surface lg:bg-bg border-2 rounded-pill py-3 lg:py-3.5 pl-5 lg:pl-6 pr-20 lg:pr-28 text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:border-transparent transition-all motion-reduce:transition-none font-medium ${
            error
              ? "border-danger focus-visible:ring-danger"
              : "border-border-ui focus-visible:ring-ring"
          }`}
        />
        <button
          type="submit"
          className="absolute right-1.5 bg-accent text-accent-text hover:opacity-90 rounded-pill px-4 lg:px-5 py-2 lg:py-2.5 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:focus-visible:ring-offset-bg transition-all motion-reduce:transition-none shadow-sm min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0"
        >
          Add
        </button>
      </div>
      <div
        id={errorId}
        aria-live="polite"
        className="text-danger text-sm font-bold mt-2 ml-4 empty:mt-0"
      >
        {error ? "Task can't be empty" : ""}
      </div>
    </form>
  );
}
