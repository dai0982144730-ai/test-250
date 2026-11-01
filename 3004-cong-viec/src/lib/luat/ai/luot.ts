// ============================================================
// luat/ai/luot.ts — LƯỢT AI CHẠY NỀN cho một file: góp ý nội dung (gop-y-luu.ts) + luật AI (kiem-ai.ts).
// Hai phần cùng cần thì GỘP một lượt AI (một prompt, JSON {"gop_y":[…],"luat":[…]}); mỗi phần ghi vào bảng
// của mình (docflow.gop_y_ai, docflow.luat_ai_ket_qua). Việc đang chạy giữ trong globalThis:
// góp ý theo sha256, luật theo sha256|dấu bộ luật — hỏi dồn không gọi AI lần hai. CHỈ SERVER.
// ============================================================
import { layQ, type Q } from "@/lib/db";
import { runAIGan } from "@/lib/ai/providers";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { thuNhanMauGoc } from "@/lib/kiem-tra/nhan-mau-goc";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { napDanhBa } from "@/lib/kiem-tra/phan-giai";
import { coHan, gopYBangAi, phanTichGopY, choCaHang, THOI_GIAN_CHO_GOP_Y_MS, type GopYAi } from "@/lib/kiem-tra/gop-y-ai";
import { luatApDung } from "../kho-luat";
import type { KetQuaLuatAi, LuatKiemTra } from "../types";
import { dauLuat, dungYeuCauGop, kiemLuatAiDayDu, laLuatAi, phanTichLuatAi, tatCaKhongRo, THOI_GIAN_CHO_LUAT_AI_MS } from "./kiem";

type G = typeof globalThis & { __docflowGopYAi?: Map<string, Promise<void>>; __docflowLuatAi?: Map<string, Promise<void>> };

/** Việc góp ý đang chạy, theo sha256 (dùng chung với gop-y-luu.ts). */
export function viecGopY(): Map<string, Promise<void>> {
  const g = globalThis as G;
  if (!g.__docflowGopYAi) g.__docflowGopYAi = new Map();
  return g.__docflowGopYAi;
}
/** Việc kiểm luật AI đang chạy, theo khoaLuatAi(sha256, dấu). */
export function viecLuat(): Map<string, Promise<void>> {
  const g = globalThis as G;
  if (!g.__docflowLuatAi) g.__docflowLuatAi = new Map();
  return g.__docflowLuatAi;
}
export const khoaLuatAi = (sha256: string, dau: string) => `${sha256}|${dau}`;

/** CHỈ DÙNG TRONG TEST / SCRIPT: chờ mọi lượt AI nền chạy xong. */
export async function choLuotAiXong(): Promise<void> {
  while (viecGopY().size || viecLuat().size) await Promise.all([...Array.from(viecGopY().values()), ...Array.from(viecLuat().values())]);
}

/** Luật AI đang áp dụng cho một mẫu (theo thu_tu). Bộ luật lỗi / chưa sẵn sàng → rỗng (không bao giờ ném). */
export async function luatAiApDung(q: Q, mauMa: string | null): Promise<LuatKiemTra[]> {
  if (!mauMa) return [];
  try {
    const ds = await luatApDung(q, mauMa);
    return ds.filter((l) => laLuatAi(l) && (l.ap_dung === "tat_ca" || l.ap_dung.includes(mauMa))).sort((a, b) => a.thu_tu - b.thu_tu);
  } catch {
    return [];
  }
}

export interface PhanLuat {
  ds: LuatKiemTra[];
  dau: string;
}

/** Phần luật AI nên chạy kèm lượt góp ý: có luật áp dụng và chưa có kết quả (xong/lỗi) cho cùng file + dấu. */
export async function phanLuatDiKem(q: Q, sha256: string, mauMa: string | null): Promise<PhanLuat | null> {
  const ds = await luatAiApDung(q, mauMa);
  if (!ds.length) return null;
  const dau = dauLuat(ds);
  try {
    const { rows } = await q.query("SELECT 1 FROM docflow.luat_ai_ket_qua WHERE sha256 = $1 AND dau_luat = $2 AND trang_thai IN ('xong', 'loi') LIMIT 1", [sha256, dau]);
    if (rows.length) return null;
  } catch {
    return null;
  }
  return { ds, dau };
}

export interface ViecLuotAi {
  sha256: string;
  taiLieuId: string;
  phienBan: number;
  gopY: boolean;
  luat: PhanLuat | null;
  thoiGianChoMs?: number;
}

type KetQuaPhan<T> = { trang_thai: "xong" | "loi"; du_lieu: T; loi: string | null };
const loiCua = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);

async function chayLuot(v: ViecLuotAi, gopY: boolean, luat: PhanLuat | null): Promise<void> {
  const ms = v.thoiGianChoMs ?? Math.max(THOI_GIAN_CHO_GOP_Y_MS, THOI_GIAN_CHO_LUAT_AI_MS);
  let gy: KetQuaPhan<GopYAi[]> = { trang_thai: "loi", du_lieu: [], loi: null };
  let kl: KetQuaPhan<KetQuaLuatAi[]> = { trang_thai: "loi", du_lieu: [], loi: null };
  let model: string | null = null;
  try {
    const q = await layQ();
    // AI chạy ngầm chỉ nhận bản đã cắt chương mật (Q5 — Mr. Đại chốt 07/10/2026)
    const { noi_dung, thong_tin } = await docPhienBan(q, v.taiLieuId, v.phienBan, null);
    let nd = await docBaoCao(noi_dung);
    // File Word gốc (chưa có ô nhập): gắn ô như lúc kiểm tra (kiem-tra/nhan-mau-goc.ts)
    nd = (await thuNhanMauGoc(noi_dung, thong_tin.ten_tep, nd))?.noi_dung ?? nd;
    const mau = nd.mau_ma ? await layMau(q, nd.mau_ma) : null;
    if (!mau) throw new Error("Không nhận ra mẫu của file — không góp ý nội dung");
    model = (await layCauHinh(q, "ai")).model_mac_dinh || null;
    if (gopY && luat) {
      // GỘP: một lượt AI cho cả góp ý lẫn luật
      const danhBa = await napDanhBa(q);
      const { system, prompt } = dungYeuCauGop(luat.ds, nd, mau, danhBa);
      let text: string | null = null;
      try {
        // khongNghi: một lượt gộp đo 105–114 giây khi CLI "nghĩ dài", 12–15 giây khi tắt (29/09)
        text = await coHan(
          runAIGan("lib/luat/ai/luot", prompt, system, undefined, model ?? undefined, ms, true),
          choCaHang(ms),
          `AI không trả lời sau ${Math.round((choCaHang(ms)) / 1000)} giây — bỏ qua góp ý`,
        );
      } catch (e) {
        gy = { trang_thai: "loi", du_lieu: [], loi: loiCua(e) };
        kl = { trang_thai: "loi", du_lieu: tatCaKhongRo(luat.ds, `AI không kiểm được luật này: ${loiCua(e)}`), loi: loiCua(e) };
      }
      if (text !== null) {
        try {
          gy = { trang_thai: "xong", du_lieu: phanTichGopY(text, nd, mau), loi: null };
        } catch (e) {
          gy = { trang_thai: "loi", du_lieu: [], loi: loiCua(e) };
        }
        try {
          kl = { trang_thai: "xong", du_lieu: phanTichLuatAi(text, luat.ds, nd, mau), loi: null };
        } catch (e) {
          kl = { trang_thai: "loi", du_lieu: tatCaKhongRo(luat.ds, `AI không kiểm được luật này: ${loiCua(e)}`), loi: loiCua(e) };
        }
      }
    } else if (gopY) {
      try {
        gy = { trang_thai: "xong", du_lieu: await gopYBangAi(nd, mau, { danhBa: await napDanhBa(q), model: model ?? undefined, thoiGianChoMs: ms }), loi: null };
      } catch (e) {
        gy = { trang_thai: "loi", du_lieu: [], loi: loiCua(e) };
      }
    } else if (luat) {
      const r = await kiemLuatAiDayDu(luat.ds, nd, mau, { model: model ?? undefined, thoiGianChoMs: ms });
      kl = { trang_thai: r.loi ? "loi" : "xong", du_lieu: r.ket_qua, loi: r.loi };
    }
  } catch (e) {
    gy = { trang_thai: "loi", du_lieu: [], loi: loiCua(e) };
    if (luat) kl = { trang_thai: "loi", du_lieu: tatCaKhongRo(luat.ds, `AI không kiểm được luật này: ${loiCua(e)}`), loi: loiCua(e) };
  }
  // Ghi kết quả: cập nhật mọi dòng đang chờ cùng file (+ dấu), thêm dòng cho chính tài liệu/phiên bản nếu chưa có
  try {
    const q = await layQ();
    if (gopY) {
      await q.query(
        `UPDATE docflow.gop_y_ai SET trang_thai = $2, gop_y = $3::jsonb, loi = $4, model = $5, xong_luc = now()
         WHERE sha256 = $1 AND trang_thai = 'dang_gop_y'`,
        [v.sha256, gy.trang_thai, JSON.stringify(gy.du_lieu), gy.loi, model],
      );
      await q.query(
        `INSERT INTO docflow.gop_y_ai (tai_lieu_id, phien_ban, sha256, trang_thai, gop_y, loi, model, bat_dau_luc, xong_luc)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, now(), now()) ON CONFLICT (tai_lieu_id, phien_ban) DO NOTHING`,
        [v.taiLieuId, v.phienBan, v.sha256, gy.trang_thai, JSON.stringify(gy.du_lieu), gy.loi, model],
      );
    }
    if (luat) {
      await q.query(
        `UPDATE docflow.luat_ai_ket_qua SET trang_thai = $3, ket_qua = $4::jsonb, loi = $5, model = $6, xong_luc = now()
         WHERE sha256 = $1 AND dau_luat = $2 AND trang_thai = 'dang_kiem'`,
        [v.sha256, luat.dau, kl.trang_thai, JSON.stringify(kl.du_lieu), kl.loi, model],
      );
      await q.query(
        `INSERT INTO docflow.luat_ai_ket_qua (tai_lieu_id, phien_ban, sha256, dau_luat, trang_thai, ket_qua, loi, model, bat_dau_luc, xong_luc)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, now(), now()) ON CONFLICT (tai_lieu_id, phien_ban) DO NOTHING`,
        [v.taiLieuId, v.phienBan, v.sha256, luat.dau, kl.trang_thai, JSON.stringify(kl.du_lieu), kl.loi, model],
      );
    }
  } catch {
    /* CSDL đã đóng (test) hoặc lỗi ghi: bỏ qua, lần hỏi sau sẽ chạy lại */
  }
}

/**
 * Khởi động lượt AI nền (đồng bộ: kiểm việc đang chạy rồi đăng ký ngay, không có await ở giữa).
 * Phần nào đang chạy rồi thì bỏ. Trả phần nào thật sự được khởi động.
 */
export function khoiDongLuotAi(v: ViecLuotAi): { gop_y: boolean; luat: boolean } {
  const mg = viecGopY();
  const ml = viecLuat();
  const gopY = v.gopY && !mg.has(v.sha256);
  const kl = v.luat && v.luat.ds.length ? khoaLuatAi(v.sha256, v.luat.dau) : null;
  const luat = !!kl && !ml.has(kl);
  if (!gopY && !luat) return { gop_y: false, luat: false };
  const viec: Promise<void> = chayLuot(v, gopY, luat ? v.luat : null).finally(() => {
    if (gopY && mg.get(v.sha256) === viec) mg.delete(v.sha256);
    if (luat && kl && ml.get(kl) === viec) ml.delete(kl);
  });
  if (gopY) mg.set(v.sha256, viec);
  if (luat && kl) ml.set(kl, viec);
  return { gop_y: gopY, luat };
}
