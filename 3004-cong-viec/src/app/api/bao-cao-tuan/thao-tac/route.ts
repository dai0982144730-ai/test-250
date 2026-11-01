// POST /api/bao-cao-tuan/thao-tac { bao_cao_id, cong_viec_id, loai: "nhac" | "giao", ket_qua?, loi_nhan?, nhac?, dinh_kem? }
// Bấm từ báo cáo tuần (chốt 30/09): bấm rồi thì nút thành "Đã nhắc" / "Đã giao" (chữ xanh), không bấm lại được.
//   nhac: chuông tới bên chủ trì việc (người được giao đích danh, hoặc mọi thành viên đơn vị chủ trì) — Ban lãnh đạo / quản trị
//   giao: chỉ GHI lại — việc mới đã được tạo bằng form Giao việc (API công việc, kiểm quyền giao ở đó); ket_qua = mã việc mới
import { tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { laBanLanhDao } from "@/lib/bao-cao-tuan/do-kho";
import { taoThongBao, dauDonVi } from "@/lib/thong-bao";
import { vietBinhLuan } from "@/lib/phong/binh-luan";
import { ghiLichSu } from "@/lib/lich-su/ghi";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const b = (await req.json().catch(() => null)) as { bao_cao_id?: string; cong_viec_id?: string; loai?: string; ket_qua?: string; loi_nhan?: string; nhac?: string[]; dinh_kem?: string[] } | null;
    if (!b?.bao_cao_id || !b.cong_viec_id || (b.loai !== "nhac" && b.loai !== "giao")) throw new LoiHttp(400, "Thiếu báo cáo, việc hoặc loại thao tác");
    return tx(async (q) => {
      const ban = await q.query<{ tuan_so: number }>("SELECT tuan_so FROM docflow.bao_cao_tuan WHERE id = $1", [b.bao_cao_id]);
      if (!ban.rows.length) throw new LoiHttp(404, "Không có bản báo cáo tuần này");
      const da = await q.query("SELECT 1 FROM docflow.bao_cao_tuan_thao_tac WHERE bao_cao_id = $1 AND cong_viec_id = $2 AND loai = $3", [b.bao_cao_id, b.cong_viec_id, b.loai]);
      if (da.rows.length) throw new LoiHttp(409, b.loai === "nhac" ? "Việc này đã được nhắc từ báo cáo tuần này" : "Việc này đã được giao từ báo cáo tuần này");
      const cv = await q.query<{ ten: string }>("SELECT ten FROM docflow.cong_viec WHERE id = $1", [b.cong_viec_id]);
      if (!cv.rows.length) throw new LoiHttp(404, `Không có công việc ${b.cong_viec_id}`);
      if (b.loai === "nhac") {
        if (!nd.la_quan_tri && !(await laBanLanhDao(q, nd))) throw new LoiHttp(403, "Chỉ Ban lãnh đạo được nhắc việc từ báo cáo tuần");
        const { rows: pt } = await q.query<{ phu_trach_loai: string; phu_trach_id: string }>(
          "SELECT phu_trach_loai, phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1 AND NOT da_bo AND COALESCE(vai,'chu_tri') = 'chu_tri' AND trang_thai = 'dang_lam'",
          [b.cong_viec_id],
        );
        // Chữ đang gõ ở ô ý kiến đi kèm tin Nhắc (Mr. Đại chốt 02/10): một cú bấm = chuông nhắc có lời nhắn + lưu thành bình luận của việc
        const loi = (b.loi_nhan ?? "").trim();
        const coKem = !!loi || !!b.dinh_kem?.length;
        const tb = {
          loai: "nhac_viec",
          noi_dung: `${nd.ten} nhắc việc ${b.cong_viec_id} ${cv.rows[0].ten.slice(0, 90)}${loi ? `: “${loi.length > 160 ? `${loi.slice(0, 160)}…` : loi}”` : ""}${b.dinh_kem?.length ? ` · kèm ${b.dinh_kem.length} file` : ""} (từ Báo cáo tuần ${ban.rows[0].tuan_so})`,
          lien_ket: `/cong-viec/${b.cong_viec_id}`,
        };
        const daNhac = new Set<string>();
        for (const p of pt) {
          // phần của cả đơn vị: đầu đơn vị (chốt K2 02/10)
          for (const id of p.phu_trach_loai === "nguoi" ? [p.phu_trach_id] : await dauDonVi(q, p.phu_trach_id)) {
            if (daNhac.has(id)) continue;
            daNhac.add(id);
            await taoThongBao(q, { ...tb, nguoi_nhan: id });
          }
        }
        // người đã nhận chuông nhắc thì không nhận thêm chuông "bình luận" cho cùng lời nhắn
        if (coKem) await vietBinhLuan(q, nd, b.cong_viec_id!, { noi_dung: loi, nhac: b.nhac, dinh_kem: b.dinh_kem }, daNhac);
      }
      await q.query("INSERT INTO docflow.bao_cao_tuan_thao_tac (bao_cao_id, cong_viec_id, loai, nguoi, ket_qua) VALUES ($1,$2,$3,$4,$5)", [
        b.bao_cao_id, b.cong_viec_id, b.loai, nd.id, b.ket_qua ?? null,
      ]);
      await ghiLichSu(q, {
        nguoi: nd.id,
        don_vi_id: nd.don_vi_id,
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: b.cong_viec_id!,
        hanh_dong: b.loai === "nhac" ? "nhac_tu_bao_cao_tuan" : "giao_tu_bao_cao_tuan",
        chi_tiet: { bao_cao_id: b.bao_cao_id, ket_qua: b.ket_qua ?? null, ...(b.loi_nhan?.trim() ? { loi_nhan: b.loi_nhan.trim() } : {}) },
      });
      return { ok: true };
    });
  });
}
