// ============================================================
// CÂY ĐẦU VIỆC CỦA MỘT DỰ ÁN — MỘT BẢN CHO CẢ TIẾN TRÌNH (QS-075 + QS-078, 27/09/2026)
//
// ĐO TRƯỚC KHI SỬA (sổ Base + sổ Tiến độ, 26/09):
//   · 29 lượt Base hỏi `tiendo.tim_dau_viec` — 18 lượt (62%) KHÔNG có trong sổ
//     của app Base: đó là bộ test unit (`npm run test`) gọi THẬT sang 3003, mỗi
//     file test một tiến trình → hai lượt cùng giây (mcp-du-an-la + wbs-lien-quan).
//     Cả 10 lượt làm bằng chứng của QS-075 đều thuộc nhóm này. Đã chặn ở
//     tests/thiet-lap/du-lieu-thu.ts.
//   · Trong app thật, 7 chỗ hỏi CÙNG một cây với `gioi_han: 500` (vượt trần 100 —
//     QS-078): danh sách issue · bộ sinh issue · màn Cây việc · soạn việc nút găng
//     · từ điển mã→tên · gán WBS bằng AI · nhắc hồ sơ pháp lý. Mỗi chỗ một bộ nhớ
//     riêng (hoặc không nhớ) → cùng một cây hỏi lại nhiều lần trong 10 phút.
//
// SỬA: mọi chỗ đi qua `layHetDauViec()` — MỘT bộ nhớ 10 phút theo dự án trên
// globalThis, MỘT lượt bay, và theo khuôn K1 (chung-16.md): mỗi trang
// `gioi_han: 100`, lặp `vi_tri += 100` tới khi `con_nua = false` (tối đa 10 trang).
//
// VÌ SAO KHÔNG ĐỔI SANG `tiendo.duong_gang` (đo 27/09, HV):
//   duong_gang trả `chuoi_gang` 12 mắt xích, 4,4 giây; việc LÁ `critical` trong
//   tim_dau_viec là 21 (= so_viec_gang_toi_cod 21), 1,9 giây. duong_gang thiếu 9
//   việc găng lá — có cả 6.1.4, đúng việc mà luật báo cáo sáng 25/09 cần. Nên
//   giữ tim_dau_viec (đúng nghiệp vụ, lại nhẹ hơn).
//
// Server-only (gọi mạng qua `hoiTienDo`), KHÔNG đụng node:fs (luật 10).
//
// AGENT CÔNG VIỆC (03/10/2026): chép nguyên từ Agent Base. Khác: lý do gọi có câu
// mặc định; khoá bộ nhớ trên globalThis đổi tên riêng (`__sciCayDauViecCongViec`).
// ============================================================

import type { KhuonTra, NguonMcp, MaLoi } from "@/lib/mcp/khuon";
import { hoiTienDo } from "@/lib/nguon-tien-do";
import { taoKhoNhoTam } from "@/lib/chung/nho-tam";

/** Một đầu việc như `tiendo.tim_dau_viec` trả (giữ nguyên mọi trường) */
export type DauViecTho = { wbs: string; name?: string; critical?: boolean; [k: string]: unknown };

/** Khuôn K1: trần một trang */
export const CO_TRANG = 100;
/** Khuôn K1: tối đa 10 trang (1.000 đầu việc) */
export const SO_TRANG_TOI_DA = 10;
/** Nhớ 10 phút theo dự án — cùng hạn với lời hứa "nhớ tạm 10 phút" trong lý do gọi */
export const NHO_DAU_VIEC_MS = 10 * 60 * 1000;

export interface CayDauViec {
  tasks: DauViecTho[];
  /** Tổng số việc khớp theo Tiến độ (K1 `tong_so`; bản cũ `total`) */
  tong_so: number;
  so_trang: number;
  /** Cây có bị cắt không (chạm 10 trang, hoặc bản cũ không lấy tiếp được) */
  bi_cat: boolean;
}

type KetQuaCay =
  | { ok: true; du_lieu: CayDauViec; nguon: NguonMcp[]; canh_bao: string[]; thoi_diem_tra_loi: string }
  | { ok: false; ma_loi: MaLoi; thong_diep: string };

/** Hàm hỏi một trang — tách ra để bài kiểm thay được */
export type HoiMotTrang = (thamSo: Record<string, unknown>, lyDo: string) => Promise<KhuonTra>;

function soNguyen(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : null;
}

/**
 * Lấy HẾT đầu việc theo trang (phần logic — không nhớ tạm). Theo khuôn K1:
 *   · trang đầu `vi_tri: 0, gioi_han: 100`; còn `con_nua: true` thì `vi_tri += 100`;
 *   · dừng khi `con_nua = false`, trang rỗng, trang không thêm mã mới, hoặc đủ 10 trang.
 * Tiến độ BẢN CŨ (chưa có `con_nua`, bỏ qua `vi_tri`, trả `total`): nếu `total`
 * lớn hơn số dòng nhận → hỏi lại MỘT lượt `gioi_han: total` (trần cũ 500) và ghi
 * cảnh báo — chỉ để sống qua lúc chuyển giao, Tiến độ lên K1 là tự hết.
 */
export async function layHetTheoTrang(
  maDuAn: string,
  lyDo: string,
  hoi: HoiMotTrang,
): Promise<KetQuaCay> {
  const tasks: DauViecTho[] = [];
  const daCo = new Set<string>();
  const canhBao: string[] = [];
  let nguon: NguonMcp[] = [];
  let tongSo: number | null = null;
  let soTrang = 0;
  let biCat = false;
  let lucTra = new Date().toISOString();

  for (let trang = 0; trang < SO_TRANG_TOI_DA; trang += 1) {
    const viTri = trang * CO_TRANG;
    const kq = await hoi(
      { ma_du_an: maDuAn, gioi_han: CO_TRANG, vi_tri: viTri },
      trang === 0 ? lyDo : `${lyDo} (trang ${trang + 1}, vi_tri=${viTri})`,
    );
    if (!kq.ok) {
      // Trang đầu hỏng = không có gì; trang sau hỏng = trả phần đã có + cảnh báo
      if (trang === 0) return { ok: false, ma_loi: kq.ma_loi, thong_diep: kq.thong_diep };
      canhBao.push(`Trang ${trang + 1} lỗi (${kq.ma_loi}: ${kq.thong_diep}) — cây dừng ở ${tasks.length} đầu việc.`);
      biCat = true;
      break;
    }
    soTrang += 1;
    if (trang === 0) {
      nguon = kq.nguon;
      lucTra = kq.thoi_diem_tra_loi;
    }
    const d = (kq.du_lieu ?? {}) as { tasks?: DauViecTho[]; tong_so?: unknown; total?: unknown; con_nua?: unknown };
    const trangNay = Array.isArray(d.tasks) ? d.tasks : [];
    tongSo = soNguyen(d.tong_so) ?? soNguyen(d.total) ?? tongSo;
    let moi = 0;
    for (const t of trangNay) {
      const ma = typeof t?.wbs === "string" ? t.wbs : "";
      if (ma === "" || daCo.has(ma)) continue;
      daCo.add(ma);
      tasks.push(t);
      moi += 1;
    }

    const coK1 = typeof d.con_nua === "boolean";
    if (!coK1) {
      // Bản cũ: không lấy tiếp theo vi_tri được
      if (trang === 0 && tongSo !== null && tongSo > tasks.length) {
        const kq2 = await hoi(
          { ma_du_an: maDuAn, gioi_han: Math.min(tongSo, 500) },
          `${lyDo} (Agent Tiến độ chưa lên khuôn cắt trang K1 — xin cả cây một lượt)`,
        );
        if (kq2.ok) {
          const d2 = (kq2.du_lieu ?? {}) as { tasks?: DauViecTho[] };
          for (const t of Array.isArray(d2.tasks) ? d2.tasks : []) {
            const ma = typeof t?.wbs === "string" ? t.wbs : "";
            if (ma === "" || daCo.has(ma)) continue;
            daCo.add(ma);
            tasks.push(t);
          }
          soTrang += 1;
          canhBao.push("Agent Tiến độ chưa có khuôn cắt trang K1 (con_nua/vi_tri) — đã xin cả cây một lượt theo luật cũ.");
        } else {
          canhBao.push(`Agent Tiến độ chưa có khuôn cắt trang K1 và lượt xin cả cây lỗi (${kq2.ma_loi}) — chỉ có ${tasks.length}/${tongSo} đầu việc.`);
          biCat = true;
        }
      }
      break;
    }
    if (d.con_nua !== true || trangNay.length === 0 || moi === 0) break;
    if (trang === SO_TRANG_TOI_DA - 1) {
      biCat = true;
      canhBao.push(`Dự án có hơn ${SO_TRANG_TOI_DA * CO_TRANG} đầu việc — chỉ lấy ${tasks.length}${tongSo !== null ? `/${tongSo}` : ""} (tối đa ${SO_TRANG_TOI_DA} trang).`);
    }
  }

  return {
    ok: true,
    du_lieu: { tasks, tong_so: tongSo ?? tasks.length, so_trang: soTrang, bi_cat: biCat },
    nguon,
    canh_bao: canhBao,
    thoi_diem_tra_loi: lucTra,
  };
}

const khoCay = taoKhoNhoTam<KetQuaCay>("__sciCayDauViecCongViec", NHO_DAU_VIEC_MS);

/** Xoá bộ nhớ cây đầu việc — bài kiểm dùng */
export function xoaNhoDauViec(): void {
  khoCay.xoa();
}

/**
 * ⭐ CỬA DUY NHẤT lấy cả cây đầu việc của một dự án từ Agent Tiến độ.
 * Nhớ 10 phút theo dự án, một lượt bay; chỉ nhớ câu trả lời ok có ≥ 1 đầu việc.
 * Trả khuôn giống `hoiTienDo` (ok · du_lieu.tasks · ma_loi · thong_diep) để chỗ gọi
 * cũ đổi một dòng. `tuNho` = lượt này không hỏi mạng.
 */
export async function layHetDauViec(
  maDuAn: string,
  lyDo = "Agent Công việc: lấy cây đầu việc của dự án để gắn việc vào đúng hạng mục (nhớ tạm 10 phút)",
  nguoi?: string,
): Promise<KetQuaCay & { tuNho: boolean }> {
  const { giaTri, tuNho } = await khoCay.lay(
    maDuAn,
    () => layHetTheoTrang(maDuAn, lyDo, (ts, ly) => hoiTienDo("tiendo.tim_dau_viec", ts, ly, nguoi)),
    (kq) => kq.ok && kq.du_lieu.tasks.length > 0 && !kq.du_lieu.bi_cat,
  );
  // Bản sao — chỗ gọi có lỡ sửa đầu việc cũng không làm bẩn bản đang nhớ
  return { ...structuredClone(giaTri), tuNho };
}
