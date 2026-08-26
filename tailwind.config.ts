import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./config/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        uplands: {
          magenta: "#b0008e",
          charcoal: "#1d1d1f",
          muted: "#5f5f5f",
          paper: "#f7f7f7",
        },
      },
      fontFamily: {
        sans: ["var(--font-roboto)", "Arial", "sans-serif"],
        slab: ["var(--font-roboto-slab)", "Georgia", "serif"],
        din: ["var(--font-din-bold)", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 48px rgba(0,0,0,.08)",
      },
    },
  },
  plugins: [],
};

export default config;
