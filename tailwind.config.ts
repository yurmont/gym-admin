import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carbon: "#070B12",
        brand: "#FF5A1F",
        volt: "#C4F82A",
        mint: "#0FC98A",
        sun: "#FFA51F",
        accent: "#FF3D5A",
        cyan: "#12C4E0"
      },
      boxShadow: { panel: "0 16px 45px rgba(7,11,18,.08)" }
    }
  },
  plugins: []
} satisfies Config;
