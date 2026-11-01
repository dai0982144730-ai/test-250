// Đóng dấu báo cáo theo MẪU (Mr. Đại chốt 28/09, cách ①): anh Thanh — chính P.ĐT&PC, kiêm Trợ lý CT — nộp Form 1 thì là
// báo cáo P.ĐT&PC, nộp Form 0 thì là báo cáo Trợ lý CT (không đè nhau); sơ đồ hiện báo cáo chức danh ở ô Ban lãnh đạo.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, tep, viDu } from "../fixtures/chuan-bi";
import { layQ, tx } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { duLieuSoDo } from "@/lib/phong/so-do";

const TL = "bld-troly-test";

describe("đóng dấu theo đơn vị lập của mẫu", () => {
  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    const q = await layQ();
    await q.query("INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, thu_tu) VALUES ($1,'Trợ lý CT','Trợ lý CT',2,'ban-tgd','chuc_danh',99)", [TL]);
    await q.query("INSERT INTO identity.kiem_nhiem (nguoi_dung_id, don_vi_id) VALUES ('nv.dtpc@scigroup.vn', $1)", [TL]);
    await q.query("UPDATE docflow.mau_word SET don_vi_lap = $1 WHERE ma = 'form-0'", [TL]);
  });

  it("Form 0 → Trợ lý CT (kiêm nhiệm), không cảnh báo sai mẫu; Form 1 → P.ĐT&PC", async () => {
    const nd = await nguoi("nv.dtpc@scigroup.vn");
    const f0 = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep("f0.docx", viDu("BaoCao_HopNhat_Tuan30.docx")) }));
    const f1 = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep("f1.docx", viDu("BaoCao_Tuan29_PDTPC.docx")) }));
    const q = await layQ();
    const lap = async (id: string | null) => (await q.query<{ don_vi_lap: string }>("SELECT don_vi_lap FROM docflow.tai_lieu WHERE id = $1", [id])).rows[0].don_vi_lap;
    expect(await lap(f0.tai_lieu_id)).toBe(TL);
    expect(f0.ket_qua.loi.some((l) => l.luat === "dung_mau" && l.thong_diep.includes("là mẫu của"))).toBe(false);
    expect(await lap(f1.tai_lieu_id)).toBe("p-dtpc");
  });

  it("người KHÔNG thuộc đơn vị của báo cáo: báo cáo vẫn là của đơn vị đó (theo nội dung) nhưng CHẶN — chốt 29/09", async () => {
    const nd = await nguoi("truong.hcth@scigroup.vn");
    const r = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep("f0b.docx", viDu("BaoCao_HopNhat_Tuan30.docx")) }));
    const q = await layQ();
    expect((await q.query<{ don_vi_lap: string }>("SELECT don_vi_lap FROM docflow.tai_lieu WHERE id = $1", [r.tai_lieu_id])).rows[0].don_vi_lap).toBe(TL);
    expect(r.ket_qua.dat).toBe(false);
    expect(r.ket_qua.loi.find((l) => l.muc === "chan" && l.luat === "dung_mau")?.thong_diep).toMatch(/bạn không thuộc Trợ lý CT/);
  });

  it("sơ đồ: báo cáo của chức danh lãnh đạo hiện ở ô Ban lãnh đạo", async () => {
    const q = await layQ();
    const { rows } = await q.query<{ id: string; ky: { tu: string } }>("SELECT id, ky_bao_cao AS ky FROM docflow.tai_lieu WHERE don_vi_lap = $1", [TL]);
    await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'da_gui' WHERE id = $1", [rows[0].id]);
    const dl = await duLieuSoDo(q, rows[0].ky.tu);
    expect(dl.bao_cao["ban-tgd"]?.tai_lieu_id).toBe(rows[0].id);
    expect(dl.bao_cao[TL]).toBeUndefined();
  });
});
