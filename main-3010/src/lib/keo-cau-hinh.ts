// ============================================================
// KÉO CẤU HÌNH VỀ TỪ MAIN — bên NHẬN của "khai một lần, cả hệ dùng"
//
// Yêu cầu gốc của Mr. Thịnh 06/09/2026: *"khai dùng chung và lựa chọn agent
// nói chuyện là ở đó hết"* + *"khi agent được bật nó sẽ lấy thông tin chung"*.
//
// ⭐ 26/09 (Mr. Đại chốt 1a): GỠ lượt kéo `main.cau_hinh_chung` — màn "Khai
// một lần — dùng chung" ở Main 0 lần lưu, lượt kéo nào cũng rỗng (459/459 ở sổ
// Main); trường `cauHinh` và `mucDungChung()` bỏ theo. Nay kéo HAI thứ: danh bạ
// · ma trận. Dự án · người dùng · kết nối đi đường `main.du_lieu_dung_chung`.
//
// TRƯỚC NGÀY NÀY hệ mới có một nửa: Main phục vụ `main.cau_hinh_chung` và
// `main.ma_tran_goi`, nhưng KHÔNG app nào gọi tới — đếm thật: 0 file trong
// Base / Hợp đồng / Pháp lý / Tiến độ nhắc tới hai công cụ đó. Màn "Khai một
// lần" vì thế mới là cái vỏ. File này là bên còn thiếu.
//
// ⭐ BA LUẬT LÀM NÊN FILE NÀY
//
// 1. MAIN TẮT THÌ AGENT VẪN CHẠY.
//    Kéo hỏng thì rơi về bản lưu lần trước (`data/cau-hinh-keo-ve.json`) và
//    nói rõ "đang dùng bản lưu lúc X". Không bao giờ ném lỗi ra ngoài, không
//    bao giờ trả rỗng rồi để màn hình hiện 0 — vì 0 là một lời nói dối.
//
// 2. CHỈ CẦN BIẾT ĐÚNG MỘT THỨ: ĐỊA CHỈ MAIN.
//    Cả danh bạ lẫn khoá đều kéo từ đó. Đây là điểm mồi (bootstrap) duy nhất,
//    khai bằng biến môi trường `DIA_CHI_MAIN`. Lên tên miền thì đặt
//    `DIA_CHI_MAIN=https://qlda.scigroup.vn` — KHÔNG sửa một dòng code nào.
//
// 3. KÉO VỀ LÀ CACHE, KHÔNG PHẢI BẢN CHÍNH.
//    Bản chính nằm ở Main. File cache chỉ để sống sót khi Main tắt, và luôn
//    mang `thoiDiemKeo` để màn hình nói được "số này cũ mấy phút rồi".
//
// Server-only — đụng `node:fs`. Màn hình client gọi qua route API.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";

// ── Kiểu ─────────────────────────────────────────────────────

/** Một dòng danh bạ kéo về từ Main. Cố ý KHÔNG có `thuMucCode`:
 *  đường dẫn ổ đĩa của máy chạy Main sang máy khác là sai. */
export interface DongDanhBaKeoVe {
  ma: string;
  ten: string;
  diaChi: string;
  duongDanMcp: string;
  dangBat: boolean;
  ghiChu?: string;
}

export interface BanKeoVe {
  /** ISO. Lần kéo THÀNH CÔNG gần nhất — null nghĩa là chưa kéo được lần nào. */
  thoiDiemKeo: string | null;
  danhBa: DongDanhBaKeoVe[];
  /** Mã các agent mà con này được phép gọi, theo ma trận ở Main */
  duocGoi: string[];
  /** Vì sao lần kéo gần nhất hỏng. null = lần gần nhất ổn. */
  loiLanCuoi: string | null;
}

export interface KetQuaKeo {
  ban: BanKeoVe;
  /** true = số vừa lấy từ Main. false = Main không thưa, đang dùng bản lưu. */
  tuoiMoi: boolean;
  /** Câu nói thẳng cho màn hình — luôn có, kể cả khi mọi thứ ổn. */
  noiVoiNguoiDung: string;
}

// ── Hằng ─────────────────────────────────────────────────────

const TEN_FILE = "cau-hinh-keo-ve.json";

/** Hạn chờ Main. 10s theo HOP-DONG-KET-NOI §6 (việc thường). */
const HAN_CHO_MS = 10_000;

const BAN_RONG: BanKeoVe = {
  thoiDiemKeo: null,
  danhBa: [],
  duocGoi: [],
  loiLanCuoi: null,
};

// ── Điểm mồi ─────────────────────────────────────────────────

/**
 * Địa chỉ Main — thứ DUY NHẤT phải khai tại chỗ.
 *
 * Lên tên miền chỉ cần đổi biến môi trường này. Mặc định localhost để chạy
 * trên máy không phải khai gì.
 */
export function diaChiMain(): string {
  const v = (process.env.DIA_CHI_MAIN ?? "").trim().replace(/\/+$/, "");
  return v !== "" ? v : "http://localhost:3010";
}

function duongDanFile(): string {
  return path.join(gocDuLieu(), TEN_FILE);
}

// ── Kho đĩa ──────────────────────────────────────────────────

/** Đọc bản lưu. Hỏng file / chưa có file đều trả bản rỗng, KHÔNG ném. */
export function docBanLuu(): BanKeoVe {
  try {
    const tho = fs.readFileSync(duongDanFile(), "utf8");
    const d = JSON.parse(tho) as Partial<BanKeoVe>;
    return {
      thoiDiemKeo: typeof d.thoiDiemKeo === "string" ? d.thoiDiemKeo : null,
      danhBa: Array.isArray(d.danhBa) ? (d.danhBa as DongDanhBaKeoVe[]) : [],
      duocGoi: Array.isArray(d.duocGoi) ? (d.duocGoi as string[]) : [],
      loiLanCuoi: typeof d.loiLanCuoi === "string" ? d.loiLanCuoi : null,
    };
  } catch {
    return { ...BAN_RONG };
  }
}

function ghiBanLuu(b: BanKeoVe): void {
  try {
    const f = duongDanFile();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(b, null, 2), "utf8");
  } catch {
    // Ghi hỏng thì thôi — lần sau kéo lại. Không được làm chết lượt gọi.
  }
}

// ── Gọi Main ─────────────────────────────────────────────────

interface TraMcp {
  ok?: boolean;
  du_lieu?: Record<string, unknown>;
  loi?: { thong_diep?: string };
}

/**
 * Một lượt gọi cổng MCP của Main. KHÔNG bao giờ ném — hỏng thì trả null kèm
 * lý do, đúng luật "không bao giờ trả HTTP 500" của HOP-DONG-KET-NOI §5.
 *
 * ⭐ 24/09: EXPORT — ở 4 bản chép, cửa ma trận của cổng MCP (lib/mcp/ma-tran-cong.ts ·
 * cua-ma-tran-luu.ts) kéo `main.ma_tran_goi` → `goi_toi` qua đúng hàm này (bản chép đã
 * bọc goiCoGhi — luật 29). Bản gốc export theo để trục A của bài kiểm đồng bộ 5 bản khớp.
 */
export async function goiMain(
  maAgentGoi: string,
  congCu: string,
  lyDo: string,
  thamSo: Record<string, unknown> = {}
): Promise<{ duLieu: Record<string, unknown> | null; loi: string | null }> {
  const dich = `${diaChiMain()}/api/mcp/main`;
  const dungLai = new AbortController();
  const hen = setTimeout(() => dungLai.abort(), HAN_CHO_MS);
  try {
    const tra = await fetch(dich, {
      method: "POST",
      headers: { "content-type": "application/json", ...headerChuoi() },
      body: JSON.stringify({
        cong_cu: congCu,
        tham_so: thamSo,
        agent_goi: maAgentGoi,
        ly_do_goi: lyDo,
      }),
      signal: dungLai.signal,
      cache: "no-store",
    });
    const j = (await tra.json()) as TraMcp;
    if (j.ok !== true) {
      return { duLieu: null, loi: j.loi?.thong_diep ?? `Main từ chối công cụ ${congCu}` };
    }
    return { duLieu: j.du_lieu ?? {}, loi: null };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    const hetHan = m.includes("abort");
    return {
      duLieu: null,
      loi: hetHan
        ? `Main không thưa trong ${HAN_CHO_MS / 1000}s (${dich})`
        : `Không nối được Main tại ${dich} — ${m}`,
    };
  } finally {
    clearTimeout(hen);
  }
}

// ── Bóc dữ liệu ──────────────────────────────────────────────

function bocDanhBa(d: Record<string, unknown> | null): DongDanhBaKeoVe[] | null {
  if (!d || !Array.isArray(d.danh_ba)) return null;
  const ra: DongDanhBaKeoVe[] = [];
  for (const x of d.danh_ba as unknown[]) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const ma = String(o.ma ?? "").trim();
    const diaChi = String(o.dia_chi ?? "").trim().replace(/\/+$/, "");
    if (ma === "" || diaChi === "") continue;
    ra.push({
      ma,
      ten: String(o.ten ?? ma).trim() || ma,
      diaChi,
      duongDanMcp: String(o.duong_dan_mcp ?? `/api/mcp/${ma}`).trim(),
      dangBat: o.dang_bat !== false,
      ghiChu: typeof o.ghi_chu === "string" && o.ghi_chu.trim() !== "" ? o.ghi_chu.trim() : undefined,
    });
  }
  // Danh bạ về mà rỗng sạch thì coi như KHÔNG kéo được — thà giữ bản cũ còn
  // hơn xoá trắng danh bạ của một agent đang chạy.
  return ra.length > 0 ? ra : null;
}

function bocDuocGoi(d: Record<string, unknown> | null): string[] | null {
  if (!d || !Array.isArray(d.duoc_goi)) return null;
  return (d.duoc_goi as unknown[])
    .map((x) => (x && typeof x === "object" ? String((x as Record<string, unknown>).ma ?? "") : ""))
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// ── Cửa chính ────────────────────────────────────────────────

function noiTuoi(soDong: number): string {
  return `Đã kéo từ Main: ${soDong} agent trong danh bạ.`;
}

function noiCu(ban: BanKeoVe, loi: string): string {
  if (ban.thoiDiemKeo === null) {
    return `Chưa kéo được cấu hình từ Main lần nào — ${loi}. Agent vẫn chạy bằng cấu hình tại chỗ.`;
  }
  const phut = Math.round((Date.now() - new Date(ban.thoiDiemKeo).getTime()) / 60000);
  const tuoi = phut < 1 ? "dưới 1 phút" : phut < 60 ? `${phut} phút` : `${Math.round(phut / 60)} giờ`;
  return `Main không thưa (${loi}). Đang dùng BẢN LƯU kéo về ${tuoi} trước.`;
}

/**
 * Kéo hai thứ về: danh bạ · mình được gọi ai (26/09 bỏ khoá dùng chung — luôn rỗng).
 *
 * `maAgentGoi` là mã của chính app đang gọi (base · hopdong · phaply · tiendo).
 * Nó đi vào sổ nhật ký của Main nên phải đúng, đừng để trống.
 */
export async function keoVeTuMain(maAgentGoi: string, lyDo = "khởi động: kéo cấu hình dùng chung"): Promise<KetQuaKeo> {
  const cu = docBanLuu();

  const [tDanhBa, tMaTran] = await Promise.all([
    goiMain(maAgentGoi, "main.danh_ba", lyDo),
    goiMain(maAgentGoi, "main.ma_tran_goi", lyDo),
  ]);

  const danhBaMoi = bocDanhBa(tDanhBa.duLieu);
  const duocGoiMoi = bocDuocGoi(tMaTran.duLieu);

  // Danh bạ là thứ quyết định "hệ có mấy con" nên nó định nghĩa thành/bại.
  // Ma trận có thể trống hợp lệ, danh bạ thì không.
  if (danhBaMoi === null) {
    const loi = tDanhBa.loi ?? "Main trả danh bạ rỗng";
    const ban: BanKeoVe = { ...cu, loiLanCuoi: loi };
    ghiBanLuu(ban);
    return { ban, tuoiMoi: false, noiVoiNguoiDung: noiCu(cu, loi) };
  }

  const ban: BanKeoVe = {
    thoiDiemKeo: new Date().toISOString(),
    danhBa: danhBaMoi,
    // Từng phần hỏng thì giữ phần cũ, đừng xoá trắng.
    duocGoi: duocGoiMoi ?? cu.duocGoi,
    loiLanCuoi: null,
  };
  ghiBanLuu(ban);
  return {
    ban,
    tuoiMoi: true,
    noiVoiNguoiDung: noiTuoi(ban.danhBa.length),
  };
}

/**
 * Đọc danh bạ ĐANG DÙNG mà không gọi mạng — cho những chỗ chạy đồng bộ
 * (cổng MCP, con quan sát). Trả bản lưu; chưa kéo lần nào thì trả rỗng để
 * nơi gọi tự rơi về danh bạ tại chỗ.
 */
export function danhBaDangDung(): DongDanhBaKeoVe[] {
  return docBanLuu().danhBa;
}

// ── Trộn với bản tại chỗ ─────────────────────────────────────

/** Đủ dùng cho hàm trộn — không buộc phải import `KhaiAgent` của từng app. */
export interface DongTaiCho {
  ma: string;
  ten: string;
  diaChi: string;
  duongDanMcp: string;
  dangBat: boolean;
  thuMucCode?: string;
  ghiChu?: string;
}

/**
 * ⭐ TRỘN danh bạ Main giao với bản tại chỗ — hàm QUAN TRỌNG NHẤT file này.
 *
 * Vì sao phải có: nếu màn hình hiện bản của Main mà phía máy chủ
 * (`docDanhBaAgent()`) vẫn đọc `data/cai-dat-base.json`, thì đúng cái lệch mà
 * cả việc này định dẹp VẪN CÒN — chỉ khác là nay nó lệch ngầm giữa màn hình
 * và máy chủ. Mọi nơi đọc danh bạ trong app phải đi qua đây.
 *
 * Luật trộn:
 *   · Main giao được → LẤY của Main (mã · tên · địa chỉ · MCP · bật/tắt).
 *   · `thuMucCode` LUÔN lấy của bản tại chỗ, ghép theo `ma`. Main cố ý không
 *     giao trường đó vì nó là đường dẫn ổ đĩa của máy chạy Main.
 *   · Main không giao được (rỗng) → dùng nguyên bản tại chỗ. Agent phải sống
 *     được khi Main tắt.
 */
export function tronDanhBa<T extends DongTaiCho>(taiCho: T[], tuMain: DongDanhBaKeoVe[]): T[] {
  if (tuMain.length === 0) return taiCho;
  return tuMain.map((m) => {
    const cu = taiCho.find((x) => x.ma === m.ma);
    return {
      ...(cu ?? ({} as T)),
      ma: m.ma,
      ten: m.ten,
      diaChi: m.diaChi,
      duongDanMcp: m.duongDanMcp,
      dangBat: m.dangBat,
      ghiChu: m.ghiChu ?? cu?.ghiChu,
      // Đường dẫn ổ đĩa: chỉ máy này biết.
      thuMucCode: cu?.thuMucCode,
    } as T;
  });
}

// ── Tự kéo, không cần ai bấm ─────────────────────────────────

/** Chỉ cho một lượt kéo chạy tại một thời điểm — tránh dội Main. */
let dangKeo = false;

/** Kéo tự động khi bản lưu cũ quá bao lâu. */
const TUOI_TOI_DA_MS = 10 * 60 * 1000;

/**
 * ⭐ TỰ KÉO — trả lời đúng yêu cầu *"khi agent được bật nó sẽ lấy thông tin
 * chung"* mà không cần người dùng bấm nút nào.
 *
 * Gọi hàm này ở ĐẦU CỔNG MCP của app (đường nóng nhất, agent nào cũng có).
 * Nó KHÔNG chờ, KHÔNG ném, KHÔNG làm chậm lượt gọi đang phục vụ:
 *   · bản lưu còn tươi (dưới 10 phút) → về ngay, không đụng mạng;
 *   · đang có lượt kéo khác → về ngay;
 *   · còn lại → đẻ một lượt kéo chạy nền rồi về ngay.
 *
 * Lần gọi đầu sau khi app khởi động luôn rơi vào nhánh thứ ba, nên hiệu quả
 * đúng bằng "kéo lúc khởi động" mà không phụ thuộc hook vòng đời nào của
 * Next — thứ khác nhau giữa dev và production.
 */
export function keoNenTuDong(maAgentGoi: string): void {
  if (dangKeo) return;
  const ban = docBanLuu();
  if (ban.thoiDiemKeo !== null) {
    const tuoi = Date.now() - new Date(ban.thoiDiemKeo).getTime();
    if (tuoi >= 0 && tuoi < TUOI_TOI_DA_MS) return;
  }
  dangKeo = true;
  void keoVeTuMain(maAgentGoi, "tự kéo: bản lưu đã cũ hoặc app vừa khởi động")
    .catch(() => undefined)
    .finally(() => {
      dangKeo = false;
    });
}
