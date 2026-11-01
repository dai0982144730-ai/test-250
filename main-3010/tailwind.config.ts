import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        surface: "var(--surface)",
        panel: "var(--panel)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        green: "var(--green)",
        red: "var(--red)",
        yellow: "var(--yellow)",
        blue: "var(--blue)",
        // Màu "Tài khoản Claude 1" ở Thống kê dùng AI — CAM cố định (chốt 04/10: TK1 cam · TK2 xanh dương), = màu nhấn agent
        // Công việc. Không dùng accent: màu nhấn Main/Hợp đồng/Quan sát là xanh, sát TK2 (kiểm độc lập lần 5 🟡2).
        tk1: "#c2724f",
        baseline: "var(--baseline-color)",
        critical: "var(--critical-color)",
        noncritical: "var(--noncritical-color)",
        forecast: "var(--forecast-color)",
      },
      backgroundColor: {
        "accent-soft": "var(--accent-bg)",
        "green-soft": "var(--green-bg)",
        "red-soft": "var(--red-bg)",
        "yellow-soft": "var(--yellow-bg)",
        "blue-soft": "var(--blue-bg)",
        // Bí danh đuôi -bg: 23 chỗ trong ba app đang viết `bg-red-bg`, `bg-blue-bg`…
        // Tailwind KHÔNG sinh ra lớp đó nên nền im lặng biến mất — không báo lỗi,
        // không ai thấy. Khai bí danh ở đây rẻ và an toàn hơn sửa 23 chỗ gọi.
        "accent-bg": "var(--accent-bg)",
        "green-bg": "var(--green-bg)",
        "red-bg": "var(--red-bg)",
        "yellow-bg": "var(--yellow-bg)",
        "blue-bg": "var(--blue-bg)",
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
