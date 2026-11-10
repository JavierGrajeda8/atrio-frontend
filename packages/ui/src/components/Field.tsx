import { Label } from "@radix-ui/react-label";
import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

interface FieldContextValue {
  inputId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: ReactNode;
  description?: ReactNode;
  /** Mensaje de error ya localizado; marca el campo como inválido. */
  error?: ReactNode;
  required?: boolean;
  className?: string;
  /** El control (normalmente un `Input`) que hereda id, `aria-describedby` y `aria-invalid`. */
  children: ReactNode;
}

export function Field({
  label,
  description,
  error,
  required = false,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider
      value={{ inputId: `${id}-input`, describedBy, invalid: Boolean(error), required }}
    >
      <div className={cn("flex flex-col gap-2", className)}>
        <Label htmlFor={`${id}-input`} className="font-body text-sm font-bold text-text">
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Label>
        {description ? (
          <p id={descriptionId} className="text-xs text-text-muted">
            {description}
          </p>
        ) : null}
        {children}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-bold text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
