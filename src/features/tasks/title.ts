export const TITLE_MAX_LENGTH = 200;

/** Newlines → space; collapse whitespace runs in the pasted fragment. */
export function normalizePastedTitle(pasted: string): string {
  return pasted.replace(/\r\n?/g, "\n").replace(/\n/g, " ").replace(/\s+/g, " ");
}

/** Truncate to TITLE_MAX_LENGTH (UTF-16 length). */
export function clampTitleLength(value: string): string {
  return value.slice(0, TITLE_MAX_LENGTH);
}
