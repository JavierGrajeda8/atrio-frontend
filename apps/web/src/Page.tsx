import { FormattedMessage, useIntl } from "@atrio/i18n";
import type { MessageId } from "@atrio/i18n";
import { Button, Card } from "@atrio/ui";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

// El título del documento cambia con la ruta: así un lector de pantalla anuncia dónde está.
function useDocumentTitle(page: string): void {
  const intl = useIntl();
  const title = intl.formatMessage({ id: "web.documentTitle" }, { page });
  useEffect(() => {
    document.title = title;
  }, [title]);
}

/** Sección todavía sin contenido: la pantalla real llega con su milestone. */
export function Page({ titleId }: { titleId: MessageId }) {
  const intl = useIntl();
  const title = intl.formatMessage({ id: titleId });
  useDocumentTitle(title);

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <Card>
        <p className="text-text-muted">
          <FormattedMessage id="web.page.empty" />
        </p>
      </Card>
    </section>
  );
}

export function NotFound() {
  const intl = useIntl();
  useDocumentTitle(intl.formatMessage({ id: "web.notFound.title" }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4 py-8 font-body text-text">
      <h1 className="font-display text-3xl font-semibold">
        <FormattedMessage id="web.notFound.title" />
      </h1>
      <p className="text-text-muted">
        <FormattedMessage id="web.notFound.description" />
      </p>
      <div>
        <Button asChild>
          <Link to="/">
            <FormattedMessage id="web.notFound.back" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
