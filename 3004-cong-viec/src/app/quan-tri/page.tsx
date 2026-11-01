// /quan-tri — đã chuyển vào Cài đặt → 👥 Người dùng & phân quyền. Giữ đường dẫn cũ (?tab=nguoi-dung&don_vi=…).
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MUC: Record<string, string> = { "vai-tro": "vai-tro", "nguoi-dung": "to-chuc", "don-vi": "to-chuc", "nhap-excel": "nhap-excel" };

export default function QuanTri({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const cu = typeof searchParams.tab === "string" ? searchParams.tab : "";
  const qs = new URLSearchParams({ tab: "nguoi-dung", muc: MUC[cu] ?? "to-chuc" });
  if (typeof searchParams.don_vi === "string") qs.set("don_vi", searchParams.don_vi);
  redirect(`/cai-dat?${qs}`);
}
