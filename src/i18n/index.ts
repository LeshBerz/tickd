import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { FALLBACK_LANGUAGE, LANGUAGES, type Language } from "../features/preferences/language.ts";
import { en } from "./en.ts";
import { ru } from "./ru.ts";

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: [...LANGUAGES],
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Switch the UI language and mirror it on `<html lang>`. */
export function applyLanguage(language: Language): void {
  if (i18n.resolvedLanguage !== language) {
    void i18n.changeLanguage(language);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

export { i18n };
