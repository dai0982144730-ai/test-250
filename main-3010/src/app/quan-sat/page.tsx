// ĐƯỜNG CŨ /quan-sat — màn "Quan sát các agent" (rồi tab Sức khoẻ) đã BỎ ở Main
// (Mr. Đại chốt 26/09/2026): sức khoẻ các agent xem ở Agent quan sát.
// Giữ đường này để link / dấu trang / tin Telegram cũ không ra 404.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DuongCuQuanSat(): never {
  redirect("/nhat-ky");
}
