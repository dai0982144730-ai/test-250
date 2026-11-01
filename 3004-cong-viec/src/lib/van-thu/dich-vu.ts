// ============================================================
// van-thu/dich-vu.ts — SỔ VĂN BẢN ĐẾN: văn thư nhập thay người ngoài công ty (đối tác, nhà thầu, cơ quan
// nhà nước...). Số đến tự tăng theo năm. Văn bản vào Đến của đơn vị văn thư (P.HCTH) rồi chuyển đơn vị xử lý.
// Lịch sử luôn ghi người thật (văn thư) + thay_cho = nơi gửi thật. CHỈ SERVER.
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { taoMa, demTiep } from "@/lib/ma";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoTaiLieu, thuMucCuaDonVi, type TepTaiLen } from "@/lib/thu-muc/dich-vu";
import { kiemTraDayDu, rutGon } from "@/lib/kiem-tra/kiem-tra";
import { docNgay } from "@/lib/kiem-tra/chuan-hoa";
import { chuyenTiep } from "@/lib/gui/dich-vu";

export interface DongSoDen {
  id: string;
  so_den: number;
  nam: number | null;
  noi_gui: string;
  so_ky_hieu: string | null;
  ngay_van_ban: string | null;
  hinh_thuc: "giay" | "email";
  email_gui: string | null;
  trich_yeu: string | null;
  tai_lieu_id: string;
  ten_tep: string | null;
  nhap_boi: string;
  nhap_boi_ten: string | null;
  nhap_luc: string;
  don_vi_xu_ly: string | null;
  don_vi_xu_ly_ten: string | null;
  buoc_id: string | null;
}

function batBuocVanThu(nd: NguoiDungPhien) {
  if (!coQuyen(nd, "van_thu.nhap_den")) throw new LoiHttp(403, "Chỉ văn thư (quyền van_thu.nhap_den) được vào sổ văn bản đến");
  if (!nd.don_vi_id) throw new LoiHttp(400, "Văn thư chưa được gán đơn vị");
}

/** Vào sổ văn bản đến + đặt vào Đến của đơn vị văn thư; có đơn vị xử lý thì chuyển tiếp luôn. */
export async function nhapVanBanDen(
  q: Q,
  nd: NguoiDungPhien,
  v: {
    noi_gui: string;
    so_ky_hieu?: string | null;
    ngay_van_ban?: string | null; // dd/mm/yyyy hoặc yyyy-mm-dd
    hinh_thuc: "giay" | "email";
    email_gui?: string | null;
    trich_yeu: string;
    tep: TepTaiLen;
    don_vi_xu_ly?: string | null;
  },
): Promise<{ id: string; so_den: number; nam: number; tai_lieu_id: string; buoc_id: string; buoc_chuyen_id: string | null }> {
  batBuocVanThu(nd);
  const noiGui = (v.noi_gui ?? "").trim();
  const trichYeu = (v.trich_yeu ?? "").trim();
  if (!noiGui) throw new LoiHttp(400, "Chưa ghi nơi gửi");
  if (!trichYeu) throw new LoiHttp(400, "Chưa ghi trích yếu văn bản");
  if (!v.tep?.noi_dung?.length) throw new LoiHttp(400, "Chưa có file văn bản (bản chụp giấy hoặc file đính kèm email)");
  if (v.hinh_thuc !== "giay" && v.hinh_thuc !== "email") throw new LoiHttp(400, "Hình thức phải là giấy hoặc email");
  let ngayVb: string | null = null;
  if (v.ngay_van_ban?.trim()) {
    const d = docNgay(v.ngay_van_ban);
    if (d.loi) throw new LoiHttp(400, `Ngày văn bản: ${d.loi}`);
    ngayVb = d.iso ?? null;
  }
  const donViVt = nd.don_vi_id!;
  const nam = new Date().getFullYear();
  const soDen = await demTiep(q, `so_den:${nam}`);

  // Văn bản bên ngoài có thể là báo cáo theo mẫu: kiểm tra (không chặn) để lấy việc — cấp "bên ngoài"
  const kq = /\.docx$/i.test(v.tep.ten_tep)
    ? await kiemTraDayDu(q, nd, v.tep.noi_dung, v.tep.ten_tep, { don_vi_lap: null, nguoi_gui_that: noiGui, bo_qua_so_cai: true })
    : null;
  const theoMau = !!kq?.mau && kq.dat;

  const thuMuc = await thuMucCuaDonVi(q, donViVt, "den");
  const { tai_lieu_id, phien_ban } = await taoTaiLieu(q, {
    ten: trichYeu,
    nguoi: nd.id,
    don_vi_lap: null,
    thu_muc_id: thuMuc,
    tep: v.tep,
    mau_ma: theoMau ? kq!.mau!.ma : null,
    ky_bao_cao: theoMau ? (kq!.ky_bao_cao ?? null) : null,
    ket_qua_kiem_tra: kq && kq.mau ? rutGon(kq) : null,
    nguoi_gui_that: noiGui,
  });

  // Hành trình: bước gốc "từ bên ngoài" → đơn vị văn thư, đã nhận ngay khi vào sổ
  const htId = taoMa("ht");
  await q.query("INSERT INTO docflow.hanh_trinh (id, tai_lieu_goc_id) VALUES ($1,$2)", [htId, tai_lieu_id]);
  const buocId = taoMa("b");
  await q.query(
    `INSERT INTO docflow.buoc_hanh_trinh (id, hanh_trinh_id, cha_id, loai, tai_lieu_id, phien_ban, tu_don_vi, tu_nguoi, den_don_vi,
       trang_thai, nhan_boi, nhan_luc, luc)
     VALUES ($1,$2,NULL,'gui',$3,$4,NULL,$5,$6,'da_nhan',$5, clock_timestamp(), clock_timestamp())`,
    [buocId, htId, tai_lieu_id, phien_ban, nd.id, donViVt],
  );
  await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'da_gui' WHERE id = $1", [tai_lieu_id]);

  const id = taoMa("vbd");
  await q.query(
    `INSERT INTO docflow.so_van_ban_den (id, so_den, nam, noi_gui, so_ky_hieu, ngay_van_ban, hinh_thuc, email_gui, trich_yeu, tai_lieu_id, nhap_boi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, soDen, nam, noiGui, v.so_ky_hieu?.trim() || null, ngayVb, v.hinh_thuc, v.email_gui?.trim() || null, trichYeu, tai_lieu_id, nd.id],
  );
  await ghiLichSu(q, {
    nguoi: nd.id,
    thay_cho: noiGui,
    don_vi_id: donViVt,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: tai_lieu_id,
    hanh_dong: "vao_so_van_ban_den",
    chi_tiet: { so_den: soDen, nam, so_ky_hieu: v.so_ky_hieu ?? null, ngay_van_ban: ngayVb, hinh_thuc: v.hinh_thuc, noi_gui: noiGui, buoc_id: buocId },
  });

  // Văn bản ĐẾN từ bên ngoài KHÔNG sinh việc (Mr. Đại chốt 28/09): việc chỉ vào sổ cái từ Form báo cáo nội bộ đã gửi và việc
  // giao thủ công trên ứng dụng. Văn bản đến chỉ vào sổ văn bản đến và chuyển xử lý; ai cần làm gì thì giao việc thủ công.
  let buocChuyen: string | null = null;
  if (v.don_vi_xu_ly) buocChuyen = await chuyenXuLyNoiBo(q, nd, id, v.don_vi_xu_ly);
  return { id, so_den: soDen, nam, tai_lieu_id, buoc_id: buocId, buoc_chuyen_id: buocChuyen };
}

async function chuyenXuLyNoiBo(q: Q, nd: NguoiDungPhien, soId: string, donVi: string): Promise<string> {
  const { rows } = await q.query<{ tai_lieu_id: string }>("SELECT tai_lieu_id FROM docflow.so_van_ban_den WHERE id = $1", [soId]);
  if (!rows[0]) throw new LoiHttp(404, "Không có văn bản này trong sổ");
  const goc = await q.query<{ id: string }>(
    "SELECT id FROM docflow.buoc_hanh_trinh WHERE tai_lieu_id = $1 AND cha_id IS NULL AND tu_don_vi IS NULL ORDER BY luc LIMIT 1",
    [rows[0].tai_lieu_id],
  );
  if (!goc.rows[0]) throw new LoiHttp(404, "Không thấy bước vào sổ của văn bản");
  const kq = await chuyenTiep(q, nd, { buoc_id: goc.rows[0].id, den: [donVi] });
  await q.query("UPDATE docflow.so_van_ban_den SET don_vi_xu_ly = $2, buoc_id = $3 WHERE id = $1", [soId, donVi, kq.buoc_ids[0]]);
  return kq.buoc_ids[0];
}

/** Chuyển văn bản đã vào sổ cho đơn vị xử lý (chuyển tiếp nguyên văn trên cùng hành trình). */
export async function chuyenXuLy(q: Q, nd: NguoiDungPhien, soId: string, donVi: string): Promise<string> {
  batBuocVanThu(nd);
  if (!donVi) throw new LoiHttp(400, "Chưa chọn đơn vị xử lý");
  return chuyenXuLyNoiBo(q, nd, soId, donVi);
}

export async function danhSachSoDen(q: Q, loc: { nam?: number; tu_khoa?: string } = {}): Promise<DongSoDen[]> {
  const dk: string[] = [];
  const ts: unknown[] = [];
  if (loc.nam) {
    ts.push(loc.nam);
    dk.push(`s.nam = $${ts.length}`);
  }
  if (loc.tu_khoa?.trim()) {
    ts.push(`%${loc.tu_khoa.trim().toLowerCase()}%`);
    dk.push(`(lower(s.noi_gui) LIKE $${ts.length} OR lower(coalesce(s.trich_yeu,'')) LIKE $${ts.length} OR lower(coalesce(s.so_ky_hieu,'')) LIKE $${ts.length})`);
  }
  const { rows } = await q.query<DongSoDen & { ngay_van_ban: string | Date | null; nhap_luc: string | Date }>(
    `SELECT s.*, to_char(s.ngay_van_ban, 'YYYY-MM-DD') AS ngay_van_ban, p.ten_tep, n.ten nhap_boi_ten, d.ten don_vi_xu_ly_ten
     FROM docflow.so_van_ban_den s
     JOIN docflow.tai_lieu t ON t.id = s.tai_lieu_id
     LEFT JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
     LEFT JOIN identity.nguoi_dung n ON n.id = s.nhap_boi
     LEFT JOIN identity.don_vi d ON d.id = s.don_vi_xu_ly
     ${dk.length ? "WHERE " + dk.join(" AND ") : ""}
     ORDER BY s.nam DESC NULLS LAST, s.so_den DESC LIMIT 500`,
    ts,
  );
  return rows.map((r) => ({
    ...r,
    ngay_van_ban: (r.ngay_van_ban as string | null) ?? null,
    nhap_luc: new Date(r.nhap_luc).toISOString(),
  }));
}
