import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: "#070A0F",
        graphite: "#151A21",
        paper: "#F4F6F8",
        panel: "#FFFFFF",
        line: "#D9E0E7",
        brand: "#00C2A8",
        brandSoft: "#DDFCF8",
        energy: "#B7F000",
        energySoft: "#F2FFD0",
        mint: "#009B8E",
        mintSoft: "#E2F7F4",
        sun: "#EAB308",
        accent: "#D92D20",
        tech: "#2563EB",
        muted: "#64748B",
      },
      boxShadow: {
        panel: "0 18px 42px rgba(7, 10, 15, .08)",
        edge: "0 1px 0 rgba(7, 10, 15, .08)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
