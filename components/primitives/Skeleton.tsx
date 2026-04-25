import { cn } from "@/lib/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "rect" | "circle";
};

export function Skeleton({ className, variant = "rect", ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-pulse bg-surface-raised",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded h-4",
        variant === "rect" && "rounded-md",
        className,
      )}
      {...props}
    />
  );
}
