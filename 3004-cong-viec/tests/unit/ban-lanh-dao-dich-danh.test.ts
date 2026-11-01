// Ban lãnh đạo phải ĐÍCH DANH (Mr. Đại chốt 28/09): báo cáo ghi "Ban lãnh đạo" ở ô phụ trách → bước Duyệt việc phải chọn
// lãnh đạo cụ thể; gửi mà chưa chọn thì máy chặn; chọn rồi thì phần việc vào sổ cái đứng tên chức danh đã chọn.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, tep } from "../fixtures/chuan-bi";
import { layQ, tx } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { ghiSuaVaoFile } from "@/lib/kiem-tra/sua-vao-file";

// Mẫu phiên bản 4: chỉ Form 0 có cột "Bộ phận phụ trách" trong chương việc
const TEP = "mau-word/vi-du/BaoCao_HopNhat_Tuan30.docx";
const PTGD = "bld-test-ptgd";

describe("Ban lãnh đạo đích danh khi duyệt việc", () => {
  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    const q = await layQ();
    await q.query("INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, thu_tu) VALUES ($1,'Phó Tổng Giám đốc · Thử','PTGĐ · Thử',2,'ban-tgd','chuc_danh',99)", [PTGD]);
  });

  it("chưa chọn lãnh đạo → chặn gửi; chọn rồi → phần việc đứng tên lãnh đạo đó, không còn Ban TGĐ", async () => {
    const nd = await nguoi("photgd@scigroup.vn");
    const goc = fs.readFileSync(TEP);
    const r0 = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep("goc.docx", goc), luu: false }));
    const dong0 = r0.ket_qua.cong_viec.find((c) => c.nguon_bang === "bang_cong_viec")!;
    const buf = await ghiSuaVaoFile(goc, [{ vi_tri: { bang: "bang_cong_viec", dong: dong0.dong_so, cot: "phu_trach" }, moi: "Ban TGĐ" }]);
    const r = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep("bld.docx", buf) }));
    const k = r.ket_qua;
    const chiSo = k.cong_viec.findIndex((c) => c.phu_trach.some((p) => p.id === "ban-tgd"));
    expect(chiSo).toBeGreaterThanOrEqual(0);
    const dong = k.du_doan.find((d) => (d as { chi_so?: number }).chi_so === chiSo)?.dong ?? chiSo;

    await expect(tx((q) => gui(q, nd, { tai_lieu_id: r.tai_lieu_id!, den: k.gui_den }))).rejects.toThrow(/Ban lãnh đạo/);

    const kq = await tx((q) => gui(q, nd, { tai_lieu_id: r.tai_lieu_id!, den: k.gui_den, thay_bld: { [dong]: PTGD } }));
    const ma = kq.so_cai.find((d) => d.dong === dong)?.cong_viec_id;
    expect(ma).toBeTruthy();
    const q = await layQ();
    const pv = await q.query<{ phu_trach_id: string }>("SELECT phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1", [ma]);
    expect(pv.rows.map((x) => x.phu_trach_id)).toContain(PTGD);
    expect(pv.rows.map((x) => x.phu_trach_id)).not.toContain("ban-tgd");
  });
});
