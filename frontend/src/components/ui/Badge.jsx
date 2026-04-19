import { cn } from '../../lib/utils';

export default function Badge({ children, variant = 'primary', className }) {
  const variants = {
    primary: 'bg-primary/15 text-primary',
    secondary: 'bg-secondary-container text-on-secondary-container',
    tertiary: 'bg-tertiary/15 text-tertiary',
    error: 'bg-error/15 text-error',
    muted: 'bg-surface-high text-on-surface-variant',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-label font-medium tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
