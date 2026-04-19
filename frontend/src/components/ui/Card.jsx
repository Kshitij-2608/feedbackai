import { cn } from '../../lib/utils';

export default function Card({ className, children, level = 'default', glow = false, ...props }) {
  const levels = {
    low: 'bg-surface-low',
    default: 'bg-surface-container',
    high: 'bg-surface-high',
    highest: 'bg-surface-highest',
    glass: 'glass-panel',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-all duration-300',
        levels[level],
        glow && 'glow-shadow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
