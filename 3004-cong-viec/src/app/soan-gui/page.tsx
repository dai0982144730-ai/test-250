// /soan-gui — Soạn và gửi đã gộp vào Thư mục (cột phải "Nạp file & gửi báo cáo", components/gui/KhungSoanGui.tsx).
// Giữ đường dẫn cũ (kèm ?tai_lieu_id= để mở lại bản nháp) cho link đã gửi.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrangSoanGui({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const id = typeof searchParams.tai_lieu_id === "string" ? searchParams.tai_lieu_id : "";
  redirect(id ? `/gui-bao-cao?tai_lieu_id=${encodeURIComponent(id)}` : "/gui-bao-cao");
}
