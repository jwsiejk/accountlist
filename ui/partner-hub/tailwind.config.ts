import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--surface-card)",
        foreground: "var(--foreground)",
        primary: "var(--brand-primary)",
        "button-primary": "var(--button-primary)",
        "button-primary-foreground": "var(--button-primary-foreground)",
        secondary: "var(--brand-secondary)",
        accent: "var(--brand-accent)",
        muted: "var(--surface-muted)",
        border: "var(--border-color)",
      },
    },
  },
  plugins: [],
};

export default config;
