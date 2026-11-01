// / — trang đầu. Mr. Đại chốt 28/09: mọi người dùng giao diện căn phòng, giao diện cổ điển ẩn đi →
// trang Tổng quan cổ điển bỏ, vào thẳng Sơ đồ tổ chức (bản cũ còn trong git).
import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phien";

export const dynamic = "force-dynamic";

export default async function TrangDau() {
  if (!(await layNguoiDung())) redirect("/login");
  redirect("/so-do");
}
