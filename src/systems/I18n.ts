import { translations, type Language } from "../data/defaultTranslations";

let currentLanguage: Language = "fr";

export function setLanguage(language: Language): void {
  currentLanguage = language;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLanguage] ?? entry.fr ?? key;
}
