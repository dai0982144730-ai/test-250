// Kiểu dữ liệu màn Việc của tôi (bản agent Công việc) — file THUẦN cho client import (luật 10).
// Hàm server ở lib/chung/viec-cong-viec.ts.
import type { NhapViecAi } from "@/lib/chung/viec-ai-soan";

/** Một việc như công cụ base.viec_cua_toi trả về */
export interface ViecCV {
  ma_viec_base: string;
  ten: string;
  du_an: string | null;
  /** YYYY-MM-DD */
  han: string | null;
  qua_han_ngay: number | null;
  chu_tri: string | null;
  nguoi_giao: string | null;
  /** Đường trên giao diện agent Công việc, ghép sau `goc` */
  duong_mo: string;
  /** 07/10 — dựng như khu phải Sơ đồ tổ chức agent Công việc: tình trạng ("quá hạn 3 ngày" · "còn 2 ngày" · "Xong ngày …"),
   *  dấu "!" việc găng, nhóm đơn vị ("Của riêng Ban lãnh đạo" · từng đơn vị cấp 2). Agent Công việc bản cũ không gửi → thiếu */
  tt?: "tre" | "sap" | "con" | "thuong-xuyen" | "xong";
  tt_chu?: string;
  gang?: boolean;
  nhom?: string;
  nhom_thu_tu?: number;
}

export type LoaiViecToi = "giao" | "nhan" | "phoi_hop";

export interface ViecCuaToiCV {
  ok: boolean;
  dem: Record<LoaiViecToi, number>;
  ds: Record<LoaiViecToi, ViecCV[]>;
  /** Khối "Việc làm xong: Tuần N−1 và N" cuối mỗi nhóm (như agent Công việc) */
  lamXong?: { nhan: string; giaiThich: string; ds: Record<LoaiViecToi, ViecCV[]> };
  loi?: string;
}

export interface NguoiNhanCV {
  nguoi: { id: string; ten: string; dv: string | null; don_vi_ids?: string[] }[];
  don_vi: { id: string; ten: string; ten_ngan?: string | null; cap?: number | null; cha_id?: string | null; loai?: string | null }[];
  /** Ô "Giao cho" (Mr. Đại chốt 04/10 tối) — agent Công việc dựng sẵn, chỉ nơi người bấm giao được: Ban lãnh đạo (trừ trợ lý) ·
   *  cây đơn vị · người giao đích danh được (gõ @). Thiếu (agent Công việc bản cũ) → ô chọn quay về danh sách đủ */
  nhom?: { lanh_dao: string[]; cay: { id: string; thut: number }[]; ca_nhan: string[] };
  /** Danh mục dự án của agent Công việc — ô "Thuộc dự án · không bắt buộc" (04/10 chiều) */
  du_an?: { id: string; ten: string; nhom?: string }[];
  /** Cài đặt kẹp tệp khi giao việc của agent Công việc */
  dinh_kem?: { bat: boolean; toi_da_mb: number; so_file_toi_da: number; luu_thang: number };
}

/** Một tệp đã chuyển sang kho đính kèm của agent Công việc (mã DK-…) */
export interface TepCV {
  id: string;
  ten: string;
  kich_thuoc: number;
}

/** Nháp hiện trên màn: thêm mã ngắn dự án đã tra từ projectId (rỗng = chưa gắn dự án có mã) */
export type NhapHien = NhapViecAi & {
  maDuAn: string;
  /** Đợt ④ (06/10): agent soạn ra nháp — chỉ bảng tổng ở Main điền (main · tiendo · hopdong …); trống = agent đang mở màn */
  agent?: string;
  /** Tiêu đề issue nguồn (agent gốc tra) — để dòng Nguồn ghi "mã + tên" (luật 30) */
  tieuDeIssue?: string;
  /** Nguồn (Mr. Đại chốt 07/10): nút găng chưa giao ở Cây việc · issue · yêu cầu trong chat — tổng phải khớp từng nguồn */
  nguonViec?: NguonViec;
  /** 07/10 — ô Lọc khung trái: việc nằm trên đường găng (thẻ làm lùi COD / nút găng Cây việc) · mức issue gốc. Agent gốc gửi kèm */
  gang?: boolean;
  mucDo?: "red" | "yellow" | "green";
};

/** Ô Lọc khung trái Việc của tôi (Mr. Đại chốt 07/10) — một ô, chọn là áp dụng */
/** Ô Lọc khung trái — tên 6 lựa chọn Mr. Đại chốt 07/10/2026 (bỏ "hạn đã qua") */
/**
 * "Tự đóng (N) ▸" (Mr. Đại duyệt 08/10/2026 — bảng B mục 5): việc chờ duyệt MÁY tự đóng vì hết lý do tồn tại (issue gốc hết vi
 * phạm · WBS đạt 100% · đã có người giao tay). Gom MỘT danh sách mặc định thu gọn, không lẫn vào việc đang chờ; 90 ngày sau xoá hẳn.
 */
export interface ViecTuDong {
  id: string;
  /** Agent gốc (bảng tổng Main) — thiếu = agent đang xem */
  agent?: string;
  maDuAn: string;
  ten: string;
  /** Câu máy ghi vì sao đóng — chữ thường, không 🤖 (code ghép) */
  lyDo: string;
  /** ISO lúc máy đóng */
  luc: string;
  /** Đóng vì đã có người giao tay việc cùng WBS — mã việc đó */
  maViec?: string | null;
}

export type LocNhap = "moi" | "gap" | "gang" | "do" | "chua-nguoi" | "han-7";
export const LUA_CHON_LOC_NHAP: { kieu: LocNhap; nhan: string }[] = [
  { kieu: "moi", nhan: "Mới soạn trước" },
  { kieu: "gap", nhan: "Gấp nhất trước" },
  { kieu: "gang", nhan: "Việc trên đường găng" },
  { kieu: "do", nhan: "Việc nghiêm trọng" },
  { kieu: "chua-nguoi", nhan: "Chưa có người nhận" },
  { kieu: "han-7", nhan: "Hạn trong 7 ngày" },
];

export type NguonViec = "cay-viec" | "issue" | "chat";
export const NHAN_NGUON_VIEC: Record<NguonViec, string> = { "cay-viec": "Cây việc & đường găng", issue: "Issue", chat: "Trợ lý chat" };
/** Nguồn của một nháp: agent gốc ghi sẵn (agent Công việc) · không thì có thẻ issue → Issue · không → chat */
export const nguonViecCua = (n: Pick<NhapHien, "nguonViec" | "tuIssue">): NguonViec => n.nguonViec ?? (n.tuIssue ? "issue" : "chat");

/** "Kết quả cần có" mặc định của một nháp AI — MỘT chỗ cho cả ô Sửa (điền sẵn) lẫn nút Gửi thẳng (máy chủ) */
export function ketQuaMacDinhNhap(n: Pick<NhapViecAi, "tuIssue" | "moTa">): string {
  const moTa = (n.moTa ?? "").trim();
  // Nháp gom từ agent khác (đợt ④) đã mang sẵn "Từ issue …" do agent gốc ghép — không ghép lần hai
  const tien = n.tuIssue && !moTa.startsWith(`Từ issue ${n.tuIssue}`) ? `Từ issue ${n.tuIssue}.` : "";
  return [tien, moTa].filter(Boolean).join(" ").trim();
}

/** Mã người/đơn vị của agent Công việc khớp gợi ý cũ trên nháp (username Base "thinhhp" ↔ "thinhhp@scigroup.vn"); không khớp → "" */
export function maNhanTuGoiY(ds: NguoiNhanCV | null, goiY?: string): string {
  const g = (goiY ?? "").replace(/^@/, "").trim().toLowerCase();
  if (!ds || !g) return "";
  return ds.don_vi.find((d) => d.id === g)?.id ?? ds.nguoi.find((n) => n.id.toLowerCase() === g || n.id.toLowerCase().split("@")[0] === g)?.id ?? "";
}

/** Tên chuẩn hoá để so trùng (thường hoá, gộp khoảng trắng, bỏ tiền tố "[tên dự án] " agent Công việc gắn vào tên việc) */
function chuanTen(t: string): string {
  return t.normalize("NFC").toLowerCase().replace(/^\[[^\]]*\]\s*/, "").replace(/\s+/g, " ").trim();
}

/**
 * Lọc nháp trước khi hiện (Mr. Đại bắt 04/10/2026: "nếu đã giao rồi thì ẩn đi, không hiển thị nữa thành rác thông tin"):
 *  ① đã có việc CÙNG TÊN trong "Việc tôi giao" ở agent Công việc → đã giao rồi, ẩn (tên ≥ 15 ký tự thì khớp cả khi tên việc dài hơn);
 *     nháp soạn từ một THẺ mà thẻ đó đã giao (qua bất kỳ bản nháp nào của thẻ) → ẩn mọi nháp của thẻ;
 *  ② một thẻ nguồn chỉ giữ bản nháp MỚI NHẤT; nháp từ câu nói (không thẻ) thì trùng tên mới gộp (danh sách vào đã sắp mới trước).
 */
export function locNhapHien<T extends Pick<NhapViecAi, "ten" | "tuIssue"> & { agent?: string }>(nhap: T[], viecToiGiao: Pick<ViecCV, "ten">[]): T[] {
  const tenGiao = viecToiGiao.map((v) => chuanTen(v.ten));
  const daGiao = (n: T) => {
    const t = chuanTen(n.ten);
    return !!t && tenGiao.some((g) => g === t || (t.length >= 15 && g.includes(t)));
  };
  const theDaGiao = new Set(nhap.filter((n) => n.tuIssue && daGiao(n)).map((n) => n.tuIssue));
  const daThay = new Set<string>();
  return nhap.filter((n) => {
    if (daGiao(n) || (n.tuIssue && theDaGiao.has(n.tuIssue))) return false;
    // Bảng tổng Main (đợt ④): mã issue chỉ duy nhất TRONG một agent → khoá kèm agent
    const k = n.tuIssue ? `the|${n.agent ?? ""}|${n.tuIssue}` : `ten|${chuanTen(n.ten)}`;
    if (daThay.has(k)) return false;
    daThay.add(k);
    return true;
  });
}

/** Hạn "dd/mm/yyyy" (hoặc "yyyy-mm-dd") đã qua so với hôm nay giờ Việt Nam chưa — nháp hạn đã qua không gửi được (Mr. Đại chốt 04/10 tối) */
export function hanDaQua(han: string | null | undefined): boolean {
  const s = (han ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
  return !!iso && iso < new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Lý do tự đóng — GỌN MỘT DÒNG (Mr. Đại 09/10/2026: hiện "· Lý do: …" chữ cam nối sau "90 ngày sau xoá hẳn"). Bỏ tên issue / tên việc
 * lặp lại (đã nằm ở dòng tên việc ngay trên). Áp cả câu cũ đã lưu trước 09/10; câu mới máy đã ghi gọn sẵn (viec-tu-dong.ts).
 */
export function lyDoGon(s: string): string {
  // Luật 30 (kiểm độc lập 10/10): không để MỖI mã. Issue gốc → bỏ mã (tên issue đã ở dòng tên việc ngay trên);
  // việc giao tay là việc KHÁC → ghi tên ngắn kèm mã.
  return s
    .replace(/^Issue (\S+) ".*" (đã .+)$/, "issue gốc $2")
    .replace(/^issue gốc ISS-\S+ (đã .+)$/, "issue gốc $1")
    .replace(/^Đã có việc (\S+) "(.*)" cùng đầu việc .+ giao ở agent Công việc sau lúc máy soạn$/, (_m, ma: string, ten: string) =>
      `đã có việc giao tay "${tenNgan8(ten)}" (${ma}) ở agent Công việc sau lúc máy soạn`,
    );
}

/** Tên rút còn ≤ 8 chữ (luật 30 — "tên dài rút ≤ ~8 chữ") */
export function tenNgan8(ten: string): string {
  const chu = ten.trim().split(/\s+/);
  return chu.length > 8 ? `${chu.slice(0, 8).join(" ")}…` : chu.join(" ");
}
