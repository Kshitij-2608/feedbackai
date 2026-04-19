/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-lowest": "var(--color-surface-lowest)",
        "surface-low": "var(--color-surface-low)",
        "surface-container": "var(--color-surface-container)",
        "surface-high": "var(--color-surface-high)",
        "surface-highest": "var(--color-surface-highest)",
        "surface-variant": "var(--color-surface-variant)",
        "surface-tint": "var(--color-surface-tint)",

        primary: "var(--color-primary)",
        "primary-container": "var(--color-primary-container)",
        "primary-dim": "var(--color-primary-dim)",
        "on-primary": "var(--color-on-primary)",
        "on-primary-container": "var(--color-on-primary-container)",

        secondary: "var(--color-secondary)",
        "secondary-container": "var(--color-secondary-container)",
        "on-secondary-container": "var(--color-on-secondary-container)",

        tertiary: "var(--color-tertiary)",

        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",

        error: "var(--color-error)",
        outline: "var(--color-outline)",
        "outline-variant": "var(--color-outline-variant)",
      },
      borderRadius: {
        DEFAULT: "1rem",
        md: "0.75rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px"
      },
      fontFamily: {
        headline: ["var(--font-headline)"],
        body: ["var(--font-body)"],
        label: ["var(--font-label)"]
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))',
      }
    },
  },
  plugins: [],
}
