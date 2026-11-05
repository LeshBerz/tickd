import { i18n } from "../../i18n/index.ts";

/** Pluralized "N items left" label, localized through the shared i18n instance. */
export function formatItemsLeft(count: number): string {
  return i18n.t("tasks.itemsLeft", { count });
}
