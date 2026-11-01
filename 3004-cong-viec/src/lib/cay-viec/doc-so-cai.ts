// ============================================================
// cay-viec/doc-so-cai.ts — NGUỒN VIỆC của màn Cây việc & đường găng: đọc SỔ CÁI của chính agent Công việc (thay
// layViecBaseNhieuKhongGian của agent Base, vốn đọc Base.vn qua khoá API). CHỈ SERVER.
//   · việc thuộc dự án: viecCuaDuAn (luật tra dự án duAnCuaViec — cùng menu Dự án)
//   · người phụ trách = phần CHỦ TRÌ còn hiệu lực (tên thật người / đơn vị, không email trần)
//   · nằm im = từ lần ghi lịch sử gần nhất của việc (docflow.lich_su), chưa có thì lúc tạo việc
//   · mã WBS = docflow.wbs_viec
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { docGanWbs, duocDuyet, viecCuaDuAn } from "@/lib/gan-wbs/gan-wbs";
import { anhXaViec, type DongSoCai, type ViecCay } from "./thuan";

/** Ngày hôm nay theo giờ Việt Nam (yyyy-mm-dd) */
export function homNayVN(bayGio = Date.now()): string {
  return new Date(bayGio + 7 * 3600e3).toISOString().slice(0, 10);
}

/**
 * Mọi việc của MỘT dự án, đã ánh xạ sang khuôn việc của màn. `nd` để biết từng việc người đang xem có được Duyệt/✎ không
 * (luật riêng 3004: không quyền thì ẨN nút).
 */
export async function viecSoCaiCuaDuAn(q: Q, dsDuAn: CauHinh["du_an"], duAnId: string, nd: NguoiDungPhien | null, bayGio = Date.now()): Promise<ViecCay[]> {
  const thuoc = [...(await viecCuaDuAn(q, dsDuAn)).values()].filter((v) => v.du_an_id === duAnId).map((v) => v.id);
  if (!thuoc.length) return [];
  const { rows } = await q.query<DongSoCai>(
    `SELECT c.id, c.ten, c.trang_thai, c.ket_thuc::text AS ket_thuc, to_char(c.tao_luc AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS tao_luc,
            p.phu_trach_loai AS pt_loai, p.phu_trach_id AS pt_id,
            COALESCE(CASE WHEN p.phu_trach_loai = 'nguoi' THEN n.ten ELSE d.ten END, p.phu_trach_id) AS pt_ten,
            GREATEST(c.tao_luc, (SELECT max(l.luc) FROM docflow.lich_su l WHERE l.doi_tuong_loai = 'cong_viec' AND l.doi_tuong_id = c.id))::text AS cap_nhat_cuoi,
            CASE WHEN c.trang_thai = 'hoan_thanh' AND c.dong_luc IS NOT NULL THEN to_char(c.dong_luc + interval '7 hours', 'YYYY-MM-DD') END AS xong_ngay
       FROM docflow.cong_viec c
       LEFT JOIN LATERAL (
         SELECT x.phu_trach_loai, x.phu_trach_id FROM docflow.phan_viec x
          WHERE x.cong_viec_id = c.id AND NOT x.da_bo ORDER BY (x.vai = 'chu_tri') DESC, x.thu_tu, x.id LIMIT 1
       ) p ON true
       LEFT JOIN identity.nguoi_dung n ON p.phu_trach_loai = 'nguoi' AND n.id = p.phu_trach_id
       LEFT JOIN identity.don_vi d ON p.phu_trach_loai = 'don_vi' AND d.id = p.phu_trach_id
      WHERE c.id = ANY($1::text[]) ORDER BY c.id`,
    [thuoc],
  );
  const gan = new Map((await docGanWbs(q, duAnId)).map((g) => [g.cong_viec_id, g]));
  const homNay = homNayVN(bayGio);
  const ra: ViecCay[] = [];
  for (const r of rows) {
    const duyet = nd ? await duocDuyet(q, nd, r.id) : false;
    ra.push(anhXaViec(r, gan.get(r.id), homNay, bayGio, duyet));
  }
  return ra;
}
