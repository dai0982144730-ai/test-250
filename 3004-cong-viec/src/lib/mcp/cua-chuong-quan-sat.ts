// ============================================================
// CỬA `base.nhan_thong_bao_quan_sat` — AGENT QUAN SÁT BỎ CHUÔNG CHO QUẢN TRỊ (Quản lý token AI Đợt 3, Mr. Đại chốt 04/10/2026)
//
// Agent quan sát (cổng 3014) không có chuông riêng. Mỗi sáng 08:00 nó gửi nhận định dùng AI cả hệ (số cắt 07:45 + 🤖) sang đây;
// cửa này bỏ MỘT dòng "Thông báo" cho TỪNG quản trị viên (baoQuanTri — như chuông tài khoản Claude mất đăng nhập).
//   · Chỉ `quansat` KÈM khoá nội bộ (x-sci-noi-bo) — cửa GHI duy nhất Quan sát được gọi; luật chỉ-đọc 26/09 vẫn giữ cho mọi
//     công cụ khác. Xét ở route.ts (xetCuaChuong) thay cho ma trận Main — chặt hơn: đúng một mã gọi + khoá.
//   · Lượt NHẬN ghi sổ hỏi–đáp như mọi lượt (không nằm trong danh sách quansat được miễn ghi — khuon-so DUOI_QUAN_SAT_DUOC_GOI).
//   · Loại tin chỉ nhận trong danh sách LOAI_NHAN; nội dung 10–2.000 ký tự; trùng y nội dung trong 20 giờ → không bỏ lần hai
//     (Quan sát gửi lại khi mất câu trả lời).
// Không link: chuông mở trên tên máy của agent Công việc, Quan sát ở cổng khác — nội dung tự đủ đọc.
// CHỈ SERVER.
// ============================================================
import { tx } from "@/lib/db";
import { baoQuanTri } from "@/lib/thong-bao";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

export const CUA_CHUONG_QUAN_SAT = "base.nhan_thong_bao_quan_sat";

/** Loại tin Quan sát được bỏ — thêm loại mới thì thêm ở đây */
const LOAI_NHAN: Record<string, string> = { token_ai_sang: "nhận định dùng AI cả hệ buổi sáng" };
const TRAN_KY_TU = 2000;

export const DONG_DANH_MUC_CHUONG = {
  ten: CUA_CHUONG_QUAN_SAT,
  mo_ta: "CHỈ Agent quan sát (kèm khoá nội bộ): bỏ một chuông Thông báo cho từng quản trị viên — mỗi sáng 08:00 nhận định dùng AI cả hệ",
  tham_so: "loai (token_ai_sang), noi_dung (10–2.000 ký tự), ngay?",
  san_sang: true,
};

/** Ai được gọi cửa này: đúng quansat + khoá nội bộ. Trả cùng khuôn với xetQuyenGoi. */
export function xetCuaChuong(agentGoi: string, coKhoa: boolean): { duoc: true; laMaLa: false; canhBao: null } | { duoc: false; lyDo: string } {
  if (chuanHoaMaAgent(agentGoi) !== "quansat") return { duoc: false, lyDo: `Cửa ${CUA_CHUONG_QUAN_SAT} chỉ dành cho Agent quan sát (quansat).` };
  if (!coKhoa) return { duoc: false, lyDo: `Cửa ${CUA_CHUONG_QUAN_SAT} cần khoá nội bộ (header x-sci-noi-bo).` };
  return { duoc: true, laMaLa: false, canhBao: null };
}

export async function nhanThongBaoQuanSat(thamSo: Record<string, unknown>): Promise<KhuonTra> {
  const loai = typeof thamSo.loai === "string" ? thamSo.loai.trim() : "";
  if (!LOAI_NHAN[loai]) return thatBai("KHONG_HIEU_YEU_CAU", `Loại tin "${loai}" không nhận — chỉ: ${Object.keys(LOAI_NHAN).join(", ")}.`);
  const noiDung = typeof thamSo.noi_dung === "string" ? thamSo.noi_dung.trim() : "";
  if (noiDung.length < 10 || noiDung.length > TRAN_KY_TU) return thatBai("KHONG_HIEU_YEU_CAU", `Nội dung phải dài 10–${TRAN_KY_TU.toLocaleString("vi-VN")} ký tự.`);
  const kq = await tx(async (q) => {
    const { rows } = await q.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM docflow.thong_bao WHERE loai = $1 AND noi_dung = $2 AND luc > now() - interval '20 hours'",
      [loai, noiDung],
    );
    if ((rows[0]?.n ?? 0) > 0) return { soNguoi: 0, trung: true };
    return { soNguoi: await baoQuanTri(q, { loai, noi_dung: noiDung, lien_ket: null }), trung: false };
  });
  return thanhCong(
    { so_nguoi_nhan: kq.soNguoi, da_bo_truoc: kq.trung },
    [
      {
        loai: "thong-bao",
        ma: CUA_CHUONG_QUAN_SAT,
        file_goc: "docflow.thong_bao",
        thoi_diem_trich: new Date().toISOString(),
        trang_thai: kq.trung ? "Đã bỏ chuông này trong 20 giờ qua — không bỏ lần hai" : `Đã bỏ chuông ${LOAI_NHAN[loai]} cho ${kq.soNguoi} quản trị viên`,
      },
    ],
  );
}
