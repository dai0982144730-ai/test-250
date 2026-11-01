// CHUÔNG TỰ GỌN THEO LOGIC + BẢN NỘP CŨ 90 NGÀY (Mr. Đại duyệt bảng B 08/10/2026) — CSDL bộ nhớ tạm, kho tệp thư mục tạm.
//   3a gộp chuông nhắc của máy · 3b việc xong tắt chuông vô nghĩa, giữ tin kết quả · 3c mở thẻ chỉ tắt chuông của người mở ·
//   3d xoá việc hết hạn lưu → xoá chuông, sổ lịch sử giữ · lưới hằng ngày · mục 2 bản nộp đè quá 90 ngày xoá file, bản cuối giữ.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { docChuongCuaViec, donChuongTonDong, taoThongBao } from "@/lib/thong-bao";
import { giaoViec, ketThucPhanViec } from "@/lib/so-cai/dich-vu";
import { vietBinhLuan } from "@/lib/phong/binh-luan";
import { donViecHetHan } from "@/lib/dinh-kem/kho";
import { docPhienBan, taoTaiLieu, themPhienBan, thuMucCuaDonVi } from "@/lib/thu-muc/dich-vu";
import { donBanNopCu } from "@/lib/thu-muc/ban-nop-cu";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
let tgd: NguoiDungPhien;
let gdEnc: NguoiDungPhien;

const chuong = async (q: Q, nguoiId: string, lienKet: string) =>
  (
    await q.query<{ loai: string; da_doc: boolean; noi_dung: string }>(
      "SELECT loai, da_doc, noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND lien_ket = $2 ORDER BY id",
      [nguoiId, lienKet],
    )
  ).rows;

beforeAll(async () => {
  process.env.DOCFLOW_FILES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-chuong-gon-"));
  process.env.DOCFLOW_DINH_KEM_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-chuong-gon-dk-"));
  await csdlMoi();
  // Tệp này dùng SCI PMC / SCI E&C làm đơn vị cấp dưới mẫu; luật "ngoài SCI" (db/85, chốt 10/10) kiểm riêng ở giao-nhan-vien.test.ts
  await (await layQ()).query("UPDATE identity.don_vi SET ngoai_sci = false WHERE id IN ('sci-pmc', 'sci-enc')");
  tgd = await nguoi("tgd@scigroup.vn");
  gdEnc = await nguoi("gd.enc@scigroup.vn");
});

describe("3a — gộp chuông nhắc của máy", () => {
  it("nhắc quá hạn 5 lần cùng việc → còn 1 dòng chưa đọc, nội dung lần mới nhất; đã đọc rồi nhắc tiếp → có dòng mới", async () => {
    const lk = "/cong-viec/CV-TEST-GOP";
    await tx(async (q) => {
      for (let i = 1; i <= 5; i++) await taoThongBao(q, { nguoi_nhan: gdEnc.id, loai: "qua_han", noi_dung: `trễ ${i} ngày`, lien_ket: lk });
    });
    const q = await layQ();
    expect(await chuong(q, gdEnc.id, lk)).toEqual([{ loai: "qua_han", da_doc: false, noi_dung: "trễ 5 ngày" }]);
    await q.query("UPDATE docflow.thong_bao SET da_doc = true WHERE lien_ket = $1", [lk]);
    await tx((t) => taoThongBao(t, { nguoi_nhan: gdEnc.id, loai: "qua_han", noi_dung: "trễ 6 ngày", lien_ket: lk }));
    expect((await chuong(q, gdEnc.id, lk)).map((c) => [c.noi_dung, c.da_doc])).toEqual([
      ["trễ 5 ngày", true],
      ["trễ 6 ngày", false],
    ]);
  });

  it("nhắc của NGƯỜI (nhac_viec) không gộp — mỗi lời nhắc giữ nguyên", async () => {
    const lk = "/cong-viec/CV-TEST-NGUOI-NHAC";
    await tx(async (q) => {
      await taoThongBao(q, { nguoi_nhan: gdEnc.id, loai: "nhac_viec", noi_dung: "nhắc lần 1", lien_ket: lk });
      await taoThongBao(q, { nguoi_nhan: gdEnc.id, loai: "nhac_viec", noi_dung: "nhắc lần 2", lien_ket: lk });
    });
    expect(await chuong(await layQ(), gdEnc.id, lk)).toHaveLength(2);
  });
});

describe("3b · 3c — việc xong và mở thẻ", () => {
  it("báo xong → chuông giao việc / bình luận / quá hạn của việc thành đã đọc cho mọi người; tin 'hoàn thành' tới người giao vẫn chưa đọc", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test chuông khi xong", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    const lk = `/cong-viec/${ma}`;
    await tx((t) => vietBinhLuan(t, gdEnc, ma, { noi_dung: "test bình luận" }));
    await tx((t) => taoThongBao(t, { nguoi_nhan: tgd.id, loai: "qua_han", noi_dung: "test quá hạn", lien_ket: lk }));
    const q = await layQ();
    expect((await chuong(q, gdEnc.id, lk)).some((c) => c.loai === "giao_viec" && !c.da_doc)).toBe(true);
    expect((await chuong(q, tgd.id, lk)).filter((c) => !c.da_doc).map((c) => c.loai).sort()).toEqual(["binh_luan", "qua_han"]);

    const pv = (await q.query<{ id: string }>("SELECT id FROM docflow.phan_viec WHERE cong_viec_id = $1", [ma])).rows[0].id;
    await tx((t) => ketThucPhanViec(t, gdEnc, pv, { ghi_chu: "test đã xong" }));

    expect((await chuong(q, gdEnc.id, lk)).filter((c) => !c.da_doc)).toEqual([]);
    expect((await chuong(q, tgd.id, lk)).filter((c) => !c.da_doc).map((c) => c.loai)).toEqual(["cong_viec_hoan_thanh"]);
  });

  it("mở thẻ việc → chỉ chuông của người mở thành đã đọc, người khác giữ nguyên", async () => {
    const lk = "/cong-viec/CV-TEST-MO-THE";
    await tx(async (q) => {
      await taoThongBao(q, { nguoi_nhan: tgd.id, loai: "binh_luan", noi_dung: "test A", lien_ket: lk });
      await taoThongBao(q, { nguoi_nhan: gdEnc.id, loai: "binh_luan", noi_dung: "test B", lien_ket: lk });
    });
    expect(await tx((q) => docChuongCuaViec(q, tgd.id, "CV-TEST-MO-THE"))).toBe(1);
    const q = await layQ();
    expect((await chuong(q, tgd.id, lk))[0].da_doc).toBe(true);
    expect((await chuong(q, gdEnc.id, lk))[0].da_doc).toBe(false);
  });
});

describe("3d + lưới hằng ngày", () => {
  it("việc hết hạn lưu bị xoá → chuông của việc mất, chuông việc khác còn, sổ lịch sử giữ", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test xoá chuông", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    const q = await layQ();
    await q.query("UPDATE docflow.cong_viec SET trang_thai = 'hoan_thanh', dong_luc = now() WHERE id = $1", [ma]);
    expect((await chuong(q, gdEnc.id, `/cong-viec/${ma}`)).length).toBeGreaterThan(0);
    const kq = await tx((t) => donViecHetHan(t, new Date(Date.now() + 7 * 31 * 864e5)));
    expect(kq.ma).toContain(ma);
    expect(await chuong(q, gdEnc.id, `/cong-viec/${ma}`)).toEqual([]);
    expect((await chuong(q, gdEnc.id, "/cong-viec/CV-TEST-MO-THE")).length).toBe(1);
    expect((await q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = $1", [ma])).rows.length).toBeGreaterThan(0);
  });

  it("chuông tồn từ trước (chèn thẳng) → lưới gộp nhắc trùng, tắt chuông của việc đã xong; tin kết quả không đụng", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test lưới", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    const lk = `/cong-viec/${ma}`;
    const q = await layQ();
    for (const nd of ["trễ 1", "trễ 2", "trễ 3"])
      await q.query("INSERT INTO docflow.thong_bao (nguoi_nhan, loai, noi_dung, lien_ket) VALUES ($1, 'qua_han', $2, $3)", [gdEnc.id, nd, lk]);
    await q.query("INSERT INTO docflow.thong_bao (nguoi_nhan, loai, noi_dung, lien_ket) VALUES ($1, 'cong_viec_hoan_thanh', 'test xong', $2)", [tgd.id, lk]);
    const r1 = await tx((t) => donChuongTonDong(t));
    expect(r1.gop).toBe(2);
    expect((await chuong(q, gdEnc.id, lk)).filter((c) => c.loai === "qua_han").map((c) => c.noi_dung)).toEqual(["trễ 3"]);
    await q.query("UPDATE docflow.cong_viec SET trang_thai = 'hoan_thanh', dong_luc = now() WHERE id = $1", [ma]);
    await tx((t) => donChuongTonDong(t));
    expect((await chuong(q, gdEnc.id, lk)).filter((c) => !c.da_doc)).toEqual([]);
    expect((await chuong(q, tgd.id, lk)).find((c) => c.loai === "cong_viec_hoan_thanh")?.da_doc).toBe(false);
  });
});

describe("mục 2 — bản nộp cũ quá 90 ngày", () => {
  it("bản bị nộp đè quá 90 ngày → file xoá, mở báo 410 tiếng Việt; bản cuối vẫn mở; file trùng nội dung với bản còn giữ thì không xoá", async () => {
    const q = await layQ();
    const tm = await thuMucCuaDonVi(q, "sci-enc", "di");
    const tep = (chu: string) => ({ ten_tep: "test báo cáo.docx", mime: "application/octet-stream", noi_dung: Buffer.from(chu, "utf8") });
    const { tai_lieu_id: id } = await tx((t) => taoTaiLieu(t, { ten: "test báo cáo", nguoi: gdEnc.id, don_vi_lap: "sci-enc", thu_muc_id: tm, tep: tep("bản 1") }));
    await tx((t) => themPhienBan(t, id, { nguoi: gdEnc.id, tep: tep("bản 2") }));
    await tx((t) => themPhienBan(t, id, { nguoi: gdEnc.id, tep: tep("bản 1") })); // bản 3 trùng nội dung bản 1
    await tx((t) => themPhienBan(t, id, { nguoi: gdEnc.id, tep: tep("bản 4 cuối") }));

    // Chưa đủ 90 ngày: không xoá gì
    expect((await tx((t) => donBanNopCu(t))).so_ban).toBe(0);

    const kq = await tx((t) => donBanNopCu(t, new Date(Date.now() + 91 * 864e5)));
    expect(kq.so_ban).toBe(3); // bản 1, 2, 3
    expect(kq.so_tep_xoa).toBe(2); // "bản 1" (bản 1 + bản 3 cùng một file) và "bản 2"
    await expect(docPhienBan(q, id, 2)).rejects.toMatchObject({ status: 410, message: expect.stringContaining("nộp đè quá 90 ngày") });
    expect((await docPhienBan(q, id)).noi_dung.toString("utf8")).toBe("bản 4 cuối");
    // Chạy lại không xoá thêm
    expect((await tx((t) => donBanNopCu(t, new Date(Date.now() + 91 * 864e5)))).so_ban).toBe(0);
  });
});
