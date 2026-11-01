// BƯỚC 3 SOÁT NỘI DUNG CÓ ĐỀ XUẤT (Mr. Đại chốt 29/09/2026): AI viết "sua" (chữ mới cho cả ô) cho góp ý / luật không đạt;
// người nộp duyệt → ghi file MỘT lần thành bản mới, kết quả soát CHÉP sang bản mới (dòng đã ghi: da_sua, luật coi như đạt),
// AI KHÔNG soát lại bản đó. runAI là bản giả (vi.mock).
import { describe, it, expect, beforeAll, vi } from "vitest";

const aiGia = vi.hoisted(() => ({ runAI: vi.fn<(...a: unknown[]) => Promise<string>>() }));
vi.mock("@/lib/ai/providers", async (goc) => {
  const that = (await goc()) as Record<string, unknown>;
  return {
    ...that,
    runAI: (...a: unknown[]) => aiGia.runAI(...a),
    // Quản lý token AI (04/10): chỗ gọi đi qua runAIGan(nhãn tính năng, …) — giả cả hàm này, không thì test gọi Claude THẬT
    runAIGan: (_ma: string, ...a: unknown[]) => aiGia.runAI(...a),
    getAIConfig: () => ({ mode: "claude-cli", provider: "anthropic", apiKey: "", model: "", baseUrl: "" }),
  };
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { layMau } from "@/lib/kiem-tra/kiem-tra";
import { phanTichGopY } from "@/lib/kiem-tra/gop-y-ai";
import { phanTichLuatAi } from "@/lib/luat/ai/kiem";
import { layGopY } from "@/lib/kiem-tra/gop-y-luu";
import { ghiSuaVaoFile } from "@/lib/kiem-tra/sua-vao-file";
import { ketThuaSoat } from "@/lib/kiem-tra/ket-thua-soat";
import type { LuatKiemTra } from "@/lib/luat/types";
import type { MauWord, NguoiDungPhien } from "@/lib/types";
import { khoTam, tep, viDu } from "../fixtures/chuan-bi";

let q: Q;
let nd: NguoiDungPhien;
let mau: MauWord;
const TEP = "BaoCao_Tuan28_BQLDA_QuangTri.docx";

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
  nd = await nguoi("gd.bqlda@scigroup.vn");
  mau = (await layMau(q, "form-7"))!;
});

describe("AI viết đề xuất sửa", () => {
  it("góp ý chỉ vào một ô giữ 'sua'; chỉ vào mục / bảng chung thì bỏ", async () => {
    const nd7 = await docWord(viDu(TEP));
    const ds = phanTichGopY(
      JSON.stringify({
        gop_y: [
          { vi_tri: "o:nguoi_lap", loai: "muc_trong", thong_diep: "Người lập còn trống", sua: "Lý Thị Nga" },
          { vi_tri: "muc:GPMB & QUAN HỆ ĐỊA PHƯƠNG", loai: "khac", thong_diep: "Mục chung", sua: "chữ gì đó" },
          { vi_tri: "o:ngay_lap", loai: "khac", thong_diep: "Không có đề xuất" },
        ],
      }),
      nd7,
      mau,
    );
    expect(ds[0]).toMatchObject({ vi_tri: { tag: "nguoi_lap" }, de_xuat: "Lý Thị Nga" });
    expect(ds[1].de_xuat).toBeUndefined();
    expect(ds[2].de_xuat).toBeUndefined();
  });

  it("luật không đạt giữ 'sua'; luật đạt thì bỏ", async () => {
    const nd7 = await docWord(viDu(TEP));
    const luat = [{ id: "a", ma: "a", ten: "A" }, { id: "b", ma: "b", ten: "B" }] as LuatKiemTra[];
    const kq = phanTichLuatAi(
      JSON.stringify({
        luat: [
          { id: "L1", dat: false, thong_diep: "Sai", vi_tri: "o:nguoi_lap", sua: "Lý Thị Nga" },
          { id: "L2", dat: true, thong_diep: "Đạt", vi_tri: "o:nguoi_lap", sua: "x" },
        ],
      }),
      luat,
      { ...nd7, van_ban: "" } as never,
      mau,
    );
    expect(kq[0]).toMatchObject({ dat: false, de_xuat: "Lý Thị Nga" });
    expect(kq[1].de_xuat).toBeUndefined();
  });
});

describe("ghi đề xuất đã duyệt → bản mới, không soát lại", () => {
  it("chép kết quả soát sang bản mới, đánh dấu dòng đã ghi, AI không chạy", async () => {
    const r1 = await tx((t) => taiLenVaKiemTra(t, nd, { tep: tep(TEP) }));
    const id = r1.tai_lieu_id!;
    const pb1 = r1.phien_ban!;
    const { rows: pb } = await q.query<{ sha256: string }>("SELECT sha256 FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1 AND phien_ban = $2", [id, pb1]);
    const gopY = [
      { luat: "noi_dung_ai", muc: "goi_y", loai: "muc_trong", thong_diep: "Người lập còn trống", vi_tri: { tag: "nguoi_lap" }, de_xuat: "Lý Thị Nga" },
      { luat: "noi_dung_ai", muc: "goi_y", loai: "khac", thong_diep: "Góp ý bỏ qua" },
    ];
    await q.query(
      `INSERT INTO docflow.gop_y_ai (tai_lieu_id, phien_ban, sha256, trang_thai, gop_y, bat_dau_luc, xong_luc) VALUES ($1, $2, $3, 'xong', $4::jsonb, now(), now())`,
      [id, pb1, pb[0].sha256, JSON.stringify(gopY)],
    );
    await q.query(
      `INSERT INTO docflow.luat_ai_ket_qua (tai_lieu_id, phien_ban, sha256, dau_luat, trang_thai, ket_qua, bat_dau_luc, xong_luc) VALUES ($1, $2, $3, 'dau-x', 'xong', $4::jsonb, now(), now())`,
      [id, pb1, pb[0].sha256, JSON.stringify([{ luat_id: "l-1", dat: false, thong_diep: "Sai", vi_tri: { tag: "nguoi_lap" }, de_xuat: "Lý Thị Nga" }])],
    );

    // Như POST /api/kiem-tra/sua-loi có buoc3: ghi file → bản mới → chép kết quả soát
    const { thong_tin, noi_dung } = await docPhienBan(q, id);
    const moi = await ghiSuaVaoFile(noi_dung, [{ vi_tri: { tag: "nguoi_lap" }, moi: "Lý Thị Nga" }]);
    const r2 = await tx(async (t) => {
      const r = await taiLenVaKiemTra(t, nd, { tep: { ten_tep: thong_tin.ten_tep, mime: thong_tin.mime, noi_dung: moi }, tai_lieu_id: id });
      await ketThuaSoat(t, id, thong_tin.phien_ban, r.phien_ban!, { gop_y: ["Người lập còn trống"], luat: ["l-1"] });
      return r;
    });
    expect(r2.phien_ban).toBe(pb1 + 1);
    expect(r2.ket_qua.o_nhap.nguoi_lap).toBe("Lý Thị Nga");

    aiGia.runAI.mockReset();
    const g2 = await layGopY(q, id, r2.phien_ban);
    expect(g2.trang_thai).toBe("xong");
    expect(g2.gop_y.map((g) => [g.thong_diep, !!g.da_sua])).toEqual([
      ["Người lập còn trống", true],
      ["Góp ý bỏ qua", false],
    ]);
    const { rows: l2 } = await q.query<{ ket_qua: { luat_id: string; dat: boolean; da_sua?: boolean }[]; dau_luat: string }>(
      "SELECT ket_qua, dau_luat FROM docflow.luat_ai_ket_qua WHERE tai_lieu_id = $1 AND phien_ban = $2",
      [id, r2.phien_ban],
    );
    expect(l2[0].dau_luat).toBe("dau-x");
    expect(l2[0].ket_qua[0]).toMatchObject({ luat_id: "l-1", dat: true, da_sua: true });
    expect(aiGia.runAI).not.toHaveBeenCalled();
  });
});
