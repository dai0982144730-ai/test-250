// ============================================================
// Danh sách nơi nhận cho ô "Giao cho" 2 trong 1 (Mr. Đại chốt 04/10/2026 tối) — MỘT chỗ cho cả ô nội bộ agent Công việc
// (/api/cay-viec/soan-giao ds_nguoi, phiên đăng nhập) lẫn cửa agent khác (nhan-tu-agent.ts ds_nguoi, khoá nội bộ + người bấm).
// Trả kèm trường cũ `nguoi` / `don_vi` (tra tên) + `nhom` (dựng ở noi-nhan-thuan.ts). Đọc CSDL — chỉ gọi phía máy chủ.
// ============================================================

import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { nguoiNgoaiSciCam, phamViGiao } from "@/lib/so-cai/dich-vu";
import { dungNhomNoiNhan, type DonViNoiNhan, type NguoiNoiNhan, type NhomNoiNhan } from "./noi-nhan-thuan";

export async function dsNoiNhan(q: Q, nd: NguoiDungPhien): Promise<{ nguoi: NguoiNoiNhan[]; don_vi: DonViNoiNhan[]; nhom: NhomNoiNhan }> {
  const { rows: nguoi } = await q.query<NguoiNoiNhan>(
    `SELECT n.id, n.ten, d.ten_ngan AS dv,
            array_remove(array_cat(ARRAY[n.don_vi_id], COALESCE((SELECT array_agg(k.don_vi_id) FROM identity.kiem_nhiem k WHERE k.nguoi_dung_id = n.id), '{}')), NULL) AS don_vi_ids
       FROM identity.nguoi_dung n LEFT JOIN identity.don_vi d ON d.id = n.don_vi_id
      WHERE n.active ORDER BY d.ten_ngan NULLS LAST, n.ten`,
  );
  const { rows: don_vi } = await q.query<DonViNoiNhan>(
    "SELECT id, ten, ten_ngan, cap, cha_id, loai, thu_tu FROM identity.don_vi WHERE active ORDER BY cap, thu_tu, ten",
  );
  // Lãnh đạo: tên ngắn đơn vị chức danh mang luôn tên người ("PTGĐ · Nguyễn Chính Đại") → bỏ phần lặp, nhãn còn "Nguyễn Chính Đại · PTGĐ"
  for (const n of nguoi) if (n.dv?.endsWith(`· ${n.ten}`)) n.dv = n.dv.slice(0, -n.ten.length - 1).replace(/\s*·?\s*$/, "") || null;
  const nhom = dungNhomNoiNhan(don_vi, nguoi, { id: nd.id, don_vi_ids: nd.don_vi_ids }, await phamViGiao(q, nd));
  // Công ty ngoài SCI (SCI PMC, SCI E&C…): đơn vị vẫn nằm trong `cay` (giao cho tổ chức thì được), cá nhân của họ rời danh sách gõ "@"
  // (Mr. Đại sửa lại 10/10/2026 chiều) — người đứng đầu công ty đó giao chuyển tiếp cho nhân viên của họ
  const cam = new Set(await nguoiNgoaiSciCam(q, nd));
  if (cam.size) nhom.ca_nhan = nhom.ca_nhan.filter((id) => !cam.has(id));
  return { nguoi, don_vi, nhom };
}
