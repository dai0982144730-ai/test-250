// ============================================================
// so-cai/dinh-dang-agent.ts — MỘT DÒNG SỔ CÁI CHO AGENT KHÁC (tên trường CỐ ĐỊNH, xem docs/SO-CAI-CHO-AGENT.md).
// Chủ module: so-cai. Cổng MCP socai.* và API /api/v1 trả đúng dạng này.
// ============================================================
import type { Q } from "@/lib/db";
import { chiTietViec } from "./dich-vu";
import { lucVN } from "./tien-ich";

export interface DongSoCaiAgent {
  ma_viec: string;
  ten_viec: string;
  du_an: string | null;
  nguon_hien_hanh: { bao_cao: string; don_vi: string; cap: number } | null;
  da_de: string[];
  luon_mo: boolean;
  bat_dau: string | null;
  ket_thuc: string | null;
  /** vai: một việc đúng một "chủ trì" (giữ hạn); "phối hợp" chỉ để biết, không hạn riêng */
  phan_viec: { phu_trach: string; vai: "chủ trì" | "phối hợp"; noi_dung: string; trang_thai: "dang_lam" | "da_ket_thuc"; ket_thuc: string | null }[];
  tien_do: string;
  canh_bao: "qua_han" | "sap_den_han" | null;
  trang_thai: "dang_mo" | "hoan_thanh" | "da_dong";
  qua_trinh: { luc: string; su_kien: string; tu?: string; nguoi?: string }[];
}

/** 'BQLDA Quảng Trị · Form 7 · tuần 29' với đơn vị 'BQLDA Quảng Trị' → 'Form 7 · tuần 29'. */
function boTenDonVi(nhan: string, tenDv: string | null): string {
  if (tenDv && nhan.startsWith(tenDv + " · ")) return nhan.slice(tenDv.length + 3);
  return nhan;
}

export async function dongChoAgent(q: Q, congViecId: string, coQuaTrinh = true): Promise<DongSoCaiAgent | null> {
  const cv = await chiTietViec(q, congViecId);
  if (!cv) return null;
  const ng = cv.nguon_hien_hanh;
  let tenDv: string | null = null;
  if (ng?.don_vi_id) {
    const { rows } = await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [ng.don_vi_id]);
    tenDv = rows[0]?.ten ?? null;
  }
  let quaTrinh: DongSoCaiAgent["qua_trinh"] = [];
  if (coQuaTrinh) {
    const { rows } = await q.query<{ luc: string | Date; hanh_dong: string; chi_tiet: Record<string, unknown>; nguoi: string; ten: string | null }>(
      `SELECT l.luc, l.hanh_dong, l.chi_tiet, l.nguoi, n.ten FROM docflow.lich_su l
         LEFT JOIN identity.nguoi_dung n ON n.id = l.nguoi
        WHERE l.doi_tuong_loai = 'cong_viec' AND l.doi_tuong_id = $1 ORDER BY l.id`,
      [congViecId],
    );
    quaTrinh = rows.map((r) => {
      const ct = (typeof r.chi_tiet === "string" ? JSON.parse(r.chi_tiet) : r.chi_tiet) as Record<string, unknown>;
      const dong: DongSoCaiAgent["qua_trinh"][number] = { luc: lucVN(r.luc), su_kien: r.hanh_dong };
      if (typeof ct?.tu === "string") dong.tu = ct.tu;
      dong.nguoi = r.nguoi === "he-thong" ? "Hệ thống" : (r.ten ?? r.nguoi);
      return dong;
    });
  }
  return {
    ma_viec: cv.id,
    ten_viec: cv.ten,
    du_an: cv.du_an,
    nguon_hien_hanh: ng ? { bao_cao: boTenDonVi(ng.nhan, tenDv), don_vi: tenDv ?? ng.don_vi_id ?? "", cap: ng.cap } : null,
    da_de: cv.cac_nguon.filter((n) => n.trang_thai === "bi_de").map((n) => n.nhan),
    luon_mo: cv.luon_mo,
    bat_dau: cv.bat_dau,
    ket_thuc: cv.ket_thuc,
    phan_viec: cv.phan_viec.map((p) => ({
      phu_trach: p.phu_trach_ten ?? p.phu_trach_id,
      vai: p.vai === "phoi_hop" ? ("phối hợp" as const) : ("chủ trì" as const),
      noi_dung: p.noi_dung,
      trang_thai: p.trang_thai,
      ket_thuc: p.ket_thuc,
    })),
    tien_do: cv.tien_do,
    canh_bao: cv.canh_bao,
    trang_thai: cv.trang_thai,
    qua_trinh: quaTrinh,
  };
}
