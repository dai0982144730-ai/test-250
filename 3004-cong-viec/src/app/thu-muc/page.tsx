// /thu-muc — Thư mục & gửi của giao diện CỔ ĐIỂN. Mr. Đại chốt 02/10/2026: không để giao diện cổ điển hiện ra khi vận hành
// → chuyển sang Gửi báo cáo (giữ ?tai_lieu_id= để mở lại bản nháp). Bản cũ còn trong git.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ThuMucCu({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const id = typeof searchParams.tai_lieu_id === "string" ? searchParams.tai_lieu_id : "";
  redirect(id ? `/gui-bao-cao?tai_lieu_id=${encodeURIComponent(id)}` : "/gui-bao-cao");
}
