import { Badge, Button, Card, CardTitle, Field, Input } from "@atrio/ui";
import type { BadgeTone, ButtonVariant } from "@atrio/ui";
import { useState } from "react";

type ThemeChoice = "system" | "light" | "dark";

const themes: Array<{ value: ThemeChoice; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const buttonVariants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];

const badgeTones: Array<{ tone: BadgeTone; label: string }> = [
  { tone: "neutral", label: "Neutral" },
  { tone: "primary", label: "Invitado" },
  { tone: "success", label: "Aprobado" },
  { tone: "danger", label: "Rechazado" },
  { tone: "warning", label: "Por vencer" },
];

function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

/** Catálogo de componentes de `@atrio/ui`: cada componente nuevo se agrega aquí con sus variantes. */
export function UiCatalog() {
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
        <h1 className="font-display text-2xl font-semibold">Catálogo de componentes</h1>
        <div role="group" aria-label="Tema" className="flex flex-wrap gap-2">
          {themes.map(({ value, label }) => (
            <Button
              key={value}
              variant={theme === value ? "primary" : "secondary"}
              aria-pressed={theme === value}
              onClick={() => chooseTheme(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </header>

      <Card>
        <CardTitle as="h2">Button</CardTitle>
        <div className="flex flex-wrap gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">Grande (garita)</Button>
          <Button disabled>Deshabilitado</Button>
          <Button asChild variant="secondary">
            <a href="#button">Como enlace</a>
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle as="h2">Input y Field</CardTitle>
        <Field label="Nombre del visitante" description="Como aparece en su documento.">
          <Input name="visitor" autoComplete="off" />
        </Field>
        <Field label="Teléfono" required error="Escribe un teléfono de 8 dígitos.">
          <Input name="phone" inputMode="numeric" defaultValue="55" />
        </Field>
        <Field label="Unidad">
          <Input name="unit" disabled defaultValue="A-12" />
        </Field>
      </Card>

      <Card>
        <CardTitle as="h2">Card</CardTitle>
        <p className="text-sm text-text-muted">
          Superficie con borde y sombra suave para agrupar contenido.
        </p>
        <Card className="bg-surface-muted shadow-none">
          <CardTitle as="h3">Tarjeta anidada</CardTitle>
          <p className="text-sm">Contenido secundario.</p>
        </Card>
      </Card>

      <Card>
        <CardTitle as="h2">Badge</CardTitle>
        <div className="flex flex-wrap gap-3">
          {badgeTones.map(({ tone, label }) => (
            <Badge key={tone} tone={tone}>
              {label}
            </Badge>
          ))}
        </div>
      </Card>
    </main>
  );
}
