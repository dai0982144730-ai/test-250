// CHUÔNG "8+5" (Mr. Đại chốt 29/09/2026): mở chuông thấy 10 tin, xem 2 → còn 8; không mở chuông, có thêm 5 tin →
// chuông hiện 8+5; mở ra thấy 5 tin có dấu ! (id > mốc cũ); đóng lại → mốc dời, 5 tin thành tin cũ chưa đọc (13).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { danhDauDaDoc, danhSachThongBao, demChuaDocMoi, demDaDocGanDay, moChuong, taoThongBao, xoaTinDaDocCu } from "@/lib/thong-bao";
import type { NguoiDungPhien } from "@/lib/types";

let nd: NguoiDungPhien;
const tao = (n: number, chu: string) =>
  tx(async (q) => {
    for (let i = 0; i < n; i++) await taoThongBao(q, { nguoi_nhan: nd.id, loai: "giao_viec", noi_dung: `${chu} ${i + 1}`, lien_ket: null });
  });

beforeAll(async () => {
  await csdlMoi();
  nd = await nguoi("nv.dtpc@scigroup.vn");
  await tx((q) => danhDauDaDoc(q, nd, "tat_ca"));
});

describe("chuông cũ + mới", () => {
  it("10 tin → mở chuông, xem 2 → 8 cũ; thêm 5 → 8+5; mở ra đúng 5 tin mới; đóng → 13 cũ + 0 mới", async () => {
    await tao(10, "lần 1");
    expect(await tx((q) => demChuaDocMoi(q, nd))).toEqual({ cu: 0, moi: 10 });
    await tx((q) => moChuong(q, nd));
    const ds = await tx((q) => danhSachThongBao(q, nd, { chua_doc: true, gioi_han: 200 }));
    await tx((q) => danhDauDaDoc(q, nd, ds.slice(0, 2).map((t) => t.id)));
    expect(await tx((q) => demChuaDocMoi(q, nd))).toEqual({ cu: 8, moi: 0 });

    await tao(5, "lần 2");
    expect(await tx((q) => demChuaDocMoi(q, nd))).toEqual({ cu: 8, moi: 5 });

    const mocCu = await tx((q) => moChuong(q, nd));
    const moi = (await tx((q) => danhSachThongBao(q, nd, { chua_doc: true, gioi_han: 200 }))).filter((t) => t.id > mocCu);
    expect(moi.map((t) => t.noi_dung).sort()).toEqual(["lần 2 1", "lần 2 2", "lần 2 3", "lần 2 4", "lần 2 5"]);
    expect(await tx((q) => demChuaDocMoi(q, nd))).toEqual({ cu: 13, moi: 0 });
  });
});

// TIN ĐÃ ĐỌC RỜI CHUÔNG (Mr. Đại chốt 10/10/2026, db/87): đọc rồi không còn trong danh sách chuông; "Xem tin đã đọc" thấy lại
// trong 7 ngày kể từ lúc đọc; quá 7 ngày lưới hằng ngày xoá hẳn.
describe("tin đã đọc — rời chuông, xem lại 7 ngày, rồi xoá", () => {
  it("đọc → rời danh sách chưa đọc, có trong 'đã đọc gần đây' (ghi giờ đọc); quá 7 ngày → xoá hẳn, tin chưa đọc không đụng", async () => {
    await tx((q) => danhDauDaDoc(q, nd, "tat_ca"));
    await tao(3, "đọc thử");
    const ds = await tx((q) => danhSachThongBao(q, nd, { chua_doc: true, gioi_han: 200 }));
    const doc = ds.filter((t) => t.noi_dung.startsWith("đọc thử")).slice(0, 2);
    await tx((q) => danhDauDaDoc(q, nd, doc.map((t) => t.id)));
    const conLai = await tx((q) => danhSachThongBao(q, nd, { chua_doc: true, gioi_han: 200 }));
    expect(conLai.map((t) => t.noi_dung)).toEqual(["đọc thử 1"]) // danh sách xếp mới nhất trước → đọc 2 tin đầu (3, 2) còn lại tin 1;
    const daDoc = await tx((q) => danhSachThongBao(q, nd, { da_doc_gan_day: true, gioi_han: 200 }));
    expect(daDoc.map((t) => t.id)).toEqual(expect.arrayContaining(doc.map((t) => t.id)));
    expect(await tx((q) => demDaDocGanDay(q, nd))).toBeGreaterThanOrEqual(2);
    // Lùi giờ đọc 8 ngày → lưới xoá; tin chưa đọc giữ nguyên
    await tx((q) => q.query("UPDATE docflow.thong_bao SET doc_luc = now() - interval '8 days' WHERE id = ANY($1::bigint[])", [doc.map((t) => t.id)]));
    expect(await tx((q) => xoaTinDaDocCu(q))).toBeGreaterThanOrEqual(2);
    expect((await tx((q) => danhSachThongBao(q, nd, { da_doc_gan_day: true, gioi_han: 200 }))).some((t) => doc.some((d) => d.id === t.id))).toBe(false);
    expect((await tx((q) => danhSachThongBao(q, nd, { chua_doc: true, gioi_han: 200 }))).map((t) => t.noi_dung)).toEqual(["đọc thử 1"]) // danh sách xếp mới nhất trước → đọc 2 tin đầu (3, 2) còn lại tin 1;
  });
});
