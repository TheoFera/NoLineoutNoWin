import { translations, type Language } from "../data/defaultTranslations";

const LANGUAGE_KEY = "no-lineout-no-win.language";

function readStoredLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  return stored === "en" ? "en" : "fr";
}

let currentLanguage: Language = readStoredLanguage();

export function setLanguage(language: Language): void {
  currentLanguage = language;
  localStorage.setItem(LANGUAGE_KEY, language);
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLanguage] ?? entry.fr ?? key;
}
