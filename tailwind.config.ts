import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-delay": "float 6s ease-in-out 1.5s infinite",
        "fade-up": "fade-up .6s ease-out both",
        shimmer: "shimmer 1.6s infinite",
        "spin-slow": "spin-slow 2.4s linear infinite",
      },
      boxShadow: {
        soft: "0 4px 24px -6px rgb(15 23 42 / 0.08)",
        card: "0 8px 40px -12px rgb(15 23 42 / 0.14)",
        glow: "0 0 60px -12px rgb(99 102 241 / 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
