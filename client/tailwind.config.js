/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#121212",
        surface: "#1E1E1E",
        "surface-hover": "#252525",
        bone: "#F0EAD6",
        "bone-muted": "#9A9380",
        crimson: {
          400: "#E06060",
          500: "#D64040",
          600: "#B33A3A",
          700: "#8A2E2E",
          900: "#3A1515",
          950: "#1F0A0A",
        },
        gold: {
          400: "#E0BE6A",
          500: "#D4A85A",
          600: "#B8924A",
          700: "#8A6E3A",
          900: "#3D2E16",
        },
        jade: {
          400: "#3D8A6E",
          500: "#2F6B55",
          600: "#245240",
          700: "#1A3D2E",
          900: "#0F251C",
        },
        blue: {
          400: "#6EB1E0",
          500: "#4A90C4",
          600: "#3A709E",
          900: "#143244",
        },
        steel: "#6B7C85",
        "steel-dark": "#3A4348",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 8px rgba(214, 64, 64, 0.25), 0 0 20px rgba(214, 64, 64, 0.08)",
          },
          "50%": {
            boxShadow: "0 0 16px rgba(214, 64, 64, 0.45), 0 0 40px rgba(214, 64, 64, 0.18)",
          },
        },
        "pulse-glow-gold": {
          "0%, 100%": {
            boxShadow: "0 0 8px rgba(212, 168, 90, 0.25), 0 0 20px rgba(212, 168, 90, 0.08)",
          },
          "50%": {
            boxShadow: "0 0 16px rgba(212, 168, 90, 0.45), 0 0 40px rgba(212, 168, 90, 0.18)",
          },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "breath": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "pulse-glow-gold": "pulse-glow-gold 3s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.35s ease-out forwards",
        "breath": "breath 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
