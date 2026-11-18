import { FormattedMessage, useIntl } from "@atrio/i18n";
import { Card, CardTitle } from "@atrio/ui";
import { useDocumentTitle } from "./Page";

/**
 * Selector de residencial en estado vacío. El contrato todavía no expone «mis membresías»
 * (REP-03: no se inventa el endpoint); la lista real llega con M1.
 */
export function ResidentialSelectorPage() {
  const intl = useIntl();
  useDocumentTitle(intl.formatMessage({ id: "web.residentials.title" }));

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">
        <FormattedMessage id="web.residentials.title" />
      </h1>
      <Card>
        <CardTitle as="h2">
          <FormattedMessage id="web.residentials.empty.title" />
        </CardTitle>
        <p className="text-text-muted">
          <FormattedMessage id="web.residentials.empty.description" />
        </p>
      </Card>
    </section>
  );
}
