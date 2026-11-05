export const NOTES_MAX_LENGTH = 2000;

/** Truncate to NOTES_MAX_LENGTH (UTF-16 length). */
export function clampNotesLength(value: string): string {
  return value.slice(0, NOTES_MAX_LENGTH);
}
