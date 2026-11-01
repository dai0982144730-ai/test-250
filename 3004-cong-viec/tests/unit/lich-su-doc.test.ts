import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query, tx } from "@/lib/db";
import { taoTaiLieu, thuMucCuaDonVi, xoaViTri, docPhienBan } from "@/lib/thu-muc/dich-vu";
import { lichSuDoiTuong, timLichSu } from "@/lib/lich-su/doc";
import { tenChoLichSu } from "@/lib/lich-su/ten";
import { kiemTraChuoi } from "@/lib/lich-su/ghi";
import { ghiLichSuChuan, xepKhoaJsonb } from "@/lib/lich-su/ghi-chuan";
import type { NguoiDungPhien } from "@/lib/types";

async function taiLen(nd: NguoiDungPhien, donVi: string, ten: string) {
  const q = await layQ();
  const tm = await thuMucCuaDonVi(q, donVi, "di");
  const kq = await tx((t) =>
    taoTaiLieu(t, { ten, nguoi: nd.id, don_vi_lap: nd.don_vi_id, thu_muc_id: tm, tep: { ten_tep: ten, mime: "text/plain", noi_dung: Buffer.from(ten) } }),
  );
  const vt = await query<{ id: string }>("SELECT id FROM docflow.vi_tri WHERE tai_lieu_id = $1", [kq.tai_lieu_id]);
  return { id: kq.tai_lieu_id, vi_tri_id: vt.rows[0].id };
}

describe("lịch sử: đọc và lọc theo quyền", () => {
  let aHung: { id: string; vi_tri_id: string };
  let aTruongKtvh: { id: string; vi_tri_id: string };
  let aNamXe: { id: string; vi_tri_id: string };
  let aDtpc: { id: string; vi_tri_id: string };

  beforeAll(async () => {
    process.env.DOCFLOW_FILES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-lichsu-"));
    await csdlMoi();
    const hung = await nguoi("hung.tv@scigroup.vn");
    const truongKtvh = await nguoi("truong.ktvh@scigroup.vn");
    const gdNamXe = await nguoi("gd.namxe@scigroup.vn");
    const nvDtpc = await nguoi("nv.dtpc@scigroup.vn");
    aHung = await taiLen(hung, "p-ktvh", "Hung_BaoCao.docx");
    aTruongKtvh = await taiLen(truongKtvh, "p-ktvh", "Truong_KTVH.docx");
    aNamXe = await taiLen(gdNamXe, "nm-namxe", "NamXe_Form8.docx");
    aDtpc = await taiLen(nvDtpc, "p-dtpc", "DTPC_Form1.docx");
    // trưởng P.KT&VH xóa file của Hùng → dòng do trưởng làm nhưng về đối tượng của Hùng
    await tx((t) => xoaViTri(t, truongKtvh, aHung.vi_tri_id));
  });

  it("dòng thời gian một tài liệu: đủ bước, cũ → mới, kể cả đã xóa; file vẫn đọc được", async () => {
    const q = await layQ();
    const ls = await lichSuDoiTuong(q, "tai_lieu", aHung.id);
    expect(ls.map((d) => d.hanh_dong)).toEqual(["tai_len", "xoa"]);
    expect(ls[0].id).toBeLessThan(ls[1].id);
    expect(typeof ls[0].luc).toBe("string");
    expect(ls[1].hash_truoc).toMatch(/^[a-f0-9]{64}$/);
    expect((await docPhienBan(q, aHung.id)).noi_dung.toString()).toBe("Hung_BaoCao.docx");
    // dòng của đối tượng khác nhắc tới tài liệu này (vd sổ cái) cũng hiện trong dòng thời gian
    await tx((t) =>
      ghiLichSuChuan(t, { nguoi: "he-thong", doi_tuong_loai: "cong_viec", doi_tuong_id: "CV-2026-0412", hanh_dong: "vao_so_cai", chi_tiet: { tai_lieu_id: aHung.id, phien_ban: 1 } }),
    );
    expect((await lichSuDoiTuong(q, "tai_lieu", aHung.id)).map((d) => d.hanh_dong)).toEqual(["tai_len", "xoa", "vao_so_cai"]);
    expect((await lichSuDoiTuong(q, "cong_viec", "CV-2026-0412")).length).toBe(1);
  });

  it("nhân viên (của mình): dòng mình làm + đối tượng của mình", async () => {
    const q = await layQ();
    const hung = await nguoi("hung.tv@scigroup.vn");
    const ds = await timLichSu(q, hung, {});
    const dt = new Set(ds.map((d) => d.doi_tuong_id));
    expect(dt.has(aHung.id)).toBe(true);
    expect(ds.some((d) => d.hanh_dong === "xoa" && d.doi_tuong_id === aHung.id)).toBe(true); // trưởng xóa file của Hùng
    expect(dt.has(aTruongKtvh.id)).toBe(false);
    expect(dt.has(aNamXe.id)).toBe(false);
    expect(dt.has(aDtpc.id)).toBe(false);
  });

  it("trưởng đơn vị (đơn vị và cấp dưới): thấy P.KT&VH + NM Nậm Xe, không thấy P.ĐT&PC", async () => {
    const q = await layQ();
    const truong = await nguoi("truong.ktvh@scigroup.vn");
    const dt = new Set((await timLichSu(q, truong, {})).map((d) => d.doi_tuong_id));
    expect(dt.has(aHung.id)).toBe(true);
    expect(dt.has(aTruongKtvh.id)).toBe(true);
    expect(dt.has(aNamXe.id)).toBe(true);
    expect(dt.has(aDtpc.id)).toBe(false);
    // Giám đốc nhà máy chỉ thấy nhà máy
    const gd = await nguoi("gd.namxe@scigroup.vn");
    const dt2 = new Set((await timLichSu(q, gd, {})).map((d) => d.doi_tuong_id));
    expect(dt2.has(aNamXe.id)).toBe(true);
    expect(dt2.has(aTruongKtvh.id)).toBe(false);
  });

  it("lãnh đạo, quản trị thấy toàn bộ; không có quyền thì rỗng", async () => {
    const q = await layQ();
    for (const email of ["tgd@scigroup.vn", "quantri@scigroup.vn"]) {
      const dt = new Set((await timLichSu(q, await nguoi(email), {})).map((d) => d.doi_tuong_id));
      for (const a of [aHung, aTruongKtvh, aNamXe, aDtpc]) expect(dt.has(a.id)).toBe(true);
    }
    const hung = await nguoi("hung.tv@scigroup.vn");
    expect(await timLichSu(q, { ...hung, quyen: {} }, {})).toEqual([]);
  });

  it("bộ lọc: hành động, người (tên), từ khóa, loại, thời gian, giới hạn", async () => {
    const q = await layQ();
    const tgd = await nguoi("tgd@scigroup.vn");
    const xoa = await timLichSu(q, tgd, { hanh_dong: "xoa" });
    expect(xoa.map((d) => d.doi_tuong_id)).toEqual([aHung.id]);
    const theoTen = await timLichSu(q, tgd, { nguoi: "Mai Văn Sơn" });
    expect(theoTen.every((d) => d.nguoi === "gd.namxe@scigroup.vn")).toBe(true);
    expect(theoTen.length).toBeGreaterThan(0);
    const tuKhoa = await timLichSu(q, tgd, { tu_khoa: "dtpc_form1" });
    expect(tuKhoa.map((d) => d.doi_tuong_id)).toContain(aDtpc.id);
    expect((await timLichSu(q, tgd, { doi_tuong_loai: "cong_viec" })).every((d) => d.doi_tuong_loai === "cong_viec")).toBe(true);
    expect(await timLichSu(q, tgd, { tu: "2999-01-01" })).toEqual([]);
    expect((await timLichSu(q, tgd, { den: "2000-01-01" })).length).toBe(0);
    expect((await timLichSu(q, tgd, { gioi_han: 2 })).length).toBe(2);
    const moiNhat = await timLichSu(q, tgd, {});
    expect(moiNhat[0].id).toBeGreaterThan(moiNhat[moiNhat.length - 1].id);
  });

  it("tên dễ đọc + chuỗi băm nguyên vẹn; sửa lén là phát hiện", async () => {
    const q = await layQ();
    const ds = await timLichSu(q, await nguoi("tgd@scigroup.vn"), {});
    const ten = await tenChoLichSu(q, ds);
    expect(ten.nguoi["hung.tv@scigroup.vn"]).toBe("Trần Văn Hùng");
    expect(ten.doi_tuong[`tai_lieu:${aDtpc.id}`]).toBe("DTPC_Form1.docx");
    expect(await kiemTraChuoi(q)).toBeNull();
    expect(xepKhoaJsonb({ phien_ban: 1, a: { zz: 1, b: 2 }, ten: "x" })).toEqual({ a: { b: 2, zz: 1 }, ten: "x", phien_ban: 1 });
    expect(Object.keys(xepKhoaJsonb({ phien_ban: 1, a: 1, ten: "x" }))).toEqual(["a", "ten", "phien_ban"]);
  });
});
