import { describe, expect, it } from "vitest";
import {
  PACKAGE_NAME,
  DEFAULT_LOCALE,
  type Locale,
  LOCALES,
  getSupportedLocales,
  getMessages,
  getIntlConfig,
  formatDateInTimezone,
  formatTimeInTimezone,
  formatNumber,
  formatCurrency,
  validateLocales,
} from "./index";

describe("@atrio/i18n", () => {
  it("expone el nombre del paquete", () => {
    expect(PACKAGE_NAME).toBe("@atrio/i18n");
  });

  it("tiene es-GT como locale por defecto", () => {
    expect(DEFAULT_LOCALE).toBe("es-GT");
  });

  describe("getSupportedLocales", () => {
    it("retorna un array de locales soportados", () => {
      const locales = getSupportedLocales();
      expect(locales).toContain("es-GT");
      expect(locales).toContain("en-US");
      expect(locales.length).toBeGreaterThan(0);
    });
  });

  describe("getMessages", () => {
    it("retorna los mensajes para es-GT", () => {
      const messages = getMessages("es-GT");
      expect(messages).toBeDefined();
      expect(messages["common.loading"]).toBe("Cargando…");
    });

    it("retorna los mensajes para en-US", () => {
      const messages = getMessages("en-US");
      expect(messages).toBeDefined();
      expect(messages["common.loading"]).toBe("Loading…");
    });

    it("retorna el locale por defecto si el locale no existe", () => {
      const messages = getMessages("invalid" as unknown as Locale);
      expect(messages).toEqual(getMessages(DEFAULT_LOCALE));
    });
  });

  describe("getIntlConfig", () => {
    it("retorna configuración de Intl para react-intl", () => {
      const config = getIntlConfig("es-GT");
      expect(config.locale).toBe("es-GT");
      expect(config.messages).toBeDefined();
      expect(config.defaultLocale).toBe("es-GT");
    });
  });

  describe("formatDateInTimezone", () => {
    const instant = new Date("2026-10-08T03:30:00Z");

    it("muestra la fecha y hora en la zona del residencial, no en UTC", () => {
      const formatted = formatDateInTimezone(instant, "America/Guatemala", "es-GT");
      // UTC-6 sin horario de verano: el 8 a las 03:30 UTC es el 7 a las 21:30 locales.
      expect(formatted).toContain("07/10/2026");
      expect(formatted).toContain("09:30:00");
    });

    it("el mismo instante se ve distinto según la zona del residencial", () => {
      const guatemala = formatDateInTimezone(instant, "America/Guatemala", "es-GT");
      const tokyo = formatDateInTimezone(instant, "Asia/Tokyo", "es-GT");
      const utc = formatDateInTimezone(instant, "UTC", "es-GT");
      expect(tokyo).toContain("08/10/2026");
      expect(tokyo).toContain("12:30:00");
      expect(utc).toContain("08/10/2026");
      expect(utc).toContain("03:30:00");
      expect(new Set([guatemala, tokyo, utc]).size).toBe(3);
    });

    it("ignora la zona horaria del dispositivo", () => {
      const original = process.env.TZ;
      process.env.TZ = "Asia/Tokyo";
      try {
        // Condición previa: el dispositivo realmente está en Tokio (12:30 locales).
        expect(instant.getHours()).toBe(12);
        const formatted = formatDateInTimezone(instant, "America/Guatemala", "es-GT");
        expect(formatted).toContain("07/10/2026");
        expect(formatted).toContain("09:30:00");
      } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
      }
    });

    it("acepta Date, string ISO y timestamp con el mismo resultado", () => {
      const fromDate = formatDateInTimezone(instant, "America/Guatemala", "es-GT");
      expect(formatDateInTimezone(instant.toISOString(), "America/Guatemala", "es-GT")).toBe(
        fromDate,
      );
      expect(formatDateInTimezone(instant.getTime(), "America/Guatemala", "es-GT")).toBe(fromDate);
    });

    it("respeta el idioma pedido", () => {
      expect(formatDateInTimezone(instant, "America/Guatemala", "en-US")).toContain("10/07/2026");
    });
  });

  describe("formatTimeInTimezone", () => {
    it("formatea solo la hora en la zona del residencial", () => {
      const formatted = formatTimeInTimezone(
        new Date("2026-10-08T03:30:00Z"),
        "America/Guatemala",
        "es-GT",
      );
      expect(formatted).toContain("09:30:00");
      expect(formatted).not.toContain("2026");
    });
  });

  describe("formatNumber", () => {
    it("formatea números según la locale es-GT", () => {
      const formatted = formatNumber(1234.56, "es-GT");
      expect(formatted).toBeDefined();
      // Guatemala uses comma as decimal separator
      expect(formatted).toContain("1");
    });

    it("formatea números según la locale en-US", () => {
      const formatted = formatNumber(1234.56, "en-US");
      expect(formatted).toBeDefined();
      // US uses period as decimal separator
      expect(formatted).toContain("1");
    });
  });

  describe("formatCurrency", () => {
    it("formatea moneda en GTQ para es-GT", () => {
      const formatted = formatCurrency(100, "GTQ", "es-GT");
      expect(formatted).toBeDefined();
      expect(formatted).toContain("100");
    });

    it("formatea moneda en USD para en-US", () => {
      const formatted = formatCurrency(100, "USD", "en-US");
      expect(formatted).toBeDefined();
      expect(formatted).toContain("100");
    });

    it("usa GTQ por defecto", () => {
      const formatted = formatCurrency(100, undefined, "es-GT");
      expect(formatted).toBeDefined();
    });
  });

  describe("validateLocales", () => {
    it("valida que todos los locales tengan las mismas claves", () => {
      const result = validateLocales();
      expect(result.valid).toBe(true);
      expect(result.missingKeys).toBeUndefined();
    });

    it("retorna estructura de validación correcta", () => {
      const result = validateLocales();
      expect(result).toHaveProperty("valid");
      expect(typeof result.valid).toBe("boolean");
    });
  });

  describe("catálogos de mensajes", () => {
    it("es-GT tiene mensajes comunes", () => {
      const messages = LOCALES["es-GT"];
      expect(messages["common.loading"]).toBeDefined();
      expect(messages["common.error"]).toBeDefined();
      expect(messages["common.retry"]).toBeDefined();
    });

    it("en-US tiene mensajes comunes", () => {
      const messages = LOCALES["en-US"];
      expect(messages["common.loading"]).toBeDefined();
      expect(messages["common.error"]).toBeDefined();
      expect(messages["common.retry"]).toBeDefined();
    });

    it("es-GT y en-US tienen las mismas claves", () => {
      const keysGT = Object.keys(LOCALES["es-GT"]).sort();
      const keysUS = Object.keys(LOCALES["en-US"]).sort();
      expect(keysGT).toEqual(keysUS);
    });
  });
});
