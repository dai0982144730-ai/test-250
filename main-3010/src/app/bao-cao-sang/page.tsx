// ĐƯỜNG CŨ /bao-cao-sang — màn "Báo cáo sáng" gộp vào mục Báo cáo, tab Sáng (Mr. Đại chốt 26/09).
// Giữ đường này để link / dấu trang / tin Telegram cũ không ra 404.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DuongCuBaoCaoSang(): never {
  redirect("/bao-cao?tab=sang");
}
