// ============================================================
// CỬA `base.nhan_thong_bao_nghiem_thu` — AGENT NGHIỆM THU BỎ CHUÔNG THEO NGƯỜI (PLAN-AGENT-NGHIEM-THU-v2.0 §9 «Chuông»,
// HOP-DONG-KET-NOI 5.7 — Mr. Đại cho dựng 18/10/2026)
//
// Agent Nghiệm thu (cổng 3015) không có chuông riêng — mọi agent nhúng chuông chung của agent Công việc. Cửa này bỏ MỘT dòng
// «Thông báo» cho từng NGƯỜI được nêu (email): BQL có phiếu chờ ký · biên bản bị trả lại · LLM cần người trả lời.
//   · Chỉ `nghiemthu` KÈM khoá nội bộ (x-sci-noi-bo) — xét ở route.ts (xetCuaChuongNghiemThu) thay cho ma trận Main, như cửa Quan sát.
//   · Người nhận phải là tài khoản của agent Công việc (tài khoản Nhà thầu không vào 3004 → không có chuông ở đây; Nghiệm thu báo
//     nhà thầu ngay trên màn của nó). Email không có tài khoản → kê ở `khong_thay`, không đoán.
//   · Trùng y người + loại + nội dung trong 20 giờ → không bỏ lần hai (Nghiệm thu gửi lại khi mất câu trả lời).
// Không link: chuông mở trên tên máy của agent Công việc, Nghiệm thu ở cổng khác — nội dung tự đủ đọc.
// CHỈ SERVER.
// ============================================================
import { tx } from "@/lib/db";
import { taoThongBao } from "@/lib/thong-bao";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

export const CUA_CHUONG_NGHIEM_THU = "base.nhan_thong_bao_nghiem_thu";

/** Loại tin Nghiệm thu được bỏ — thêm loại mới thì thêm ở đây */
const LOAI_NHAN: Record<string, string> = {
  nt_cho_ky: "phiếu yêu cầu nghiệm thu chờ ký",
  nt_tra_lai: "biên bản nghiệm thu bị trả lại",
  nt_hoi: "agent Nghiệm thu cần người trả lời",
  // 19/10/2026 (Mr. Đại): báo cáo ngày mới ở agent Tiến độ → có biên bản tới lượt nghiệm thu (một chuông mỗi ngày báo cáo)
  nt_toi_luot: "biên bản tới lượt nghiệm thu theo báo cáo ngày",
};
const TRAN_KY_TU = 2000;
const TRAN_NGUOI = 20;

export const DONG_DANH_MUC_CHUONG_NGHIEM_THU = {
  ten: CUA_CHUONG_NGHIEM_THU,
  mo_ta: "CHỈ Agent nghiệm thu (kèm khoá nội bộ): bỏ một chuông Thông báo cho từng người được nêu — phiếu chờ ký · biên bản bị trả lại · LLM cần người trả lời",
  tham_so: "nguoi_nhan (email hoặc danh sách ≤ 20), loai (nt_cho_ky | nt_tra_lai | nt_hoi | nt_toi_luot), noi_dung (10–2.000 ký tự)",
  san_sang: true,
};

/** Ai được gọi cửa này: đúng nghiemthu + khoá nội bộ. Trả cùng khuôn với xetQuyenGoi. */
export function xetCuaChuongNghiemThu(agentGoi: string, coKhoa: boolean): { duoc: true; laMaLa: false; canhBao: null } | { duoc: false; lyDo: string } {
  if (chuanHoaMaAgent(agentGoi) !== "nghiemthu") return { duoc: false, lyDo: `Cửa ${CUA_CHUONG_NGHIEM_THU} chỉ dành cho Agent nghiệm thu (nghiemthu).` };
  if (!coKhoa) return { duoc: false, lyDo: `Cửa ${CUA_CHUONG_NGHIEM_THU} cần khoá nội bộ (header x-sci-noi-bo).` };
  return { duoc: true, laMaLa: false, canhBao: null };
}

export async function nhanThongBaoNghiemThu(thamSo: Record<string, unknown>): Promise<KhuonTra> {
  const loai = typeof thamSo.loai === "string" ? thamSo.loai.trim() : "";
  if (!LOAI_NHAN[loai]) return thatBai("KHONG_HIEU_YEU_CAU", `Loại tin "${loai}" không nhận — chỉ: ${Object.keys(LOAI_NHAN).join(", ")}.`);
  const noiDung = typeof thamSo.noi_dung === "string" ? thamSo.noi_dung.trim() : "";
  if (noiDung.length < 10 || noiDung.length > TRAN_KY_TU) return thatBai("KHONG_HIEU_YEU_CAU", `Nội dung phải dài 10–${TRAN_KY_TU.toLocaleString("vi-VN")} ký tự.`);
  const tho = Array.isArray(thamSo.nguoi_nhan) ? thamSo.nguoi_nhan : [thamSo.nguoi_nhan];
  const email = Array.from(new Set(tho.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean)));
  if (!email.length) return thatBai("KHONG_HIEU_YEU_CAU", "Thiếu người nhận (nguoi_nhan = email).");
  if (email.length > TRAN_NGUOI) return thatBai("KHONG_HIEU_YEU_CAU", `Tối đa ${TRAN_NGUOI} người nhận mỗi lượt.`);
  const kq = await tx(async (q) => {
    const daBo: string[] = [];
    const trung: string[] = [];
    const khongThay: string[] = [];
    for (const e of email) {
      const id = (await q.query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE lower(email) = $1 AND active LIMIT 1", [e])).rows[0]?.id;
      if (!id) {
        khongThay.push(e);
        continue;
      }
      const { rows } = await q.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND loai = $2 AND noi_dung = $3 AND luc > now() - interval '20 hours'",
        [id, loai, noiDung],
      );
      if ((rows[0]?.n ?? 0) > 0) {
        trung.push(e);
        continue;
      }
      await taoThongBao(q, { nguoi_nhan: id, loai, noi_dung: noiDung, lien_ket: null });
      daBo.push(e);
    }
    return { daBo, trung, khongThay };
  });
  return thanhCong(
    { so_nguoi_nhan: kq.daBo.length, da_bo: kq.daBo, da_bo_truoc: kq.trung, khong_thay: kq.khongThay },
    [
      {
        loai: "thong-bao",
        ma: CUA_CHUONG_NGHIEM_THU,
        file_goc: "docflow.thong_bao",
        thoi_diem_trich: new Date().toISOString(),
        trang_thai: `Bỏ chuông ${LOAI_NHAN[loai]} cho ${kq.daBo.length} người${kq.trung.length ? ` · ${kq.trung.length} người đã có trong 20 giờ qua` : ""}${kq.khongThay.length ? ` · ${kq.khongThay.length} email không có tài khoản agent Công việc` : ""}`,
      },
    ],
  );
}
