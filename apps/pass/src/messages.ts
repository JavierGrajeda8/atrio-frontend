import esGT from "@atrio/i18n/src/locales/es-GT.json";

// Solo el catálogo JSON y el tipo de sus ids: el paquete `@atrio/i18n` completo trae react-intl y
// rompería el presupuesto de la página del pase (VIS-01). Idioma por residencial: VIS-05, pendiente.
type PassMessageId = Extract<keyof typeof esGT, `pass.${string}`>;

export function t(id: PassMessageId): string {
  return esGT[id];
}
