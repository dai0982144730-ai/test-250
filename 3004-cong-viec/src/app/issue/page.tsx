// /issue — địa chỉ CŨ (đổi thành "Quá hạn" 01/10, màn Quá hạn xoá 02/10/2026 vì trùng Sơ đồ). Giữ để link cũ vẫn mở đúng chỗ.
import { redirect } from "next/navigation";
import { DUONG_RA_SOAT } from "@/lib/so-cai/duong-ra-soat";

export const dynamic = "force-dynamic";

export default function DiaChiCu({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  redirect(searchParams.tab === "thieu-so-cai" ? DUONG_RA_SOAT : "/so-do");
}
