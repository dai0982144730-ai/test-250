// /qua-han — ĐÃ XOÁ (Mr. Đại 02/10/2026: "màn hình này trùng với Sơ đồ"). Việc quá hạn xem trên Sơ đồ tổ chức (nút lọc quá hạn);
// rà soát sổ cái nằm ở Cài đặt → 🧩 Riêng của agent → Rà soát sổ cái. Giữ đường dẫn để link cũ (chuông, thư, dấu trang) không chết.
import { redirect } from "next/navigation";
import { DUONG_RA_SOAT } from "@/lib/so-cai/duong-ra-soat";

export const dynamic = "force-dynamic";

export default function DiaChiCu({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  redirect(searchParams.tab === "thieu-so-cai" ? DUONG_RA_SOAT : "/so-do");
}
