import { Badge, Button, Card, CardTitle, Field, GateStatus, Input } from "@atrio/ui";
import type { BadgeTone, ButtonVariant, GateStatusKind } from "@atrio/ui";
import { FormattedMessage, useIntl } from "@atrio/i18n";
import type { MessageId } from "@atrio/i18n";
import { useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const themes: Array<{ value: ThemeChoice; id: MessageId }> = [
  { value: "system", id: "ui.theme.system" },
  { value: "light", id: "ui.theme.light" },
  { value: "dark", id: "ui.theme.dark" },
];

const buttonVariants: Array<{ variant: ButtonVariant; id: MessageId }> = [
  { variant: "primary", id: "ui.button.primary" },
  { variant: "secondary", id: "ui.button.secondary" },
  { variant: "ghost", id: "ui.button.ghost" },
  { variant: "danger", id: "ui.button.danger" },
];

const gateStates: Array<{
  status: GateStatusKind;
  label: MessageId;
  details: MessageId;
}> = [
  { status: "granted", label: "ui.gate.granted", details: "ui.gate.granted.details" },
  { status: "denied", label: "ui.gate.denied", details: "ui.gate.denied.details" },
  { status: "offline", label: "ui.gate.offline", details: "ui.gate.offline.details" },
];

const badgeTones: Array<{ tone: BadgeTone; id: MessageId }> = [
  { tone: "neutral", id: "ui.badge.neutral" },
  { tone: "primary", id: "ui.badge.primary" },
  { tone: "success", id: "ui.badge.success" },
  { tone: "danger", id: "ui.badge.danger" },
  { tone: "warning", id: "ui.badge.warning" },
];

function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/** Catálogo de componentes de `@atrio/ui`: cada componente nuevo se agrega aquí con sus variantes. */
export function UiCatalog() {
  const intl = useIntl();
  const [theme, setTheme] = useState<ThemeChoice>(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "system",
  );

  function chooseTheme(choice: ThemeChoice): void {
    setTheme(choice);
    applyTheme(choice);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold">
          <FormattedMessage id="ui.title" />
        </h1>
        <div
          role="group"
          aria-label={intl.formatMessage({ id: "ui.theme.label" })}
          className="flex flex-wrap gap-2"
        >
          {themes.map(({ value, id }) => (
            <Button
              key={value}
              variant={theme === value ? "primary" : "secondary"}
              aria-pressed={theme === value}
              onClick={() => chooseTheme(value)}
            >
              <FormattedMessage id={id} />
            </Button>
          ))}
        </div>
      </header>

      <Card>
        <CardTitle as="h2">
          <FormattedMessage id="ui.button.title" />
        </CardTitle>
        <div className="flex flex-wrap gap-3">
          {buttonVariants.map(({ variant, id }) => (
            <Button key={variant} variant={variant}>
              <FormattedMessage id={id} />
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">
            <FormattedMessage id="ui.button.large" />
          </Button>
          <Button disabled>
            <FormattedMessage id="ui.button.disabled" />
          </Button>
          <Button asChild variant="secondary">
            <a href="#button">
              <FormattedMessage id="ui.button.asLink" />
            </a>
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle as="h2">
          <FormattedMessage id="ui.field.title" />
        </CardTitle>
        <Field
          label={intl.formatMessage({ id: "ui.field.visitor.label" })}
          description={intl.formatMessage({ id: "ui.field.visitor.description" })}
        >
          <Input name="visitor" autoComplete="off" />
        </Field>
        <Field
          label={intl.formatMessage({ id: "ui.field.phone.label" })}
          required
          error={intl.formatMessage({ id: "ui.field.phone.error" })}
        >
          <Input name="phone" inputMode="numeric" defaultValue="55" />
        </Field>
        <Field label={intl.formatMessage({ id: "ui.field.unit.label" })}>
          <Input name="unit" disabled defaultValue="A-12" />
        </Field>
      </Card>

      <Card>
        <CardTitle as="h2">
          <FormattedMessage id="ui.card.title" />
        </CardTitle>
        <p className="text-sm text-text-muted">
          <FormattedMessage id="ui.card.description" />
        </p>
        <Card className="bg-surface-muted shadow-none">
          <CardTitle as="h3">
            <FormattedMessage id="ui.card.nested.title" />
          </CardTitle>
          <p className="text-sm">
            <FormattedMessage id="ui.card.nested.description" />
          </p>
        </Card>
      </Card>

      <Card>
        <CardTitle as="h2">
          <FormattedMessage id="ui.badge.title" />
        </CardTitle>
        <div className="flex flex-wrap gap-3">
          {badgeTones.map(({ tone, id }) => (
            <Badge key={tone} tone={tone}>
              <FormattedMessage id={id} />
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle as="h2">
          <FormattedMessage id="ui.gate.title" />
        </CardTitle>
        <div className="flex flex-col gap-3">
          {gateStates.map(({ status, label, details }) => (
            <GateStatus
              key={status}
              status={status}
              className="min-h-72 rounded-lg"
              label={intl.formatMessage({ id: label })}
              details={intl.formatMessage({ id: details })}
              actions={
                status === "offline" ? (
                  <Button size="lg" variant="secondary">
                    <FormattedMessage id="ui.gate.action" />
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </Card>
    </main>
  );
}
