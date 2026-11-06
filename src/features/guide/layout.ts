export type Rect = { top: number; left: number; width: number; height: number };
export type Viewport = { width: number; height: number };
export type CardPosition = { top: number; left: number; width: number };

/** Card width cap and viewport breathing room, in CSS pixels. */
export const CARD_MAX_WIDTH = 352;
export const VIEWPORT_MARGIN = 16;
/** Space between the highlighted target and the card. */
export const CARD_GAP = 14;
/** Padding of the spotlight ring around the target. */
export const SPOTLIGHT_PADDING = 6;

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

/** Expands a target rectangle into the highlighted area, without leaving the viewport. */
export function spotlightRect(anchor: Rect, viewport: Viewport): Rect {
  const top = Math.max(0, anchor.top - SPOTLIGHT_PADDING);
  const left = Math.max(0, anchor.left - SPOTLIGHT_PADDING);
  const right = Math.min(viewport.width, anchor.left + anchor.width + SPOTLIGHT_PADDING);
  const bottom = Math.min(viewport.height, anchor.top + anchor.height + SPOTLIGHT_PADDING);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/**
 * Places the tour card near the highlighted target: below it when there is room,
 * otherwise above, otherwise pinned to the bottom edge. A missing target centres the card.
 */
export function placeCard(
  anchor: Rect | null,
  viewport: Viewport,
  cardHeight: number,
): CardPosition {
  const width = Math.min(CARD_MAX_WIDTH, Math.max(0, viewport.width - VIEWPORT_MARGIN * 2));
  const height = Math.min(cardHeight, Math.max(0, viewport.height - VIEWPORT_MARGIN * 2));

  if (anchor === null) {
    return {
      top: Math.max(VIEWPORT_MARGIN, (viewport.height - height) / 2),
      left: Math.max(VIEWPORT_MARGIN, (viewport.width - width) / 2),
      width,
    };
  }

  const maxLeft = viewport.width - width - VIEWPORT_MARGIN;
  const left = clamp(anchor.left, VIEWPORT_MARGIN, maxLeft);

  const below = anchor.top + anchor.height + SPOTLIGHT_PADDING + CARD_GAP;
  if (below + height <= viewport.height - VIEWPORT_MARGIN) {
    return { top: below, left, width };
  }

  const above = anchor.top - SPOTLIGHT_PADDING - CARD_GAP - height;
  if (above >= VIEWPORT_MARGIN) {
    return { top: above, left, width };
  }

  return {
    top: Math.max(VIEWPORT_MARGIN, viewport.height - height - VIEWPORT_MARGIN),
    left,
    width,
  };
}
