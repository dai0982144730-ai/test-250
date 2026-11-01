// GET /api/toi — người đang đăng nhập + tên đơn vị + được vào trang nào + số thông báo chưa đọc (cho thanh bên).
import { demViecMoi } from "@/lib/viec-moi";
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy } from "@/lib/phien";
import { coQuyen, laQuanTriToanBo } from "@sci/identity";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { nhomDuocSua, suaDuocMoiNhom } from "@/lib/cau-hinh/quyen";
import { raSoatMoiNhat } from "@/lib/so-cai/ra-soat";
import { demChuaDoc, demChuaDocMoi } from "@/lib/thong-bao";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const q = await layQ();
    const { rows } = await q.query<{ id: string; ten: string; ten_ngan: string; cap: number }>(
      "SELECT id, ten, ten_ngan, cap FROM identity.don_vi WHERE id = ANY($1::text[])",
      [nd.don_vi_ids],
    );
    const donVi = nd.don_vi_id ? rows.find((r) => r.id === nd.don_vi_id) ?? null : null;
    const pq = await layCauHinh(q, "phan_quyen_cau_hinh");
    return {
      ...nd,
      don_vi: donVi,
      kiem_nhiem: rows.filter((r) => r.id !== nd.don_vi_id),
      co_the: {
        quan_tri: coQuyen(nd, "nguoi_dung.quan_ly"),
        quan_tri_toan_bo: laQuanTriToanBo(nd),
        cap_khoa: coQuyen(nd, "agent.cap_khoa"),
        quan_ly_mau: coQuyen(nd, "mau.quan_ly"),
        cai_dat: nhomDuocSua(nd, pq).length > 0,
        ra_soat_so_cai: suaDuocMoiNhom(nd),
        // Mục "Thống kê dùng AI" trong Cài đặt — cùng quyền với /api/ai/thong-ke
        thong_ke_ai: coQuyen(nd, "cau_hinh.sua"),
      },
      // Menu Issue (quản trị): số dòng việc của báo cáo đã gửi còn thiếu trong sổ cái — theo lần rà soát gần nhất
      so_viec_thieu_so_cai: suaDuocMoiNhom(nd) ? await (async () => {
        const r = await raSoatMoiNhat(q);
        return r?.so_thieu ?? 0; // chỉ việc thiếu theo quy tắc (bỏ đếm việc AI ngoài bảng — chốt 29/09)
      })() : 0,
      so_thong_bao_chua_doc: await demChuaDoc(q, nd),
      // Chuông "8+5": số chưa đọc đến SAU lần mở chuông trước (Mr. Đại chốt 29/09)
      so_thong_bao_moi: (await demChuaDocMoi(q, nd)).moi,
      // Nút "Việc của tôi" phát sáng: việc mình CHỦ TRÌ đích danh giao sau lần mở màn Việc của tôi gần nhất (Mr. Đại chốt 08/10)
      so_viec_moi: await demViecMoi(q, nd.id, nd.don_vi_ids),
      // Giao diện 3D / 2D người này chọn (không có dòng = 3D)
      kieu_ve:
        (await q.query<{ kieu_ve: string }>("SELECT kieu_ve FROM docflow.tuy_chon_giao_dien WHERE nguoi_dung_id = $1", [nd.id])).rows[0]?.kieu_ve ?? "3d",
      // Menu Issue: số việc quá hạn chưa đóng (phần việc còn làm có hạn trước hôm nay, giờ Việt Nam)
      so_viec_qua_han: Number(
        (
          await q.query<{ n: number }>(
            `SELECT count(DISTINCT c.id)::int AS n FROM docflow.so_cai c JOIN docflow.phan_viec p ON p.cong_viec_id = c.id
              WHERE p.trang_thai = 'dang_lam' AND NOT p.da_bo AND NOT p.luon_mo AND p.ket_thuc IS NOT NULL
                AND p.ket_thuc < ((now() AT TIME ZONE 'UTC') + interval '7 hours')::date`,
          )
        ).rows[0]?.n ?? 0,
      ),
    };
  });
}
