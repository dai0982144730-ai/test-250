// /thong-bao — trang Thông báo của giao diện CỔ ĐIỂN. Mr. Đại chốt 02/10/2026: không để giao diện cổ điển hiện ra khi vận
// hành → thông báo xem ở chuông trên thanh đầu trang; đường cũ chuyển về Sơ đồ. Bản cũ còn trong git.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ThongBaoCu() {
  redirect("/so-do");
}
