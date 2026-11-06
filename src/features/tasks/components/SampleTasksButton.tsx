import { useTranslation } from "react-i18next";
import { useAppDispatch } from "../../../app/hooks.ts";
import { SAMPLE_TASK_KEYS, type SampleTaskKey } from "../samples.ts";
import { addSamples } from "../tasksSlice.ts";

function translatedSamples(t: (key: string) => string): Record<SampleTaskKey, string> {
  const titles = {} as Record<SampleTaskKey, string>;
  for (const key of SAMPLE_TASK_KEYS) {
    titles[key] = t(`samples.${key}`);
  }
  return titles;
}

/**
 * Fills an empty list with the localized starter set through the domain action,
 * so the normal listener persistence path writes it and existing tasks are kept.
 */
export function SampleTasksButton() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <button
      type="button"
      data-guide="sample-tasks"
      onClick={() => dispatch(addSamples(translatedSamples(t)))}
      className="mt-5 text-sm font-bold text-accent border-2 border-accent rounded-pill px-4 py-2 min-h-[44px] hover:bg-accent hover:text-accent-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-colors motion-reduce:transition-none"
    >
      {t("samples.load")}
    </button>
  );
}
