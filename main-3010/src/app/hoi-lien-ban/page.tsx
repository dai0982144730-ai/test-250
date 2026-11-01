// ĐƯỜNG CŨ /hoi-lien-ban — màn "Hỏi vắt ngang các ban" đã BỎ (Mr. Đại chốt 25/09,
// phương án b): câu hỏi vắt ngang hỏi thẳng trợ lý chat Main (web + Telegram),
// trợ lý tự đi hỏi các agent (PLAN-MAIN-AGENT mục 4). Giữ đường này để link /
// dấu trang cũ không ra 404 — chuyển sang trang trợ lý.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function HoiLienBanDaBo(): never {
  redirect("/chat");
}
