// P3 Forge — Language utilities

import { LANGUAGE } from '../api/types';

const LANGUAGE_CODES: Record<number, string> = {
  [LANGUAGE.DE]: 'de',
  [LANGUAGE.EN]: 'en',
  [LANGUAGE.ES]: 'es',
  [LANGUAGE.FR]: 'fr',
};

const LANGUAGE_NAMES: Record<number, string> = {
  [LANGUAGE.DE]: 'Deutsch',
  [LANGUAGE.EN]: 'English',
  [LANGUAGE.ES]: 'Español',
  [LANGUAGE.FR]: 'Français',
};

export function getLanguageCode(langId: number): string {
  return LANGUAGE_CODES[langId] ?? 'en';
}

export function getLanguageName(langId: number): string {
  return LANGUAGE_NAMES[langId] ?? 'English';
}
