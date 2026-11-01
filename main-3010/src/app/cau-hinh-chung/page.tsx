// ĐƯỜNG CŨ /cau-hinh-chung — màn "Khai một lần — dùng chung" đã GỠ 26/09 (0 lần lưu; 3 agent kéo 459/459 lượt rỗng). Khoá thật khai ở Cài đặt → 🔌 Kết nối.
// Giữ đường này để link / dấu trang / tin Telegram cũ không ra 404.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DuongCuCauHinhChung(): never {
  redirect("/settings?tab=ket-noi");
}
