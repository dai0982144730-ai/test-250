// Dòng người nộp đã BỎ ở bước Duyệt việc (db/71 viec_bi_bo) — Rà soát tự bổ sung ghi lại CẢ bản báo cáo (ra-soat.ts) không được tạo
// lại thành việc: máy không đè lựa chọn của người (Mr. Đại duyệt 18/10/2026). Đo trước khi sửa: dòng đã Bỏ thành 1 việc đang mở.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec } from "@/lib/types";
import { ghiVaoSoCai, xemTruocVaoSoCai } from "@/lib/so-cai/dich-vu";

const BQ = { loai: "don_vi" as const, id: "bqlda-qt", ten: "BQLDA Quảng Trị" };
const d1: DongCongViec = { ten: "Việc giữ lại khi nộp", phu_trach: [BQ], nguon_bang: "bang_cong_viec", dong_so: 1, ket_thuc: "2026-11-30" };
const d2: DongCongViec = { ten: "Việc người nộp đã bỏ ở bước Duyệt", phu_trach: [BQ], nguon_bang: "bang_cong_viec", dong_so: 2, ket_thuc: "2026-11-30" };
const d3: DongCongViec = { ten: "Lắp biển cảnh báo khu vực nổ mìn", phu_trach: [BQ], nguon_bang: "bang_cong_viec", dong_so: 3, ket_thuc: "2026-10-09", da_xong: true };
const dv = (tl: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai => ({
  tai_lieu_id: tl,
  phien_ban: 1,
  mau_ma: "form-7",
  nhan: "BQLDA Quảng Trị · Form 7 · tuần 42",
  don_vi_id: "bqlda-qt",
  cap: 3,
  nguoi_gui: "gd.bqlda@scigroup.vn",
  ky_bao_cao_den: "2026-10-18",
  ngay_gui: "2026-10-13T02:00:00Z",
  cong_viec: cv,
  ...extra,
});
const soViec = async (ten: string) => (await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.cong_viec WHERE ten = $1", [ten])).rows[0].n;

describe("Rà soát ghi lại cả bản: giữ dòng người nộp đã Bỏ / chọn Không vào sổ", () => {
  beforeAll(async () => {
    await csdlMoi();
    await query("INSERT INTO docflow.tai_lieu (id, ten, mau_ma, don_vi_lap, nguoi_tao, trang_thai) VALUES ('tl-x', 'x.docx', 'form-7', 'bqlda-qt', 'gd.bqlda@scigroup.vn', 'da_gui')");
    // Lúc gửi (gui/dich-vu.ts vaoSoCai): dòng 2 bị Bỏ → viec_bi_bo, rút khỏi danh sách; dòng 3 (đã xong) người nộp chọn "Không vào sổ"
    await query("INSERT INTO docflow.viec_bi_bo (tai_lieu_id, phien_ban, nguon_bang, dong_so, y_so, ten, nguoi) VALUES ('tl-x', 1, 'bang_cong_viec', 2, 1, $1, 'gd.bqlda@scigroup.vn')", [d2.ten]);
    await tx((q) => ghiVaoSoCai(q, dv("tl-x", [d1, d3], { xac_nhan_trung: { 1: "khong" } })));
  });

  it("đúng ca đã đo: Rà soát bổ sung ghi lại [dòng 1, dòng 2] → dòng 2 KHÔNG thành việc (trước khi sửa: 1 việc đang mở)", async () => {
    const kq = await tx((q) => ghiVaoSoCai(q, dv("tl-x", [d1, d2, d3])));
    expect(kq.map((k) => k.hanh_dong)).toEqual(["khong_dung", "khong_dung", "khong_dung"]);
    expect(kq[0].ly_do).toBe("dòng này đã vào sổ cái trước đó");
    expect(kq[1].ly_do).toMatch(/bỏ dòng này ở bước Duyệt/);
    expect(kq[2].ly_do).toMatch(/đã quyết không vào sổ từ trước/);
    expect(await soViec(d2.ten)).toBe(0);
    expect(await soViec(d3.ten)).toBe(0); // lần nạp đầu cũng không đè lựa chọn "Không vào sổ"
    expect(await soViec(d1.ten)).toBe(1);
  });

  it("xem trước của bản đã gửi cũng nói đúng", async () => {
    const xem = await tx((q) => xemTruocVaoSoCai(q, dv("tl-x", [d2])));
    expect(xem[0]).toMatchObject({ hanh_dong: "khong_dung" });
    expect(xem[0].ly_do).toMatch(/bỏ dòng này/);
  });

  it("bản 2 gửi lại (phiên bản khác) thì dòng đó được xét lại như thường — quyết định Bỏ chỉ của bản 1", async () => {
    const kq = await tx((q) => ghiVaoSoCai(q, { ...dv("tl-x", [d2]), phien_ban: 2 }));
    expect(kq[0].hanh_dong).toBe("tao_moi");
    expect(await soViec(d2.ten)).toBe(1);
  });
});
