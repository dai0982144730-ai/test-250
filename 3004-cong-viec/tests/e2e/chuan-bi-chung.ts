// Chạy một lần trước mọi test: đăng nhập quản trị rồi mở lần lượt mọi trang và API chính để next dev
// dựng sẵn (lần đầu mỗi trang mất vài giây — không để test đầu tiên của mỗi trang bị hết giờ).
import { request, type FullConfig } from "@playwright/test";

const TRANG = [
  "/",
  "/thu-muc",
  "/soan-gui",
  "/so-cai",
  "/van-thu",
  "/lich-su",
  "/mau-word",
  "/luat-kiem-tra",
  "/ky-nang",
  "/quan-tri",
  "/quan-tri/khoa-agent",
  "/cai-dat",
  "/thong-bao",
  "/chat",
  "/tai-lieu/khong-co",
  "/cong-viec/khong-co",
];

const API = [
  "/api/toi",
  "/api/thu-muc",
  "/api/gui/noi-nhan",
  "/api/tai-lieu-gui/nhap",
  "/api/so-cai",
  "/api/so-cai/danh-muc",
  "/api/van-thu",
  "/api/lich-su",
  "/api/lich-su/danh-muc",
  "/api/mau-word",
  "/api/luat",
  "/api/luat/loai",
  "/api/luat/mau",
  "/api/cai-dat",
  "/api/cai-dat/danh-muc",
  "/api/skill",
  "/api/thong-bao",
  "/api/quan-tri/nguoi-dung",
  "/api/quan-tri/don-vi",
  "/api/quan-tri/vai-tro",
  "/api/quan-tri/khoa-agent",
  "/api/tro-ly/phien",
  "/api/tro-ly/model",
  "/api/ai/status",
  "/api/ai/chat/sessions",
  "/api/email/tuy-chon",
  "/api/email/hang-doi",
];

export default async function chuanBi(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const ctx = await request.newContext({ baseURL, timeout: 180_000 });
  const dn = await ctx.post("/api/auth/login", { data: { email: "quantri@scigroup.vn", mat_khau: "Sci@2026" } });
  if (!dn.ok()) throw new Error(`Không đăng nhập được máy chủ test: ${dn.status()} ${await dn.text()}`);
  for (const u of [...TRANG, ...API]) {
    const r = await ctx.get(u);
    if (r.status() >= 500) throw new Error(`Máy chủ test lỗi ${r.status()} khi mở ${u}: ${(await r.text()).slice(0, 300)}`);
  }
  await ctx.dispose();
}
