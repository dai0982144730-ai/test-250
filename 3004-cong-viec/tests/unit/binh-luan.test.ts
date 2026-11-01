// Bình luận việc + @ (giao diện căn phòng Đợt 2, 28/09/2026): người nhận tin = người làm (trưởng đơn vị phụ trách) +
// người giao + người đã bình luận + người được @ (trừ người viết); @ phải còn "@Tên" trong nội dung mới báo.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { danhSachBinhLuan, nguoiNhanCoBan, vietBinhLuan } from "@/lib/phong/binh-luan";

let q: Q;
let ma: string;
const tin = async (loai?: string) =>
  (await q.query<{ nguoi_nhan: string; loai: string; noi_dung: string; lien_ket: string }>(
    `SELECT nguoi_nhan, loai, noi_dung, lien_ket FROM docflow.thong_bao WHERE loai IN ('binh_luan','duoc_nhac') ${loai ? "AND loai = $1" : ""} ORDER BY id`,
    loai ? [loai] : [],
  )).rows;

beforeAll(async () => {
  await csdlMoi();
  q = await layQ();
  // Bài này đo AI ĐƯỢC BÁO; phạm vi "Tag tên" (nhân viên mặc định chỉ tag đơn vị mình + cấp dưới) đo ở tag-ten.test.ts
  await q.query("UPDATE identity.quyen_vai_tro SET pham_vi = 'toan_bo' WHERE vai_tro_id = 'nhan-vien' AND quyen = 'cong_viec.tag_ten'");
  const qt = await nguoi("quantri@scigroup.vn");
  ma = await tx((t) =>
    giaoViec(t, qt, { ten: "Thay van xả cống số 2 Ca Nan 1", ket_thuc: "2099-10-15", phan_viec: [{ loai: "don_vi", id: "p-ktvh", ten: "Phòng Kinh tế và Vận hành" }] }),
  );
});

describe("bình luận việc", () => {
  it("chưa ai bình luận: sẽ báo trưởng đơn vị phụ trách (người làm) + người giao", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    const m = await nguoiNhanCoBan(q, ma, hung.id);
    expect(m.get("truong.ktvh@scigroup.vn")).toEqual(["người làm"]);
    expect(m.get("quantri@scigroup.vn")).toEqual(["người giao"]);
    expect(m.has(hung.id)).toBe(false); // người viết không tự báo mình
  });

  it("viết có @: báo người làm + người giao + người được @; tin ghi mã + tên việc (luật 30), link về việc", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    const r = await tx((t) =>
      vietBinhLuan(t, hung, ma, { noi_dung: "@Lê Minh Tuấn anh xem giúp báo giá van nhé", nhac: ["truong.dtpc@scigroup.vn"] }),
    );
    expect(Object.fromEntries(r.da_bao.map((x) => [x.id, x.ly]))).toEqual({
      "truong.ktvh@scigroup.vn": ["người làm"],
      "quantri@scigroup.vn": ["người giao"],
      "truong.dtpc@scigroup.vn": ["được @"],
    });
    const ds = await tin();
    expect(ds).toHaveLength(3);
    expect(ds.find((x) => x.nguoi_nhan === "truong.dtpc@scigroup.vn")!.loai).toBe("duoc_nhac");
    expect(ds[0].noi_dung).toMatch(new RegExp(`bình luận ở ${ma} Thay van xả cống số 2 Ca Nan 1: “@Lê Minh Tuấn anh xem giúp báo giá van nhé” · bạn là`));
    expect(ds[0].lien_ket).toBe(`/cong-viec/${ma}`);
    const bl = await danhSachBinhLuan(q, ma);
    expect(bl).toHaveLength(1);
    expect(bl[0].nhac).toEqual([{ id: "truong.dtpc@scigroup.vn", ten: "Lê Minh Tuấn" }]);
  });

  it("người đã bình luận được báo ở lần sau; chọn @ rồi xoá chữ @ thì không báo người đó", async () => {
    const truong = await nguoi("truong.ktvh@scigroup.vn");
    const r = await tx((t) => vietBinhLuan(t, truong, ma, { noi_dung: "Phòng đã có 2 báo giá, trình trong tuần 40", nhac: ["truong.dtpc@scigroup.vn"] }));
    const ly = Object.fromEntries(r.da_bao.map((x) => [x.id, x.ly]));
    expect(ly["hung.tv@scigroup.vn"]).toEqual(["đã bình luận"]);
    expect(ly["quantri@scigroup.vn"]).toEqual(["người giao"]);
    expect(ly["truong.ktvh@scigroup.vn"]).toBeUndefined();
    expect(ly["truong.dtpc@scigroup.vn"]).toBeUndefined();
  });

  it("nội dung trống bị chặn; việc không có → 404", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    await expect(tx((t) => vietBinhLuan(t, hung, ma, { noi_dung: "   " }))).rejects.toMatchObject({ status: 400 });
    await expect(tx((t) => vietBinhLuan(t, hung, "CV-KHONG-CO", { noi_dung: "x" }))).rejects.toMatchObject({ status: 404 });
  });
});
