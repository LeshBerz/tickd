export const GUIDE_STEP_IDS = ["welcome", "filters", "add", "task", "samples", "settings"] as const;
export type GuideStepId = (typeof GUIDE_STEP_IDS)[number];

export type GuideStep = {
  id: GuideStepId;
  /**
   * Candidate targets in priority order; the first one visible in the layout wins.
   * A step with no targets is always shown as a centred card without a highlight.
   */
  targets: readonly string[];
  titleKey: string;
  bodyKey: string;
};

/**
 * The tour declares up to five steps per screen: the welcome step has no target,
 * and either "task" (populated list) or "samples" (empty list) resolves, never both.
 */
export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: "welcome",
    targets: [],
    titleKey: "guide.welcomeTitle",
    bodyKey: "guide.welcomeBody",
  },
  {
    id: "filters",
    targets: ['nav[data-guide="filters"]'],
    titleKey: "guide.filtersTitle",
    bodyKey: "guide.filtersBody",
  },
  {
    id: "add",
    targets: ['form[data-guide="add-form"]'],
    titleKey: "guide.addTitle",
    bodyKey: "guide.addBody",
  },
  {
    id: "task",
    targets: ['ul[data-guide="task-list"]'],
    titleKey: "guide.taskTitle",
    bodyKey: "guide.taskBody",
  },
  {
    id: "samples",
    targets: ['[data-guide="sample-tasks"]'],
    titleKey: "guide.samplesTitle",
    bodyKey: "guide.samplesBody",
  },
  {
    id: "settings",
    targets: ['aside a[data-guide="settings"]', 'header a[data-guide="settings"]'],
    titleKey: "guide.settingsTitle",
    bodyKey: "guide.settingsBody",
  },
];
