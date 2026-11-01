// ============================================================
// CÀI ĐẶT AGENT BASE — mô hình + lưu trữ
// PLAN-AGENT-BASE-VN mục 10c (8 tab) · 11 (ngưỡng) · 6f (từ điển ngữ cảnh)
//
// Nguyên tắc: Cài đặt là chỗ chứa MỌI thứ khai một lần rồi gần như không
// đụng lại (luật 14). Thứ nào SỬA PHẢI ĐỔI THẬT kết quả thì để ở đây, thứ
// nào chỉ là đặc tả kỹ thuật thì chỉ hiện để đọc.
//
// GHI VẾT: mọi lần sửa ngưỡng ghi lại ai sửa, lúc nào, từ mấy sang mấy
// (mục 11 — "Sửa phải đổi thật kết quả và ghi vết").
//
// File này đụng node:fs nên CHỈ chạy phía máy chủ.
// ============================================================

import { tachTuDienCu } from "@/lib/tu-dien-ghep";
import fs from "node:fs";
import {
  DANH_BA_MAC_DINH,
  chuanHoaKhai,
  type KhaiAgent,
} from "@/lib/danh-ba-agent";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { MOC_GIU_SO_MAC_DINH, kiemMocGiuSo, type MocGiuSo } from "@/lib/nhat-ky/moc-giu-so";

// Tính MỖI LẦN GỌI (không khoá lúc nạp module) — bài kiểm đổi THU_MUC_DU_LIEU giữa chừng vẫn trúng
const DUONG_DAN = (): string => path.join(gocDuLieu(), "cai-dat-base.json");

// ─────────────────────────────────────────────────────────────
// Kiểu dữ liệu
// ─────────────────────────────────────────────────────────────

export interface VetSua {
  thoiDiem: string;
  nguoi: string;
  truong: string;
  tuGiaTri: string;
  sangGiaTri: string;
}

/** Nhịp tự chạy của con quan sát (mục Quan sát) */
export interface NhipQuanSat {
  /** Tắt sẵn: chạy bộ test là sinh tiến trình con, người dùng phải chủ động bật */
  bat: boolean;
  /** Giờ VN "HH:MM" */
  gio: string;
  /** false = chỉ gọi thử sức khoẻ, không chạy bộ test (vài giây thay vì vài phút) */
  chayCaTest: boolean;
}

export const NHIP_QUAN_SAT_MAC_DINH: NhipQuanSat = {
  bat: false,
  gio: "22:00",
  chayCaTest: true,
};

/**
 * ⭐ 24/09 — BỎ 3 trường không code nào của Main dùng (đo grep src/ + tests/: chỉ có
 * chính file này và /api/cai-dat-base đọc-ghi, không màn nào hiện, không phép tính nào đọc):
 *   · nguongNamImNgay (ngưỡng nằm im) · truongTuyBienWbs (trường khai mã WBS)
 *   · quyDoiDuAn (quy đổi dự án ↔ không gian Base)
 * Ba thứ đó thuộc Agent Base (1-agent-base giữ bản riêng, đang dùng). File cũ còn khoá
 * thì docCaiDat bỏ qua, lần ghi sau tự rơi khỏi file — không sập.
 * ⭐ 24/09 (lượt 2) — bỏ thêm `nguongViecQuaHan` (ngưỡng việc quá hạn): đo grep src/ +
 * tests/ chỉ có file này và PUT /api/cai-dat-base đọc-ghi, không màn nào hiện, không phép
 * tính nào đọc. File cũ còn khoá (data/cai-dat-base.json đang ghi 5) vẫn đọc được.
 */
export const TRUONG_DA_BO = ["nguongNamImNgay", "truongTuyBienWbs", "quyDoiDuAn", "nguongViecQuaHan"] as const;

/** Bỏ các khoá đã gỡ khỏi một object đọc từ file / body cũ */
function boTruongCu<T extends object>(o: T): T {
  const ra = { ...o } as Record<string, unknown>;
  for (const k of TRUONG_DA_BO) delete ra[k];
  return ra as T;
}

export interface CaiDatBase {
  /**
   * TỪ ĐIỂN NGỮ CẢNH (mục 6f) — nội dung file "Cơ cấu tổ chức và danh mục
   * dự án", dán NGUYÊN VĂN. Không parse thành cột vì LLM đọc chứ không phải
   * code. Thiếu cái này thì agent đọc tên viết tắt trong Base sẽ không biết
   * đó là ban nào, dự án nào — mọi phân tích phía sau đều lệch.
   */
  tuDienNguCanh: string;

  /**
   * ⭐ 04/10/2026 (CHOT 6g.7 mục 5): từ điển nay Main TỰ GHÉP (lib/tu-dien-ngu-canh.ts) — chỉ còn hai ô gõ tay:
   * A "Tập đoàn và các công ty thành viên" và D "Chỗ bổ sung". `tuDienNguCanh` giữ làm bản cũ (không ai đọc nữa);
   * tệp chưa có hai trường này thì docCaiDat tách từ bản cũ (tachTuDienCu).
   */
  tuDienCongTy: string;
  tuDienBoSung: string;

  /** Username Base của người dùng hiện tại (tab 8) */
  usernameBase: string;

  /**
   * ⭐ DANH BẠ AGENT — người điều khiển tự khai muốn nối mấy con, con nào.
   * KHÔNG gắn cứng "4 agent" hay "5 agent" ở bất kỳ đâu trong code:
   * hôm nay 5 con, mai thêm con quan sát thành 6, mốt bớt còn 2 — chỉ sửa
   * bảng này trong Cài đặt, code giữ nguyên.
   * Khuôn theo `core.nang_luc_agent` (PLAN-TONG-THE 6.5).
   */
  danhBaAgent: KhaiAgent[];

  /**
   * ⭐ NHỊP TỰ CHẠY CỦA CON QUAN SÁT — mấy giờ đêm thì tự đi soi cả hệ.
   * Cũng là cấu hình, không gắn cứng: bật/tắt, đổi giờ, chọn có chạy cả bộ
   * test hay chỉ gọi thử sức khoẻ (nhanh hơn nhiều).
   */
  quanSatTuChay: NhipQuanSat;

  /**
   * ⭐ 26/09 — HAI MỐC GIỮ SỔ HỎI–ĐÁP (HOP-DONG-KET-NOI 7.1): đầy đủ ≤ dayDu ngày (tra
   * ngược báo cáo tuần) · bản gọn ≤ gon ngày (tra ngược báo cáo tháng) · cũ hơn xoá.
   * Cài đặt CHUNG của hệ — 4 agent kéo về qua main.du_lieu_dung_chung (`giu_so`).
   */
  giuSo: MocGiuSo;

  /** Sổ ghi vết sửa cấu hình — 200 dòng gần nhất */
  vetSua: VetSua[];
}

export const MAC_DINH: CaiDatBase = {
  tuDienNguCanh: "",
  tuDienCongTy: "",
  tuDienBoSung: "",
  usernameBase: "",
  danhBaAgent: DANH_BA_MAC_DINH,
  quanSatTuChay: NHIP_QUAN_SAT_MAC_DINH,
  giuSo: MOC_GIU_SO_MAC_DINH,
  vetSua: [],
};

// ─────────────────────────────────────────────────────────────
// Đọc / ghi
// ─────────────────────────────────────────────────────────────

export function docCaiDat(): CaiDatBase {
  try {
    const tho = fs.readFileSync(DUONG_DAN(), "utf8").replace(/^﻿/, "");
    const d = boTruongCu(JSON.parse(tho) as Partial<CaiDatBase>);
    // 04/10: chưa có hai ô mới → tách từ ô gõ tay cũ (không mất chữ: không nhận ra khuôn thì dồn hết vào "Chỗ bổ sung")
    const tach =
      typeof d.tuDienCongTy !== "string" && typeof d.tuDienBoSung !== "string" && d.tuDienNguCanh
        ? tachTuDienCu(d.tuDienNguCanh)
        : null;
    return {
      ...MAC_DINH,
      ...d,
      tuDienCongTy: tach ? tach.congTy : typeof d.tuDienCongTy === "string" ? d.tuDienCongTy : "",
      tuDienBoSung: tach ? tach.boSung : typeof d.tuDienBoSung === "string" ? d.tuDienBoSung : "",
      // Danh ba co the thieu truong o ban cu -> chuan hoa lai, bo dong hong
      danhBaAgent: Array.isArray(d.danhBaAgent)
        ? (d.danhBaAgent
            .map((x) => chuanHoaKhai(x as Partial<KhaiAgent>))
            .filter(Boolean) as KhaiAgent[])
        : MAC_DINH.danhBaAgent,
      quanSatTuChay: {
        ...NHIP_QUAN_SAT_MAC_DINH,
        ...(d.quanSatTuChay ?? {}),
      },
      // Mốc hỏng/thiếu trong tệp → mặc định của khuôn (không để một số sai làm dọn nhầm sổ)
      giuSo: ((k) => (k.ok ? k.moc : { ...MOC_GIU_SO_MAC_DINH }))(kiemMocGiuSo(d.giuSo)),
      vetSua: Array.isArray(d.vetSua) ? d.vetSua : [],
    };
  } catch {
    // Chưa có file = lần đầu chạy, KHÔNG phải lỗi
    return { ...MAC_DINH };
  }
}

/** Ghi cài đặt mới, tự sinh vết sửa cho các trường có đổi */
export function ghiCaiDat(moi: Partial<CaiDatBase>, nguoi: string): CaiDatBase {
  const cu = docCaiDat();
  const vet: VetSua[] = [];
  const luc = new Date().toISOString();

  moi = boTruongCu(moi);
  const soSanh: (keyof CaiDatBase)[] = ["usernameBase"];
  for (const k of soSanh) {
    if (moi[k] !== undefined && String(moi[k]) !== String(cu[k])) {
      vet.push({
        thoiDiem: luc,
        nguoi,
        truong: k,
        tuGiaTri: String(cu[k]),
        sangGiaTri: String(moi[k]),
      });
    }
  }
  if (moi.tuDienNguCanh !== undefined && moi.tuDienNguCanh !== cu.tuDienNguCanh) {
    vet.push({
      thoiDiem: luc,
      nguoi,
      truong: "tuDienNguCanh",
      tuGiaTri: `${cu.tuDienNguCanh.length.toLocaleString("vi-VN")} ký tự`,
      sangGiaTri: `${moi.tuDienNguCanh.length.toLocaleString("vi-VN")} ký tự`,
    });
  }
  for (const k of ["tuDienCongTy", "tuDienBoSung"] as const) {
    if (moi[k] !== undefined && moi[k] !== cu[k]) {
      vet.push({ thoiDiem: luc, nguoi, truong: k, tuGiaTri: `${cu[k].length.toLocaleString("vi-VN")} ký tự`, sangGiaTri: `${(moi[k] ?? "").length.toLocaleString("vi-VN")} ký tự` });
    }
  }
  if (
    moi.danhBaAgent !== undefined &&
    JSON.stringify(moi.danhBaAgent) !== JSON.stringify(cu.danhBaAgent)
  ) {
    const dem = (ds: KhaiAgent[]) => `${ds.length} agent, ${ds.filter((a) => a.dangBat).length} đang bật`;
    vet.push({
      thoiDiem: luc,
      nguoi,
      truong: "danhBaAgent",
      tuGiaTri: dem(cu.danhBaAgent),
      sangGiaTri: dem(moi.danhBaAgent),
    });
  }
  if (
    moi.quanSatTuChay !== undefined &&
    JSON.stringify(moi.quanSatTuChay) !== JSON.stringify(cu.quanSatTuChay)
  ) {
    const ta = (n: NhipQuanSat) =>
      n.bat ? `bật, ${n.gio}${n.chayCaTest ? ", có chạy test" : ", chỉ đo sức khoẻ"}` : "tắt";
    vet.push({
      thoiDiem: luc,
      nguoi,
      truong: "quanSatTuChay",
      tuGiaTri: ta(cu.quanSatTuChay),
      sangGiaTri: ta(moi.quanSatTuChay),
    });
  }
  if (moi.giuSo !== undefined && JSON.stringify(moi.giuSo) !== JSON.stringify(cu.giuSo)) {
    const ta = (m: MocGiuSo) => `đầy đủ ${m.dayDu} ngày · gọn tới ${m.gon} ngày`;
    vet.push({
      thoiDiem: luc,
      nguoi,
      truong: "giuSo",
      tuGiaTri: ta(cu.giuSo),
      sangGiaTri: ta(moi.giuSo),
    });
  }
  const ra: CaiDatBase = {
    ...cu,
    ...moi,
    vetSua: [...vet, ...cu.vetSua].slice(0, 200),
  };

  fs.mkdirSync(path.dirname(DUONG_DAN()), { recursive: true });
  fs.writeFileSync(DUONG_DAN(), JSON.stringify(ra, null, 2), "utf8");
  return ra;
}

/** Đọc danh bạ agent — cửa DUY NHẤT để biết hệ đang nối mấy con, con nào */
export function docDanhBaAgent(): KhaiAgent[] {
  return docCaiDat().danhBaAgent;
}
