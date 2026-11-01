/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cho phép build KIỂM vào thư mục khác (DIST_DIR=.next-kiem npm run build) để
  // không ghi đè .next mà dev server đang chạy — đã một lần làm sập app Mr. Đại
  // đang test (06/09). Không đặt biến thì vẫn là .next như thường.
  distDir: process.env.DIST_DIR || ".next",
  // Đóng gói portable: build ra .next/standalone (server.js + node_modules tối thiểu)
  output: "standalone",
  experimental: {
    // pdf-parse (pdf.js) hỏng khi bị webpack đóng gói — chạy thẳng từ node_modules.
    // @napi-rs/canvas (vẽ ảnh biểu đồ báo cáo sáng, 17/10/2026) là gói nhị phân gốc — cũng không đóng gói được.
    serverComponentsExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  },
};

export default nextConfig;
