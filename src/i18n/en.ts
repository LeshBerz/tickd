export const en = {
  nav: {
    filterLabel: "Filter tasks",
    tasks: "Tasks",
    all: "All",
    active: "Active",
    completed: "Completed",
    settings: "Settings",
  },
  tasks: {
    titleAll: "All tasks",
    titleActive: "Active",
    titleCompleted: "Completed",
    addLabel: "Add a task",
    addPlaceholder: "Add a task...",
    add: "Add",
    emptyLabel: "Task can't be empty",
    emptyTitle: "All caught up!",
    emptyHintBefore: "Press",
    emptyHintAfter: " to add a task.",
    emptyFallback: "Add your first task above.",
    nothingTitle: "Nothing here",
    noActive: "No active tasks.",
    noCompleted: "No completed tasks.",
    editLabel: "Edit task",
    editSaveHint: "to save",
    editCancelHint: "to cancel",
    toggleLabel: "Mark {{title}} as completed",
    deleteLabel: "Delete task: {{title}}",
    itemsLeft_one: "{{count}} item left",
    itemsLeft_other: "{{count}} items left",
    clearCompleted: "Clear completed",
    deleted: "Task deleted",
    undo: "Undo",
  },
  detail: {
    back: "Back to list",
    notes: "Notes",
    notesPlaceholder: "Add notes...",
  },
  storage: {
    unavailable: "Can't save tasks — browser storage is unavailable.",
    quota: "Can't save tasks — browser storage is full.",
    discarded: "Couldn't restore saved tasks. Starting fresh.",
    dismiss: "Dismiss",
  },
  settings: {
    title: "Settings",
    intro: "Preferences are stored in this browser and apply to the whole app.",
    appearance: "Appearance",
    themeLegend: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    accentLegend: "Accent color",
    accentTeal: "Teal",
    accentBlue: "Blue",
    accentViolet: "Violet",
    accentAmber: "Amber",
    accentRose: "Rose",
    languageLegend: "Language",
    languageEn: "English",
    languageRu: "Русский",
    keyboardLegend: "Keyboard",
    showHints: "Show keyboard shortcut hints",
    showHintsHelp: "Tip hints for filters, the add field and the undo action.",
  },
};

/** Plural keys differ per language; `en` only needs one/other, `ru` uses all four. */
export type PluralForms = Record<
  "itemsLeft_one" | "itemsLeft_few" | "itemsLeft_many" | "itemsLeft_other",
  string
>;

export type TranslationShape = Omit<typeof en, "tasks"> & {
  tasks: Omit<typeof en.tasks, "itemsLeft_one" | "itemsLeft_other"> & PluralForms;
};
