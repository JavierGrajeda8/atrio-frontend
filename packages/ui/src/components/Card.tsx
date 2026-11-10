import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 text-text shadow-1",
        className,
      )}
      {...props}
    />
  );
}

export interface CardTitleProps extends ComponentProps<"h3"> {
  /** Nivel del encabezado; elige el que respete la jerarquía de la página. */
  as?: "h2" | "h3" | "h4";
}

export function CardTitle({ as: Heading = "h3", className, ...props }: CardTitleProps) {
  return <Heading className={cn("font-display text-lg font-semibold", className)} {...props} />;
}
