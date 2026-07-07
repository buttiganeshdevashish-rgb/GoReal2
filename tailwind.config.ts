import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07070B",
          900: "#0C0C12",
          850: "#11111A",
          800: "#16161F",
          700: "#1E1E2A",
          600: "#2A2A3A",
          500: "#3B3B4F",
          400: "#6B6B85",
          300: "#9C9CB5",
          200: "#C6C6D8",
          100: "#E8E8F2",
        },
        brand: {
          300: "#B7A6FF",
          400: "#9D85FF",
          500: "#7C5CFF",
          600: "#6A46F5",
          700: "#5936D6",
        },
        mint: { 400: "#4ADE80", 500: "#22C55E" },
        flame: { 400: "#FB923C", 500: "#F97316" },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "-apple-system", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(124,92,255,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 32px -12px rgba(0,0,0,0.6)",
      },
      animation: {
        "fade-up": "fadeUp .5s ease both",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
