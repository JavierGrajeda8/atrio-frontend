import type { ComponentProps } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "primary" | "success" | "danger" | "warning";

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
}

// El estado nunca depende solo del color: el badge siempre lleva texto.
const tones: Record<BadgeTone, string> = {
  neutral: "border-border-strong bg-surface-muted text-text",
  primary: "border-primary bg-primary-soft text-primary",
  success: "border-success bg-surface-muted text-success",
  danger: "border-danger bg-surface-muted text-danger",
  warning: "border-warning-text bg-surface-muted text-warning-text",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-1 font-body text-xs font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
