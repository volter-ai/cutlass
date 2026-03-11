import { en, type Translations } from './translations/en';
import { es } from './translations/es';

export type Locale = 'en' | 'es';

export type { Translations };

export const translations: Record<Locale, Translations> = { en, es };
