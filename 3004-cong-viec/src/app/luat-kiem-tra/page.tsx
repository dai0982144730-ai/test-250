// /luat-kiem-tra — đã chuyển vào Cài đặt → 🧩 Riêng của agent → Luật kiểm tra. Giữ đường dẫn cũ.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LuatKiemTra() {
  redirect("/cai-dat?tab=rieng&muc=luat");
}
