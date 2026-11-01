// /lich-su — đã chuyển vào Cài đặt → 🧩 Riêng của agent → Lịch sử. Giữ đường dẫn cũ (kèm bộ lọc) cho link đã gửi.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrangLichSu({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const qs = new URLSearchParams({ tab: "rieng", muc: "lich-su" });
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string") qs.set(k, v);
  redirect(`/cai-dat?${qs}`);
}
