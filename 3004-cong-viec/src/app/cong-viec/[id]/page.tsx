// /cong-viec/<mã> — trang một việc của giao diện CỔ ĐIỂN. Mr. Đại chốt 02/10/2026: không để giao diện cổ điển hiện ra khi
// vận hành → mở việc đó trên Sơ đồ tổ chức (bung sẵn). Bản cũ còn trong git.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ViecCu({ params }: { params: { id: string } }) {
  redirect(`/so-do?viec=${encodeURIComponent(decodeURIComponent(params.id))}`);
}
