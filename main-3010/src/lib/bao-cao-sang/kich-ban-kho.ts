// ============================================================
// KHO KỊCH BẢN BÁO CÁO SÁNG THEO NGƯỜI NHẬN (server-only, node:fs)
// MD: PLAN-MAIN-AGENT mục 6.6 · Mr. Đại chốt 04/10/2026
//
// Hai file trong `data/`:
//   bao-cao-sang-kich-ban.json   — mỗi người MỘT bản ghi: mẫu + phần ghi đè + lịch sử phiên bản
//   bao-cao-sang-da-gui.jsonl    — mỗi lượt gửi một dòng: ai · mẫu · mã tin Telegram
//                                  (Đợt 2 dùng mã tin để nhận ra "trả lời vào tin báo cáo" = góp ý)
//
// Khoá = MÃ NGƯỜI bất biến (`id`, 6g.6 A1) chứ không phải email — đổi email (04/10)
// không làm mất kịch bản. Người cũ chưa có mã thì dùng email.
//
// Người nhận = tài khoản đang mở + đã nối Telegram + có mẫu. Chưa ai được chọn mẫu
// thì MẶC ĐỊNH THEO CHỨC VỤ (Mr. Đại 04/10: Chủ tịch → Tổng quát, TGĐ → Điều hành) và
// chat cũ TELEGRAM_CHAT_ID → Điều hành (giữ nguyên cái anh đang nhận).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { danhSachNguoiDungDayDu, type StoredUser } from "@/lib/users";
import { listProjects } from "@/lib/projects";
import { chuanHoaGhiDe, laMaMau, thamSoHieuLuc, type MaMau, type ThamSoKichBan } from "./kich-ban";
import { boKhoiHieuLuc, chuanHoaBoKhoi, tenKhoi, type ChonKhoi } from "./khoi";

const FILE_KICH_BAN = () => path.join(gocDuLieu(), "bao-cao-sang-kich-ban.json");
const FILE_DA_GUI = () => path.join(gocDuLieu(), "bao-cao-sang-da-gui.jsonl");

/** "khong-nhan" = người này đã được chọn KHÔNG nhận (khác với chưa ai chọn) */
export type LuaChonMau = MaMau | "khong-nhan";

export interface PhienBanKichBan {
  luc: string;
  /** Email người đổi */
  boi: string;
  /** "nguoi-nhan" = khối Người nhận trên web · "telegram" = góp ý qua Telegram (Đợt 2) */
  nguon: string;
  mau: LuaChonMau;
  ghiDe: Partial<ThamSoKichBan>;
  duAnChon?: string[];
  /** ⭐ 17/10/2026 — bộ khối kéo thả (KE-HOACH/23); không có = theo bộ mặc định của mẫu */
  boKhoi?: ChonKhoi[];
  /** Câu tiếng Việt: đổi gì, vì sao */
  lyDo: string;
}

export interface BanGhiKichBan {
  ma: string;
  email: string;
  mau: LuaChonMau;
  ghiDe: Partial<ThamSoKichBan>;
  /**
   * ⭐ 04/10 tối — dự án CHỌN TAY cho mẫu Dự án (slug, thứ tự sổ dự án). Giữ nguyên khi đổi
   * mẫu qua lại: đây là "người này quản lý dự án nào", không phải tham số trình bày.
   */
  duAnChon: string[];
  /**
   * ⭐ 17/10/2026 (KE-HOACH/23) — bộ khối người này tự kéo thả: thứ tự + phạm vi + số dòng từng khối. Không có = bộ mặc
   * định của mẫu (ba mẫu cũ = ba bộ mặc định — không ai mất bản đang nhận). Đổi mẫu thì bỏ bộ riêng (nạp bộ của mẫu mới).
   */
  boKhoi?: ChonKhoi[];
  lichSu: PhienBanKichBan[];
}

type KhoKichBan = Record<string, BanGhiKichBan>;

const maNguoi = (u: Pick<StoredUser, "id" | "email">): string => (u.id && u.id.trim() !== "" ? u.id : u.email);

function docKho(): KhoKichBan {
  try {
    const v = JSON.parse(fs.readFileSync(FILE_KICH_BAN(), "utf8").replace(/^﻿/, "")) as unknown;
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    const ra: KhoKichBan = {};
    for (const [ma, o] of Object.entries(v as Record<string, unknown>)) {
      const x = o as Record<string, unknown>;
      const mau = x?.mau;
      if (!(laMaMau(mau) || mau === "khong-nhan")) continue;
      ra[ma] = {
        ma,
        email: typeof x.email === "string" ? x.email : "",
        mau,
        ghiDe: chuanHoaGhiDe(x.ghiDe),
        duAnChon: Array.isArray(x.duAnChon) ? x.duAnChon.filter((s): s is string => typeof s === "string") : [],
        ...(chuanHoaBoKhoi(x.boKhoi) ? { boKhoi: chuanHoaBoKhoi(x.boKhoi) as ChonKhoi[] } : {}),
        lichSu: Array.isArray(x.lichSu) ? (x.lichSu as PhienBanKichBan[]).slice(-50) : [],
      };
    }
    return ra;
  } catch {
    // Chưa có file = chưa ai chọn mẫu, KHÔNG phải lỗi
    return {};
  }
}

function ghiKho(k: KhoKichBan): void {
  try {
    const p = FILE_KICH_BAN();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tam = `${p}.tmp`;
    fs.writeFileSync(tam, JSON.stringify(k, null, 2), "utf8");
    fs.renameSync(tam, p);
  } catch (e) {
    // Kiểm độc lập 04/10 🟡2: câu lỗi đĩa gốc là tiếng Anh ("EPERM: operation not permitted…")
    // → ghi câu gốc vào nhật ký máy chủ, người dùng nhận câu tiếng Việt
    console.error("[bao-cao-sang] ghi kho kịch bản hỏng:", e);
    throw new Error("Không ghi được kho kịch bản báo cáo sáng — thử lại, còn lỗi thì báo quản trị.");
  }
}

/**
 * Đã có ai từng được chọn mẫu (kể cả "Không nhận") chưa. Chưa có → được dùng đường cũ
 * (một bản gửi chat TELEGRAM_CHAT_ID). Đã có → TÔN TRỌNG lựa chọn, không gửi đường cũ
 * (kiểm độc lập 04/10 🟡3: người chọn "Không nhận" vẫn nhận qua đường cũ).
 */
export function khoCoBanGhi(): boolean {
  return Object.keys(docKho()).length > 0;
}

/** Chat cũ nhận báo cáo trước 04/10 (biến môi trường) */
function chatCu(): string {
  return (process.env.TELEGRAM_CHAT_ID ?? "").trim();
}

/**
 * Mẫu mặc định khi CHƯA AI CHỌN cho người này. Chỉ theo đúng câu Mr. Đại nói 04/10 —
 * Phó chủ tịch, Phó TGĐ… để trống (Admin chọn), không đoán thêm.
 */
export function mauMacDinh(u: Pick<StoredUser, "chucVu" | "telegramChatId">): MaMau | null {
  const cv = (u.chucVu ?? "").trim().toLowerCase();
  if (cv === "chủ tịch hđqt" || cv === "chủ tịch hội đồng quản trị") return "tong-quat";
  if (cv === "tổng giám đốc") return "dieu-hanh";
  if (u.telegramChatId && u.telegramChatId === chatCu()) return "dieu-hanh";
  return null;
}

/** Danh sách dự án của công ty để chọn tay (đúng thứ tự sổ dự án) */
export function duAnDeChon(): { id: string; ten: string }[] {
  try {
    return listProjects().map((p) => ({ id: p.id, ten: p.name }));
  } catch {
    return [];
  }
}

/** Giữ dự án còn trong sổ, bỏ trùng, xếp theo thứ tự sổ dự án */
function chuanDuAnChon(ds: readonly string[]): string[] {
  const coThat = duAnDeChon().map((p) => p.id);
  return coThat.filter((id) => ds.includes(id));
}

export interface DongNguoiNhan {
  ma: string;
  email: string;
  ten: string;
  chucVu: string | null;
  capChucVu: number | null;
  daNoiTelegram: boolean;
  /** Mẫu hiệu lực; null = không nhận */
  mau: MaMau | null;
  /** true = chưa ai chọn, đang theo chức vụ */
  laMacDinh: boolean;
  ghiDe: Partial<ThamSoKichBan>;
  thamSo: ThamSoKichBan | null;
  /** Dự án chọn tay (mẫu Dự án dùng) — giữ cả khi đang ở mẫu khác */
  duAnChon: string[];
  /** ⭐ 17/10 — bộ khối hiệu lực (bộ riêng, hoặc bộ mặc định của mẫu); [] khi không nhận */
  boKhoi: ChonKhoi[];
  /** true = người này đã tự kéo thả (không theo bộ mặc định của mẫu) */
  boKhoiRieng: boolean;
  /** Có mẫu + đã nối Telegram → 07:00 sẽ gửi */
  seGui: boolean;
  /** Vì sao chưa gửi được — null khi `seGui` */
  lyDoChuaGui: string | null;
  /**
   * Mẫu Dự án mà chưa chọn dự án nào. VẪN GỬI — tin chỉ có lời nhắc chọn dự án (im lặng dễ
   * nhầm với hỏng), và KHÔNG rơi về đường cũ gửi bản toàn công ty (đo 04/10 tối: anh chọn mẫu
   * Dự án, chưa chọn dự án → danh sách rỗng → đường cũ gửi bản toàn công ty, trái ý anh).
   */
  thieuDuAn: boolean;
  /** Số lần kịch bản đã đổi */
  soPhienBan: number;
  /** Lượt gửi gần nhất */
  guiGanNhat: { ngay: string; luc: string; ok: boolean; soTin: number; loi: string | null } | null;
}

/** Bảng người nhận cho màn hình: mọi tài khoản đang mở, người có mẫu + đã nối Telegram lên đầu */
export function bangNguoiNhan(): DongNguoiNhan[] {
  const kho = docKho();
  const daGui = docDaGui(400);
  const ra: DongNguoiNhan[] = [];
  for (const u of danhSachNguoiDungDayDu()) {
    if (!u.active) continue;
    const ma = maNguoi(u);
    const bg = kho[ma];
    const macDinh = bg ? null : mauMacDinh(u);
    const mau: MaMau | null = bg ? (bg.mau === "khong-nhan" ? null : bg.mau) : macDinh;
    // Gửi thử về chat người bấm KHÔNG tính là đã gửi cho người này
    const gui = daGui.find((g) => g.ma === ma && g.duong !== "thu");
    const daNoiTelegram = typeof u.telegramChatId === "string" && u.telegramChatId !== "";
    const duAnChon = chuanDuAnChon(bg?.duAnChon ?? []);
    const lyDoChuaGui = mau && !daNoiTelegram ? "chưa nối Telegram" : null;
    ra.push({
      ma,
      email: u.email,
      ten: u.name,
      chucVu: u.chucVu ?? null,
      capChucVu: typeof u.capChucVu === "number" ? u.capChucVu : null,
      daNoiTelegram,
      mau,
      laMacDinh: !bg && macDinh !== null,
      ghiDe: bg?.ghiDe ?? {},
      thamSo: mau ? thamSoHieuLuc(mau, bg?.ghiDe) : null,
      duAnChon,
      boKhoi: mau ? boKhoiHieuLuc(mau, bg?.boKhoi) : [],
      boKhoiRieng: !!bg?.boKhoi && bg.boKhoi.length > 0,
      seGui: mau !== null && lyDoChuaGui === null,
      lyDoChuaGui,
      // Bộ khối có khối «Dự án tôi chọn» mà chưa chọn dự án nào → vẫn gửi, khối đó in lời nhắc (im lặng dễ nhầm với hỏng)
      thieuDuAn: duAnChon.length === 0 && (mau ? boKhoiHieuLuc(mau, bg?.boKhoi) : []).some((k) => k.phamVi === "du-an-chon"),
      soPhienBan: bg?.lichSu.length ?? 0,
      guiGanNhat: gui ? { ngay: gui.ngay, luc: gui.luc, ok: gui.ok, soTin: gui.messageIds.length, loi: gui.loi } : null,
    });
  }
  const hang = (d: DongNguoiNhan) => (d.seGui ? 0 : d.mau ? 1 : d.daNoiTelegram ? 2 : 3);
  return ra.sort(
    (a, b) => hang(a) - hang(b) || (a.capChucVu ?? 99) - (b.capChucVu ?? 99) || a.ten.localeCompare(b.ten, "vi"),
  );
}

export interface NguoiNhan {
  ma: string;
  email: string;
  ten: string;
  chatId: string;
  mau: MaMau;
  thamSo: ThamSoKichBan;
  duAnChon: string[];
  /** ⭐ 17/10 — bộ khối hiệu lực */
  boKhoi: ChonKhoi[];
}

/** Người sẽ được gửi sáng nay: đang mở + đã nối Telegram + có mẫu (mẫu Dự án chưa chọn dự án vẫn nhận lời nhắc) */
export function danhSachNguoiNhan(): NguoiNhan[] {
  const theoMa = new Map(danhSachNguoiDungDayDu().map((u) => [maNguoi(u), u]));
  return bangNguoiNhan()
    .filter((d) => d.seGui && d.thamSo !== null)
    .map((d) => ({
      ma: d.ma,
      email: d.email,
      ten: d.ten,
      chatId: theoMa.get(d.ma)?.telegramChatId ?? "",
      mau: d.mau as MaMau,
      thamSo: d.thamSo as ThamSoKichBan,
      duAnChon: d.duAnChon,
      boKhoi: d.boKhoi,
    }))
    .filter((n) => n.chatId !== "");
}

/**
 * Chọn mẫu cho một người (khối Người nhận trên web). Đổi mẫu thì XOÁ phần ghi đè cũ —
 * ghi đè chỉnh cho mẫu này không hợp mẫu kia; bản cũ vẫn nằm trong lịch sử.
 */
export function datMau(ma: string, mau: LuaChonMau, boi: string, nguon = "nguoi-nhan"): BanGhiKichBan {
  const u = danhSachNguoiDungDayDu().find((x) => maNguoi(x) === ma);
  if (!u) throw new Error(`Không tìm thấy tài khoản "${ma}".`);
  const kho = docKho();
  const cu = kho[ma];
  const doiMau = !cu || cu.mau !== mau;
  const duAnChon = cu?.duAnChon ?? [];
  const moi: BanGhiKichBan = {
    ma,
    email: u.email,
    mau,
    ghiDe: doiMau ? {} : cu.ghiDe,
    duAnChon,
    ...(!doiMau && cu?.boKhoi ? { boKhoi: cu.boKhoi } : {}),
    lichSu: [
      ...(cu?.lichSu ?? []),
      {
        luc: new Date().toISOString(),
        boi,
        nguon,
        mau,
        ghiDe: doiMau ? {} : cu.ghiDe,
        duAnChon,
        lyDo: mau === "khong-nhan" ? "Thôi nhận báo cáo sáng" : `Chọn mẫu ${mau}`,
      },
    ].slice(-50),
  };
  kho[ma] = moi;
  ghiKho(kho);
  return moi;
}

/**
 * ⭐ 04/10 tối — đặt danh sách dự án CHỌN TAY cho mẫu Dự án (1 hoặc nhiều). Màn hình gửi
 * CẢ danh sách sau mỗi lần bấm (bấm là lưu, không nút xác nhận). Dự án không có trong sổ bị bỏ.
 * Người chưa có bản ghi (đang theo mặc định chức vụ) thì giữ mẫu hiệu lực của họ.
 */
export function chonDuAn(ma: string, duAn: readonly string[], boi: string): BanGhiKichBan {
  const u = danhSachNguoiDungDayDu().find((x) => maNguoi(x) === ma);
  if (!u) throw new Error(`Không tìm thấy tài khoản "${ma}".`);
  const kho = docKho();
  const cu = kho[ma];
  const mau: LuaChonMau = cu?.mau ?? mauMacDinh(u) ?? "khong-nhan";
  const duAnChon = chuanDuAnChon(duAn);
  const ten = new Map(duAnDeChon().map((p) => [p.id, p.ten]));
  const moi: BanGhiKichBan = {
    ma,
    email: u.email,
    mau,
    ghiDe: cu?.ghiDe ?? {},
    duAnChon,
    ...(cu?.boKhoi ? { boKhoi: cu.boKhoi } : {}),
    lichSu: [
      ...(cu?.lichSu ?? []),
      {
        luc: new Date().toISOString(),
        boi,
        nguon: "nguoi-nhan",
        mau,
        ghiDe: cu?.ghiDe ?? {},
        duAnChon,
        lyDo:
          duAnChon.length === 0
            ? "Bỏ hết dự án"
            : `Chọn ${duAnChon.length} dự án: ${duAnChon.map((id) => ten.get(id) ?? id).join(", ")}`,
      },
    ].slice(-50),
  };
  kho[ma] = moi;
  ghiKho(kho);
  return moi;
}

/**
 * ⭐ 17/10/2026 (KE-HOACH/23) — đặt BỘ KHỐI kéo thả cho một người: màn hình gửi CẢ bộ sau mỗi lần thả / đổi phạm vi (bấm là
 * lưu, không nút xác nhận). Khối lạ / trùng bị bỏ (chuanHoaBoKhoi). Bộ rỗng = trả về bộ mặc định của mẫu.
 * Người chưa có bản ghi (đang theo mặc định chức vụ) thì giữ mẫu hiệu lực của họ.
 */
export function datBoKhoi(ma: string, boKhoiTho: unknown, boi: string): BanGhiKichBan {
  const u = danhSachNguoiDungDayDu().find((x) => maNguoi(x) === ma);
  if (!u) throw new Error(`Không tìm thấy tài khoản "${ma}".`);
  const boKhoi = chuanHoaBoKhoi(boKhoiTho);
  if (boKhoi === null) throw new Error("Bộ khối gửi lên không đúng khuôn (phải là danh sách khối).");
  const kho = docKho();
  const cu = kho[ma];
  const mau: LuaChonMau = cu?.mau ?? mauMacDinh(u) ?? "khong-nhan";
  const moi: BanGhiKichBan = {
    ma,
    email: u.email,
    mau,
    ghiDe: cu?.ghiDe ?? {},
    duAnChon: cu?.duAnChon ?? [],
    ...(boKhoi.length > 0 ? { boKhoi } : {}),
    lichSu: [
      ...(cu?.lichSu ?? []),
      {
        luc: new Date().toISOString(),
        boi,
        nguon: "nguoi-nhan",
        mau,
        ghiDe: cu?.ghiDe ?? {},
        duAnChon: cu?.duAnChon ?? [],
        ...(boKhoi.length > 0 ? { boKhoi } : {}),
        lyDo:
          boKhoi.length === 0
            ? "Trả về bộ khối mặc định của mẫu"
            : `Bộ khối ${boKhoi.length} khối: ${boKhoi.map((k) => `${tenKhoi(k.ma)}${k.phamVi === "du-an-chon" ? " (dự án tôi chọn)" : ""}`).join(" · ")}`,
      },
    ].slice(-50),
  };
  kho[ma] = moi;
  ghiKho(kho);
  return moi;
}

/** Mã người (khoá kho) của một email — để người dùng thường chỉ sửa được dòng của chính mình */
export function maCuaEmail(email: string): string | null {
  const u = danhSachNguoiDungDayDu().find((x) => x.email === email);
  return u ? maNguoi(u) : null;
}

// ─────────────────────────────────────────────────────────────
// Sổ đã gửi
// ─────────────────────────────────────────────────────────────

export interface DongDaGui {
  ngay: string;
  ma: string;
  email: string;
  chatId: string;
  mau: MaMau;
  messageIds: number[];
  luc: string;
  ok: boolean;
  loi: string | null;
  soKyTu: number;
  /** "B" tự chạy · "tay" người bấm · "thu" gửi thử về chat người bấm */
  duong: string;
}

export function ghiDaGui(d: DongDaGui): void {
  try {
    const p = FILE_DA_GUI();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, `${JSON.stringify(d)}\n`, "utf8");
  } catch {
    // mất vết gửi thì thôi — không làm hỏng việc gửi
  }
}

/** Sổ đã gửi, MỚI NHẤT trước */
export function docDaGui(gioiHan = 200): DongDaGui[] {
  try {
    return fs
      .readFileSync(FILE_DA_GUI(), "utf8")
      .split("\n")
      .filter((s) => s.trim() !== "")
      .map((s) => {
        try {
          return JSON.parse(s) as DongDaGui;
        } catch {
          return null;
        }
      })
      .filter((x): x is DongDaGui => x !== null && Array.isArray(x.messageIds))
      .reverse()
      .slice(0, gioiHan);
  } catch {
    return [];
  }
}
