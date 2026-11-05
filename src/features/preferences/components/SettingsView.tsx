import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import { LANGUAGES, type Language } from "../language.ts";
import { ACCENTS, type Accent } from "../palettes.ts";
import { setAccent, setLanguage, setShowKeyboardHints, setTheme } from "../preferencesSlice.ts";
import { selectAccent, selectLanguage, selectTheme } from "../selectors.ts";
import { selectShowKeyboardHints } from "../selectShowKeyboardHints.ts";
import { THEMES, type ThemeMode } from "../theme.ts";

const THEME_LABEL_KEYS: Record<ThemeMode, string> = {
  system: "settings.themeSystem",
  light: "settings.themeLight",
  dark: "settings.themeDark",
};

const ACCENT_LABEL_KEYS: Record<Accent, string> = {
  teal: "settings.accentTeal",
  blue: "settings.accentBlue",
  violet: "settings.accentViolet",
  amber: "settings.accentAmber",
  rose: "settings.accentRose",
};

const LANGUAGE_LABEL_KEYS: Record<Language, string> = {
  en: "settings.languageEn",
  ru: "settings.languageRu",
};

const SWATCH_CLASS: Record<Accent, string> = {
  teal: "bg-swatch-teal",
  blue: "bg-swatch-blue",
  violet: "bg-swatch-violet",
  amber: "bg-swatch-amber",
  rose: "bg-swatch-rose",
};

const CARD_CLASS = "bg-card border border-border rounded-card p-4 lg:p-5 flex flex-col gap-4";
const LEGEND_CLASS = "text-xs font-bold text-text-muted uppercase tracking-wider mb-3";
const ROW_CLASS =
  "flex items-center gap-3 px-3 py-2 rounded-card border-2 border-border-ui cursor-pointer font-bold text-text transition-colors motion-reduce:transition-none has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring min-h-[44px]";

export function SettingsView() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const accent = useAppSelector(selectAccent);
  const language = useAppSelector(selectLanguage);
  const showKeyboardHints = useAppSelector(selectShowKeyboardHints);

  return (
    <div className="flex-1 lg:overflow-y-auto w-full lg:pl-16 xl:pl-24 lg:pr-8">
      <div className="w-full max-w-[44rem] px-4 lg:px-0 py-6 lg:py-10 flex flex-col gap-6">
        <header>
          <h2 className="text-2xl font-extrabold text-text">{t("settings.title")}</h2>
          <p className="text-sm font-medium text-text-muted mt-1">{t("settings.intro")}</p>
        </header>

        <section className={CARD_CLASS} aria-labelledby="settings-appearance">
          <h3 id="settings-appearance" className="text-base font-extrabold text-text -mb-1">
            {t("settings.appearance")}
          </h3>

          <fieldset>
            <legend className={LEGEND_CLASS}>{t("settings.themeLegend")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEMES.map((mode) => (
                <label key={mode} className={ROW_CLASS}>
                  <input
                    type="radio"
                    name="theme"
                    value={mode}
                    checked={theme === mode}
                    onChange={() => dispatch(setTheme(mode))}
                    className="accent-accent w-4 h-4"
                  />
                  <span>{t(THEME_LABEL_KEYS[mode])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND_CLASS}>{t("settings.accentLegend")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACCENTS.map((palette) => (
                <label key={palette} className={ROW_CLASS}>
                  <input
                    type="radio"
                    name="accent"
                    value={palette}
                    checked={accent === palette}
                    onChange={() => dispatch(setAccent(palette))}
                    className="accent-accent w-4 h-4"
                  />
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full border border-border ${SWATCH_CLASS[palette]}`}
                  />
                  <span>{t(ACCENT_LABEL_KEYS[palette])}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className={CARD_CLASS}>
          <fieldset>
            <legend className={LEGEND_CLASS}>{t("settings.languageLegend")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LANGUAGES.map((code) => (
                <label key={code} className={ROW_CLASS}>
                  <input
                    type="radio"
                    name="language"
                    value={code}
                    checked={language === code}
                    onChange={() => dispatch(setLanguage(code))}
                    className="accent-accent w-4 h-4"
                  />
                  <span lang={code}>{t(LANGUAGE_LABEL_KEYS[code])}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className={CARD_CLASS}>
          <h3 className="text-base font-extrabold text-text -mb-1">
            {t("settings.keyboardLegend")}
          </h3>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="settings-keyboard-hints"
              checked={showKeyboardHints}
              onChange={(event) => dispatch(setShowKeyboardHints(event.target.checked))}
              className="mt-1 accent-accent w-5 h-5 shrink-0"
            />
            <div className="flex flex-col">
              <label
                htmlFor="settings-keyboard-hints"
                className="font-bold text-text cursor-pointer"
              >
                {t("settings.showHints")}
              </label>
              <p className="text-sm font-medium text-text-muted">{t("settings.showHintsHelp")}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
