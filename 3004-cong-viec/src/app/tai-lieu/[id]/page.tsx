// /tai-lieu/<mã> — trang một tài liệu của giao diện CỔ ĐIỂN. Mr. Đại chốt 02/10/2026: không để giao diện cổ điển hiện ra khi
// vận hành → tải thẳng bản Word của tài liệu. Bản cũ còn trong git.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TaiLieuCu({ params }: { params: { id: string } }) {
  redirect(`/api/tai-lieu/${encodeURIComponent(decodeURIComponent(params.id))}/tep`);
}
