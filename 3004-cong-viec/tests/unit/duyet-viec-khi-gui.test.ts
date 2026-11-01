// Nộp báo cáo Đợt B — bước "Duyệt việc" (Mr. Đại chốt 28/09/2026): việc người gửi bấm Bỏ KHÔNG vào sổ cái,
// báo cáo vẫn gửi; có sổ việc bị bỏ + lịch sử; Rà soát sổ cái không coi việc bị bỏ là "thiếu" để tự thêm lại.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, tep } from "../fixtures/chuan-bi";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { raSoatSoCai } from "@/lib/so-cai/ra-soat";

const TEP = "mau-word/vi-du/BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx";

describe("duyệt việc trước khi gửi", () => {
  beforeAll(async () => {
    khoTam();
    await csdlMoi();
  });

  it("bỏ 1 việc: báo cáo gửi đi, việc đó không vào sổ cái, kết quả trả đúng vị trí dòng; rà soát không tự thêm lại", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const r = await tx(async (q) => taiLenVaKiemTra(q, nd, { tep: tep("ban2.docx", fs.readFileSync(TEP)) }));
    const k = r.ket_qua;
    expect(k.dat).toBe(true);
    const vaoSo = k.du_doan.filter((d) => d.hanh_dong !== "khong_dung");
    expect(vaoSo.length).toBeGreaterThan(1);
    const bo = vaoSo[0].dong;
    const viecBo = k.cong_viec.filter((c) => c.nguon_bang !== "bang_quyet_dinh")[bo];

    const kq = await tx((q) => gui(q, nd, { tai_lieu_id: r.tai_lieu_id!, den: k.gui_den, bo_viec: [bo] }));
    // kết quả không có dòng bị bỏ; các dòng khác giữ đúng vị trí như người gửi thấy
    expect(kq.so_cai.some((d) => d.dong === bo)).toBe(false);
    expect(kq.so_cai.map((d) => d.dong).sort((a, b) => a - b)).toEqual(k.du_doan.map((d) => d.dong).filter((d) => d !== bo).sort((a, b) => a - b));

    const q = await layQ();
    const nguon = await q.query<{ bang: string; so: number }>(
      `SELECT du_lieu->>'nguon_bang' AS bang, (du_lieu->>'dong_so')::int AS so FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1`,
      [r.tai_lieu_id],
    );
    expect(nguon.rows.some((x) => x.bang === viecBo.nguon_bang && Number(x.so) === viecBo.dong_so)).toBe(false);
    const biBo = await q.query("SELECT ten, nguoi FROM docflow.viec_bi_bo WHERE tai_lieu_id = $1", [r.tai_lieu_id]);
    expect(biBo.rows).toEqual([{ ten: viecBo.ten, nguoi: nd.id }]);
    const ls = await q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'bo_viec_khi_gui'", [r.tai_lieu_id]);
    expect(ls.rows.length).toBe(1);

    const rs = await tx((t) => raSoatSoCai(t, { tai_lieu_id: r.tai_lieu_id! }));
    expect(rs.tai_lieu.find((t) => t.tai_lieu_id === r.tai_lieu_id)?.thieu ?? []).toEqual([]);
  });
});
