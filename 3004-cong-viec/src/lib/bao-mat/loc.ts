// ============================================================
// bao-mat/loc.ts — LỌC Ở NGUỒN ĐỌC TỆP (Mr. Đại chốt 07/10/2026). CHỈ SERVER.
// Mọi đường đọc nội dung tệp (xem trước, PDF, tải Word, trợ lý AI, AI chạy ngầm, cổng agent khác, code viết sau này) đi qua
// docPhienBan (thu-muc/dich-vu.ts) → locBaoMat. Mặc định là CẮT: chỉ người có tên trong danh sách hoặc chính người tải bản đó lên
// mới nhận toàn văn; máy chỉ nhận toàn văn khi nói rõ MAY_DOC_TOAN_VAN (kiểm tra lại khi gửi, so sha bản sửa — không đưa chữ ra ngoài).
// Cắt hỏng → 403 kèm câu từ chối, KHÔNG BAO GIỜ rơi về tệp gốc (Q3).
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { LoiHttp } from "@/lib/phien";
import { bamSha256 } from "@/lib/luu-tru/kho";
import { catChuongMat, coChuongMat, LoiCatChuong } from "./cat-chuong";
import { catChuongMatExcel, coChuongMatExcel } from "./cat-chuong-excel";
import { boDauHoa, catKetQuaKiemTra, coTenTrongDanhSach, duocXemDu, gocChuongMat, laMauMat } from "./quy-tac";

/** Máy đọc toàn văn — CHỈ cho code không đưa chữ của tệp tới người, AI hay agent khác */
export const MAY_DOC_TOAN_VAN: unique symbol = Symbol("may-doc-toan-van");

/** Ai đang đọc: người đăng nhập · null = AI chạy ngầm / agent khác / không rõ (luôn nhận bản cắt) · máy đọc toàn văn */
export type NguoiDoc = NguoiDungPhien | null | typeof MAY_DOC_TOAN_VAN;

export interface PhienBanCoTheCat {
  ten_tep: string;
  mime: string;
  sha256: string;
  kich_thuoc: number;
  tai_len_boi: string;
  ket_qua_kiem_tra: unknown;
  /** true = bản đã cắt chương mật (người đọc không được xem đủ) */
  da_cat?: boolean;
}

/** "Không có số liệu, … công ty" + "." — câu cấu hình có hay không có dấu chấm cuối đều ra một dấu */
export function cauTuChoi(cau: string, them?: string): string {
  const c = cau.trim().replace(/[.。]+$/, "");
  return them ? `${c}. ${them}` : `${c}.`;
}

async function chuongCuaMau(q: Q, ma: string): Promise<string[]> {
  const { rows } = await q.query<{ muc: unknown }>("SELECT dinh_nghia->'muc_bat_buoc' AS muc FROM docflow.mau_word WHERE ma = $1", [ma]);
  const m = rows[0]?.muc;
  return Array.isArray(m) ? m.filter((x): x is string => typeof x === "string") : [];
}

/** Lọc một bản đã đọc từ kho theo người đọc. tlMauMa = docflow.tai_lieu.mau_ma. */
export async function locBaoMat<T extends PhienBanCoTheCat>(
  q: Q,
  tlMauMa: string | null,
  thong_tin: T,
  noi_dung: Buffer,
  nguoi: NguoiDoc,
): Promise<{ thong_tin: T; noi_dung: Buffer }> {
  if (nguoi === MAY_DOC_TOAN_VAN) return { thong_tin, noi_dung };
  const cfg = await layCauHinh(q, "bao_mat");
  const mat = gocChuongMat(cfg);
  if (mat.length === 0) return { thong_tin, noi_dung };
  const kqMau = (thong_tin.ket_qua_kiem_tra as { mau_ma?: string | null } | null)?.mau_ma ?? null;
  const theoMau = laMauMat(cfg, tlMauMa) || laMauMat(cfg, kqMau);
  const laWord = /\.(docx|docm)$/i.test(thong_tin.ten_tep) || thong_tin.mime.includes("wordprocessingml");
  // Báo cáo nộp bằng Excel từ 22/10/2026 — cắt theo hàng tiêu đề chương (bao-mat/cat-chuong-excel.ts)
  const laExcel = !laWord && (/\.xlsx$/i.test(thong_tin.ten_tep) || thong_tin.mime.includes("spreadsheetml"));
  // Không theo mẫu mật vẫn dò nội dung: báo cáo TCKT nộp lại dưới đơn vị/mẫu khác vẫn bị cắt
  const doThay = !theoMau && ((laWord && (await coChuongMat(noi_dung, mat))) || (laExcel && (await coChuongMatExcel(noi_dung, mat))));
  if (!theoMau && !doThay) return { thong_tin, noi_dung };
  if (duocXemDu(cfg, nguoi, thong_tin.tai_len_boi)) return { thong_tin, noi_dung };
  if (!laWord && !laExcel) throw new LoiHttp(403, cauTuChoi(cfg.cau_tu_choi, "(Tệp này không phải Word hay Excel nên không tách được phần được xem.)"));
  const ma = tlMauMa ?? kqMau;
  try {
    const tc = { mat, biet: ma ? await chuongCuaMau(q, ma) : [], cau_tu_choi: cauTuChoi(cfg.cau_tu_choi) };
    const kq = laExcel ? await catChuongMatExcel(noi_dung, tc) : await catChuongMat(noi_dung, tc);
    return {
      thong_tin: {
        ...thong_tin,
        sha256: bamSha256(kq.buf),
        kich_thuoc: kq.buf.length,
        ket_qua_kiem_tra: catKetQuaKiemTra(thong_tin.ket_qua_kiem_tra),
        da_cat: true,
      },
      noi_dung: kq.buf,
    };
  } catch (e) {
    const ly = e instanceof LoiCatChuong ? e.message : "không đọc được tệp";
    throw new LoiHttp(403, cauTuChoi(cfg.cau_tu_choi, `(Không tách được phần được xem của tệp này: ${ly}.)`));
  }
}

/**
 * Kết quả kiểm tra lúc nộp trả qua API THÔNG TIN tài liệu (không đọc tệp). Kiểm độc lập 10/10 bắt: /api/tai-lieu/[id] (khung xem
 * trước Thư mục gọi) và /api/tai-lieu-gui/[id] trả NGUYÊN ket_qua_kiem_tra — câu lỗi chương I, III của Form 4 tới tay người không
 * có tên. Người không được xem đủ → catKetQuaKiemTra khi bản theo mẫu mật, hoặc khi kết quả nhắc tên một chương mật (báo cáo
 * TCKT nộp dưới mẫu khác — cùng ý dò nội dung ở locBaoMat, ở đây dò trên chữ của kết quả).
 */
export async function locKetQuaKiemTra<T>(q: Q, tlMauMa: string | null, kq: T, taiLenBoi: string | null | undefined, nguoi: NguoiDoc): Promise<T> {
  if (nguoi === MAY_DOC_TOAN_VAN || !kq || typeof kq !== "object") return kq;
  const cfg = await layCauHinh(q, "bao_mat");
  const mat = gocChuongMat(cfg);
  if (mat.length === 0 || duocXemDu(cfg, nguoi, taiLenBoi)) return kq;
  const kqMau = (kq as { mau_ma?: string | null }).mau_ma ?? null;
  const chu = boDauHoa(JSON.stringify(kq));
  if (laMauMat(cfg, tlMauMa) || laMauMat(cfg, kqMau) || mat.some((g) => chu.includes(g))) return catKetQuaKiemTra(kq);
  return kq;
}

/** Câu chặn khi người đọc chỉ được bản cắt mà việc đang làm cần toàn văn (đánh dấu lỗi, sửa lỗi, kiểm tra lại, góp ý…) */
export async function cauChanBanCat(q: Q): Promise<string> {
  return cauTuChoi((await layCauHinh(q, "bao_mat")).cau_tu_choi, "(Báo cáo này có phần số liệu tài chính — bạn chỉ được xem bản rút gọn.)");
}

/**
 * Luật thêm vào lời dặn trợ lý chat (yêu cầu 4 — Mr. Đại chốt 07/10/2026). Người có tên trong danh sách → "" (trả lời bình thường).
 * Người khác (kể cả quản trị) → hỏi số liệu chương mật thì trả NGUYÊN VĂN câu từ chối. Công cụ đọc tệp đã trả bản cắt — luật
 * này chặn thêm đường AI suy số từ nguồn khác.
 */
export async function luatBaoMatChat(q: Q, nd: NguoiDungPhien): Promise<string> {
  const cfg = await layCauHinh(q, "bao_mat");
  if (gocChuongMat(cfg).length === 0 || coTenTrongDanhSach(cfg, nd)) return "";
  const { rows } = await q.query<{ ma: string; ten: string }>("SELECT ma, ten FROM docflow.mau_word WHERE ma = ANY($1)", [cfg.mau_mat]);
  const mau = rows.length ? rows.map((r) => `${r.ma} ${r.ten}`).join(", ") : cfg.mau_mat.join(", ");
  return [
    `7. BẢO MẬT TÀI CHÍNH: người đang hỏi KHÔNG được xem các chương ${cfg.chuong_mat.map((c) => `"${c}"`).join(", ")} của báo cáo theo mẫu ${mau}.`,
    `   Hỏi tới số liệu của các chương đó (dù hỏi thẳng hay vòng) thì "reply" là ĐÚNG NGUYÊN VĂN câu: "${cauTuChoi(cfg.cau_tu_choi)}" — không ước, không suy từ nguồn khác, không nhắc con số nào.`,
    "   Các chương còn lại (vấn đề nổi bật, kiến nghị, kết quả và kế hoạch việc) vẫn trả lời bình thường.",
  ].join("\n");
}
