import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--brand-primary))",
        secondary: "hsl(var(--brand-secondary))",
        accent: "hsl(var(--brand-accent))",
        muted: "hsl(var(--surface-muted))",
        border: "hsl(var(--border-color))",
      },
    },
  },
  plugins: [],
};

export default config;
