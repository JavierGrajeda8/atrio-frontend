import { createElement } from "react";
import type { ReactNode } from "react";
import { IntlProvider } from "react-intl";
import messagesesGT from "./locales/es-GT.json";
import messagesEnUS from "./locales/en-US.json";

export const PACKAGE_NAME = "@atrio/i18n";

// Todo texto visible se usa desde aquí: `<FormattedMessage>` y `useIntl()` (I18N-01).
export { FormattedMessage, useIntl } from "react-intl";

export type Locale = "es-GT" | "en-US" | "es-MX" | "es-CO";

/** Ids de los mensajes: `es-GT` es el catálogo de referencia. */
export type MessageId = keyof typeof messagesesGT;
export type Messages = Record<MessageId, string>;

declare global {
  // Hace que `<FormattedMessage id>` y `formatMessage({ id })` solo acepten ids existentes.
  // react-intl solo permite tipar los ids con esta augmentación de `namespace`.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace FormatjsIntl {
    interface Message {
      ids: MessageId;
    }
  }
}

// Tipar cada catálogo como `Messages` hace que tsc falle si a `en-US` le falta una clave.
const esGT: Messages = messagesesGT;
const enUS: Messages = messagesEnUS;

export const LOCALES: Record<Locale, Messages> = {
  "es-GT": esGT,
  "en-US": enUS,
  "es-MX": esGT, // Use es-GT as fallback for now
  "es-CO": esGT, // Use es-GT as fallback for now
};

export const DEFAULT_LOCALE: Locale = "es-GT";

/**
 * Get all supported locales
 */
export function getSupportedLocales(): Locale[] {
  return Object.keys(LOCALES) as Locale[];
}

/**
 * Get messages for a specific locale
 */
export function getMessages(locale: Locale): Messages {
  return LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
}

/**
 * Get Intl config for react-intl integration
 */
export function getIntlConfig(locale: Locale): {
  locale: Locale;
  defaultLocale: Locale;
  messages: Messages;
} {
  return {
    locale,
    messages: getMessages(locale),
    defaultLocale: DEFAULT_LOCALE,
  };
}

/** Envuelve la app con los mensajes del idioma; `es-GT` por defecto (I18N-02). */
export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  return createElement(IntlProvider, getIntlConfig(locale), children);
}

/**
 * Format a date in the residential's timezone
 * @param date - The date to format
 * @param timezone - The IANA timezone (e.g., "America/Guatemala")
 * @param locale - The locale for formatting
 * @param options - Intl.DateTimeFormat options
 */
export function formatDateInTimezone(
  date: Date | string | number,
  timezone: string,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone,
  };

  const formatter = new Intl.DateTimeFormat(locale, {
    ...defaultOptions,
    ...options,
  });

  return formatter.format(dateObj);
}

/**
 * Format a time in the residential's timezone
 * @param date - The date to format
 * @param timezone - The IANA timezone (e.g., "America/Guatemala")
 * @param locale - The locale for formatting
 */
export function formatTimeInTimezone(
  date: Date | string | number,
  timezone: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone,
  }).format(typeof date === "object" ? date : new Date(date));
}

/**
 * Format a number according to locale
 * @param value - The number to format
 * @param locale - The locale for formatting
 * @param options - Intl.NumberFormat options
 */
export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const formatter = new Intl.NumberFormat(locale, options);
  return formatter.format(value);
}

/**
 * Format currency according to locale and currency
 * @param value - The amount to format
 * @param currency - The currency code (e.g., "GTQ", "USD")
 * @param locale - The locale for formatting
 * @param options - Intl.NumberFormat options
 */
export function formatCurrency(
  value: number,
  currency: "GTQ" | "USD" = "GTQ",
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  });
  return formatter.format(value);
}

/**
 * Validate that all locale catalogs have the same keys
 */
export function validateLocales(): { valid: boolean; missingKeys?: Record<string, string[]> } {
  const allKeys = new Set<string>();
  const localeKeys: Record<Locale, Set<string>> = {
    "es-GT": new Set(),
    "en-US": new Set(),
    "es-MX": new Set(),
    "es-CO": new Set(),
  };

  // Collect all keys
  Object.entries(LOCALES).forEach(([locale, messages]) => {
    const keys = Object.keys(messages);
    keys.forEach((key) => {
      allKeys.add(key);
      localeKeys[locale as Locale].add(key);
    });
  });

  // Check for missing keys in each locale
  const missingKeys: Record<string, string[]> = {};
  Object.entries(localeKeys).forEach(([locale, keys]) => {
    const missing = Array.from(allKeys).filter((key) => !keys.has(key));
    if (missing.length > 0) {
      missingKeys[locale] = missing;
    }
  });

  return {
    valid: Object.keys(missingKeys).length === 0,
    missingKeys: Object.keys(missingKeys).length > 0 ? missingKeys : undefined,
  };
}
