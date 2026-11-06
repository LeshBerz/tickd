import { describe, expect, test } from "vitest";
import {
  clampNotesLength,
  NOTES_MAX_HEIGHT,
  NOTES_MAX_LENGTH,
  NOTES_MIN_HEIGHT,
  notesFieldHeight,
} from "./notes.ts";

describe("clampNotesLength", () => {
  test("keeps short notes and truncates long ones", () => {
    expect(clampNotesLength("short")).toBe("short");
    expect(clampNotesLength("a".repeat(2500))).toHaveLength(NOTES_MAX_LENGTH);
  });
});

describe("notesFieldHeight", () => {
  test("never shrinks below the starting height", () => {
    expect(notesFieldHeight(0)).toBe(NOTES_MIN_HEIGHT);
    expect(notesFieldHeight(NOTES_MIN_HEIGHT - 40)).toBe(NOTES_MIN_HEIGHT);
  });

  test("follows the content between the two limits", () => {
    expect(notesFieldHeight(NOTES_MIN_HEIGHT + 120)).toBe(NOTES_MIN_HEIGHT + 120);
  });

  test("stops at the cap so a long note scrolls instead of growing", () => {
    expect(notesFieldHeight(NOTES_MAX_HEIGHT + 500)).toBe(NOTES_MAX_HEIGHT);
    expect(notesFieldHeight(NOTES_MAX_HEIGHT)).toBe(NOTES_MAX_HEIGHT);
  });

  test("falls back to the starting height for a missing measurement", () => {
    expect(notesFieldHeight(Number.NaN)).toBe(NOTES_MIN_HEIGHT);
    expect(notesFieldHeight(Number.POSITIVE_INFINITY)).toBe(NOTES_MIN_HEIGHT);
  });

  test("keeps the cap above the starting height", () => {
    expect(NOTES_MAX_HEIGHT).toBeGreaterThan(NOTES_MIN_HEIGHT);
  });
});
