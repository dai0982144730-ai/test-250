// /so-cai — Sổ cái của giao diện CỔ ĐIỂN. Mr. Đại chốt 02/10/2026: khi vận hành không để trang giao diện cổ điển hiện ra
// → chuyển sang Sơ đồ tổ chức (việc theo đơn vị nằm ở đó). Bản cũ còn trong git.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SoCaiCu() {
  redirect("/so-do");
}
