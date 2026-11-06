export const NOTES_MAX_LENGTH = 2000;

/** The notes field starts at this height and grows with the content. */
export const NOTES_MIN_HEIGHT = 112;

/** Growth stops here: longer notes scroll inside the field instead of taking the page. */
export const NOTES_MAX_HEIGHT = 420;

/** Truncate to NOTES_MAX_LENGTH (UTF-16 length). */
export function clampNotesLength(value: string): string {
  return value.slice(0, NOTES_MAX_LENGTH);
}

/**
 * Height for the auto-growing notes field: the measured content height, kept between
 * the starting height and the cap so a long note never pushes the rest of the panel away.
 */
export function notesFieldHeight(contentHeight: number): number {
  if (!Number.isFinite(contentHeight)) {
    return NOTES_MIN_HEIGHT;
  }
  return Math.min(Math.max(contentHeight, NOTES_MIN_HEIGHT), NOTES_MAX_HEIGHT);
}
