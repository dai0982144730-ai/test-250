// ĐƯỜNG CŨ /ma-tran-goi — màn "Ai được gọi ai" chuyển vào Cài đặt → 🔌 Kết nối, cạnh Danh bạ agent (Mr. Đại chốt 26/09).
// Giữ đường này để link / dấu trang / tin Telegram cũ không ra 404.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DuongCuMaTranGoi(): never {
  redirect("/settings?tab=ket-noi");
}
