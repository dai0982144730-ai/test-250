// /van-thu — Sổ văn bản đến ĐANG ẨN theo yêu cầu: chặn cả đường dẫn, chuyển về Thư mục & gửi.
// Giao diện cũ giữ ở components/van-thu/TrangVanThu.tsx (bật lại thì render nó ở đây + thêm dòng menu).
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrangVanThu() {
  redirect("/gui-bao-cao");
}
