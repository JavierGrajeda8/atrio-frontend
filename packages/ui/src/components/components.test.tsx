// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Badge, Button, Card, CardTitle, Field, Input } from "../index";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

describe("Button", () => {
  it("es type=button por defecto para no enviar formularios por accidente", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" }).getAttribute("type")).toBe("button");
  });

  it("ejecuta onClick y no lo ejecuta cuando está deshabilitado", () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Activo</Button>
        <Button onClick={onClick} disabled>
          Inactivo
        </Button>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Activo" }));
    fireEvent.click(screen.getByRole("button", { name: "Inactivo" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("usa objetivos táctiles de 44 px (md) y 56 px (lg)", () => {
    render(
      <>
        <Button>Medio</Button>
        <Button size="lg">Grande</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Medio" }).className).toContain("min-h-touch-min");
    expect(screen.getByRole("button", { name: "Grande" }).className).toContain("min-h-touch-gate");
  });

  it("asChild aplica los estilos a un enlace sin forzar type", () => {
    render(
      <Button asChild>
        <a href="/destino">Ir</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ir" });
    expect(link.getAttribute("type")).toBeNull();
    expect(link.className).toContain("bg-primary");
  });
});

describe("Field e Input", () => {
  it("asocia la etiqueta con el input", () => {
    render(
      <Field label="Nombre">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre").tagName).toBe("INPUT");
  });

  it("enlaza descripción y error con aria-describedby y marca aria-invalid", () => {
    render(
      <Field label="Teléfono" description="Solo dígitos." error="Teléfono inválido.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Teléfono");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0] as string)?.textContent).toBe("Solo dígitos.");
    expect(document.getElementById(ids[1] as string)?.textContent).toBe("Teléfono inválido.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Teléfono inválido.");
  });

  it("sin error no marca el input como inválido", () => {
    render(
      <Field label="Nombre">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre").hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("required llega al input nativo", () => {
    render(
      <Field label="Unidad" required>
        <Input />
      </Field>,
    );
    expect((screen.getByLabelText(/Unidad/) as HTMLInputElement).required).toBe(true);
  });

  it("Input funciona solo, con sus propios atributos", () => {
    render(<Input aria-label="Buscar" aria-describedby="ayuda" />);
    expect(screen.getByLabelText("Buscar").getAttribute("aria-describedby")).toBe("ayuda");
  });
});

describe("Card", () => {
  it("el título respeta el nivel de encabezado pedido", () => {
    render(
      <Card>
        <CardTitle as="h2">Resumen</CardTitle>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Resumen" })).toBeTruthy();
  });
});

describe("Badge", () => {
  it("siempre muestra texto: el estado no depende solo del color", () => {
    render(<Badge tone="danger">Rechazado</Badge>);
    expect(screen.getByText("Rechazado").className).toContain("text-danger");
  });
});

function Components() {
  return (
    <main>
      <h1>Componentes</h1>
      <Card>
        <CardTitle as="h2">Formulario</CardTitle>
        <Field label="Nombre" description="Como en su documento.">
          <Input />
        </Field>
        <Field label="Teléfono" required error="Teléfono inválido.">
          <Input />
        </Field>
        <Button>Guardar</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="ghost">Omitir</Button>
        <Button variant="danger" size="lg">
          Eliminar
        </Button>
        <Button asChild>
          <a href="/destino">Enlace</a>
        </Button>
        <Badge>Neutral</Badge>
        <Badge tone="primary">Invitado</Badge>
        <Badge tone="success">Aprobado</Badge>
        <Badge tone="danger">Rechazado</Badge>
        <Badge tone="warning">Por vencer</Badge>
      </Card>
    </main>
  );
}

describe("accesibilidad (axe)", () => {
  // En jsdom la regla `color-contrast` de axe no puede evaluar estilos (queda "incompleta" y
  // muestra avisos de canvas); el contraste se mide sobre los tokens en tests/ui-contrast.test.ts.
  for (const theme of ["light", "dark"] as const) {
    it(`los 5 componentes no reportan violaciones en tema ${theme}`, async () => {
      document.documentElement.setAttribute("data-theme", theme);
      const { container } = render(<Components />);
      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  }

  it("el chequeo detecta violaciones reales (un input sin etiqueta)", async () => {
    const { container } = render(<Input />);
    const results = await axe(container);
    expect(results.violations.map((violation) => violation.id)).toContain("label");
  });
});
