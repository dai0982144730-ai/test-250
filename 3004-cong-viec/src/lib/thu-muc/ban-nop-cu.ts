// ============================================================
// thu-muc/ban-nop-cu.ts — DỌN BẢN NỘP CŨ (Mr. Đại chốt 08/10/2026, bảng B mục 2). CHỈ SERVER. Chạy trong vòng nền hằng ngày.
//   Xoá nội dung file của bản đã bị NỘP ĐÈ khi bản đè nó đã có quá 90 ngày. Bản hiện tại (bản cuối của kỳ) không bao giờ xoá.
//   Không xoá khi còn việc ĐANG MỞ lấy nguồn từ đúng bản đó (nút mở file gốc khoanh dòng vẫn chạy).
//   Kho file dùng chung theo mã băm (một file có thể là nhiều bản / mẫu Word / ảnh góp ý) → chỉ xoá file trên đĩa khi
//   không còn chỗ nào khác trỏ tới; dòng phien_ban_tep giữ (đánh xoa_luc) — lịch sử, kết quả kiểm tra, góp ý AI vẫn còn.
// ============================================================
import type { Q } from "@/lib/db";
import { xoaTepNeuMoCoi } from "@/lib/luu-tru/kho";

export const SO_NGAY_GIU_BAN_NOP_CU = 90;

export async function donBanNopCu(
  q: Q,
  bayGio = new Date(),
): Promise<{ so_ban: number; so_tep_xoa: number; byte: number; so_ngay: number }> {
  const moc = new Date(bayGio.getTime() - SO_NGAY_GIU_BAN_NOP_CU * 864e5).toISOString();
  const { rows } = await q.query<{ tai_lieu_id: string; phien_ban: number; khoa_luu: string; kich_thuoc: string }>(
    `UPDATE docflow.phien_ban_tep p SET xoa_luc = $2
       FROM docflow.tai_lieu t
      WHERE t.id = p.tai_lieu_id AND p.xoa_luc IS NULL AND p.phien_ban < t.phien_ban_hien_tai
        AND EXISTS (SELECT 1 FROM docflow.phien_ban_tep n
                     WHERE n.tai_lieu_id = p.tai_lieu_id AND n.phien_ban = p.phien_ban + 1 AND n.tai_len_luc < $1)
        AND NOT EXISTS (SELECT 1 FROM docflow.nguon_cong_viec g JOIN docflow.cong_viec c ON c.id = g.cong_viec_id
                         WHERE g.tai_lieu_id = p.tai_lieu_id AND g.phien_ban = p.phien_ban AND c.trang_thai = 'dang_mo')
      RETURNING p.tai_lieu_id, p.phien_ban, p.khoa_luu, p.kich_thuoc::text`,
    [moc, bayGio.toISOString()],
  );
  let soTep = 0;
  let byte = 0;
  for (const k of new Set(rows.map((r) => r.khoa_luu))) {
    if (await xoaTepNeuMoCoi(q, k)) {
      soTep++;
      byte += Number(rows.find((r) => r.khoa_luu === k)?.kich_thuoc ?? 0);
    }
  }
  return { so_ban: rows.length, so_tep_xoa: soTep, byte, so_ngay: SO_NGAY_GIU_BAN_NOP_CU };
}
