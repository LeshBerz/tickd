import { describe, expect, test } from "vitest";
import { en } from "./en.ts";
import { ru } from "./ru.ts";

type Nested = { [key: string]: string | Nested };

function flatten(dictionary: Nested, prefix = ""): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") {
      flat[path] = value;
    } else {
      Object.assign(flat, flatten(value, path));
    }
  }
  return flat;
}

const enFlat = flatten(en);
const ruFlat = flatten(ru);

const PLURAL_SUFFIXES = ["_one", "_other", "_few", "_many"] as const;

function isPluralKey(key: string): boolean {
  return PLURAL_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

describe("translation dictionaries", () => {
  test("every English key has a Russian translation", () => {
    const missing = Object.keys(enFlat).filter((key) => !isPluralKey(key) && !(key in ruFlat));

    expect(missing).toEqual([]);
  });

  test("Russian has no unexpected keys beyond its plural forms", () => {
    const extra = Object.keys(ruFlat).filter((key) => !(key in enFlat) && !isPluralKey(key));

    expect(extra).toEqual([]);
  });

  test("no translation is empty or a placeholder", () => {
    for (const [key, value] of Object.entries({ ...enFlat, ...ruFlat })) {
      expect(value.trim(), key).not.toBe("");
      expect(value, key).not.toBe(key);
    }
  });

  test("interpolated messages keep their placeholders", () => {
    for (const key of ["tasks.toggleLabel", "tasks.deleteLabel"]) {
      expect(enFlat[key]).toContain("{{title}}");
      expect(ruFlat[key]).toContain("{{title}}");
    }
  });

  test("Russian plural forms cover one, few, many and other", () => {
    for (const form of ["one", "few", "many", "other"]) {
      expect(ruFlat[`tasks.itemsLeft_${form}`]).toContain("{{count}}");
    }
    expect(enFlat["tasks.itemsLeft_one"]).toContain("{{count}}");
    expect(enFlat["tasks.itemsLeft_other"]).toContain("{{count}}");
  });
});
