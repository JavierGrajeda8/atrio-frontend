import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `lg` cumple el objetivo táctil de garita (56 px). */
  size?: ButtonSize;
  /** Renderiza el hijo (p. ej. un `<a>`) con los estilos del botón. */
  asChild?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-body font-bold " +
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-border-strong bg-surface text-text hover:bg-surface-muted",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  danger: "bg-danger text-surface hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-touch-min px-4 text-sm",
  lg: "min-h-touch-gate px-6 text-md",
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      {...(asChild ? {} : { type })}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
