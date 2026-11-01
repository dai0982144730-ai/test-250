import type { Config } from "tailwindcss";

// Màu khai bằng biến CSS; bọc color-mix + <alpha-value> để lớp có độ mờ (vd border-red/40, bg-accent/10) hoạt động
const mau = (bien: string) => `color-mix(in srgb, var(${bien}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: mau("--bg"),
        bg2: mau("--bg2"),
        surface: mau("--surface"),
        panel: mau("--panel"),
        text: mau("--text"),
        "text-secondary": mau("--text-secondary"),
        "text-muted": mau("--text-muted"),
        accent: mau("--accent"),
        "accent-hover": mau("--accent-hover"),
        border: mau("--border"),
        "border-light": mau("--border-light"),
        green: mau("--green"),
        red: mau("--red"),
        yellow: mau("--yellow"),
        blue: mau("--blue"),
        baseline: mau("--baseline-color"),
        critical: mau("--critical-color"),
        noncritical: mau("--noncritical-color"),
        forecast: mau("--forecast-color"),
      },
      backgroundColor: {
        "accent-soft": mau("--accent-bg"),
        "green-soft": mau("--green-bg"),
        "red-soft": mau("--red-bg"),
        "yellow-soft": mau("--yellow-bg"),
        "blue-soft": mau("--blue-bg"),
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "8px",
      },
      boxShadow: {
        card: "0 8px 30px rgba(0,0,0,.6)",
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Arial", '"Helvetica Neue"', "sans-serif"],
        mono: ['"Cascadia Code"', '"Fira Code"', "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
