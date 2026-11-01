// /api/cai-dat/keo-du-an-main — DANH MỤC DỰ ÁN KÉO TỪ MAIN (LOI-DUNG-CHUNG 6g.6, Đợt 1 — Mr. Đại chốt 03/10/2026)
//   GET  — vết lượt kéo gần nhất (giờ, số dự án, dự án mới, dự án chỉ có ở đây, dự án chưa chọn Ban QLDA, lỗi)
//   POST — kéo ngay (nút ↻ ở Cài đặt › Sơ đồ tổ chức dự án): người sửa được nhóm "du_an"; hỏi lại agent Tiến độ hết, không dùng bản nhớ
import { layQ } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { duocSuaNhom } from "@/lib/cau-hinh/quyen";
import { docVetKeo, keoDuAnTuMain } from "@/lib/du-an-main";

export const dynamic = "force-dynamic";

export async function GET() {
  return xuLy(async () => {
    await batBuocDangNhap();
    return { vet: docVetKeo() };
  });
}

export async function POST() {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    if (!duocSuaNhom(nd, "du_an", await layCauHinh(await layQ(), "phan_quyen_cau_hinh"))) throw new LoiHttp(403, 'Bạn không có quyền sửa nhóm cài đặt "Sơ đồ tổ chức dự án"');
    return { vet: await keoDuAnTuMain(`${nd.ten || nd.id} bấm ↻ Kéo lại danh mục dự án từ Main (Cài đặt › Sơ đồ tổ chức dự án)`, true) };
  });
}
