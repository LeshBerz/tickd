(() => {
  const STORAGE_KEY = "tickd:preferences";
  const THEMES = ["system", "light", "dark"];
  const ACCENTS = ["teal", "blue", "violet", "amber", "rose"];
  const LANGUAGES = ["en", "ru"];
  const root = document.documentElement;

  const pick = (value, allowed) =>
    typeof value === "string" && allowed.indexOf(value) !== -1 ? value : null;

  const readPreferences = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed && parsed.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  };

  const systemPrefersDark = () => {
    try {
      return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    } catch {
      return false;
    }
  };

  const preferences = readPreferences();
  const theme = preferences ? pick(preferences.theme, THEMES) : null;
  const accent = preferences ? pick(preferences.accent, ACCENTS) : null;
  const language = preferences ? pick(preferences.language, LANGUAGES) : null;
  const dark = theme === "dark" || (theme !== "light" && systemPrefersDark());

  if (dark) {
    root.classList.add("dark");
  }
  root.setAttribute("data-accent", accent || "teal");
  if (language !== null) {
    root.setAttribute("lang", language);
  }
})();
