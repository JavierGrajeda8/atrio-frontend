import type { IntlConfig } from "react-intl";
import messagesesGT from "./locales/es-GT.json";
import messagesEnUS from "./locales/en-US.json";

export const PACKAGE_NAME = "@atrio/i18n";

export type Locale = "es-GT" | "en-US" | "es-MX" | "es-CO";

export const LOCALES: Record<Locale, Record<string, string>> = {
  "es-GT": messagesesGT,
  "en-US": messagesEnUS,
  "es-MX": messagesesGT, // Use es-GT as fallback for now
  "es-CO": messagesesGT, // Use es-GT as fallback for now
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
export function getMessages(locale: Locale): Record<string, string> {
  return LOCALES[locale] || LOCALES[DEFAULT_LOCALE];
}

/**
 * Get Intl config for react-intl integration
 */
export function getIntlConfig(locale: Locale): Partial<IntlConfig> {
  return {
    locale,
    messages: getMessages(locale),
    defaultLocale: DEFAULT_LOCALE,
  };
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
  return formatDateInTimezone(date, timezone, locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone,
  });
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

// Export ESLint rule
export { default as noLiteralStringRule } from "./eslint-rule";
