// ============================================================
// viec-moi.ts — "VIỆC MỚI GIAO CHO TÔI" để nút Việc của tôi phát sáng (Mr. Đại chốt 08/10/2026). CHỈ SERVER.
//   Việc mới = việc đang mở, có phần việc còn làm giao ĐÍCH DANH người này làm CHỦ TRÌ (không tính phối hợp, không tính việc
//   chính mình giao cho mình), giao SAU lần cuối người này mở màn Việc của tôi.
//   "Đích danh" = ĐÚNG luật nút "tôi nhận" (toiLocMay · lib/mcp/cong-base-thuan.ts): giao thẳng cho người, HOẶC giao vào ô ghế
//   lãnh đạo của người đó (đơn vị loại chuc_danh, vd "Việc của PTGĐ · Nguyễn Chính Đại" = bld-ptgd-dai) — Mr. Đại bắt lỗi 08/10. Mở màn đó → dời mốc → hết sáng.
//   Chưa có mốc (lần đầu) → mốc = 7 ngày trước: việc giao trong 7 ngày qua mà chưa mở màn Việc của tôi vẫn sáng.
//   (Bản đầu 08/10 đặt mốc = lúc đăng nhập lần đầu → việc giao TRƯỚC lần đăng nhập đó không sáng — Mr. Đại bắt lỗi.)
// ============================================================
import type { Q } from "@/lib/db";

export async function demViecMoi(q: Q, nguoiId: string, donViIds: string[] = []): Promise<number> {
  const moc = (await q.query<{ luc: string }>("SELECT luc::text AS luc FROM docflow.moc_xem_viec WHERE nguoi_dung_id = $1", [nguoiId])).rows[0];
  if (!moc) {
    await q.query("INSERT INTO docflow.moc_xem_viec (nguoi_dung_id, luc) VALUES ($1, now() - interval '7 days') ON CONFLICT DO NOTHING", [nguoiId]);
  }
  const { rows } = await q.query<{ n: number }>(
    `SELECT count(DISTINCT c.id)::int AS n
       FROM docflow.phan_viec p JOIN docflow.cong_viec c ON c.id = p.cong_viec_id
      WHERE c.trang_thai = 'dang_mo' AND NOT p.da_bo AND p.trang_thai = 'dang_lam'
        AND COALESCE(p.vai, 'chu_tri') = 'chu_tri'
        AND ((p.phu_trach_loai = 'nguoi' AND p.phu_trach_id = $1)
          OR (p.phu_trach_loai = 'don_vi' AND p.phu_trach_id = ANY($2::text[])
              AND EXISTS (SELECT 1 FROM identity.don_vi d WHERE d.id = p.phu_trach_id AND d.loai = 'chuc_danh')))
        AND COALESCE(c.giao_boi, '') <> $1
        AND p.tao_luc > (SELECT luc FROM docflow.moc_xem_viec WHERE nguoi_dung_id = $1)`,
    [nguoiId, donViIds],
  );
  return rows[0]?.n ?? 0;
}

/** Người mở màn Việc của tôi → dời mốc về bây giờ (hết sáng) */
export async function daXemViecMoi(q: Q, nguoiId: string): Promise<void> {
  await q.query(
    `INSERT INTO docflow.moc_xem_viec (nguoi_dung_id, luc) VALUES ($1, now())
     ON CONFLICT (nguoi_dung_id) DO UPDATE SET luc = now()`,
    [nguoiId],
  );
}
