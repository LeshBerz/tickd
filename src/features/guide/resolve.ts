import { GUIDE_STEPS, type GuideStep } from "./steps.ts";

export type ResolvedStep = { step: GuideStep; element: HTMLElement | null };

/**
 * Whether the document has a real box model. jsdom always reports zero sizes,
 * so geometry-based visibility must only be trusted when layout actually exists.
 */
export function hasLayout(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const rect = document.body.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isVisible(element: HTMLElement, layout: boolean): boolean {
  if (!layout) {
    return true;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findTarget(step: GuideStep, root: ParentNode, layout: boolean): HTMLElement | null {
  for (const selector of step.targets) {
    // A selector may match both the mobile and the desktop variant of a control;
    // the hidden one has no box, so the first visible match wins.
    const matches = root.querySelectorAll(selector);
    for (const element of matches) {
      if (element instanceof HTMLElement && isVisible(element, layout)) {
        return element;
      }
    }
  }
  return null;
}

/**
 * A step without targets (the welcome card) is always kept. Steps whose target is
 * missing on this layout — hidden navigation, a filled list without the empty-state
 * button, the settings link on a narrow header — are skipped instead of pointing
 * at nothing, so the overlay never ends up broken or empty.
 */
export function resolveGuideSteps(
  root: ParentNode = document,
  layout: boolean = hasLayout(),
): ResolvedStep[] {
  const resolved: ResolvedStep[] = [];
  for (const step of GUIDE_STEPS) {
    if (step.targets.length === 0) {
      resolved.push({ step, element: null });
      continue;
    }
    const element = findTarget(step, root, layout);
    if (element !== null) {
      resolved.push({ step, element });
    }
  }
  return resolved;
}
