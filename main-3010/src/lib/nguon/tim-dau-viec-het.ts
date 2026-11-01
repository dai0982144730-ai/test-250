// ============================================================
// LẤY MỌI ĐẦU VIỆC CỦA MỘT DỰ ÁN — cắt trang theo khuôn K1  (server-only)
//
// Khuôn K1 (QS-078, chốt 27/09 cho cả 5 repo): `tiendo.tim_dau_viec` trả tối đa
// 100 dòng mỗi lượt, thêm `vi_tri` (bỏ qua bao nhiêu dòng). Câu trả lời có
// `tong_so` · `vi_tri` · `so_tra_ve` · `con_nua`. Cần hơn 100 thì lặp
// `vi_tri += 100` tới khi `con_nua = false`, tối đa 10 trang.
//
// Cổng Tiến độ bản cũ (chưa có `con_nua`): không lặp trang được — nếu `total`
// lớn hơn số dòng nhận thì xin lại MỘT lượt `gioi_han: 500` như trước 27/09.
//
// Mỗi trang là một lượt `hoiTienDo` có vết sổ (luật 29) và được nhớ 10 phút
// (bo-nho-hoi.ts) — từ điển tên việc và khối B11 dùng chung các trang này.
// ============================================================

import type { KhuonTra } from "@/lib/mcp/khuon";
import { hoiTienDo } from "@/lib/nguon-tien-do";
import type { TuyChonNho } from "./bo-nho-hoi";

/** Trần một trang — khuôn K1 */
export const TRAN_MOT_TRANG = 100;
/** Tối đa 10 trang (1.000 đầu việc) — khuôn K1 */
export const TOI_DA_TRANG = 10;

export interface KetQuaMoiDauViec {
  /** Dòng nguyên văn cổng trả: {wbs, name, pct, critical, …} */
  tasks: Record<string, unknown>[];
  /** Tổng số việc khớp cổng báo (tong_so / total) — null = cổng không báo */
  tong: number | null;
  /** true = đã lấy đủ mọi việc khớp */
  du: boolean;
  /** Câu lỗi tiếng Việt khi lượt ĐẦU hỏng — null = lấy được */
  loi: string | null;
  /** Số lượt gọi thật đã dùng (để bài kiểm đếm) */
  soLuot: number;
}

function soHoacNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function docTrang(k: KhuonTra): { ds: Record<string, unknown>[]; d: Record<string, unknown> } {
  const d = (k.ok && k.du_lieu && typeof k.du_lieu === "object" ? k.du_lieu : {}) as Record<string, unknown>;
  const ds = Array.isArray(d.tasks) ? (d.tasks as Record<string, unknown>[]) : [];
  return { ds, d };
}

/**
 * Lặp trang theo K1 — hàm gọi một trang được TIÊM vào (bài kiểm chạy không cần mạng).
 * `goiTrang(thamThem)` nhận `{gioi_han, vi_tri}` (hoặc `{gioi_han: 500}` cho cổng cũ).
 */
export async function gomMoiTrang(
  goiTrang: (thamThem: Record<string, unknown>) => Promise<KhuonTra>,
): Promise<KetQuaMoiDauViec> {
  const tasks: Record<string, unknown>[] = [];
  let tong: number | null = null;
  let soLuot = 0;
  let viTri = 0;

  for (let trang = 0; trang < TOI_DA_TRANG; trang++) {
    const k = await goiTrang({ gioi_han: TRAN_MOT_TRANG, vi_tri: viTri });
    soLuot++;
    if (!k.ok) {
      // Trang đầu hỏng = chưa có gì; trang sau hỏng = có một phần, nói thẳng là thiếu
      return {
        tasks,
        tong,
        du: false,
        loi: trang === 0 ? k.thong_diep : `Mới lấy được ${tasks.length} việc — trang sau hỏng: ${k.thong_diep}`,
        soLuot,
      };
    }
    const { ds, d } = docTrang(k);
    tasks.push(...ds);
    tong = soHoacNull(d.tong_so) ?? soHoacNull(d.total) ?? tong;

    if (typeof d.con_nua === "boolean") {
      // Cổng đã theo K1
      if (!d.con_nua || ds.length === 0) return { tasks, tong, du: true, loi: null, soLuot };
      viTri += TRAN_MOT_TRANG;
      continue;
    }

    // Cổng bản cũ: không có con_nua → không lặp trang được
    if (trang === 0 && tong !== null && tong > ds.length) {
      const k2 = await goiTrang({ gioi_han: 500 });
      soLuot++;
      if (k2.ok) {
        const t2 = docTrang(k2);
        const tong2 = soHoacNull(t2.d.total) ?? tong;
        return { tasks: t2.ds, tong: tong2, du: t2.ds.length >= tong2, loi: null, soLuot };
      }
    }
    return { tasks, tong, du: tong === null || tasks.length >= tong, loi: null, soLuot };
  }
  // Chạm 10 trang mà cổng vẫn báo còn — trả phần đã có, không giả là đủ
  return { tasks, tong, du: false, loi: null, soLuot };
}

/** Mọi đầu việc của một dự án (từ khoá rỗng) qua `hoiTienDo`, cắt trang K1. Không ném lỗi. */
export function layMoiDauViec(
  maDuAn: string,
  lyDo: string,
  tuyChon: TuyChonNho = {},
): Promise<KetQuaMoiDauViec> {
  return gomMoiTrang((thamThem) =>
    hoiTienDo("tiendo.tim_dau_viec", { ma_du_an: maDuAn, tu_khoa: "", ...thamThem }, lyDo, undefined, tuyChon),
  );
}
