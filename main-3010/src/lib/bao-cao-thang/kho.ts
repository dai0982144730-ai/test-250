// ============================================================
// KHO BẢN NHÁP BÁO CÁO THÁNG  (server-only)
//
// Mỗi kỳ một file `data/bao-cao-thang/<nam>-<thang>.json`. Không tách theo dự
// án: quyết định 1 của Mr. Đại 30/08 là GỘP CẢ 3 DỰ ÁN VÀO MỘT FILE.
//
// ⛔ Kho này KHÔNG phải nguồn số liệu. Nó chỉ giữ BẢN NHÁP đã dựng để mở lại
//    xem, không phải để Main "có sẵn số khỏi hỏi" — Main không giữ dữ liệu
//    nghiệp vụ (PLAN mục 1). Muốn số mới thì dựng lại bản nháp mới.
//
// ⛔ TRƯỚC KHI LƯU phải soát `baoCaoHopLe`: ô có giá trị mà thiếu nguồn thì
//    TỪ CHỐI LƯU. Ranh giới JSON không mang theo kiểu nên nhánh union của
//    `OSo` hết tác dụng ở đây — phải soát lại bằng tay đúng chỗ này.
//
// DAC-TA mục 4 điểm 3: bản đã ký là bản gốc, sửa thì tạo phiên bản mới, giữ
// bản cũ. Vì vậy lưu đè chỉ áp cho bản NHÁP; bản đã chốt được chép sang tên
// có hậu tố phiên bản.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { baoCaoHopLe, type BaoCaoThang } from "./model";

const THU_MUC = "bao-cao-thang";

function thuMuc(): string {
  return path.join(gocDuLieu(), THU_MUC);
}

/** Tên file một kỳ: "2026-07.json" */
export function tenFileKy(nam: number, thang: number): string {
  return `${nam}-${String(thang).padStart(2, "0")}.json`;
}

function duongDan(nam: number, thang: number): string {
  return path.join(thuMuc(), tenFileKy(nam, thang));
}

export interface KetQuaLuu {
  ok: boolean;
  duongDan?: string;
  loi?: string[];
}

/**
 * Lưu bản nháp. Báo cáo không hợp lệ thì KHÔNG LƯU và trả về danh sách lỗi —
 * để một ô số không nguồn lọt vào kho là để nó lọt luôn ra file DOCX gửi Chủ
 * đầu tư.
 */
export function luuBanNhap(bc: BaoCaoThang): KetQuaLuu {
  const soat = baoCaoHopLe(bc);
  if (!soat.ok) return { ok: false, loi: soat.loi };
  try {
    const p = duongDan(bc.ky.nam, bc.ky.thang);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(bc, null, 2), "utf8");
    return { ok: true, duongDan: p };
  } catch (e) {
    return { ok: false, loi: [`Không ghi được file bản nháp: ${(e as Error).message}`] };
  }
}

/**
 * Đọc bản nháp một kỳ. File hỏng hoặc không hợp lệ → trả `null` kèm lý do,
 * KHÔNG trả về báo cáo vá víu: bản nháp lỗi mà vẫn hiện lên là mời người đọc
 * tin vào số không truy được nguồn.
 */
export function docBanNhap(
  nam: number,
  thang: number,
): { bc: BaoCaoThang | null; lyDo?: string } {
  const p = duongDan(nam, thang);
  if (!fs.existsSync(p)) {
    return { bc: null, lyDo: `Chưa dựng bản nháp cho kỳ ${nam}-${String(thang).padStart(2, "0")}.` };
  }
  let tho: string;
  try {
    tho = fs.readFileSync(p, "utf8");
  } catch (e) {
    return { bc: null, lyDo: `Không đọc được file bản nháp: ${(e as Error).message}` };
  }
  let bc: BaoCaoThang;
  try {
    bc = JSON.parse(tho) as BaoCaoThang;
  } catch {
    return { bc: null, lyDo: "File bản nháp hỏng cấu trúc JSON." };
  }
  const soat = baoCaoHopLe(bc);
  if (!soat.ok) {
    return {
      bc: null,
      lyDo: `Bản nháp đã lưu không đạt luật dẫn nguồn: ${soat.loi.slice(0, 3).join(" · ")}`,
    };
  }
  return { bc };
}

export interface DongDanhSach {
  nam: number;
  thang: number;
  tenFile: string;
  thoiDiemSua: string;
}

// ─────────────────────────────────────────────────────────────
// 13/10/2026 (KE-HOACH/22): thông tin đầu báo cáo + bản TRƯỚC để so khi "Làm lại báo cáo"
// ─────────────────────────────────────────────────────────────

/** Ba ô đầu báo cáo người dùng khai một lần: Đơn vị lập · Nơi nhận · Người ký */
export interface CaiDatDauBaoCao {
  donViLap: string;
  noiNhan: string;
  nguoiKy: string;
}

function duongDanCaiDat(): string {
  return path.join(thuMuc(), "cai-dat-dau-bao-cao.json");
}

export function docCaiDatDau(): CaiDatDauBaoCao {
  const chu = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 200) : "");
  try {
    const j = JSON.parse(fs.readFileSync(duongDanCaiDat(), "utf8")) as Record<string, unknown>;
    return { donViLap: chu(j.donViLap), noiNhan: chu(j.noiNhan), nguoiKy: chu(j.nguoiKy) };
  } catch {
    return { donViLap: "", noiNhan: "", nguoiKy: "" };
  }
}

export function luuCaiDatDau(v: Partial<CaiDatDauBaoCao>): { ok: boolean; loi?: string; caiDat: CaiDatDauBaoCao } {
  const cu = docCaiDatDau();
  const chu = (m: unknown, c: string) => (typeof m === "string" ? m.trim().slice(0, 200) : c);
  const moi: CaiDatDauBaoCao = {
    donViLap: chu(v.donViLap, cu.donViLap),
    noiNhan: chu(v.noiNhan, cu.noiNhan),
    nguoiKy: chu(v.nguoiKy, cu.nguoiKy),
  };
  try {
    fs.mkdirSync(thuMuc(), { recursive: true });
    fs.writeFileSync(duongDanCaiDat(), JSON.stringify(moi, null, 2), "utf8");
    return { ok: true, caiDat: moi };
  } catch (e) {
    return { ok: false, loi: `Không ghi được thông tin đầu báo cáo: ${(e as Error).message}`, caiDat: cu };
  }
}

function duongDanBanTruoc(nam: number, thang: number): string {
  return path.join(thuMuc(), `${nam}-${String(thang).padStart(2, "0")}.truoc.json`);
}

/**
 * Giữ bản đang lưu thành "bản trước" NGAY TRƯỚC KHI làm lại — để màn hình nói được báo cáo đổi ra sao
 * (Mr. Đại 13/10: "khi code các agent khác thay đổi thì tôi muốn coi báo cáo tháng sẽ thay đổi ra sao").
 * Chỉ giữ MỘT bản trước mỗi kỳ; không có bản đang lưu thì không làm gì.
 */
export function giuBanTruoc(nam: number, thang: number): void {
  try {
    const p = duongDan(nam, thang);
    if (fs.existsSync(p)) fs.copyFileSync(p, duongDanBanTruoc(nam, thang));
  } catch {
    /* không giữ được bản trước thì vẫn làm lại — chỉ mất dòng so sánh */
  }
}

export function docBanTruoc(nam: number, thang: number): BaoCaoThang | null {
  try {
    return JSON.parse(fs.readFileSync(duongDanBanTruoc(nam, thang), "utf8")) as BaoCaoThang;
  } catch {
    return null;
  }
}

/** Các kỳ đã có bản nháp, mới nhất trước */
export function danhSachBanNhap(): DongDanhSach[] {
  const d = thuMuc();
  if (!fs.existsSync(d)) return [];
  const ra: DongDanhSach[] = [];
  let ten: string[];
  try {
    ten = fs.readdirSync(d);
  } catch {
    return [];
  }
  for (const t of ten) {
    const m = /^(\d{4})-(\d{2})\.json$/.exec(t);
    if (!m) continue;
    let thoiDiem = "";
    try {
      thoiDiem = fs.statSync(path.join(d, t)).mtime.toISOString();
    } catch {
      thoiDiem = "";
    }
    ra.push({ nam: Number(m[1]), thang: Number(m[2]), tenFile: t, thoiDiemSua: thoiDiem });
  }
  return ra.sort((a, b) => b.nam - a.nam || b.thang - a.thang);
}

/**
 * Chốt một bản nháp thành phiên bản giữ lại (DAC-TA mục 4 điểm 3: bản đã ký là
 * bản gốc, sửa thì tạo bản mới, KHÔNG đè bản cũ).
 */
export function chotPhienBan(bc: BaoCaoThang, nhan: string): KetQuaLuu {
  const soat = baoCaoHopLe(bc);
  if (!soat.ok) return { ok: false, loi: soat.loi };
  const sach = nhan.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 40) || "ban-chot";
  try {
    const p = path.join(
      thuMuc(),
      `${bc.ky.nam}-${String(bc.ky.thang).padStart(2, "0")}--${sach}.json`,
    );
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (fs.existsSync(p)) {
      return { ok: false, loi: [`Đã có phiên bản tên "${sach}" cho kỳ này — đặt tên khác.`] };
    }
    fs.writeFileSync(p, JSON.stringify(bc, null, 2), "utf8");
    return { ok: true, duongDan: p };
  } catch (e) {
    return { ok: false, loi: [`Không ghi được phiên bản: ${(e as Error).message}`] };
  }
}
