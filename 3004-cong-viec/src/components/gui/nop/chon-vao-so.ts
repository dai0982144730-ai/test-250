// ============================================================
// gui/nop/chon-vao-so.ts — Ô "Vào sổ cái" ở bước 4 cho MỘT dòng: chọn được gì, mặc định gì, có bắt chọn không.
// MỘT chỗ duy nhất (luật 7) cho bảng Duyệt việc (BangDuyetViec) và nút Gửi (KhungSoanGui) — trước đây hai nơi tự tính.
// Mr. Đại chốt 02/10/2026 (lỗi CV-2026-0098 "Thi công móng trụ T5–T8"):
//   · dòng báo ĐÃ XONG (code đọc, hoặc 🤖 AI đọc ô Tình trạng) không bao giờ thành việc mới: "Không vào sổ" hoặc đóng đúng việc
//   · ứng viên là việc đã xong + dòng chưa xong → "Đúng là CV-… (đã xong …) — mở lại"
//   · 🤖 AI rà từng ứng viên của máy: ứng viên AI cho là khác việc vẫn hiện (người quyết) nhưng không bắt chọn, không mặc định
// Mr. Đại gật 18/10/2026: LẦN NẠP ĐẦU của đơn vị lập + mẫu (máy chủ gắn xong_lan_dau) → dòng đã xong mặc định "Vào sổ — đã xong
//   ngày …" (giá trị "xong"); vẫn chọn được "Không vào sổ" hoặc "Đúng là CV-… — đóng việc này"
// ============================================================
import type { DongCongViec, DuDoanDong } from "@/lib/types";

/** Phần kết quả "AI đọc báo cáo" của một dòng mà ô này cần (lib/so-cai/ai-ra-viec.ts GoiYAiViec) */
export type GoiYAiDong = {
  chi_so: number;
  trung?: { ma: string; ten: string; ly_do: string }[];
  tinh_trang?: { gia_tri: "xong" | "chua_xong" | "dung"; ly_do: string };
  may_sai?: { ma: string; ly_do: string }[];
  van_de?: string;
};

export type UngVienChon = { ma: string; ten: string; ly_do: string; da_xong?: string | null; ai_sai?: string; cap_tren_xong?: string | null };

export interface CachChon {
  /** dòng là việc đã xong (code hoặc AI đọc) */
  laXong: boolean;
  /** 🤖 lý do AI đọc là đã xong khi code chưa nhận ra */
  aiXong: string | null;
  /** lần nạp đầu + dòng đã xong: ngày xong sẽ ghi (yyyy-mm-dd) */
  xongLanDau: string | null;
  ungVien: UngVienChon[];
  /** giá trị mặc định khi người nộp chưa chọn: "" = bắt chọn · "khong" · "moi" · "xong" (lần nạp đầu: vào sổ ở trạng thái đã xong) */
  macDinh: "" | "khong" | "moi" | "xong";
  /** các lựa chọn của ô (giá trị gửi lên /api/gui xac_nhan_trung) */
  luaChon: { v: string; nhan: string }[];
}

const ngan = (s: string, n = 42) => (s.length > n ? `${s.slice(0, n)}…` : s);
const ngayVN = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

export function cachChon(d: DuDoanDong | undefined, c: DongCongViec | undefined, g: GoiYAiDong | undefined): CachChon {
  const aiXong = c && !c.da_xong && g?.tinh_trang?.gia_tri === "xong" ? g.tinh_trang.ly_do || "AI đọc là đã xong" : null;
  const laXong = !!c?.da_xong || !!aiXong;
  const xongLanDau = laXong && d?.xong_lan_dau ? d.xong_lan_dau : null;
  const sai = new Map((g?.may_sai ?? []).map((s) => [s.ma, s.ly_do]));
  const ungVien: UngVienChon[] = [];
  if (d?.hanh_dong === "goi_y_trung")
    for (const x of d.goi_y ?? []) {
      if (laXong && x.da_xong) continue; // việc đã xong thì không cần "đóng" lần nữa
      ungVien.push({
        ma: x.cong_viec_id,
        ten: x.ten,
        ly_do: x.cap_tren_xong ? `${x.cap_tren_xong} (cấp trên) đã báo xong — chọn thì ghi ý kiến khác, báo người giao, không mở lại` : `máy thấy giống ${Math.round(x.do_giong * 100)}%`,
        da_xong: x.da_xong ?? null,
        ...(x.cap_tren_xong ? { cap_tren_xong: x.cap_tren_xong } : {}),
        ...(sai.has(x.cong_viec_id) ? { ai_sai: sai.get(x.cong_viec_id) } : {}),
      });
    }
  for (const t of g?.trung ?? []) if (!ungVien.some((u) => u.ma === t.ma)) ungVien.push({ ma: t.ma, ten: t.ten, ly_do: `🤖 ${t.ly_do}` });

  const choChon =
    d && (d.hanh_dong === "goi_y_trung" || d.hanh_dong === "tao_moi" || d.hanh_dong === "vao_so_xong" || (d.hanh_dong === "khong_dung" && !d.cong_viec_id && laXong));
  const tin = ungVien.filter((u) => !u.ai_sai);
  const macDinh: CachChon["macDinh"] = choChon && tin.length ? "" : laXong ? (xongLanDau ? "xong" : "khong") : "moi";
  const luaChon: CachChon["luaChon"] = [];
  if (choChon) {
    if (xongLanDau) luaChon.push({ v: "xong", nhan: `Vào sổ — đã xong ngày ${ngayVN(xongLanDau)} (lần nạp đầu)` });
    if (laXong) luaChon.push({ v: "khong", nhan: "Không vào sổ — việc đã xong" });
    if (!c?.da_xong) luaChon.push({ v: "moi", nhan: aiXong ? "Vẫn vào sổ — việc mới" : "Việc mới" });
    for (const u of ungVien)
      luaChon.push({
        v: u.ma,
        nhan: `Đúng là ${u.ma} · ${ngan(u.ten)}${u.cap_tren_xong ? ` (cấp trên đã báo xong ${ngayVN(u.da_xong ?? "")}) — ghi ý kiến khác` : u.da_xong ? ` (đã xong ${ngayVN(u.da_xong)}) — mở lại` : laXong ? " — đóng việc này" : ""}${u.ai_sai ? " · 🤖 khác việc" : ""}`,
      });
  }
  return { laXong, aiXong, xongLanDau, ungVien, macDinh, luaChon };
}

/** Giá trị gửi lên khi người nộp chọn x: trùng mặc định thì không gửi (máy chủ tự làm đúng mặc định). */
export const giaTriGui = (cc: CachChon, x: string): string | null => (!x || x === cc.macDinh ? null : x);
