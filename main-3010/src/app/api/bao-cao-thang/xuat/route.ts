// KẾT XUẤT BÁO CÁO THÁNG
//
//   GET /api/bao-cao-thang/xuat?nam=&thang=&dinh_dang=xlsx|md|nguon
//
// `nguon` xuất phụ lục "ô nào lấy ở đâu" — phục vụ bài nghiệm thu số 9 của
// PLAN: lấy 10 con số bất kỳ trong báo cáo, cả 10 phải truy được về một lượt
// gọi cụ thể.
//
// DAC-TA mục 4 điểm 2: "Không tự gửi. Dựng xong file là dừng." Route này chỉ
// trả file về trình duyệt, không có đường nào gửi đi đâu.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { locBaoCaoThang } from "@/lib/agent-mat-loc";
import { docBanNhap } from "@/lib/bao-cao-thang/kho";
import { apDungSuaTay } from "@/lib/bao-cao-thang/sua-tay";
import { xuatMarkdown, xuatPhuLucNguon, xuatXlsx } from "@/lib/bao-cao-thang/xuat";
import { kyThangTruoc } from "@/lib/bao-cao-thang/dung";
import { locTheoDuAn } from "@/lib/bao-cao-thang/loc-du-an";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const mac = kyThangTruoc();
  const namTho = Number(url.searchParams.get("nam"));
  const thangTho = Number(url.searchParams.get("thang"));
  const nam = Number.isInteger(namTho) && namTho >= 2000 ? namTho : mac.nam;
  const thang = Number.isInteger(thangTho) && thangTho >= 1 && thangTho <= 12 ? thangTho : mac.thang;
  const dinhDang = (url.searchParams.get("dinh_dang") ?? "xlsx").toLowerCase();

  const { bc: goc, lyDo } = docBanNhap(nam, thang);
  if (!goc) return NextResponse.json({ ok: false, message: lyDo }, { status: 404 });
  // ⭐ 05/10 luật agent mật: tệp xuất ra cũng chỉ mang phần người tải được xem
  // 28/10: file xuất lấy đúng chữ người đã sửa tay trên màn
  const bc = locBaoCaoThang(apDungSuaTay(goc), boLocMatCuaNguoi(auth.session.email, auth.session.role));

  // 28/10/2026: ?du_an=<mã> xuất riêng một dự án (nút «Chọn dự án»); bỏ trống = toàn công ty
  const maDuAn = url.searchParams.get("du_an") ?? "";
  const tenPhamVi = maDuAn ? (bc.duAn.find((d) => d.ma === maDuAn)?.ten ?? null) : null;
  if (maDuAn && !tenPhamVi) return NextResponse.json({ ok: false, message: "Không có dự án này trong báo cáo." }, { status: 404 });
  const bcXuat = maDuAn ? locTheoDuAn(bc, maDuAn) : bc;
  const ten = `bao-cao-thang-${nam}-${String(thang).padStart(2, "0")}${maDuAn ? `-${maDuAn}` : ""}`;

  if (dinhDang === "md" || dinhDang === "nguon") {
    const chu = dinhDang === "md" ? xuatMarkdown(bc) : xuatPhuLucNguon(bc);
    return new NextResponse(chu, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ten}${dinhDang === "nguon" ? "-nguon" : ""}.md"`,
      },
    });
  }

  // 28/10/2026 (Mr. Đại): xuất Excel theo mẫu «Báo cáo hợp nhất trình TGĐ (Form 0)» — định dạng mặc định
  if (dinhDang === "xlsx") {
    try {
      const buf = await xuatXlsx(bcXuat, tenPhamVi ?? "toàn công ty");
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${ten}.xlsx"`,
        },
      });
    } catch (e) {
      return NextResponse.json({ ok: false, message: `Không dựng được file Excel: ${(e as Error).message}` }, { status: 500 });
    }
  }

  return NextResponse.json(
    { ok: false, message: `Chưa hỗ trợ định dạng "${dinhDang}". Dùng xlsx, md hoặc nguon.` },
    { status: 400 },
  );
}
