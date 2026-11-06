import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import { openGuide } from "../../guide/guideSlice.ts";
import { filterPaths } from "../../tasks/filter.ts";
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
  "flex items-center gap-3 px-3 py-2 rounded-card border-2 border-border-ui cursor-pointer font-bold text-text transition-colors motion-reduce:transition-none has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring min-h-[44px] min-w-[44px]";

export function SettingsView() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useAppSelector(selectTheme);
  const accent = useAppSelector(selectAccent);
  const language = useAppSelector(selectLanguage);
  const showKeyboardHints = useAppSelector(selectShowKeyboardHints);

  // The tour highlights task-view targets, so replay starts from the list.
  const handleReplay = () => {
    navigate(filterPaths.all);
    dispatch(openGuide());
  };

  return (
    <div className="flex-1 lg:overflow-y-auto w-full lg:pl-16 xl:pl-24 lg:pr-8">
      <div className="w-full max-w-[44rem] px-4 lg:px-0 pt-2 pb-6 lg:py-10 flex flex-col gap-6 stagger">
        <header>
          <NavLink
            to={filterPaths.all}
            className="lg:hidden group/back flex w-fit items-center gap-2 -ml-2 mb-2 px-2 py-1.5 rounded-card text-sm font-bold text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none min-h-[44px] min-w-[44px]"
          >
            <svg
              className="w-4 h-4 transition-transform motion-reduce:transition-none group-hover/back:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("settings.back")}
          </NavLink>
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
          <div className="flex flex-col gap-1">
            <label
              htmlFor="settings-keyboard-hints"
              className="flex items-center gap-3 cursor-pointer font-bold text-text min-h-[44px] py-1"
            >
              <input
                type="checkbox"
                id="settings-keyboard-hints"
                checked={showKeyboardHints}
                aria-describedby="settings-keyboard-hints-help"
                onChange={(event) => dispatch(setShowKeyboardHints(event.target.checked))}
                className="accent-accent w-5 h-5 shrink-0"
              />
              <span>{t("settings.showHints")}</span>
            </label>
            <p id="settings-keyboard-hints-help" className="text-sm font-medium text-text-muted">
              {t("settings.showHintsHelp")}
            </p>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <h3 className="text-base font-extrabold text-text -mb-1">{t("settings.guideLegend")}</h3>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-muted">{t("settings.replayHelp")}</p>
            <button
              type="button"
              onClick={handleReplay}
              className="self-start bg-accent text-accent-text rounded-pill px-5 py-2 text-sm font-bold shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all motion-reduce:transition-none min-h-[44px] min-w-[44px]"
            >
              {t("settings.replayTour")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
