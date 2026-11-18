import { FormattedMessage, useIntl } from "@atrio/i18n";
import { Button, Card, Field, Input } from "@atrio/ui";
import type { FormEvent } from "react";
import { useDocumentTitle } from "./Page";

/**
 * Pantalla de login SIN conexión a un backend de autenticación (todavía no existe en el
 * contrato). No envía, guarda ni registra nada: el botón está deshabilitado y el formulario
 * ignora cualquier envío. El teléfono es un dato sensible (SEC-56).
 */
export function LoginPage() {
  const intl = useIntl();
  useDocumentTitle(intl.formatMessage({ id: "web.login.title" }));

  function ignoreSubmit(event: FormEvent): void {
    event.preventDefault();
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold">
          <FormattedMessage id="web.login.title" />
        </h1>
        <p className="text-text-muted">
          <FormattedMessage id="web.login.description" />
        </p>
      </div>
      <Card>
        <form onSubmit={ignoreSubmit} noValidate className="flex flex-col gap-4">
          <Field label={intl.formatMessage({ id: "web.login.phone.label" })}>
            <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" />
          </Field>
          <p id="login-unavailable" className="text-text-muted">
            <FormattedMessage id="web.login.unavailable" />
          </p>
          <Button type="submit" size="lg" disabled aria-describedby="login-unavailable">
            <FormattedMessage id="web.login.submit" />
          </Button>
        </form>
      </Card>
    </section>
  );
}
