// Góp ý, phản ánh (Mr. Đại chốt 01/10/2026): ai cũng gửi + xem tất cả; quản trị đặt trạng thái + trả lời → chuông người góp ý.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { anhGopY, danhSachGopY, guiGopY, traLoiGopY, xoaGopY } from "@/lib/gop-y/dich-vu";
import { khoTam } from "../fixtures/chuan-bi";

let q: Q;
// ảnh PNG 1×1 điểm
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

describe("Góp ý, phản ánh", () => {
  it("gửi kèm ảnh → ai cũng thấy; quản trị nhận chuông; quản trị trả lời → người gửi nhận chuông", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    const qt = await nguoi("quantri@scigroup.vn");
    const { id } = await tx((x) => guiGopY(x, hung, { tieu_de: "Số việc trên ô không khớp", noi_dung: "Ô Phòng TCKT ghi 5, danh sách có 4", trang: "/so-do", anh: [{ ten: "a.png", loai: "image/png", noi_dung: PNG }] }));
    expect(id).toMatch(/^GY-\d{4}$/);
    const ds = await danhSachGopY(q);
    const g = ds.find((x) => x.id === id)!;
    expect(g.trang_thai).toBe("moi");
    expect(g.anh).toHaveLength(1);
    expect(g.ten_nguoi).toBe(hung.ten);
    expect((await anhGopY(q, id, 0))?.loai).toBe("image/png");
    const tbQt = await q.query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = 'quan-tri' AND lien_ket = $1", [`/gop-y?id=${id}`]);
    expect(tbQt.rows.length).toBe(1);

    await expect(tx((x) => traLoiGopY(x, hung, id, { trang_thai: "da_sua" }))).rejects.toMatchObject({ status: 403 });
    await tx((x) => traLoiGopY(x, qt, id, { trang_thai: "da_tiep_nhan", tra_loi: "Đã ghi nhận, sẽ sửa tuần sau" }));
    const { rows } = await q.query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND lien_ket = $2", [hung.id, `/gop-y?id=${id}`]);
    expect(rows[0]?.noi_dung).toContain("Đã tiếp nhận — Đã ghi nhận, sẽ sửa tuần sau");
    expect((await danhSachGopY(q)).find((x) => x.id === id)?.tra_loi).toBe("Đã ghi nhận, sẽ sửa tuần sau");

    // đã tiếp nhận → người gửi không xoá được nữa; quản trị xoá được
    await expect(tx((x) => xoaGopY(x, hung, id))).rejects.toMatchObject({ status: 403 });
    await tx((x) => xoaGopY(x, qt, id));
    expect((await danhSachGopY(q)).some((x) => x.id === id)).toBe(false);
  });

  it("chặn: thiếu tên, file không phải ảnh", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    await expect(tx((x) => guiGopY(x, hung, { tieu_de: "  ", noi_dung: "", anh: [] }))).rejects.toMatchObject({ status: 400 });
    await expect(tx((x) => guiGopY(x, hung, { tieu_de: "x", noi_dung: "", anh: [{ ten: "a.exe", loai: "application/octet-stream", noi_dung: PNG }] }))).rejects.toMatchObject({ status: 400 });
  });
});
