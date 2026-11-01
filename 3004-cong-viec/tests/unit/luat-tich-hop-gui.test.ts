// ============================================================
// luat-tich-hop — LUẬT NGƯỜI DÙNG trong kiểm tra + gửi, bằng FILE WORD dựng từ mẫu thật bản 6 (Form 7 BQLDA tuần 29: ô
// "Tình trạng tổng thể" còn "......" — mẫu bản 6 đã bỏ khối chữ ký). Luật code mức chặn → dat=false + chặn gửi thật;
// cảnh báo không chặn; tắt thì hết lỗi.
// Luật AI mức chặn: đọc kết quả kiểm AI nền (giả lập ketQuaKiemAi). Chạy thử trên các báo cáo đã tải lên.
// ============================================================
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

vi.mock("@/lib/luat/loai-luat", () => ({
  LOAI_LUAT: {
    o_co_gia_tri: {
      ma: "o_co_gia_tri",
      ten: "Ô phải có giá trị",
      mo_ta: "Ô nhập không được để trống",
      vi_du: "Ô Tình trạng tổng thể phải điền",
      tham_so: [{ khoa: "o", nhan: "Ô", kieu: "o", bat_buoc: true }],
      kiem: (bc: { o_nhap: Record<string, string> }, ts: Record<string, unknown>, ctx: { gia_tri_chua_dien: string[] }) => {
        const tag = String(ts.o);
        const v = (bc.o_nhap[tag] ?? "").trim();
        return !v || ctx.gia_tri_chua_dien.includes(v) ? [{ thong_diep: `Ô "${tag}" chưa có giá trị`, vi_tri: { tag } }] : [];
      },
    },
  },
  kiemThamSo: (_loai: string, ts: Record<string, unknown>, mau: { ten: string; o_nhap: { tag: string }[] } | null) => {
    if (!ts.o) return ["Chưa chọn ô"];
    if (mau && !mau.o_nhap.some((o) => o.tag === ts.o)) return [`Mẫu ${mau.ten} không có ô "${String(ts.o)}"`];
    return [];
  },
  docThanhLoi: () => "",
}));

const ai = vi.hoisted(() => ({
  ketQuaKiemAi: vi.fn(),
  batDauKiemAi: vi.fn(async () => {}),
  kiemLuatAi: vi.fn(),
  dichCauLuat: vi.fn(),
}));
vi.mock("@/lib/luat/kiem-ai", () => ai);

import { csdlMoi, nguoi } from "../helpers/csdl";
import { boSinh, khoTam, tep } from "../fixtures/chuan-bi";
import { tx, type Q } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { luuLuat, xoaLuat } from "@/lib/luat/kho-luat";
import { chayThuLuat } from "@/lib/luat/chay-luat";
import type { LuatKiemTra, LuatNhap } from "@/lib/luat/types";
import type { NguoiDungPhien } from "@/lib/types";

let q: Q;
let quanTri: NguoiDungPhien, nvBqlda: NguoiDungPhien, nvEnc: NguoiDungPhien;

const F7 = "BaoCao_Tuan29_BQLDA_QuangTri_ban6.docx";
/** Form 7 tuần 29 dựng từ mẫu bản 6: đủ ô bắt buộc, ô "Tình trạng tổng thể" còn "......" */
let bufF7: Buffer;
/** Như trên nhưng Kỳ báo cáo chưa tích (ô bắt buộc của luật hệ thống ky_bao_cao) */
let bufF7ChuaKy: Buffer;

const luatKy = (x: Partial<LuatNhap> = {}): LuatNhap => ({
  ma: "f7-tinh-trang-tong-the",
  ten: "Tình trạng tổng thể đã ghi",
  cau_luat: "Ô Tình trạng tổng thể phải điền",
  mo_ta: null,
  cach_kiem: "code",
  loai: "o_co_gia_tri",
  tham_so: { o: "du_an_tinh_trang" },
  huong_dan_ai: null,
  ap_dung: ["form-7"],
  muc: "chan",
  khi_ai_loi: "cho_gui",
  bat: true,
  nhom: "Ô chung",
  thu_tu: 500,
  ...x,
});

const taiLen = (ten = F7, nd = nvBqlda) => tx((t) => taiLenVaKiemTra(t, nd, { tep: tep(ten, ten === F7 ? bufF7 : undefined) }));

beforeAll(async () => {
  khoTam();
  q = await csdlMoi();
  [quanTri, nvBqlda, nvEnc] = await Promise.all(["quantri", "nv.bqlda", "nv.enc"].map((e) => nguoi(`${e}@scigroup.vn`)));
  await q.query("UPDATE docflow.luat_kiem_tra SET da_xoa = true WHERE NOT he_thong"); // tách khỏi luật mẫu gieo sẵn
  const { taoBaoCao, VI_DU } = await boSinh();
  const g = VI_DU.bqlda(29, "Lý Thị Nga");
  g.o.du_an_tinh_trang = "......";
  bufF7 = await taoBaoCao("form-7", g);
  g.o.ky_bao_cao = { chon: "", tuan: "......./2026" };
  bufF7ChuaKy = await taoBaoCao("form-7", g);
});

beforeEach(() => {
  ai.ketQuaKiemAi.mockReset();
  ai.batDauKiemAi.mockClear();
});

describe("luật code trong kiểm tra và gửi", () => {
  let luat: LuatKiemTra;

  it("chưa có luật người dùng: báo cáo đạt; kết quả lưu các luật hệ thống + phiên bản đã dùng", async () => {
    const r = await taiLen();
    expect(r.ket_qua.dat).toBe(true);
    const { rows } = await q.query<{ ket_qua_kiem_tra: { luat_da_dung: { ma: string; phien_ban: number }[] } }>(
      "SELECT ket_qua_kiem_tra FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1",
      [r.tai_lieu_id],
    );
    expect(rows[0].ket_qua_kiem_tra.luat_da_dung.map((l) => l.ma)).toContain("nguoi_lap");
  });

  it("luật code mức chặn: dat=false, lỗi đúng ô + gắn luật; gửi thật bị chặn", async () => {
    luat = await tx((t) => luuLuat(t, quanTri, luatKy()));
    const r = await taiLen();
    expect(r.ket_qua.dat).toBe(false);
    const l = r.ket_qua.loi.find((x) => x.luat === luat.ma)!;
    expect(l).toMatchObject({ muc: "chan", luat_id: luat.id, cach_kiem: "code", ten_luat: luat.ten, vi_tri: { tag: "du_an_tinh_trang" } });
    expect(r.ket_qua.luat_da_dung).toContainEqual(expect.objectContaining({ id: luat.id, phien_ban: 1 }));
    await expect(tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toThrow(/chưa đạt kiểm tra.*du_an_tinh_trang/);
    // Mẫu khác không bị luật này
    const enc = await taiLen("BaoCao_Thang7_SCI_ENC.docx", nvEnc);
    expect(enc.ket_qua.loi.some((x) => x.luat === luat.ma)).toBe(false);
  });

  it("hạ xuống cảnh báo: vẫn báo nhưng không chặn, gửi được", async () => {
    luat = await tx((t) => luuLuat(t, quanTri, luatKy({ id: luat.id, muc: "canh_bao" })));
    const r = await taiLen();
    expect(r.ket_qua.dat).toBe(true);
    expect(r.ket_qua.loi.find((x) => x.luat === luat.ma)?.muc).toBe("canh_bao");
    const g = await tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
    expect(g.buoc_ids.length).toBe(1);
    const { rows } = await q.query<{ ket_qua_kiem_tra: { luat_khi_gui: { luat_da_dung: { id: string; phien_ban: number }[] } } }>(
      "SELECT ket_qua_kiem_tra FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1",
      [r.tai_lieu_id],
    );
    expect(rows[0].ket_qua_kiem_tra.luat_khi_gui.luat_da_dung).toContainEqual(expect.objectContaining({ id: luat.id, phien_ban: 2 }));
  });

  it("tắt luật thì hết lỗi; xóa luật cũng vậy", async () => {
    luat = await tx((t) => luuLuat(t, quanTri, luatKy({ id: luat.id, muc: "chan", bat: false })));
    let r = await taiLen();
    expect(r.ket_qua.loi.some((x) => x.luat === luat.ma)).toBe(false);
    expect(r.ket_qua.dat).toBe(true);
    await tx((t) => luuLuat(t, quanTri, luatKy({ id: luat.id, muc: "chan", bat: true })));
    expect((await taiLen()).ket_qua.dat).toBe(false);
    await tx((t) => xoaLuat(t, quanTri, luat.id));
    r = await taiLen();
    expect(r.ket_qua.dat).toBe(true);
  });

  it("luật hệ thống lấy mức từ bảng luật: hạ 'ky_bao_cao' xuống cảnh báo thì bản chưa tích kỳ đạt (mẫu bản 6 bỏ ô Người lập)", async () => {
    const tepChuaKy = () => tep("BaoCao_Tuan29_BQLDA_QuangTri_ban1_chua_ky.docx", bufF7ChuaKy);
    const r1 = await tx((t) => taiLenVaKiemTra(t, nvBqlda, { tep: tepChuaKy() }));
    expect(r1.ket_qua.dat).toBe(false);
    expect(r1.ket_qua.loi.find((x) => x.muc === "chan")?.luat).toBe("ky_bao_cao");
    const { rows } = await q.query<{ id: string }>("SELECT id FROM docflow.luat_kiem_tra WHERE ma = 'ky_bao_cao' AND he_thong");
    const nl = (await import("@/lib/luat/kho-luat")).layLuat;
    const goc = (await nl(q, rows[0].id))!;
    await tx((t) => luuLuat(t, quanTri, { ...goc, muc: "canh_bao" }));
    const r2 = await tx((t) => taiLenVaKiemTra(t, nvBqlda, { tep: tepChuaKy() }));
    expect(r2.ket_qua.dat).toBe(true);
    expect(r2.ket_qua.loi.find((x) => x.luat === "ky_bao_cao" && x.muc !== "goi_y")?.muc).toBe("canh_bao");
    await tx((t) => luuLuat(t, quanTri, { ...goc, muc: "chan" }));
  });
});

describe("luật AI mức chặn lúc gửi", () => {
  let luatAi: LuatKiemTra;

  beforeAll(async () => {
    luatAi = await tx((t) =>
      luuLuat(t, quanTri, {
        ...luatKy({ ma: "f7-so-lieu-khop", ten: "Số liệu các mục khớp nhau", cach_kiem: "ai", loai: null, tham_so: null }),
        huong_dan_ai: "Tiến độ tổng thể phải khớp chi tiết từng hạng mục",
        muc: "chan",
        khi_ai_loi: "cho_gui",
      }),
    );
  });

  it("tải lên KHÔNG chạy luật AI (dat vẫn true, không gọi AI)", async () => {
    const r = await taiLen();
    expect(r.ket_qua.dat).toBe(true);
    expect(ai.kiemLuatAi).not.toHaveBeenCalled();
    expect(ai.ketQuaKiemAi).not.toHaveBeenCalled();
  });

  it("AI đang kiểm → gửi bị từ chối, nêu luật; khởi động lại AI ngoài giao dịch", async () => {
    const r = await taiLen();
    ai.ketQuaKiemAi.mockResolvedValue({ trang_thai: "dang_kiem", ket_qua: [] });
    await expect(tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toThrow(
      /AI đang kiểm luật “Số liệu các mục khớp nhau”, chờ ít giây rồi gửi lại/,
    );
    await new Promise((x) => setTimeout(x, 50));
    expect(ai.batDauKiemAi).toHaveBeenCalled();
    const { rows } = await q.query<{ trang_thai: string }>("SELECT trang_thai FROM docflow.tai_lieu WHERE id = $1", [r.tai_lieu_id]);
    expect(rows[0].trang_thai).toBe("nhap");
  });

  it("AI xong, luật chặn không đạt → chặn, nêu luật và lý do", async () => {
    const r = await taiLen();
    ai.ketQuaKiemAi.mockResolvedValue({
      trang_thai: "xong",
      ket_qua: [{ luat_id: luatAi.id, dat: false, thong_diep: "Tổng thể 60% nhưng các hạng mục bình quân 45%", muc: "chan", khi_ai_loi: "cho_gui", ten: luatAi.ten }],
    });
    await expect(tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toThrow(
      /chưa đạt luật AI: Số liệu các mục khớp nhau: Tổng thể 60%/,
    );
  });

  it("AI lỗi + khi_ai_loi 'cho_gui' → gửi được, lưu bằng chứng; khi_ai_loi 'chan' → chặn", async () => {
    const r = await taiLen();
    ai.ketQuaKiemAi.mockResolvedValue({
      trang_thai: "loi",
      ket_qua: [{ luat_id: luatAi.id, dat: null, thong_diep: "AI quá giờ", muc: "chan", khi_ai_loi: "cho_gui", ten: luatAi.ten }],
    });
    await tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
    const { rows } = await q.query<{ ket_qua_kiem_tra: { luat_khi_gui: { luat_ai: { id: string; dat: boolean | null; phien_ban: number }[] } } }>(
      "SELECT ket_qua_kiem_tra FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1",
      [r.tai_lieu_id],
    );
    expect(rows[0].ket_qua_kiem_tra.luat_khi_gui.luat_ai).toEqual([expect.objectContaining({ id: luatAi.id, dat: null, phien_ban: 1 })]);

    luatAi = await tx((t) => luuLuat(t, quanTri, { ...luatAi, khi_ai_loi: "chan" }));
    const r2 = await taiLen();
    await expect(tx((t) => gui(t, nvBqlda, { tai_lieu_id: r2.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toThrow(/AI không kiểm được luật/);
    // ketQuaKiemAi ném lỗi (luat-ai chưa sẵn sàng) cũng coi là AI lỗi
    ai.ketQuaKiemAi.mockRejectedValue(new Error("Chưa làm"));
    await expect(tx((t) => gui(t, nvBqlda, { tai_lieu_id: r2.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toThrow(/AI không kiểm được luật/);
    luatAi = await tx((t) => luuLuat(t, quanTri, { ...luatAi, khi_ai_loi: "cho_gui" }));
    await tx((t) => gui(t, nvBqlda, { tai_lieu_id: r2.tai_lieu_id!, den: ["p-dtpc"] }));
  });

  it("AI xong và đạt → gửi được; luật AI mức cảnh báo không bao giờ chặn", async () => {
    let r = await taiLen();
    ai.ketQuaKiemAi.mockResolvedValue({ trang_thai: "xong", ket_qua: [{ luat_id: luatAi.id, dat: true, thong_diep: "khớp", muc: "chan", khi_ai_loi: "cho_gui", ten: luatAi.ten }] });
    await tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
    luatAi = await tx((t) => luuLuat(t, quanTri, { ...luatAi, muc: "canh_bao" }));
    ai.ketQuaKiemAi.mockResolvedValue({ trang_thai: "dang_kiem", ket_qua: [] });
    r = await taiLen();
    await tx((t) => gui(t, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
    expect(ai.ketQuaKiemAi).toHaveBeenCalledTimes(1); // chỉ lần có luật chặn mới hỏi AI
    await tx((t) => xoaLuat(t, quanTri, luatAi.id));
  });
});

describe("chạy thử luật trên báo cáo đã có", () => {
  it("đếm đúng: báo cáo Form 7 không đạt, Form khác bỏ qua; luật 'tat_ca' trên ô có giá trị thì đạt hết", async () => {
    await taiLen("BaoCao_Thang7_SCI_ENC.docx", nvEnc);
    const { rows } = await q.query<{ mau_ma: string | null; n: number }>(
      `SELECT t.mau_ma, count(*)::int n FROM docflow.tai_lieu t JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
       GROUP BY t.mau_ma`,
    );
    const tong = rows.reduce((s, r) => s + r.n, 0);
    const soF7 = rows.find((r) => r.mau_ma === "form-7")?.n ?? 0;
    expect(soF7).toBeGreaterThan(3);

    const kq = await chayThuLuat(q, luatKy({ id: null }));
    expect(kq.so_tai_lieu).toBe(tong);
    expect(kq.so_khong_dat).toBe(soF7); // mọi bản Form 7 đều còn "......" (hoặc file cũ không có) ở ô Tình trạng tổng thể
    expect(kq.so_dat).toBe(0);
    expect(kq.so_bo_qua).toBe(tong - soF7);
    expect(kq.mau.every((m) => m.mau_ma === "form-7" && !m.dat && m.loi[0].vi_tri?.tag === "du_an_tinh_trang")).toBe(true);

    // ô Gửi: mọi báo cáo đã tải lên (Form 6, Form 7) đều ghi nơi nhận → đạt hết
    const tatCa = await chayThuLuat(q, luatKy({ id: null, ap_dung: "tat_ca", tham_so: { o: "gui_den" } }));
    expect(tatCa).toMatchObject({ so_tai_lieu: tong, so_bo_qua: 0, so_dat: tong, so_khong_dat: 0 });

    const gioiHan = await chayThuLuat(q, luatKy({ id: null }), { gioi_han: 2 });
    expect(gioiHan.so_tai_lieu).toBe(2);
  });

  it("luật AI chỉ lấy mẫu gioi_han_ai tài liệu", async () => {
    ai.kiemLuatAi.mockImplementation(async (ds: LuatKiemTra[]) => [{ luat_id: ds[0].id, dat: false, thong_diep: "không khớp" }]);
    const kq = await chayThuLuat(
      q,
      luatKy({ id: null, cach_kiem: "ai", loai: null, tham_so: null, huong_dan_ai: "Số liệu phải khớp" }),
      { gioi_han_ai: 2 },
    );
    expect(ai.kiemLuatAi).toHaveBeenCalledTimes(2);
    expect(kq.so_khong_dat).toBe(2);
    expect(kq.so_dat).toBe(0);
    expect(kq.so_bo_qua).toBe(kq.so_tai_lieu - 2);
  });
});
