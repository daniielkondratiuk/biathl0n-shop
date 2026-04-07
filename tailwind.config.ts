// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-helvetica)"],
        helvetica: ["var(--font-helvetica)"],
        gilroy: ["var(--font-gilroy)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        // Typography scale from Figma
        "7xl": [
          "72px",
          {
            lineHeight: "78px",
            letterSpacing: "0",
          },
        ],
        "6xl": [
          "56px",
          {
            lineHeight: "60px",
            letterSpacing: "-1.12px",
          },
        ],
        "2xl": [
          "24px",
          {
            lineHeight: "30px",
            letterSpacing: "0",
          },
        ],
        "2xl-gilroy": [
          "24px",
          {
            lineHeight: "36px",
            letterSpacing: "0",
          },
        ],
        xl: [
          "20px",
          {
            lineHeight: "28px",
            letterSpacing: "0",
          },
        ],
        base: [
          "16px",
          {
            lineHeight: "24px",
            letterSpacing: "0",
          },
        ],
        sm: [
          "14px",
          {
            lineHeight: "20px",
            letterSpacing: "0",
          },
        ],
        xs: [
          "12px",
          {
            lineHeight: "18px",
            letterSpacing: "0",
          },
        ],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        bold: "700",
        extrabold: "800",
      },
      colors: {
        // Neutral color scale from Figma
        neutral: {
          900: "var(--color-neutral-900)",
          700: "var(--color-neutral-700)",
          500: "var(--color-neutral-500)",
          400: "var(--color-neutral-400)",
          300: "var(--color-neutral-300)",
          200: "var(--color-neutral-200)",
          100: "var(--color-neutral-100)",
        },
        // Supporting colors from Figma
        "accent-green": "var(--color-accent-green)",
        "accent-red": "var(--color-accent-red)",
        "accent-orange": "var(--color-accent-orange)",
        // Unified theme tokens
        surface: {
          light: "#F5F5F5",
          dark: "#1F1F1F",
        },
        textBase: {
          light: "#111111",
          dark: "#EEEEEE",
        },
        borderBase: {
          light: "#E1E1E1",
          dark: "#3A3A3A",
        },
        // Semantic colors
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        success: "var(--color-success)",
        error: "var(--color-error)",
        warning: "var(--color-warning)",
      },
    },
  },
  plugins: [],
};

export default config;


