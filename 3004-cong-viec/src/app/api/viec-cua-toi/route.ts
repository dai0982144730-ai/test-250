// /api/viec-cua-toi — màn "Việc của tôi" của agent Công việc (đợt ⑤, Mr. Đại chốt 06/10/2026 "Ca": menu riêng, hai nửa như Main).
//   GET → { hom_nay, cho_duyet, noi_nhan, viec }
//     cho_duyet: issue cần giao việc MỚI người này giao được — CÙNG hàm với cửa base.viec_cho_duyet của Main (nhapChoDuyet, luật 7)
//     noi_nhan : danh sách ô "Giao cho" (chỉ nơi mình giao được) — rỗng khi không có quyền Giao việc
//     viec     : 3 nút Việc tôi giao / nhận / phối hợp — CÙNG lõi công cụ base.viec_cua_toi mà Main · Tiến độ · Hợp đồng đọc
// Giao / Bỏ qua đi qua POST /api/cay-viec/issue (hanhDong "giao-viec" · "khong-can-giao") — một lõi giao, không viết lại.
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { dsNoiNhan } from "@/lib/cay-viec/noi-nhan";
import { homNayVN } from "@/lib/cay-viec/doc-so-cai";
import { quyenIssue } from "@/lib/cay-viec/issue/quyen";
import { nhapChoDuyet, tachMaNhap, tenWbsCuaThe } from "@/lib/cay-viec/issue/viec-cho-duyet";
import { chayCongCu } from "@/lib/mcp/cong-base";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const giao = quyenIssue(nd).giao;
    const choDuyet = giao
      ? (await nhapChoDuyet(nd)).map((d) => {
          const ma = tachMaNhap(d.id);
          return { ...d, ten_wbs: ma ? (tenWbsCuaThe(ma.duAn, ma.theId) ?? null) : null };
        })
      : [];
    const noiNhan = giao ? await tx((q) => dsNoiNhan(q, nd)) : null;
    const kq = await chayCongCu("base.viec_cua_toi", { nguoi: nd.email, gioi_han: 500 });
    if (!kq.ok) throw new LoiHttp(400, kq.thong_diep);
    return { hom_nay: homNayVN(), co_quyen_giao: giao, cho_duyet: choDuyet, noi_nhan: noiNhan, viec: kq.du_lieu };
  });
}
