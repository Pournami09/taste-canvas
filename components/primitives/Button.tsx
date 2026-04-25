"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-medium rounded-md",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent-default text-text-inverse hover:bg-accent-hover",
        secondary:
          "bg-surface-raised text-text-primary border border-border-default hover:bg-surface-subtle",
        ghost: "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
        destructive:
          "bg-destructive-default text-text-inverse hover:bg-destructive-hover",
      },
      size: {
        sm: "h-7 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
