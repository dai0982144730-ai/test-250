// ============================================================
// DỌN SỔ HỎI–ĐÁP THEO TUỔI — HOP-DONG-KET-NOI 7.1 "Giữ sổ theo tuổi"
// (Mr. Đại chốt 26/09/2026). Tệp này CHÉP GIỐNG HỆT ở 4 app Next; phần riêng
// từng app (thư mục dữ liệu, mốc lấy ở đâu) nằm ở `moc-giu-so-luu.ts`.
//
//   ≤ mốc đầy đủ (10 ngày) → giữ nguyên từng byte
//   ≤ mốc gọn (35 ngày)    → `rutGonDong` (bỏ traLoi/biCat, thêm daRutGon: true)
//   cũ hơn                 → xoá
//   dòng hỏng (không đọc được JSON) → GIỮ nguyên, chỉ đếm
//
// SỔ LÀ TỆP GHI NỐI LIÊN TỤC. Cách không để mất dòng mới:
//   1. đọc tệp, chỉ xử lý tới ký tự xuống dòng cuối cùng (đuôi dở dang = chưa đọc);
//   2. ghi bản đã dọn ra tệp tạm;
//   3. chép thêm vào tệp tạm MỌI byte được ghi nối SAU lúc đọc (so kích thước tệp);
//   4. thay tệp gốc bằng rename (nguyên tử).
// Toàn bộ chạy ĐỒNG BỘ — trong cùng tiến trình máy chủ, `ghiNhatKy` (appendFileSync)
// không chen vào giữa được; bước 3 đỡ cho tiến trình KHÁC (script) ghi cùng lúc.
// Không có dòng nào phải đổi thì KHÔNG ghi lại tệp.
//
// Lịch: mỗi đêm 03:30 giờ VN — giờ vắng nhất: sau việc đêm pháp lý (02:00) và quét
// tuần (02:30), trước báo cáo sáng 07:00; máy tắt lúc đó thì nhịp đầu tiên sau khi
// bật lại sẽ dọn bù (một lần mỗi ngày). Kết quả ghi vào `data/don-so-trang-thai.json`
// — KHÔNG ghi vào sổ hỏi–đáp. Server-only (node:fs).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { cachGiuDong, rutGonDong } from "./khuon-so";
import type { MocGiuSo } from "./moc-giu-so";
import { docMocGiuSo, thuMucSo } from "./moc-giu-so-luu";

export const TEN_TEP_SO = "nhat-ky-hoi-agent.jsonl";
export const TEN_TEP_TRANG_THAI = "don-so-trang-thai.json";
const TEN_TEP_KHOA = "don-so.dang-chay";
/** Giờ VN dọn mỗi đêm */
export const GIO_DON_SO = "03:30";
/** Khoá chạy để lâu hơn mức này coi như lượt trước đã chết giữa chừng */
const HAN_KHOA_MS = 10 * 60_000;
/** Giữ bao nhiêu lần dọn gần nhất trong tệp trạng thái */
const SO_LAN_LUU = 30;

export interface DemDonSo {
  /** Dòng giữ đầy đủ */
  dayDu: number;
  /** Dòng ở tuổi "gọn" (kể cả dòng vốn không có nội dung để bỏ) */
  gon: number;
  /** Trong số dòng gọn: bao nhiêu dòng THỰC SỰ bị bỏ nội dung lần này */
  daRutGon: number;
  xoa: number;
  /** Dòng không đọc được JSON — giữ nguyên */
  hong: number;
  /** Dòng được ghi nối vào sổ trong lúc đang dọn — đã ghép lại, không mất */
  ghiNoiThem: number;
  byteTruoc: number;
  byteSau: number;
  /** Có ghi lại tệp không (không dòng nào phải đổi thì không) */
  daGhiLai: boolean;
}

export type BoiDonSo = "tu-dong" | "tay";

export interface KetQuaDonSo extends DemDonSo {
  luc: string;
  boi: BoiDonSo;
  moc: MocGiuSo;
  /** Mốc lấy từ đâu: cấu hình Main hay mặc định của khuôn */
  nguonMoc: "main" | "mac-dinh";
  miliGiay: number;
  loi?: string;
}

export interface TrangThaiDonSo {
  /** Ngày VN (YYYY-MM-DD) vòng TỰ ĐỘNG đã dọn — một lần mỗi ngày */
  ngayDaDon: string | null;
  lanCuoi: KetQuaDonSo | null;
  lichSu: KetQuaDonSo[];
}

const DEM_RONG: DemDonSo = { dayDu: 0, gon: 0, daRutGon: 0, xoa: 0, hong: 0, ghiNoiThem: 0, byteTruoc: 0, byteSau: 0, daGhiLai: false };

// ─────────────────────────────────────────────────────────────
// Lõi: dọn MỘT tệp sổ
// ─────────────────────────────────────────────────────────────

function nguSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Windows: tệp đang bị mở đọc có thể làm rename hỏng tạm thời (EPERM/EBUSY) — thử lại vài lần */
function doiTen(tu: string, sang: string): void {
  for (let lan = 1; ; lan++) {
    try {
      fs.renameSync(tu, sang);
      return;
    } catch (e) {
      const ma = (e as NodeJS.ErrnoException).code;
      if (lan >= 8 || (ma !== "EPERM" && ma !== "EBUSY" && ma !== "EACCES")) throw e;
      nguSync(50 * lan);
    }
  }
}

function demXuongDong(b: Buffer): number {
  let n = 0;
  for (let i = 0; i < b.length; i++) if (b[i] === 0x0a) n++;
  return n;
}

/**
 * Dọn một tệp sổ JSONL. `sauKhiDoc` chỉ bài kiểm dùng — mô phỏng dòng được ghi nối
 * sau lúc đọc. Ném lỗi khi không thay được tệp (tệp gốc vẫn nguyên).
 */
export function donSoTep(
  tep: string,
  o: { bayGio?: number; moc: MocGiuSo; sauKhiDoc?: () => void },
): DemDonSo {
  if (!fs.existsSync(tep)) return { ...DEM_RONG };
  const bayGio = o.bayGio ?? Date.now();
  const buf = fs.readFileSync(tep);
  const dem: DemDonSo = { ...DEM_RONG, byteTruoc: buf.length };
  // Chỉ xử lý tới ký tự xuống dòng cuối — đuôi dở dang (đang ghi dở) coi như chưa đọc
  const daDoc = buf.lastIndexOf(0x0a) + 1;
  const ra: string[] = [];
  let coDoi = false;
  if (daDoc > 0) {
    const dong = buf.subarray(0, daDoc).toString("utf8").split("\n");
    dong.pop(); // phần rỗng sau "\n" cuối
    for (const tho of dong) {
      if (tho.trim() === "") continue;
      let d: unknown;
      try {
        d = JSON.parse(tho);
      } catch {
        d = undefined;
      }
      if (!d || typeof d !== "object" || Array.isArray(d)) {
        dem.hong++;
        ra.push(tho);
        continue;
      }
      const o2 = d as Record<string, unknown>;
      const cach = cachGiuDong(typeof o2.thoiDiem === "string" ? o2.thoiDiem : "", bayGio, o.moc);
      if (cach === "xoa") {
        dem.xoa++;
        coDoi = true;
      } else if (cach === "gon") {
        dem.gon++;
        if ("traLoi" in o2 || "biCat" in o2) {
          ra.push(JSON.stringify(rutGonDong(o2)));
          dem.daRutGon++;
          coDoi = true;
        } else {
          ra.push(tho); // vốn đã gọn — giữ nguyên từng byte
        }
      } else {
        dem.dayDu++;
        ra.push(tho);
      }
    }
  }
  o.sauKhiDoc?.();
  if (!coDoi) {
    dem.byteSau = fs.statSync(tep).size;
    return dem;
  }

  const tam = `${tep}.dang-don`;
  try {
    fs.writeFileSync(tam, ra.length ? ra.join("\n") + "\n" : "");
    // Ghép mọi byte được ghi nối SAU lúc đọc (kể cả đuôi dở dang lúc đọc)
    let viTri = daDoc;
    for (let vong = 0; vong < 50; vong++) {
      const co = fs.statSync(tep).size;
      if (co < viTri) throw new Error("Sổ bị cắt ngắn giữa lúc dọn — bỏ lượt dọn, sổ giữ nguyên");
      if (co === viTri) break;
      const them = Buffer.alloc(co - viTri);
      const fd = fs.openSync(tep, "r");
      try {
        fs.readSync(fd, them, 0, them.length, viTri);
      } finally {
        fs.closeSync(fd);
      }
      fs.appendFileSync(tam, them);
      dem.ghiNoiThem += demXuongDong(them);
      viTri = co;
    }
    doiTen(tam, tep);
  } catch (e) {
    try {
      fs.rmSync(tam, { force: true });
    } catch {
      /* tệp tạm sót lại không hại gì — lần sau ghi đè */
    }
    throw e;
  }
  dem.daGhiLai = true;
  dem.byteSau = fs.statSync(tep).size;
  return dem;
}

// ─────────────────────────────────────────────────────────────
// Trạng thái + khoá chống chạy chồng
// ─────────────────────────────────────────────────────────────

function tepTrangThai(): string {
  return path.join(thuMucSo(), TEN_TEP_TRANG_THAI);
}

export function docTrangThaiDonSo(): TrangThaiDonSo {
  try {
    const j = JSON.parse(fs.readFileSync(tepTrangThai(), "utf8")) as Partial<TrangThaiDonSo>;
    return {
      ngayDaDon: typeof j.ngayDaDon === "string" ? j.ngayDaDon : null,
      lanCuoi: j.lanCuoi && typeof j.lanCuoi === "object" ? j.lanCuoi : null,
      lichSu: Array.isArray(j.lichSu) ? j.lichSu : [],
    };
  } catch {
    return { ngayDaDon: null, lanCuoi: null, lichSu: [] };
  }
}

function ghiTrangThai(t: TrangThaiDonSo): void {
  try {
    fs.mkdirSync(path.dirname(tepTrangThai()), { recursive: true });
    fs.writeFileSync(tepTrangThai(), JSON.stringify(t, null, 2), "utf8");
  } catch {
    /* ghi trạng thái hỏng không được làm hỏng lượt dọn */
  }
}

/** Lấy khoá (tệp tạo bằng cờ "wx") — chặn cả tiến trình khác (script) chạy chồng */
function layKhoa(): string | null {
  const p = path.join(thuMucSo(), TEN_TEP_KHOA);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tuoi = Date.now() - fs.statSync(p).mtimeMs;
    if (tuoi > HAN_KHOA_MS) fs.rmSync(p, { force: true });
  } catch {
    /* chưa có khoá */
  }
  try {
    fs.writeFileSync(p, JSON.stringify({ pid: process.pid, luc: new Date().toISOString() }), { flag: "wx" });
    return p;
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __donSoDangChay: boolean | undefined;
  // eslint-disable-next-line no-var
  var __donSoNhipDaBat: boolean | undefined;
}

/** Giờ VN — {ngay "YYYY-MM-DD", gio "HH:MM"} */
function gioVnDonSo(luc: Date): { ngay: string; gio: string } {
  const t = new Date(luc.getTime() + 7 * 3_600_000).toISOString();
  return { ngay: t.slice(0, 10), gio: t.slice(11, 16) };
}

/** Dọn sổ của app này một lượt. Không ném — lỗi nằm trong `loi`. */
export function donSo(o: { boi: BoiDonSo; bayGio?: Date }): KetQuaDonSo {
  const bay = o.bayGio ?? new Date();
  const batDau = Date.now();
  const { moc, nguon } = docMocGiuSo();
  const kq = (dem: DemDonSo, loi?: string): KetQuaDonSo => ({
    luc: bay.toISOString(),
    boi: o.boi,
    moc,
    nguonMoc: nguon,
    ...dem,
    miliGiay: Date.now() - batDau,
    ...(loi ? { loi } : {}),
  });
  if (globalThis.__donSoDangChay) return kq({ ...DEM_RONG }, "Đang có một lượt dọn sổ khác — không chạy chồng.");
  const khoa = layKhoa();
  if (!khoa) return kq({ ...DEM_RONG }, "Tiến trình khác đang dọn sổ — không chạy chồng.");
  globalThis.__donSoDangChay = true;
  let ra: KetQuaDonSo;
  try {
    ra = kq(donSoTep(path.join(thuMucSo(), TEN_TEP_SO), { bayGio: bay.getTime(), moc }));
  } catch (e) {
    ra = kq({ ...DEM_RONG }, `Dọn sổ lỗi: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    globalThis.__donSoDangChay = false;
    try {
      fs.rmSync(khoa, { force: true });
    } catch {
      /* khoá sót — lần sau tự gỡ khi quá hạn */
    }
  }
  const tt = docTrangThaiDonSo();
  ghiTrangThai({
    // Chỉ vòng tự động đánh dấu "hôm nay đã dọn"; chạy tay để kiểm không chặn vòng đêm
    ngayDaDon: o.boi === "tu-dong" ? gioVnDonSo(bay).ngay : tt.ngayDaDon,
    lanCuoi: ra,
    lichSu: [ra, ...tt.lichSu].slice(0, SO_LAN_LUU),
  });
  return ra;
}

/** Một nhịp xét: đã qua 03:30 giờ VN mà hôm nay chưa dọn thì dọn. Trả null nếu chưa tới lượt. */
export function xetDonSoDem(bay: Date = new Date()): KetQuaDonSo | null {
  if (globalThis.__donSoDangChay) return null;
  const { ngay, gio } = gioVnDonSo(bay);
  if (gio < GIO_DON_SO) return null;
  if (docTrangThaiDonSo().ngayDaDon === ngay) return null;
  return donSo({ boi: "tu-dong", bayGio: bay });
}

/** Nhịp riêng mỗi phút — cho app chưa có vòng hẹn giờ sẵn. Bật một lần mỗi tiến trình. */
export function khoiDongDonSo(): void {
  if (globalThis.__donSoNhipDaBat) return;
  globalThis.__donSoNhipDaBat = true;
  setInterval(() => {
    try {
      xetDonSoDem();
    } catch {
      /* nhịp dọn sổ không được làm sập máy chủ */
    }
  }, 60_000);
}

/** Khối `giu_so` khai trong `suc_khoe` — Agent quan sát hiện lại (chỉ đọc) */
export function giuSoChoSucKhoe(): Record<string, unknown> {
  const { moc, nguon } = docMocGiuSo();
  const cuoi = docTrangThaiDonSo().lanCuoi;
  return {
    day_du: moc.dayDu,
    gon: moc.gon,
    nguon_moc: nguon,
    gio_don: GIO_DON_SO,
    lan_don_cuoi: cuoi?.luc ?? null,
    ket_qua_cuoi: cuoi
      ? {
          boi: cuoi.boi,
          so_dong_day_du: cuoi.dayDu,
          so_dong_gon: cuoi.gon,
          so_dong_da_rut_gon: cuoi.daRutGon,
          so_dong_xoa: cuoi.xoa,
          so_dong_hong: cuoi.hong,
          kb_truoc: Math.round(cuoi.byteTruoc / 1024),
          kb_sau: Math.round(cuoi.byteSau / 1024),
          loi: cuoi.loi ?? null,
        }
      : null,
  };
}
