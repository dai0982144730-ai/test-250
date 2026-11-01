import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query, tx } from "@/lib/db";
import {
  taoTaiLieu,
  themPhienBan,
  thuMucCuaDonVi,
  datVaoThuMuc,
  ganNhan,
  xoaViTri,
  khoiPhucViTri,
  docPhienBan,
} from "@/lib/thu-muc/dich-vu";
import { hatGiong } from "@/lib/thu-muc/hat-giong";
import { cayThuMuc, noiDungThuMuc, taoThuMucCon, timTaiLieu, duocXemNoiDung } from "@/lib/thu-muc/truy-van";
import { lichSuDoiTuong } from "@/lib/lich-su/doc";
import { kiemTraChuoi } from "@/lib/lich-su/ghi";
import { bamSha256 } from "@/lib/luu-tru/kho";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";

const tep = (ten: string, noiDung: string) => ({ ten_tep: ten, mime: "text/plain", noi_dung: Buffer.from(noiDung, "utf8") });

async function taiLen(nd: NguoiDungPhien, donVi: string, loai: "den" | "di" | "du_an", ten: string) {
  const q = await layQ();
  const thuMuc = await thuMucCuaDonVi(q, donVi, loai);
  const kq = await tx((t) => taoTaiLieu(t, { ten, nguoi: nd.id, don_vi_lap: nd.don_vi_id, thu_muc_id: thuMuc, tep: tep(ten, `nội dung ${ten}`) }));
  const vt = await query<{ id: string }>("SELECT id FROM docflow.vi_tri WHERE tai_lieu_id = $1", [kq.tai_lieu_id]);
  return { ...kq, thu_muc_id: thuMuc, vi_tri_id: vt.rows[0].id };
}

async function loiCua(p: Promise<unknown>): Promise<LoiHttp> {
  try {
    await p;
  } catch (e) {
    return e as LoiHttp;
  }
  throw new Error("Không ném lỗi");
}

describe("thư mục phòng ban", () => {
  beforeAll(async () => {
    process.env.DOCFLOW_FILES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-thumuc-"));
    await csdlMoi();
  });

  it("gieo đủ thư mục gốc + Đến/Đi/Dự án/Thùng rác cho 26 đơn vị, chạy lại không nhân đôi", async () => {
    const dem = async () =>
      (await query<{ don_vi_id: string; loai: string; n: number }>(
        "SELECT don_vi_id, loai, count(*)::int n FROM docflow.thu_muc GROUP BY don_vi_id, loai",
      )).rows;
    const truoc = await dem();
    expect(new Set(truoc.map((r) => r.don_vi_id)).size).toBe(26);
    for (const loai of ["goc", "den", "di", "du_an", "thung_rac"]) {
      expect(truoc.filter((r) => r.loai === loai && r.n === 1)).toHaveLength(26);
    }
    await hatGiong(await layQ());
    expect((await dem()).reduce((s, r) => s + r.n, 0)).toBe(130);
    // thư mục con nằm dưới thư mục gốc của chính đơn vị đó
    const lech = await query(
      `SELECT 1 FROM docflow.thu_muc c JOIN docflow.thu_muc g ON g.id = c.cha_id WHERE c.loai <> 'goc' AND (g.loai <> 'goc' OR g.don_vi_id <> c.don_vi_id)`,
    );
    expect(lech.rows).toHaveLength(0);
  });

  it("đơn vị thêm sau: thuMucCuaDonVi tự dựng cây", async () => {
    await query("INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai) VALUES ('vp-hdqt','Văn phòng HĐQT','VP HĐQT',0,NULL,'rieng')");
    const q = await layQ();
    const den = await thuMucCuaDonVi(q, "vp-hdqt", "den");
    expect(den).toBe(await thuMucCuaDonVi(q, "vp-hdqt", "den"));
    const { rows } = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.thu_muc WHERE don_vi_id = 'vp-hdqt'");
    expect(rows[0].n).toBe(5);
    const hung = await nguoi("hung.tv@scigroup.vn");
    const cay = await cayThuMuc(q, hung);
    expect(cay.don_vi.map((d) => d.id)).toContain("vp-hdqt");
    expect(cay.thu_muc.filter((t) => t.loai === "thung_rac")).toHaveLength(27);
  });

  it("tạo tài liệu + phiên bản 2: bản cũ giữ, mã băm đúng, lịch sử ghi tải lên", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    const a = await taiLen(hung, "p-ktvh", "di", "BaoCao_Tuan29_PhongKTVH.docx");
    expect(a.phien_ban).toBe(1);
    const q = await layQ();
    const pb2 = await tx((t) => themPhienBan(t, a.tai_lieu_id, { nguoi: hung.id, tep: tep("BaoCao_Tuan29_PhongKTVH.docx", "bản 2") }));
    expect(pb2).toBe(2);
    const moi = await docPhienBan(q, a.tai_lieu_id);
    expect(moi.thong_tin.phien_ban).toBe(2);
    expect(moi.noi_dung.toString("utf8")).toBe("bản 2");
    expect(moi.thong_tin.sha256).toBe(bamSha256(Buffer.from("bản 2", "utf8")));
    const cu = await docPhienBan(q, a.tai_lieu_id, 1);
    expect(cu.noi_dung.toString("utf8")).toContain("nội dung");
    await expect(docPhienBan(q, a.tai_lieu_id, 9)).rejects.toThrow();
    const ls = await lichSuDoiTuong(q, "tai_lieu", a.tai_lieu_id);
    expect(ls.map((d) => d.hanh_dong)).toEqual(["tai_len", "tai_len"]);
    expect(ls[1].chi_tiet.phien_ban).toBe(2);
    expect(ls[1].chi_tiet.sha256).toBe(moi.thong_tin.sha256);
  });

  it("đặt vào thư mục Đến (không trùng) và gắn nhãn Bị trả lại", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    const a = await taiLen(hung, "p-ktvh", "di", "GuiDi.docx");
    const q = await layQ();
    const den = await thuMucCuaDonVi(q, "ban-tgd", "den");
    const v1 = await datVaoThuMuc(q, { tai_lieu_id: a.tai_lieu_id, thu_muc_id: den, vai: "den", nguoi: hung.id });
    const v2 = await datVaoThuMuc(q, { tai_lieu_id: a.tai_lieu_id, thu_muc_id: den, vai: "den", nguoi: hung.id });
    expect(v2).toBe(v1);
    await ganNhan(q, { tai_lieu_id: a.tai_lieu_id, thu_muc_id: den, nhan: "bi_tra_lai" });
    const tgd = await nguoi("tgd@scigroup.vn");
    const nd = await noiDungThuMuc(q, tgd, den);
    const dong = nd.tai_lieu.find((d) => d.tai_lieu_id === a.tai_lieu_id)!;
    expect(dong.nhan).toBe("bi_tra_lai");
    expect(dong.vai).toBe("den");
  });

  it("xóa theo quyền: nhân viên chỉ xóa file mình; trưởng đơn vị trong đơn vị mình; quản trị mọi nơi", async () => {
    const q = await layQ();
    const hung = await nguoi("hung.tv@scigroup.vn");
    const truongKtvh = await nguoi("truong.ktvh@scigroup.vn");
    const nvDtpc = await nguoi("nv.dtpc@scigroup.vn");
    const quanTri = await nguoi("quantri@scigroup.vn");

    const cuaTruong = await taiLen(truongKtvh, "p-ktvh", "di", "CuaTruong.docx");
    const cuaHung = await taiLen(hung, "p-ktvh", "di", "CuaHung.docx");
    const cuaHung2 = await taiLen(hung, "p-ktvh", "du_an", "CuaHung2.docx");
    const dtpc1 = await taiLen(nvDtpc, "p-dtpc", "di", "Dtpc1.docx");
    const dtpc2 = await taiLen(nvDtpc, "p-dtpc", "di", "Dtpc2.docx");

    // cờ quyền trên danh sách thư mục khớp với dịch vụ
    const ds = await noiDungThuMuc(q, hung, cuaTruong.thu_muc_id);
    expect(ds.tai_lieu.find((d) => d.tai_lieu_id === cuaTruong.tai_lieu_id)!.duoc_xoa).toBe(false);
    expect(ds.tai_lieu.find((d) => d.tai_lieu_id === cuaHung.tai_lieu_id)!.duoc_xoa).toBe(true);

    expect((await loiCua(tx((t) => xoaViTri(t, hung, cuaTruong.vi_tri_id)))).status).toBe(403);
    await tx((t) => xoaViTri(t, hung, cuaHung.vi_tri_id));
    await tx((t) => xoaViTri(t, truongKtvh, cuaHung2.vi_tri_id));
    expect((await loiCua(tx((t) => xoaViTri(t, truongKtvh, dtpc1.vi_tri_id)))).status).toBe(403);
    await tx((t) => xoaViTri(t, quanTri, dtpc1.vi_tri_id));
    expect((await loiCua(tx((t) => xoaViTri(t, quanTri, dtpc1.vi_tri_id)))).status).toBe(409);
    // xóa bị từ chối thì không đổi gì
    const conDo = await query<{ da_xoa: boolean }>("SELECT da_xoa FROM docflow.vi_tri WHERE id = $1", [cuaTruong.vi_tri_id]);
    expect(conDo.rows[0].da_xoa).toBe(false);

    // Thùng rác của P.KT&VH có 2 file; P.ĐT&PC có 1
    const racKtvh = await noiDungThuMuc(q, hung, await thuMucCuaDonVi(q, "p-ktvh", "thung_rac"));
    expect(racKtvh.la_thung_rac).toBe(true);
    expect(racKtvh.tai_lieu.map((d) => d.tai_lieu_id).sort()).toEqual([cuaHung.tai_lieu_id, cuaHung2.tai_lieu_id].sort());
    const dongHung = racKtvh.tai_lieu.find((d) => d.tai_lieu_id === cuaHung.tai_lieu_id)!;
    expect(dongHung.xoa_boi).toBe(hung.id);
    expect(dongHung.duoc_khoi_phuc).toBe(true);
    // file do trưởng xóa nhưng Hùng tải lên → Hùng vẫn khôi phục được (của mình)
    expect(racKtvh.tai_lieu.find((d) => d.tai_lieu_id === cuaHung2.tai_lieu_id)!.duoc_khoi_phuc).toBe(true);

    // file đã xóa vẫn đọc được + lịch sử ghi ai xóa
    const doc = await docPhienBan(q, cuaHung.tai_lieu_id);
    expect(doc.noi_dung.toString("utf8")).toBe("nội dung CuaHung.docx");
    const ls = await lichSuDoiTuong(q, "tai_lieu", dtpc1.tai_lieu_id);
    expect(ls.map((d) => [d.hanh_dong, d.nguoi])).toEqual([
      ["tai_len", nvDtpc.id],
      ["xoa", quanTri.id],
    ]);

    // khôi phục: nhân viên P.ĐT&PC khôi phục được file của mình; Hùng không khôi phục được file P.ĐT&PC
    expect((await loiCua(tx((t) => khoiPhucViTri(t, hung, dtpc1.vi_tri_id)))).status).toBe(403);
    await tx((t) => khoiPhucViTri(t, nvDtpc, dtpc1.vi_tri_id));
    const sau = await query<{ da_xoa: boolean; xoa_boi: string | null }>("SELECT da_xoa, xoa_boi FROM docflow.vi_tri WHERE id = $1", [dtpc1.vi_tri_id]);
    expect(sau.rows[0]).toEqual({ da_xoa: false, xoa_boi: null });
    expect((await loiCua(tx((t) => khoiPhucViTri(t, nvDtpc, dtpc1.vi_tri_id)))).status).toBe(409);
    const ls2 = await lichSuDoiTuong(q, "tai_lieu", dtpc1.tai_lieu_id);
    expect(ls2.map((d) => d.hanh_dong)).toEqual(["tai_len", "xoa", "khoi_phuc"]);

    // trưởng P.ĐT&PC xóa được file của nhân viên phòng mình
    const truongDtpc = await nguoi("truong.dtpc@scigroup.vn");
    await tx((t) => xoaViTri(t, truongDtpc, dtpc2.vi_tri_id));
    expect(await kiemTraChuoi(q)).toBeNull();
  });

  it("thùng rác quá hạn: ẩn khỏi thùng rác nhưng file + lịch sử vẫn còn", async () => {
    const q = await layQ();
    const hung = await nguoi("hung.tv@scigroup.vn");
    const a = await taiLen(hung, "p-ktvh", "di", "Cu_Qua_Han.docx");
    await tx((t) => xoaViTri(t, hung, a.vi_tri_id));
    await query("UPDATE docflow.vi_tri SET xoa_luc = now() - interval '40 days' WHERE id = $1", [a.vi_tri_id]);
    const rac = await noiDungThuMuc(q, hung, await thuMucCuaDonVi(q, "p-ktvh", "thung_rac"));
    expect(rac.tai_lieu.some((d) => d.tai_lieu_id === a.tai_lieu_id)).toBe(false);
    expect((await loiCua(tx((t) => khoiPhucViTri(t, hung, a.vi_tri_id)))).status).toBe(410);
    expect((await docPhienBan(q, a.tai_lieu_id)).noi_dung.toString("utf8")).toBe("nội dung Cu_Qua_Han.docx");
    expect((await lichSuDoiTuong(q, "tai_lieu", a.tai_lieu_id)).map((d) => d.hanh_dong)).toEqual(["tai_len", "xoa"]);
  });

  it("ai cũng thấy cấu trúc mọi đơn vị; tìm tài liệu mọi đơn vị (không gồm thùng rác)", async () => {
    const q = await layQ();
    const nguoiMoi = await nguoi("nguoimoi@scigroup.vn");
    const cay = await cayThuMuc(q, nguoiMoi);
    expect(cay.don_vi.length).toBeGreaterThanOrEqual(9);
    expect(cay.don_vi.every((d) => !d.duoc_tai_len)).toBe(true);
    const ktvh = cay.don_vi.find((d) => d.id === "p-ktvh")!;
    expect(ktvh.truong).toContain("Đỗ Quang Vinh");
    const kq = await timTaiLieu(q, "phongktvh");
    expect(kq.some((r) => r.ten === "BaoCao_Tuan29_PhongKTVH.docx" && r.don_vi_id === "p-ktvh")).toBe(true);
    expect((await timTaiLieu(q, "CuaHung.docx")).length).toBe(0); // đã xóa
  });

  it("xem nội dung phòng khác theo cấu hình", async () => {
    const q = await layQ();
    const hung = await nguoi("hung.tv@scigroup.vn");
    const nvDtpc = await nguoi("nv.dtpc@scigroup.vn");
    const a = await taiLen(nvDtpc, "p-dtpc", "di", "XemTheoQuyen.docx");
    expect(await duocXemNoiDung(q, hung, a.tai_lieu_id)).toBe(true);
    await query(
      `INSERT INTO docflow.cau_hinh (khoa, gia_tri) VALUES ('thu_muc', '{"xem_noi_dung_phong_khac":"theo_quyen"}')
       ON CONFLICT (khoa) DO UPDATE SET gia_tri = EXCLUDED.gia_tri`,
    );
    // nhân viên mặc định có tai_lieu.xem toàn bộ → vẫn xem được; bớt còn "của mình" thì không
    expect(await duocXemNoiDung(q, hung, a.tai_lieu_id)).toBe(true);
    const hepHon: NguoiDungPhien = { ...hung, quyen: { ...hung.quyen, "tai_lieu.xem": "don_vi" } };
    expect(await duocXemNoiDung(q, hepHon, a.tai_lieu_id)).toBe(false);
    expect(await duocXemNoiDung(q, { ...nvDtpc, quyen: { "tai_lieu.xem": "cua_minh" } }, a.tai_lieu_id)).toBe(true);
    await query("DELETE FROM docflow.cau_hinh WHERE khoa = 'thu_muc'");
  });

  it("tạo thư mục con chỉ trong Dự án, theo quyền tải lên", async () => {
    const q = await layQ();
    const duAn = await thuMucCuaDonVi(q, "p-ktvh", "du_an");
    // Nhân viên không có sẵn quyền tải thẳng lên thư mục: phải được gắn vai trò "Tải thẳng lên thư mục"
    const chuaCap = await nguoi("hung.tv@scigroup.vn");
    expect((await loiCua(tx((t) => taoThuMucCon(t, chuaCap, duAn, "Thủy điện Nậm Xe 2")))).status).toBe(403);
    await query("INSERT INTO identity.gan_vai_tro (nguoi_dung_id, vai_tro_id) VALUES ($1, 'tai-len-thu-muc')", ["hung.tv@scigroup.vn"]);
    const hung = await nguoi("hung.tv@scigroup.vn");
    const id = await tx((t) => taoThuMucCon(t, hung, duAn, "Thủy điện Nậm Xe 2"));
    const con = await tx((t) => taoThuMucCon(t, hung, id, "Hồ sơ thiết kế"));
    expect(con).toBeTruthy();
    expect((await loiCua(tx((t) => taoThuMucCon(t, hung, duAn, "thủy điện nậm xe 2")))).status).toBe(409);
    expect((await loiCua(tx((t) => taoThuMucCon(t, hung, duAn, "a/b")))).status).toBe(400);
    const den = await thuMucCuaDonVi(q, "p-ktvh", "den");
    expect((await loiCua(tx((t) => taoThuMucCon(t, hung, den, "Không được")))).status).toBe(400);
    const duAnDtpc = await thuMucCuaDonVi(q, "p-dtpc", "du_an");
    expect((await loiCua(tx((t) => taoThuMucCon(t, hung, duAnDtpc, "Không được")))).status).toBe(403);
    const nd = await noiDungThuMuc(q, hung, id);
    expect(nd.duong_dan.map((t) => t.loai)).toEqual(["goc", "du_an", "khac"]);
    expect(nd.duoc_tao_thu_muc).toBe(true);
    expect(nd.thu_muc_con.map((t) => t.ten)).toEqual(["Hồ sơ thiết kế"]);
  });
});
