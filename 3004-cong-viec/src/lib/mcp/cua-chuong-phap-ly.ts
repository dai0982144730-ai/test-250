// ============================================================
// CỬA `base.nhan_thong_bao_phap_ly` — AGENT PHÁP LÝ BỎ CHUÔNG THEO NGƯỜI (Mr. Đại gật 20/10/2026 «Góp ý chưa báo chuông cho người gửi → thêm chuông»)
//
// Agent Pháp lý trả lời góp ý xong thì báo chuông cho người đã gửi góp ý. Dựng đúng mẫu cửa Nghiệm thu (`cua-chuong-nghiem-thu.ts`):
//   · Chỉ `phaply` KÈM khoá nội bộ (x-sci-noi-bo) — xét ở route.ts (xetCuaChuongPhapLy) thay cho ma trận Main.
//   · Người nhận phải là tài khoản của agent Công việc; email không có tài khoản → kê ở `khong_thay`, không đoán.
//   · Trùng y người + loại + nội dung trong 20 giờ → không bỏ lần hai.
// Nhãn nguồn «Pháp lý» đi cùng nội dung: nếu nội dung chưa mở đầu bằng «Pháp lý» thì cửa thêm «Pháp lý — » phía trước.
// CHỈ SERVER.
// ============================================================
import { tx } from "@/lib/db";
import { taoThongBao } from "@/lib/thong-bao";
import { thanhCong, thatBai, type KhuonTra } from "@/lib/mcp/khuon";
import { chuanHoaMaAgent } from "@/lib/chung/ma-agent";

export const CUA_CHUONG_PHAP_LY = "base.nhan_thong_bao_phap_ly";

/** Loại tin Pháp lý được bỏ — thêm loại mới thì thêm ở đây */
const LOAI_NHAN: Record<string, string> = {
  pl_tra_loi_gop_y: "agent Pháp lý đã trả lời góp ý",
};
const TRAN_KY_TU = 2000;
const TRAN_NGUOI = 20;
const NHAN_NGUON = "Pháp lý";

export const DONG_DANH_MUC_CHUONG_PHAP_LY = {
  ten: CUA_CHUONG_PHAP_LY,
  mo_ta: "CHỈ Agent pháp lý (kèm khoá nội bộ): bỏ một chuông Thông báo cho từng người được nêu — góp ý đã được trả lời",
  tham_so: "nguoi_nhan (email hoặc danh sách ≤ 20), loai (pl_tra_loi_gop_y), noi_dung (10–2.000 ký tự)",
  san_sang: true,
};

/** Ai được gọi cửa này: đúng phaply + khoá nội bộ. Trả cùng khuôn với xetQuyenGoi. */
export function xetCuaChuongPhapLy(agentGoi: string, coKhoa: boolean): { duoc: true; laMaLa: false; canhBao: null } | { duoc: false; lyDo: string } {
  if (chuanHoaMaAgent(agentGoi) !== "phaply") return { duoc: false, lyDo: `Cửa ${CUA_CHUONG_PHAP_LY} chỉ dành cho Agent pháp lý (phaply).` };
  if (!coKhoa) return { duoc: false, lyDo: `Cửa ${CUA_CHUONG_PHAP_LY} cần khoá nội bộ (header x-sci-noi-bo).` };
  return { duoc: true, laMaLa: false, canhBao: null };
}

export async function nhanThongBaoPhapLy(thamSo: Record<string, unknown>): Promise<KhuonTra> {
  const loai = typeof thamSo.loai === "string" ? thamSo.loai.trim() : "";
  if (!LOAI_NHAN[loai]) return thatBai("KHONG_HIEU_YEU_CAU", `Loại tin "${loai}" không nhận — chỉ: ${Object.keys(LOAI_NHAN).join(", ")}.`);
  const goc = typeof thamSo.noi_dung === "string" ? thamSo.noi_dung.trim() : "";
  if (goc.length < 10 || goc.length > TRAN_KY_TU) return thatBai("KHONG_HIEU_YEU_CAU", `Nội dung phải dài 10–${TRAN_KY_TU.toLocaleString("vi-VN")} ký tự.`);
  const noiDung = goc.startsWith(NHAN_NGUON) ? goc : `${NHAN_NGUON} — ${goc}`;
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
        ma: CUA_CHUONG_PHAP_LY,
        file_goc: "docflow.thong_bao",
        thoi_diem_trich: new Date().toISOString(),
        trang_thai: `Bỏ chuông ${LOAI_NHAN[loai]} cho ${kq.daBo.length} người${kq.trung.length ? ` · ${kq.trung.length} người đã có trong 20 giờ qua` : ""}${kq.khongThay.length ? ` · ${kq.khongThay.length} email không có tài khoản agent Công việc` : ""}`,
      },
    ],
  );
}
