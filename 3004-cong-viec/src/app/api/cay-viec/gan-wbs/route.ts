// /api/cay-viec/gan-wbs — GẮN VIỆC VÀO CÂY WBS (Mr. Đại chốt 03/10/2026, menu "Cây việc & đường găng")
//   (dữ liệu màn đọc ở GET /api/cay-viec — màn chép từ agent Base, 03/10)
//   POST { chay: true, du_an }          — gắn ngay một lượt (người có quyền Duyệt gắn WBS); bình thường máy tự chạy nền 5 phút/lần
//   POST { duyet: "CV-…" }               — duyệt nguyên đề xuất 🤖
//   POST { duyet_lo: "<dự án>" }        — duyệt cả lô đề xuất chờ duyệt có độ chắc ≥ 70% (Mr. Đại chốt 03/10)
//   POST { sua: { cong_viec_id, ma } }   — đổi sang mã khác, ma = null = "không thuộc đầu việc nào" (người thắng)
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { duyetCaLo, duyetHoacSua, ganWbsNen, lanChayCuoi, layCayThat, viecCuaDuAn } from "@/lib/gan-wbs/gan-wbs";

export const dynamic = "force-dynamic";

async function cayCua(duAnId: string) {
  const ds = await tx((q) => layCauHinh(q, "du_an"));
  const da = ds.find((d) => d.id === duAnId);
  if (!da) throw new LoiHttp(404, `Không có dự án ${duAnId} trong Cài đặt › Sơ đồ tổ chức dự án`);
  if (!da.ma_tien_do) return { da, cay: null, loi_cay: `Dự án ${da.ten} chưa có cây WBS bên agent Tiến độ — chưa gắn được (máy tự điền "Mã bên Tiến độ" khi bên đó có cây)` };
  const c = await layCayThat(da.ma_tien_do, `Màn Cây việc & đường găng — hiện mã + tên đầu việc của dự án ${da.ten}`);
  return c.ok ? { da, cay: c.tasks, loi_cay: null } : { da, cay: null, loi_cay: `Chưa lấy được cây WBS từ agent Tiến độ: ${c.thong_diep}` };
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { chay?: boolean; du_an?: string; duyet?: string; duyet_lo?: string; sua?: { cong_viec_id?: string; ma?: string | null } } | null;
    if (!b) throw new LoiHttp(400, "Thiếu nội dung");
    if (b.chay) {
      if (!nd.la_quan_tri && !nd.quyen["wbs.duyet"]) throw new LoiHttp(403, "Bạn không có quyền \"Duyệt gắn WBS\"");
      try {
        return { ket_qua: await ganWbsNen(b.du_an, true) };
      } catch (e) {
        // câu đã dịch sang tiếng Việt ở ganWbsNen (câu gốc tiếng Anh của Claude CLI chỉ ở nhật ký máy chủ)
        throw new LoiHttp(502, lanChayCuoi()?.loi ?? `🤖 AI chưa gắn được: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (b.duyet) return { wbs: await tx((q) => duyetHoacSua(q, nd, b.duyet!, {})) };
    if (b.duyet_lo) {
      if (!nd.la_quan_tri && !nd.quyen["wbs.duyet"]) throw new LoiHttp(403, "Bạn không có quyền \"Duyệt gắn WBS\"");
      const nguong = (await tx((q) => layCauHinh(q, "gan_wbs"))).nguong_tu_duyet;
      return await duyetCaLo(tx, nd, b.duyet_lo, nguong);
    }
    if (b.sua?.cong_viec_id && b.sua.ma !== undefined) {
      const cv = b.sua.cong_viec_id;
      const ds = await tx((q) => layCauHinh(q, "du_an"));
      const thuoc = (await tx((q) => viecCuaDuAn(q, ds))).get(cv);
      if (!thuoc) throw new LoiHttp(400, `Việc ${cv} không thuộc dự án nào có cây WBS`);
      const { cay, loi_cay } = await cayCua(thuoc.du_an_id);
      if (!cay) throw new LoiHttp(502, loi_cay ?? "Chưa lấy được cây WBS");
      const maCo = new Map(cay.map((t) => [t.wbs, t.name]));
      return { wbs: await tx((q) => duyetHoacSua(q, nd, cv, { ma: b.sua!.ma ?? null, du_an_id: thuoc.du_an_id }, maCo)) };
    }
    throw new LoiHttp(400, "Yêu cầu không rõ");
  });
}
