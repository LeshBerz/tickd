import { useEffect } from "react";
import { useAppSelector } from "../../app/hooks.ts";
import { applyLanguage } from "../../i18n/index.ts";
import { selectAccent, selectLanguage, selectTheme } from "./selectors.ts";
import { darkMediaQuery, resolveTheme, systemPrefersDark } from "./theme.ts";

/**
 * Mirrors preferences onto the document: the `.dark` class, the accent palette attribute
 * and `<html lang>`. Safe when `matchMedia` is missing (tests, non-browser environments).
 */
export function useApplyPreferences(): void {
  const theme = useAppSelector(selectTheme);
  const accent = useAppSelector(selectAccent);
  const language = useAppSelector(selectLanguage);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (prefersDark: boolean) => {
      root.classList.toggle("dark", resolveTheme(theme, prefersDark) === "dark");
    };

    apply(systemPrefersDark());

    if (theme !== "system") {
      return;
    }

    const query = darkMediaQuery();
    if (query === null) {
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      apply(event.matches);
    };

    query.addEventListener("change", handleChange);
    return () => {
      query.removeEventListener("change", handleChange);
    };
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);
}
