// /api/tai-lieu — GET ?q=: tìm tài liệu mọi đơn vị (Ctrl K)
//                POST multipart {thu_muc_id, tep (nhiều file), tai_lieu_id?}: tải lên tài liệu mới / thêm phiên bản mới
import { layQ, tx } from "@/lib/db";
import { batBuocDangNhap, xuLy, LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { layCayDonVi } from "@sci/identity/don-vi";
import { taoTaiLieu, themPhienBan } from "@/lib/thu-muc/dich-vu";
import { timTaiLieu } from "@/lib/thu-muc/truy-van";
import { doanMime } from "@/lib/thu-muc/xem-truoc";
import { coTheKetThuc } from "@/lib/so-cai/dich-vu";

export const dynamic = "force-dynamic";

const TOI_DA_MB = Number(process.env.DOCFLOW_TAI_LEN_TOI_DA_MB || 100);

export async function GET(req: Request) {
  return xuLy(async () => {
    await batBuocDangNhap();
    const u = new URL(req.url).searchParams;
    const q = await layQ();
    return { ket_qua: await timTaiLieu(q, u.get("q") ?? "", Number(u.get("gioi_han") || 30)) };
  });
}

export async function POST(req: Request) {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const form = await req.formData().catch(() => null);
    if (!form) throw new LoiHttp(400, "Cần gửi dạng multipart/form-data");
    const thuMucId = String(form.get("thu_muc_id") ?? "");
    const taiLieuId = form.get("tai_lieu_id") ? String(form.get("tai_lieu_id")) : null;
    const tep = form.getAll("tep").filter((x): x is File => typeof x === "object" && x !== null && "arrayBuffer" in x);
    if (!thuMucId) throw new LoiHttp(400, "Thiếu thư mục");
    if (!tep.length) throw new LoiHttp(400, "Chưa chọn file");
    for (const f of tep) {
      if (f.size > TOI_DA_MB * 1024 * 1024) throw new LoiHttp(413, `File "${f.name}" lớn hơn ${TOI_DA_MB} MB`);
    }
    const q0 = await layQ();
    const tm = await q0.query<{ don_vi_id: string; loai: string }>("SELECT don_vi_id, loai FROM docflow.thu_muc WHERE id = $1", [thuMucId]);
    if (!tm.rows[0]) throw new LoiHttp(404, "Không tìm thấy thư mục");
    if (tm.rows[0].loai === "thung_rac") throw new LoiHttp(400, "Không tải lên vào Thùng rác");
    const cay = await layCayDonVi(q0, true);
    const donVi = tm.rows[0].don_vi_id;

    const doc = await Promise.all(
      tep.map(async (f) => ({
        ten_tep: f.name || "tep",
        mime: doanMime(f.name || "", f.type),
        noi_dung: Buffer.from(await f.arrayBuffer()),
      })),
    );

    if (taiLieuId) {
      // Bản mới của tài liệu đã có: người tạo, hoặc người có quyền tải lên trong đơn vị của thư mục
      const tl = await q0.query<{ nguoi_tao: string }>(
        `SELECT t.nguoi_tao FROM docflow.tai_lieu t WHERE t.id = $1
         AND EXISTS (SELECT 1 FROM docflow.vi_tri v WHERE v.tai_lieu_id = t.id AND v.thu_muc_id = $2 AND NOT v.da_xoa)`,
        [taiLieuId, thuMucId],
      );
      if (!tl.rows[0]) throw new LoiHttp(404, "Không tìm thấy tài liệu trong thư mục này");
      if (!coQuyen(nd, "tai_lieu.tai_len", { chu_so_huu: tl.rows[0].nguoi_tao, don_vi_id: donVi }, cay)) {
        throw new LoiHttp(403, "Bạn không có quyền tải bản mới cho tài liệu này");
      }
      if (doc.length !== 1) throw new LoiHttp(400, "Bản mới chỉ nhận một file");
      const phienBan = await tx((q) => themPhienBan(q, taiLieuId, { nguoi: nd.id, tep: doc[0] }));
      return { da_tai: [{ tai_lieu_id: taiLieuId, phien_ban: phienBan, ten: doc[0].ten_tep }] };
    }

    if (!coQuyen(nd, "tai_lieu.tai_len", { don_vi_id: donVi }, cay)) {
      // Ngoại lệ: file kết quả khi Kết thúc phần việc — người bấm Kết thúc được phần đó, vào thư mục Đi/gốc của đơn vị mình
      const pvId = form.get("phan_viec_id") ? String(form.get("phan_viec_id")) : null;
      const pv = pvId
        ? (await q0.query<{ phu_trach_loai: string; phu_trach_id: string; trang_thai: string }>(
            "SELECT phu_trach_loai, phu_trach_id, trang_thai FROM docflow.phan_viec WHERE id = $1 AND NOT da_bo",
            [pvId],
          )).rows[0]
        : undefined;
      const laKetQua = !!pv && coTheKetThuc(nd, pv) && nd.don_vi_ids.includes(donVi) && ["di", "goc"].includes(tm.rows[0].loai);
      if (!laKetQua) throw new LoiHttp(403, "Bạn chưa được cấp quyền tải tài liệu thẳng lên thư mục (không qua Soạn và gửi). Liên hệ quản trị để được cấp.");
    }
    const daTai = await tx(async (q) => {
      const kq: { tai_lieu_id: string; phien_ban: number; ten: string }[] = [];
      for (const d of doc) {
        const r = await taoTaiLieu(q, { ten: d.ten_tep, nguoi: nd.id, don_vi_lap: nd.don_vi_id ?? donVi, thu_muc_id: thuMucId, tep: d });
        kq.push({ ...r, ten: d.ten_tep });
      }
      return kq;
    });
    return { da_tai: daTai };
  });
}
