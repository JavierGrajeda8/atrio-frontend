import type { ComponentProps } from "react";
import { cn } from "./cn";
import { useFieldContext } from "./Field";

export type InputProps = ComponentProps<"input">;

// El borde usa `text-muted` (≥ 3:1 sobre la superficie, WCAG 1.4.11); `border-strong` no alcanza.
// El foco usa `primary` y no `focus-ring`: ese token no cambia en oscuro y queda en 2.7:1.
const base =
  "min-h-touch-min w-full rounded-md border border-text-muted bg-surface px-3 font-body text-sm " +
  "text-text placeholder:text-text-muted outline-offset-2 " +
  "focus-visible:outline-2 focus-visible:outline-primary " +
  "aria-invalid:border-danger aria-invalid:border-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, id, required, ...props }: InputProps) {
  const field = useFieldContext();
  const describedBy =
    [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <input
      id={id ?? field?.inputId}
      required={required ?? field?.required}
      aria-invalid={props["aria-invalid"] ?? (field?.invalid ? true : undefined)}
      className={cn(base, className)}
      {...props}
      aria-describedby={describedBy}
    />
  );
}
