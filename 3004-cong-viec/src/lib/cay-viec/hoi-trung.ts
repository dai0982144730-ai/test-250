// ============================================================
// LUẬT 33 — agent Công việc TRẢ LỜI "việc này có trùng không" (cổng `base.hoi_trung_viec`, Mr. Đại chốt 04/10/2026)
//
// Agent Công việc giữ SỔ CÁI — mọi việc đã giao của 5 agent đều nằm ở đây, nên đây là nơi bắt được nhiều trùng nhất
// (ca thật 05/10: 6.1.4 đã có CV-2026-0124 giao từ Cây việc, Tiến độ vẫn giao thêm CV-2026-0132).
// So với: việc ĐANG MỞ của dự án (mã WBS chỉ tính dòng đã duyệt — 🤖 chờ duyệt không tính, chốt 03/10).
// Máy lọc ứng viên → có ứng viên mới hỏi 🤖 AI phán (runAIGan — sổ token ghi theo tính năng). Server-only.
// ============================================================

import { tx } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { danhSachSoCai } from "@/lib/so-cai/dich-vu";
import { viecSoCaiCuaDuAn } from "@/lib/cay-viec/doc-so-cai";
import { viecCuaDuAn } from "@/lib/gan-wbs/gan-wbs";
import { traDuAnTrongDanhSach } from "@/lib/mcp/cong-base-thuan";
import { runAIGan } from "@/lib/ai/providers";
import { phanTrung, type CauHoiTrung, type TraLoiTrung, type ViecDeSo } from "@/lib/chung/hoi-trung-kieu";

/** Việc đang mở đem ra so: theo dự án của câu hỏi; câu hỏi không dự án → việc không thuộc dự án nào */
export async function viecDeSoCongViec(cau: CauHoiTrung): Promise<{ ds: ViecDeSo[] } | { loi: string }> {
  return tx(async (q) => {
    const dsDa = await layCauHinh(q, "du_an");
    if (cau.ma_du_an) {
      const da = traDuAnTrongDanhSach(cau.ma_du_an, dsDa);
      if (!da.ok) return { loi: da.loi.ok ? "" : da.loi.thong_diep };
      const ds = (await viecSoCaiCuaDuAn(q, dsDa, da.duAn.id, null))
        .filter((v) => !v.daXong)
        .map(
          (v): ViecDeSo => ({
            ma: v.id,
            noi_dung: v.ten,
            ma_du_an: cau.ma_du_an,
            ma_wbs: v.maWbs && !v.aiGanChuaSoat ? v.maWbs : null,
            trang_thai: "da_giao",
            nguoi_nhan: v.tenNguoi || null,
            han: v.han,
          }),
        );
      return { ds };
    }
    const thuocDuAn = new Set((await viecCuaDuAn(q, dsDa)).keys());
    const ds = (await danhSachSoCai(q))
      .filter((v) => !thuocDuAn.has(v.id))
      .map((v): ViecDeSo => {
        const ct = v.phan_viec.find((p) => p.vai !== "phoi_hop");
        return { ma: v.id, noi_dung: v.ten, ma_du_an: null, trang_thai: "da_giao", nguoi_nhan: ct?.phu_trach_ten ?? null, han: v.ket_thuc?.slice(0, 10) ?? null };
      });
    return { ds };
  });
}

export async function traLoiHoiTrung(cau: CauHoiTrung): Promise<TraLoiTrung | { loi: string }> {
  const r = await viecDeSoCongViec(cau);
  if ("loi" in r) return r;
  return phanTrung(cau, r.ds, (prompt, heThong) => runAIGan("lib/cay-viec/hoi-trung", prompt, heThong, undefined, undefined, 60_000, true));
}
