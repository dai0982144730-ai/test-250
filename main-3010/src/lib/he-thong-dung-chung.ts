// ============================================================
// DỮ LIỆU DÙNG CHUNG CỦA CẢ HỆ — MAIN LÀ BẢN GỐC (Mr. Đại chốt 11/09/2026)
//
// Nguyên tắc "một vấn đề chỉ ở một nơi, cả hệ 5 agent coi là một nơi": Dự án ·
// Người dùng & quyền · Kết nối (AI, Drive, Base.vn) chỉ KHAI Ở MAIN. Bốn agent kia
// kéo về qua cổng MCP `main.du_lieu_dung_chung` (cùng nếp với `main.danh_ba`)
// và chỉ ĐỌC. (26/09: đây là đường DUY NHẤT còn lại — `main.cau_hinh_chung` đã gỡ.) Main chết → cả hệ ngừng khai mới, đúng ý anh;
// một trong bốn con kia chết không ảnh hưởng con khác vì chúng chỉ đọc bản kéo về.
//
// Trả cả khoá thật (AI key, token Base, token Drive, hash mật khẩu) — đường này
// chỉ mở qua cổng MCP nội bộ, có ghi vết từng lượt ở sổ nhật ký.
// Server-only (node:fs qua các kho).
// ============================================================

import { tuDienDayDu } from "@/lib/tu-dien-ngu-canh";
import { docCaiDat } from "@/lib/cai-dat-base";
import { danhSachDuAnDungChung, type ProjectInfo } from "@/lib/projects";
import { danhSachNguoiDungDayDu, soBanGhiNguoiLa, type StoredUser } from "@/lib/users";
import { biDanhHopLe, docBiDanhTaiKhoan, type BiDanhTaiKhoan } from "@/lib/bi-danh-tai-khoan";
import { docToChuc, type TinhTrangToChuc } from "@/lib/to-chuc";
import type { ToChuc } from "@/lib/to-chuc-kieu";
import { dungBang, tinhChoNguoi, type LoaiDuAn } from "@/lib/loai-theo-so-do";
import { getAIConfig } from "@/lib/ai/providers";
import { getSetting } from "@/lib/appconfig";
import { docDrive } from "@/lib/drive/store";

export interface DuAnDungChung {
  /** slug — trùng tên thư mục data/projects/<id> ở mọi agent */
  id: string;
  /** ⭐ MÃ NGẮN dùng chung cả hệ: HV · TT · BT · N3A — khoá nối giữa 5 agent */
  ma: string;
  ten: string;
  ngayKhoiCong?: string;
  chuDauTu?: string;
  viDo?: number;
  kinhDo?: number;
  /** email Giám đốc dự án — CHỈ LÀ DỮ LIỆU (25/09: không còn là điều kiện ký; ký = mọi PM, quyen.ts) */
  giamDoc?: string;
  /** ⭐ 03/10 (LOI-DUNG-CHUNG 6g.6): tên gọi khác trong báo cáo + nhóm cây Dự án (sci | khac) */
  tenKhac: string[];
  nhom?: "sci" | "khac";
  /** ⭐ 6g.6 Đợt 2 bước E: đơn vị gắn (SCI đầu tư: đầu = Ban QLDA) + Ban điều hành. Không có = Main chưa quản (agent giữ bản tại chỗ) */
  donVi?: string[];
  banDieuHanh?: string | null;
  luuTru: boolean;
  taoLuc: string;
  taoBoi: string;
}

export interface BanDungChung {
  luc: string;
  duAn: DuAnDungChung[];
  /**
   * Bản ghi đầy đủ (kèm hash/salt) — agent đích ghi thẳng vào users.json của nó.
   * ⭐ 6g.6.13: tổ chức đã có → người không phải PM/Admin mang `role` = loại ở Main (theo sơ đồ) + `loaiTheoDuAn`
   * (MÃ NGẮN dự án — HV · TT · NK1… dùng chung cả hệ, Pháp lý không có mã Main → "engineer" | "viewer" | null = không thấy).
   * Tiến độ · Hợp đồng · Pháp lý tra bảng này, KHÔNG tự tính. Dự án không có mã ngắn (dự án demo) không có trong bảng.
   */
  nguoiDung: NguoiDungGiao[];
  ketNoi: {
    ai: { mode: string; provider: string; apiKey: string; model: string; baseUrl: string };
    base: Record<string, string>;
    drive: { client?: unknown; token?: unknown; email?: string };
  };
  /** 📄 Từ điển ngữ cảnh «Cơ cấu tổ chức và danh mục dự án» — bản sửa duy nhất ở Main (11/09) */
  tuDienNguCanh: string;
  /**
   * ⭐ E15 (23/09) — ánh xạ người dùng hệ thống ↔ username Base, nguồn Agent Base
   * (base.thong_tin_nhan_su.email_sci) qua danh bạ Main. Agent nhận: tra "email
   * đang đăng nhập → @username Base" (giao việc, lọc việc của tôi) mà khỏi hỏi Base.
   */
  anhXaBase: { email: string; usernameBase: string; hoTen?: string }[];
  /** ⭐ 6g.6 Đợt 2 (03/10): bí danh tài khoản email cũ → email mới (gộp dai@sci.vn → dainc; admin@sci.vn → quantri) — chỉ dòng khớp người Main */
  biDanhTaiKhoan: BiDanhTaiKhoan[];
  /** Số bản ghi users.json hàm lọc không nhận — > 0 thì agent nhận KHÔNG khoá người vắng mặt (soát vòng 2 · 03/10) */
  soNguoiBiLoc: number;
  /** ⭐ 6g.6 A9 (Đợt 2): cây đơn vị · kiêm nhiệm · ủy quyền ký — `tinhTrang` khác "ok" thì agent nhận KHÔNG coi là tổ chức rỗng */
  toChuc: ToChuc & { tinhTrang: TinhTrangToChuc };
  /**
   * ⭐ 26/09 — hai mốc giữ sổ hỏi–đáp (HOP-DONG-KET-NOI 7.1): cài đặt chung của hệ, khai ở
   * Cài đặt → 🔌 Kết nối; mỗi agent kéo về rồi tự dọn sổ của mình mỗi đêm.
   */
  giuSo: { dayDu: number; gon: number };
}

export type NguoiDungGiao = StoredUser & { loaiTheoDuAn?: Record<string, LoaiDuAn> };

/** 6g.6.13: kèm loại theo sơ đồ cho từng người. Tổ chức chưa có / hỏng → giao nguyên như trước */
export function nguoiKemLoai(ds: StoredUser[], duAn: Pick<ProjectInfo, "ma" | "donVi" | "banDieuHanh">[]): NguoiDungGiao[] {
  const tc = docToChuc();
  if (tc.tinhTrang !== "ok") return ds;
  const b = dungBang(tc.toChuc);
  const pj = duAn
    .filter((p) => (p.ma ?? "").trim() !== "")
    .map((p) => ({ id: (p.ma ?? "").trim().toUpperCase(), donVi: p.donVi, banDieuHanh: p.banDieuHanh ?? null }));
  return ds.map((u) => {
    const t = tinhChoNguoi(u, pj, b);
    return t.theoDuAn ? { ...u, role: t.role, loaiTheoDuAn: t.theoDuAn } : u;
  });
}

function duAnTuRegistry(p: ProjectInfo): DuAnDungChung {
  return {
    id: p.id,
    ma: (p.ma ?? "").trim().toUpperCase(),
    ten: p.name,
    ngayKhoiCong: p.projectStart,
    chuDauTu: p.chuDauTu,
    viDo: p.viDo,
    kinhDo: p.kinhDo,
    giamDoc: p.giamDoc,
    tenKhac: p.tenKhac ?? [],
    nhom: p.nhom,
    ...(p.donVi ? { donVi: p.donVi, banDieuHanh: p.banDieuHanh ?? null } : {}),
    luuTru: p.archived === true,
    taoLuc: p.createdAt,
    taoBoi: p.createdBy,
  };
}

export function banDungChung(): BanDungChung {
  const ai = getAIConfig();
  const dsDuAn = danhSachDuAnDungChung();
  const nguoiDung = nguoiKemLoai(danhSachNguoiDungDayDu(), dsDuAn);
  // 04/10 tối (Mr. Đại duyệt dọn vết Base): Base.vn hết hợp đồng — thôi phát khoá Base.vn. Gửi {} để Tiến độ / Hợp đồng /
  // Pháp lý ghi đè khoá đang giữ thành rỗng ở lượt đồng bộ sau (dong-bo-tu-main của từng agent ghi `?? ""`).
  const base: Record<string, string> = {};
  const drive = docDrive();
  const caiDat = docCaiDat();
  return {
    luc: new Date().toISOString(),
    duAn: dsDuAn.map(duAnTuRegistry),
    nguoiDung,
    ketNoi: {
      ai: { mode: ai.mode, provider: ai.provider, apiKey: ai.apiKey, model: ai.model, baseUrl: ai.baseUrl },
      base,
      drive: { client: drive.client, token: drive.token, email: drive.email },
    },
    // 04/10 (CHOT 6g.7 mục 5): bản Main tự ghép — agent nhận vẫn là một chuỗi chữ như trước
    tuDienNguCanh: tuDienDayDu(),
    giuSo: { dayDu: caiDat.giuSo.dayDu, gon: caiDat.giuSo.gon },
    // 04/10 tối: thôi phát ánh xạ email ↔ tài khoản Base.vn (kho danh bạ Base cũ đã cất vào data/_da-go-04-10) — gửi [] để
    // agent nhận xoá bản đang giữ. Giữ trường để khuôn trả lời không đổi.
    anhXaBase: [],
    biDanhTaiKhoan: biDanhHopLe(docBiDanhTaiKhoan(), nguoiDung),
    soNguoiBiLoc: soBanGhiNguoiLa(),
    toChuc: (() => {
      const tc = docToChuc();
      return { ...tc.toChuc, tinhTrang: tc.tinhTrang };
    })(),
  };
}
