// pm2 — tiến trình scidocflow cổng 3004 (máy chủ Vietnix). Chạy: pm2 start deploy/ecosystem.config.cjs
// Không đụng các web đang chạy (Pháp lý, AI tư vấn, hptai.vn, proxygiasoc) và CSDL hptbim.
module.exports = {
  apps: [
    {
      name: "scidocflow",
      cwd: __dirname + "/..",
      script: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3004",
        HOSTNAME: "127.0.0.1",
      },
      // Biến bí mật (AUTH_SECRET, DATABASE_URL) đặt trong .env.local cạnh server.js — không ghi vào file này
      max_memory_restart: "600M",
      autorestart: true,
      time: true,
    },
  ],
};
