// ĐƯỜNG CŨ /bao-cao-thang — màn "Báo cáo tháng" gộp vào mục Báo cáo, tab Tháng (Mr. Đại chốt 26/09).
// Giữ đường này để link / dấu trang / tin Telegram cũ không ra 404.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DuongCuBaoCaoThang(): never {
  redirect("/bao-cao?tab=thang");
}
