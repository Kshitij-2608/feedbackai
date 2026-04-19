import { cn } from '../../lib/utils';

export default function Input({ label, error, className, id, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-label font-medium text-on-surface-variant uppercase tracking-[0.08em]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full bg-transparent px-0 py-2.5 text-on-surface text-sm font-body outline-none',
          'border-b border-outline-variant/20 transition-all duration-300',
          'placeholder:text-on-surface-variant/50',
          'focus:border-b-primary focus:[box-shadow:0_2px_12px_-4px_var(--color-primary)/20]',
          error && 'border-b-error',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
    </div>
  );
}
