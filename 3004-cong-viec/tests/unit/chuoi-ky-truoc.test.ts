// ============================================================
// CHUỖI THEO DÕI VIỆC lúc nộp (Mr. Đại chốt 02/10/2026): báo cáo kỳ N thiếu việc của kỳ N−1 (chưa báo xong / dừng) → CHẶN.
// Cùng bộ: K11 — bảng việc trống → CHẶN. Code: src/lib/kiem-tra/chuoi-ky-truoc.ts + kiem-tra.ts bước 7a, 8b.
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, boSinh, tep } from "../fixtures/chuan-bi";
import { tuanIso } from "../../scripts/chuyen-mau-that.mjs";
import { tx } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import type { NguoiDungPhien } from "@/lib/types";

process.env.TAT_CHUOI_KY_TRUOC = "0"; // vitest.config.ts tắt luật này cho các kịch bản cũ — file này bật lại

type Dong = Record<string, string>;
let nv: NguoiDungPhien;

async function baoCao(soTuan: number, dong: Dong[]): Promise<Buffer> {
  const { taoBaoCao, VI_DU } = await boSinh();
  const g = VI_DU.bqlda(29, "Lý Thị Nga");
  g.o.ky_bao_cao = { chon: "tuan", tuan: `${soTuan}/2026   (${tuanIso(soTuan, 2026).join(" – ")})` };
  g.bang.bang_cong_viec = dong;
  return taoBaoCao("form-7", g);
}
const viec = (ten: string, them: Dong = {}): Dong => ({ ten, du_an: "ĐG Hướng Việt", phu_trach: "BQLDA Quảng Trị", ket_thuc: "31/12/2026", ...them });
const taiLen = (buf: Buffer) => tx((q) => taiLenVaKiemTra(q, nv, { tep: tep("bc.docx", buf) }));
const chan = (r: Awaited<ReturnType<typeof taiLen>>) => r.ket_qua.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep);

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  nv = await nguoi("nv.bqlda@scigroup.vn");
});

describe("chuỗi theo dõi việc kỳ trước → kỳ này", () => {
  it("K11: bảng việc trống → chặn", async () => {
    const r = await taiLen(await baoCao(30, []));
    expect(chan(r).some((t) => /chưa có việc nào/.test(t))).toBe(true);
  });

  it("kỳ đầu (chưa có kỳ trước) → không chặn; gửi tuần 30 có 3 việc (1 việc đã xong)", async () => {
    const r = await taiLen(await baoCao(30, [viec("Đổ bê tông móng trụ T60"), viec("Kéo dây đoạn T61–T62"), viec("Nghiệm thu móng T59", { tinh_trang: "Đã xong" })]));
    expect(chan(r)).toEqual([]);
    await tx((q) => gui(q, nv, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
  });

  it("tuần 31 thiếu 1 việc đang làm của tuần 30 → chặn, nêu đúng tên; việc đã xong tuần 30 được bỏ", async () => {
    const r = await taiLen(await baoCao(31, [viec("Đổ bê tông móng trụ T60", { tinh_trang: "Đã xong" }), viec("Lắp dựng cột trụ T61")]));
    const c = chan(r).filter((t) => /báo cáo tuần 30/.test(t));
    expect(c).toHaveLength(1);
    expect(c[0]).toMatch(/Thiếu 1 việc/);
    expect(c[0]).toContain("Kéo dây đoạn T61–T62");
    expect(c[0]).not.toContain("Nghiệm thu móng T59");
  });

  it("tuần 31 ghi đủ (việc thiếu ghi \"Dừng: lý do\") → không chặn", async () => {
    const r = await taiLen(
      await baoCao(31, [
        viec("Đổ bê tông móng trụ T60", { tinh_trang: "Đã xong" }),
        viec("Kéo dây đoạn T61-T62", { tinh_trang: "Dừng: chờ chủ đầu tư chốt tuyến" }),
        viec("Lắp dựng cột trụ T61"),
      ]),
    );
    expect(chan(r)).toEqual([]);
  });

  it("mã việc kỳ trước lấy đúng dòng BẢNG VIỆC — việc AI tìm ngoài bảng cùng số dòng không đè (lỗi bắt khi test 02/10)", async () => {
    const r31 = await taiLen(
      await baoCao(31, [
        viec("Đổ bê tông móng trụ T60", { tinh_trang: "Đã xong" }),
        viec("Kéo dây đoạn T61-T62", { tinh_trang: "Dừng: chờ chủ đầu tư chốt tuyến" }),
        viec("Lắp dựng cột trụ T61"),
      ]),
    );
    // 3 việc AI tìm ngoài bảng → nguồn ai_ngoai_bang dòng 1, 2, 3 — trùng số dòng với bảng việc
    const ai = ["Mua vật tư dự phòng A", "Mua vật tư dự phòng B", "Mua vật tư dự phòng C"].map((ten) => ({ ten, han: "2026-12-31", trich: ten }));
    const g = await tx((q) => gui(q, nv, { tai_lieu_id: r31.tai_lieu_id!, den: ["p-dtpc"], them_viec: ai }));
    const maCot = g.so_cai.find((d) => d.dong === 2)?.cong_viec_id; // dòng thứ 3 của bảng = "Lắp dựng cột trụ T61"
    const maAi3 = g.so_cai.find((d) => d.dong === 5)?.cong_viec_id;
    expect(maCot && maAi3 && maCot !== maAi3).toBeTruthy();
    const r32 = await taiLen(await baoCao(32, [viec("Thi công đoạn T63")]));
    const c = chan(r32).find((t) => /báo cáo tuần 31/.test(t)) ?? "";
    expect(c).toContain(`${maCot} Lắp dựng cột trụ T61`);
    expect(c).not.toContain(`${maAi3} Lắp dựng`);
  });
});
