import { cn } from "@/lib/cn";

type Props = {
  label: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export function ComponentPreview({ label, description, className, children }: Props) {
  return (
    <section className="mb-12">
      <h2 className="text-base font-semibold text-text-primary mb-1">{label}</h2>
      {description && (
        <p className="text-sm text-text-secondary mb-4">{description}</p>
      )}
      <div
        className={cn(
          "rounded-lg border border-border-subtle bg-surface-raised",
          "flex flex-wrap items-center gap-4 p-8",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
