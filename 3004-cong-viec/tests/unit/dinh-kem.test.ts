// TỆP ĐÍNH KÈM VIỆC (Mr. Đại chốt 29/09/2026): kẹp file khi giao việc / báo xong / bình luận; chuông kèm file;
// bật tắt + 50 MB + 20 file + lưu 6 tháng theo Cài đặt; kho riêng (trợ lý AI không đọc).
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { datCauHinh } from "../fixtures/chuan-bi";
import { layQ, tx } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { giaoViec, ketThucPhanViec } from "@/lib/so-cai/dich-vu";
import { vietBinhLuan, danhSachBinhLuan } from "@/lib/phong/binh-luan";
import { dinhKemCuaViec, docNoiDungDinhKem, donDinhKem, donViecHetHan, taiLenDinhKem } from "@/lib/dinh-kem/kho";
import type { NguoiDungPhien } from "@/lib/types";

const DV = (id: string, ten: string) => ({ loai: "don_vi" as const, id, ten });
const pdf = (n = 10) => ({ ten: "biên bản nghiệm thu.pdf", mime: "application/pdf", buf: Buffer.alloc(n, 1) });
let tgd: NguoiDungPhien;
let gdEnc: NguoiDungPhien;

beforeAll(async () => {
  process.env.DOCFLOW_DINH_KEM_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-dinh-kem-"));
  await csdlMoi();
  // Tệp này dùng SCI PMC / SCI E&C làm đơn vị cấp dưới mẫu; luật "ngoài SCI" (db/85, chốt 10/10) kiểm riêng ở giao-nhan-vien.test.ts
  await (await layQ()).query("UPDATE identity.don_vi SET ngoai_sci = false WHERE id IN ('sci-pmc', 'sci-enc')");
  tgd = await nguoi("tgd@scigroup.vn");
  gdEnc = await nguoi("gd.enc@scigroup.vn");
});

describe("kẹp file", () => {
  it("giao việc kèm 2 file → file gắn vào việc, tin chuông của người nhận có 2 file", async () => {
    const a = await tx((q) => taiLenDinhKem(q, tgd, "giao_viec", pdf()));
    const b = await tx((q) => taiLenDinhKem(q, tgd, "giao_viec", { ten: "dự toán.xlsx", mime: "", buf: Buffer.from("x") }));
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test giao kèm file", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")], dinh_kem: [a.id, b.id] }));
    const q = await layQ();
    expect((await dinhKemCuaViec(q, ma)).map((t) => t.noi)).toEqual(["giao_viec", "giao_viec"]);
    const tb = (await q.query<{ tep: { id: string; ten: string }[]; noi_dung: string }>("SELECT tep, noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND loai = 'giao_viec' ORDER BY id DESC LIMIT 1", [gdEnc.id])).rows[0];
    expect(tb.tep.map((t) => t.ten)).toEqual(["biên bản nghiệm thu.pdf", "dự toán.xlsx"]);
    expect(tb.noi_dung).toContain("kèm 2 file");
    expect(docNoiDungDinhKem(a.id).length).toBe(10);
    // Gắn lại lần hai (file đã gắn) → báo lỗi, không gắn nhầm việc khác
    await expect(tx((t) => giaoViec(t, tgd, { ten: "test gắn lại", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")], dinh_kem: [a.id] }))).rejects.toThrow(/không còn/);
  });

  it("báo xong kèm file → người giao nhận tin kèm file; bình luận kèm file (không cần chữ) → người nhận tin có file", async () => {
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "test báo xong", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    const q = await layQ();
    const bl = await tx((t) => taiLenDinhKem(t, gdEnc, "binh_luan", pdf(5)));
    const r = await tx((t) => vietBinhLuan(t, gdEnc, ma, { noi_dung: "", dinh_kem: [bl.id] }));
    expect(r.da_bao.map((x) => x.id)).toContain(tgd.id);
    expect((await danhSachBinhLuan(q, ma)).at(-1)!.tep.map((t) => t.id)).toEqual([bl.id]);
    const pv = (await q.query<{ id: string }>("SELECT id FROM docflow.phan_viec WHERE cong_viec_id = $1", [ma])).rows[0].id;
    const x = await tx((t) => taiLenDinhKem(t, gdEnc, "bao_xong", pdf(7)));
    await tx((t) => ketThucPhanViec(t, gdEnc, pv, { ghi_chu: "Đã lắp xong", dinh_kem: [x.id] }));
    // Phần cuối xong → người giao nhận MỘT tin "hoàn thành" mang lời báo xong + file (chốt 02/10 — trước: 2 tin)
    const tin = (await q.query<{ loai: string; tep: { id: string }[]; noi_dung: string }>("SELECT loai, tep, noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND lien_ket = $2 AND loai IN ('ket_thuc_phan_viec', 'cong_viec_hoan_thanh')", [tgd.id, `/cong-viec/${ma}`])).rows;
    expect(tin.map((t) => t.loai)).toEqual(["cong_viec_hoan_thanh"]);
    expect(tin[0].tep.map((t) => t.id)).toEqual([x.id]);
    expect(tin[0].noi_dung).toContain("Đã lắp xong");
  });

  it("Cài đặt: tắt kẹp file ở bình luận → chặn; vượt dung lượng → chặn; quá số file → chặn", async () => {
    const q = await layQ();
    await datCauHinh(q, "dinh_kem", { ...MAC_DINH.dinh_kem, binh_luan: false, toi_da_mb: 1, so_file_toi_da: 2 });
    try {
      await expect(tx((t) => taiLenDinhKem(t, tgd, "binh_luan", pdf()))).rejects.toThrow(/đang tắt/);
      await expect(tx((t) => taiLenDinhKem(t, tgd, "giao_viec", pdf(2 * 1024 * 1024)))).rejects.toThrow(/vượt 1 MB/);
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) ids.push((await tx((t) => taiLenDinhKem(t, tgd, "giao_viec", pdf()))).id);
      await expect(tx((t) => giaoViec(t, tgd, { ten: "test quá số file", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")], dinh_kem: ids }))).rejects.toThrow(/tối đa 2 file/);
    } finally {
      await datCauHinh(q, "dinh_kem", MAC_DINH.dinh_kem);
    }
  });

  it("hết hạn lưu (6 tháng) → xóa nội dung, giữ tên; file tải lên bỏ dở quá 1 ngày → dọn", async () => {
    const q = await layQ();
    const a = await tx((t) => taiLenDinhKem(t, tgd, "giao_viec", pdf()));
    const ma = await tx((t) => giaoViec(t, tgd, { ten: "test hết hạn", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")], dinh_kem: [a.id] }));
    const boDo = await tx((t) => taiLenDinhKem(t, tgd, "giao_viec", pdf()));
    const sau7Thang = new Date(Date.now() + 7 * 31 * 24 * 3600 * 1000);
    const kq = await tx((t) => donDinhKem(t, sau7Thang));
    expect(kq.het_han).toBeGreaterThanOrEqual(1);
    expect(kq.bo_do).toBeGreaterThanOrEqual(1);
    const con = (await dinhKemCuaViec(q, ma)).find((t) => t.id === a.id)!;
    expect(con.ten_tep).toBe("biên bản nghiệm thu.pdf");
    expect(con.xoa_luc).toBeTruthy();
    expect(() => docNoiDungDinhKem(a.id)).toThrow(/đã bị xóa/);
    expect((await q.query("SELECT 1 FROM docflow.tep_dinh_kem WHERE id = $1", [boDo.id])).rows).toHaveLength(0);
  });

  it("việc đã xong quá cùng thời hạn lưu (chốt 30/09) → xóa hẳn việc + file + bình luận; việc đang mở và việc làm mốc chưa tính thì giữ", async () => {
    const q = await layQ();
    const a = await tx((t) => taiLenDinhKem(t, tgd, "giao_viec", pdf()));
    const xong = await tx((t) => giaoViec(t, tgd, { ten: "test xong lâu", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")], dinh_kem: [a.id] }));
    await tx((t) => vietBinhLuan(t, tgd, xong, { noi_dung: "test bình luận" }));
    const moc = await tx((t) => giaoViec(t, tgd, { ten: "test mốc", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    const cho = await tx((t) => giaoViec(t, tgd, { ten: "test chờ mốc", ket_thuc: "2099-12-31", phan_viec: [DV("sci-enc", "SCI E&C")] }));
    await q.query("INSERT INTO docflow.phu_thuoc_viec (id, cong_viec_id, loai, viec_truoc_id, ten) VALUES ('ptv-test', $1, 'bat_dau', $2, 'test mốc')", [cho, moc]);
    await q.query("UPDATE docflow.cong_viec SET trang_thai = 'hoan_thanh', dong_luc = now() WHERE id = ANY($1::text[])", [[xong, moc]]);
    // Chưa tới hạn: không xóa gì
    expect((await tx((t) => donViecHetHan(t))).ma).not.toContain(xong);
    const sau7Thang = new Date(Date.now() + 7 * 31 * 24 * 3600 * 1000);
    const kq = await tx((t) => donViecHetHan(t, sau7Thang));
    expect(kq.ma).toContain(xong);
    expect(kq.ma).not.toContain(moc); // việc "test chờ mốc" còn mở, chưa tính ngày theo mốc
    expect(kq.ma).not.toContain(cho); // đang mở
    expect((await q.query("SELECT 1 FROM docflow.cong_viec WHERE id = $1", [xong])).rows).toHaveLength(0);
    expect((await q.query("SELECT 1 FROM docflow.binh_luan WHERE cong_viec_id = $1", [xong])).rows).toHaveLength(0);
    expect((await q.query("SELECT 1 FROM docflow.tep_dinh_kem WHERE id = $1", [a.id])).rows).toHaveLength(0);
    expect(fs.existsSync(path.join(process.env.DOCFLOW_DINH_KEM_DIR!, a.id))).toBe(false);
    // Sổ lịch sử giữ nguyên
    expect((await q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = $1", [xong])).rows.length).toBeGreaterThan(0);
  });

  it("kho riêng: file không nằm trong kho tài liệu mà công cụ AI đọc (không có bản ghi tai_lieu)", async () => {
    const a = await tx((t) => taiLenDinhKem(t, tgd, "giao_viec", pdf()));
    expect(fs.existsSync(path.join(process.env.DOCFLOW_DINH_KEM_DIR!, a.id))).toBe(true);
    const q = await layQ();
    expect((await q.query("SELECT 1 FROM docflow.tai_lieu WHERE id = $1", [a.id])).rows).toHaveLength(0);
  });
});
