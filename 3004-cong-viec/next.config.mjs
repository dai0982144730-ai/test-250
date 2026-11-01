/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.DIST_DIR || ".next",
  // standalone: cho triển khai máy chủ (deploy/). Chạy trên máy bằng CHAY-UNG-DUNG.bat (next start) thì tắt để bản build gọn.
  output: process.env.NEXT_OUTPUT_STANDALONE === "0" ? undefined : "standalone",
  experimental: {
    // PGlite (Postgres nhúng) và pg phải chạy thẳng từ node_modules, không đóng gói webpack
    serverComponentsExternalPackages: ["@electric-sql/pglite", "pg", "nodemailer"],
  },
};

export default nextConfig;
