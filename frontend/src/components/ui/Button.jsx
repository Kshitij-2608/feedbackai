import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-primary-gradient text-on-primary rounded-full px-6 py-3 font-headline font-semibold text-sm tracking-wide shadow-[0_0_20px_-4px] shadow-primary-dim/40 hover:shadow-[0_0_30px_-4px] hover:shadow-primary-dim/60 hover:scale-[1.02] active:scale-[0.98]',
  secondary: 'bg-surface-variant/20 backdrop-blur-[10px] text-primary rounded-full px-6 py-3 font-headline font-semibold text-sm ghost-border hover:bg-surface-high/40 hover:scale-[1.02] active:scale-[0.98]',
  ghost: 'text-primary rounded-md px-5 py-2.5 text-sm font-semibold hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98]',
  danger: 'bg-error/10 text-error rounded-full px-6 py-3 font-semibold text-sm hover:bg-error/20 hover:scale-[1.02] active:scale-[0.98]',
};

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export default function Button({ variant = 'primary', size, className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        size && sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
