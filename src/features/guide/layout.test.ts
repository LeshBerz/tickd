import { describe, expect, test } from "vitest";
import { placeCard, type Rect, spotlightRect } from "./layout.ts";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 375, height: 667 };

const topLeft: Rect = { top: 20, left: 16, width: 200, height: 44 };
const middle: Rect = { top: 400, left: 600, width: 300, height: 60 };
const bottom: Rect = { top: 820, left: 40, width: 200, height: 60 };

describe("spotlightRect", () => {
  test("pads the target on every side", () => {
    expect(spotlightRect(middle, desktop)).toEqual({
      top: 394,
      left: 594,
      width: 312,
      height: 72,
    });
  });

  test("never leaves the viewport", () => {
    const edge: Rect = { top: 0, left: 0, width: 375, height: 44 };

    expect(spotlightRect(edge, mobile)).toEqual({ top: 0, left: 0, width: 375, height: 50 });
  });
});

describe("placeCard", () => {
  test("sits below a target that has room under it", () => {
    const position = placeCard(topLeft, desktop, 200);

    expect(position.top).toBe(20 + 44 + 6 + 14);
    expect(position.left).toBe(16);
    expect(position.width).toBe(352);
  });

  test("moves above a target near the bottom edge", () => {
    const position = placeCard(bottom, desktop, 200);

    expect(position.top).toBe(820 - 6 - 14 - 200);
  });

  test("clamps horizontally on a phone so the card stays inside the viewport", () => {
    const position = placeCard({ top: 300, left: 320, width: 40, height: 40 }, mobile, 180);

    expect(position.width).toBe(343);
    expect(position.left).toBe(16);
  });

  test("centres the card when there is no target", () => {
    const position = placeCard(null, desktop, 200);

    expect(position.left).toBe((1440 - 352) / 2);
    expect(position.top).toBe((900 - 200) / 2);
  });

  test("pins a tall card inside the viewport", () => {
    const position = placeCard(null, mobile, 900);

    expect(position.top).toBeGreaterThanOrEqual(16);
    expect(position.width).toBe(343);
  });
});
