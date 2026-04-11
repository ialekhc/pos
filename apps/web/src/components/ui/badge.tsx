import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'default' | 'secondary' | 'outline';

export function Badge({
  children,
  className,
  variant = 'secondary'
}: {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  const variantClass =
    variant === 'default'
      ? 'bg-primary text-primary-foreground'
      : variant === 'outline'
        ? 'border-border bg-background text-foreground'
        : 'bg-secondary text-secondary-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold',
        variantClass,
        className
      )}
    >
      {children}
    </span>
  );
}
