import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, toggle }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex items-center justify-center w-10 h-10 rounded-full 
                 bg-surface-container hover:bg-surface-high transition-all duration-300 
                 hover:scale-110 group"
    >
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 
                       transition-opacity duration-300 glow-shadow" />
      {theme === 'dark' ? (
        <Sun size={18} className="text-primary transition-transform duration-300 group-hover:rotate-12" />
      ) : (
        <Moon size={18} className="text-primary transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
