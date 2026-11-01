// ============================================================
// BÁO CÁO SÁNG — KHO (server-only, node:fs)
// MD: PLAN-MAIN-AGENT mục 6.2 (`core.luat_bao_cao_sang`) · 6.3
//
// Hai file trong `data/`:
//   bao-cao-sang-luat.json        — danh sách luật động, SỬA/XOÁ ĐƯỢC
//   bao-cao-sang-lich-su.jsonl    — mỗi dòng một bản báo cáo đã dựng
//
// Vì sao luật để JSON còn lịch sử để JSONL: luật là thứ người dùng xoá thường
// xuyên (mục 6.2: "mọi luật đều xem và xoá được"), còn lịch sử báo cáo là sổ
// chỉ-ghi-thêm — sửa được thì mất tác dụng tra lại "hôm ấy báo theo luật nào".
//
// LUẬT HẾT HẠN KHÔNG BỊ XOÁ KHỎI ĐĨA, chỉ rụng khỏi danh sách còn hiệu lực khi
// đọc. Xoá thật thì không tra ngược được, mà cái giá lưu là vài dòng JSON.
//
// Ghi hỏng KHÔNG được làm hỏng việc chính (giống sổ nhật ký) — mọi hàm đọc
// bọc try/catch và trả về rỗng thay vì ném.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import {
  chuanHoaLuat,
  locLuatConHieuLuc,
  locLuatHetHan,
  type LuatBaoCao,
} from "./luat";
import { taoDong, type BaoCaoSang, type DongBaoCao, type DongThieu } from "./model";
import type { DuLieuKhoi } from "./khoi-du-lieu";

const FILE_LUAT = () => path.join(gocDuLieu(), "bao-cao-sang-luat.json");
const FILE_LICH_SU = () => path.join(gocDuLieu(), "bao-cao-sang-lich-su.jsonl");

function baoDamThuMuc(p: string): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

// ─────────────────────────────────────────────────────────────
// Luật động
// ─────────────────────────────────────────────────────────────

/** Đọc TOÀN BỘ luật (kể cả đã hết hạn) — màn hình cần hiện cả khối hết hạn */
export function docLuat(): LuatBaoCao[] {
  try {
    const tho = fs.readFileSync(FILE_LUAT(), "utf8").replace(/^﻿/, "");
    const v = JSON.parse(tho) as unknown;
    if (!Array.isArray(v)) return [];
    return v.map(chuanHoaLuat).filter((x): x is LuatBaoCao => x !== null);
  } catch {
    // Chưa có file = chưa ai đặt luật nào, KHÔNG phải lỗi
    return [];
  }
}

function ghiLuat(ds: LuatBaoCao[]): boolean {
  try {
    const p = FILE_LUAT();
    baoDamThuMuc(p);
    fs.writeFileSync(p, JSON.stringify(ds, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Thêm một luật. Trùng NGUYÊN VĂN và còn hiệu lực thì KHÔNG thêm dòng thứ hai
 * — nhắn lại hai lần cùng một câu là chuyện thường, đẻ ra hai luật giống hệt
 * chính là kiểu chồng luật mà mục 6.2 muốn chặn.
 */
export function themLuat(luat: LuatBaoCao): { them: boolean; ds: LuatBaoCao[] } {
  const ds = docLuat();
  const trung = ds.find(
    (l) =>
      l.noiDung === luat.noiDung &&
      l.phamVi === luat.phamVi &&
      l.hieuLucTu === luat.hieuLucTu,
  );
  if (trung) return { them: false, ds };
  const moi = [luat, ...ds].slice(0, 500);
  ghiLuat(moi);
  return { them: true, ds: moi };
}

/** Xoá một luật theo mã — mục 6.2: "mọi luật đều xem và xoá được trên màn hình" */
export function xoaLuat(ma: string): { xoa: boolean; ds: LuatBaoCao[] } {
  const ds = docLuat();
  const con = ds.filter((l) => l.ma !== ma);
  if (con.length === ds.length) return { xoa: false, ds };
  ghiLuat(con);
  return { xoa: true, ds: con };
}

/** Luật còn hiệu lực cho một ngày (ISO giờ VN) */
export function docLuatConHieuLuc(ngay: string): LuatBaoCao[] {
  return locLuatConHieuLuc(docLuat(), ngay);
}

/** Luật đã hết hạn tính đến ngày đó — hiện riêng, mờ, có nút xoá hẳn */
export function docLuatHetHan(ngay: string): LuatBaoCao[] {
  return locLuatHetHan(docLuat(), ngay);
}

// ─────────────────────────────────────────────────────────────
// Lịch sử báo cáo
// ─────────────────────────────────────────────────────────────

/**
 * Đọc lại một dòng báo cáo từ đĩa. Nguồn rỗng → BỎ dòng đó, y như lúc dựng:
 * file JSON sửa tay được, nên luật cứng 1 phải kiểm lại ở cả đường đọc.
 */
function chuanHoaDong(v: unknown): DongBaoCao | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const muc = o.muc;
  if (muc !== "can-quyet" && muc !== "dang-chu-y" && muc !== "da-lam") return null;
  return taoDong({
    muc,
    duAn: typeof o.duAn === "string" ? o.duAn : null,
    noiDung: typeof o.noiDung === "string" ? o.noiDung : "",
    nguon: typeof o.nguon === "string" ? o.nguon : "",
    soNgayAnhHuong: typeof o.soNgayAnhHuong === "number" ? o.soNgayAnhHuong : null,
    doLlmSinh: o.doLlmSinh === true,
  });
}

function chuanHoaBaoCao(v: unknown): BaoCaoSang | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const ngay = typeof o.ngay === "string" ? o.ngay : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return null;
  const dongTho = Array.isArray(o.dong) ? o.dong : [];
  const dong = dongTho.map(chuanHoaDong).filter((x): x is DongBaoCao => x !== null);
  const thieuTho = Array.isArray(o.thieuSot) ? o.thieuSot : [];
  const thieuSot: DongThieu[] = thieuTho
    .map((t) => {
      const x = t as Record<string, unknown>;
      return {
        ten: typeof x.ten === "string" ? x.ten : "",
        lyDo: typeof x.lyDo === "string" ? x.lyDo : "",
        // ⭐ 04/10 — chỗ thiếu của MỘT dự án
        ...(typeof x.maDuAn === "string" ? { maDuAn: x.maDuAn } : {}),
        ...(typeof x.tenDuAn === "string" ? { tenDuAn: x.tenDuAn } : {}),
      };
    })
    .filter((t) => t.ten !== "");
  const luatTho = Array.isArray(o.luatApDung) ? o.luatApDung : [];
  return {
    ngay,
    soDuAn: typeof o.soDuAn === "number" ? o.soDuAn : null,
    dong,
    thieuSot,
    luatApDung: luatTho.map((l) => {
      const x = l as Record<string, unknown>;
      return {
        ma: typeof x.ma === "string" ? x.ma : "",
        noiDung: typeof x.noiDung === "string" ? x.noiDung : "",
        moTaHieuLuc: typeof x.moTaHieuLuc === "string" ? x.moTaHieuLuc : "",
      };
    }),
    soDongBiLoaiVaThieuNguon:
      typeof o.soDongBiLoaiVaThieuNguon === "number" ? o.soDongBiLoaiVaThieuNguon : 0,
    dungLuc: typeof o.dungLuc === "string" ? o.dungLuc : `${ngay}T00:00:00.000Z`,
    daGuiLuc: typeof o.daGuiLuc === "string" ? o.daGuiLuc : null,
    // ⭐ 25/09 — trường của luật báo cáo sáng mới; bản cũ không có thì bỏ trống
    ...(Array.isArray(o.duAn) && Array.isArray(o.vanDe)
      ? {
          duAn: o.duAn as BaoCaoSang["duAn"],
          vanDe: o.vanDe as BaoCaoSang["vanDe"],
          ...(o.thongKe && typeof o.thongKe === "object" ? { thongKe: o.thongKe as BaoCaoSang["thongKe"] } : {}),
          ...(typeof o.lienKetIssue === "string" ? { lienKetIssue: o.lienKetIssue } : {}),
          // ⭐ 04/10 — kịch bản theo người nhận
          ...(Array.isArray(o.viecDoKhac) ? { viecDoKhac: o.viecDoKhac as BaoCaoSang["viecDoKhac"] } : {}),
          ...(typeof o.diaChiMain === "string" ? { diaChiMain: o.diaChiMain } : {}),
        }
      : {}),
  };
}

/** Ghi thêm một bản báo cáo vào sổ. Sổ hỏng thì mất vết, không sập việc chính. */
export function luuBaoCao(bc: BaoCaoSang): boolean {
  try {
    const p = FILE_LICH_SU();
    baoDamThuMuc(p);
    fs.appendFileSync(p, JSON.stringify(bc) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

/** Lịch sử, MỚI NHẤT trước. Dòng hỏng bỏ dòng đó, không bỏ cả sổ. */
export function docLichSu(gioiHan = 30): BaoCaoSang[] {
  try {
    const dong = fs
      .readFileSync(FILE_LICH_SU(), "utf8")
      .split("\n")
      .filter((s) => s.trim() !== "");
    const ra: BaoCaoSang[] = [];
    for (const s of dong) {
      try {
        const bc = chuanHoaBaoCao(JSON.parse(s));
        if (bc) ra.push(bc);
      } catch {
        // dòng hỏng — bỏ qua
      }
    }
    return ra.reverse().slice(0, gioiHan);
  } catch {
    return [];
  }
}

/** Bản báo cáo MỚI NHẤT của một ngày (một ngày có thể dựng lại nhiều lần) */
export function docBaoCaoNgay(ngay: string): BaoCaoSang | null {
  return docLichSu(400).find((b) => b.ngay === ngay) ?? null;
}

/**
 * Đánh dấu "đã gửi Telegram" bằng cách ghi THÊM một bản mới, không sửa dòng cũ
 * — sổ chỉ-ghi-thêm thì sửa tại chỗ là phá luật của chính nó.
 */
export function danhDauDaGui(bc: BaoCaoSang, luc: string): BaoCaoSang {
  const moi: BaoCaoSang = { ...bc, daGuiLuc: luc };
  luuBaoCao(moi);
  return moi;
}

// ─────────────────────────────────────────────────────────────
// ⭐ 17/10/2026 — SỐ CÁC KHỐI BÁO CÁO SÁNG (KE-HOACH/23): mỗi ngày MỘT tệp `data/bao-cao-sang-khoi/<ngày>.json`, ghi đè
// trong ngày. Vì sao không nhét vào sổ lịch sử: sổ đã 1,3 MB / 89 dòng (đo 17/10) và mỗi lần «đã gửi» chép lại cả bản —
// số khối (S-Curve, xu thế COD…) ~40 KB/ngày sẽ nhân lên vài lần mỗi ngày.
// ─────────────────────────────────────────────────────────────

const THU_MUC_KHOI = () => path.join(gocDuLieu(), "bao-cao-sang-khoi");

export function luuKhoi(ngay: string, dl: DuLieuKhoi): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return false;
  try {
    const p = path.join(THU_MUC_KHOI(), `${ngay}.json`);
    baoDamThuMuc(p);
    const tam = `${p}.tam`;
    fs.writeFileSync(tam, JSON.stringify(dl), "utf8");
    fs.renameSync(tam, p);
    return true;
  } catch {
    return false;
  }
}

export function docKhoi(ngay: string): DuLieuKhoi | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return null;
  try {
    const v = JSON.parse(fs.readFileSync(path.join(THU_MUC_KHOI(), `${ngay}.json`), "utf8")) as DuLieuKhoi;
    return v && typeof v === "object" && v.theoDuAn && typeof v.theoDuAn === "object" ? { ...v, keoVe: v.keoVe ?? {} } : null;
  } catch {
    return null;
  }
}
