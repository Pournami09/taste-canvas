"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-md px-3 text-sm",
            "bg-[var(--input-bg)] text-[var(--input-fg)]",
            "border border-[var(--input-border)]",
            "placeholder:text-[var(--input-placeholder)]",
            "transition-colors focus:outline-none focus:border-[var(--input-border-focus)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-destructive-default focus:border-destructive-default",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive-default">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-md px-3 py-2 text-sm resize-none",
            "bg-[var(--input-bg)] text-[var(--input-fg)]",
            "border border-[var(--input-border)]",
            "placeholder:text-[var(--input-placeholder)]",
            "transition-colors focus:outline-none focus:border-[var(--input-border-focus)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-destructive-default",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive-default">{error}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
