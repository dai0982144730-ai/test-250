// ============================================================
// KHUÔN TRẢ LỜI CỔNG MCP — HOP-DONG-KET-NOI mục 3 (bắt buộc với MỌI công cụ)
//
// - Trường `nguon` BẮT BUỘC: mảng rỗng bị coi là lỗi — agent không dẫn được
//   nguồn thì KHÔNG được trả lời, phải trả KHONG_CO_DU_LIEU (mục 3.1).
// - Không bao giờ ném ngoại lệ ra ngoài biên MCP (mục 3.2).
// - Trần 100 bản ghi mỗi câu trả lời (TRO-LY-TRUNG-TAM mục 1 luồng ③).
//
// File THUẦN — không đụng node:fs (luật 10), màn hình import được.
// ============================================================

/** Phiên bản hợp đồng kết nối agent này đang theo (HOP-DONG-KET-NOI mục 11) */
export const PHIEN_BAN_HOP_DONG = "1.1";

/** Trần bản ghi mỗi câu trả lời MCP */
export const TRAN_BAN_GHI = 100;

/** Sáu mã lỗi của HOP-DONG-KET-NOI mục 3.2 — không tự chế mã thứ bảy */
export type MaLoi =
  | "KHONG_CO_DU_LIEU"
  | "KHONG_HIEU_YEU_CAU"
  | "KHONG_CO_QUYEN"
  | "HET_HAN_CHO"
  | "AGENT_KHONG_SAN_SANG"
  | "LOI_NOI_BO";

/** Một dòng dẫn nguồn — khuôn mục 3.1 */
export interface NguonMcp {
  /** "wbs" | "bc-ngay" | "bc-tuan" | "tien-do" | "tai-lieu" | "so-cod"… */
  loai: string;
  ma: string;
  file_goc: string;
  vi_tri?: string;
  thoi_diem_trich?: string;
  trang_thai?: string;
}

export interface TraThanhCong {
  ok: true;
  du_lieu: unknown;
  nguon: NguonMcp[];
  thoi_diem_tra_loi: string;
  canh_bao: string[];
}

export interface TraThatBai {
  ok: false;
  ma_loi: MaLoi;
  thong_diep: string;
}

export type KhuonTra = TraThanhCong | TraThatBai;

export function thatBai(ma_loi: MaLoi, thong_diep: string): TraThatBai {
  return { ok: false, ma_loi, thong_diep };
}

/**
 * Dựng câu trả lời thành công. NGUỒN RỖNG → tự đổi thành KHONG_CO_DU_LIEU
 * (ép nguyên tắc "mọi bản ghi truy vết được về file gốc" ở tầng giao thức).
 */
export function thanhCong(
  du_lieu: unknown,
  nguon: NguonMcp[],
  canh_bao: string[] = []
): KhuonTra {
  if (nguon.length === 0) {
    return thatBai(
      "KHONG_CO_DU_LIEU",
      "Không dẫn được nguồn cho câu trả lời — theo hợp đồng kết nối, không nguồn thì không trả lời."
    );
  }
  return {
    ok: true,
    du_lieu,
    nguon: nguon.slice(0, TRAN_BAN_GHI),
    thoi_diem_tra_loi: new Date().toISOString(),
    canh_bao,
  };
}
