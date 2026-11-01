// Gửi · nhận · chuyển tiếp · gửi kèm · trả lại · gửi lại · gửi mới · hoàn thành · cây hành trình.
// Kịch bản SCI E&C (kế hoạch v2, mục "Gửi, chuyển tiếp"). Hàm thu-muc / so-cai: dùng hàm thật; nếu module
// đó còn "Chưa làm" thì tự dùng bản giả lập trong tests/fixtures/gia-lap.ts (nhatKy ghi lại mọi lần gọi).
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/thu-muc/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapThuMuc);
});
vi.mock("@/lib/so-cai/dich-vu", async (goc) => {
  const g = await import("../fixtures/gia-lap");
  return g.boc((await goc()) as Record<string, unknown>, g.giaLapSoCai);
});

import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { chuyenTiep, cayHanhTrinh, gui, guiLai, guiMoi, hoanThanh, nhan, traLai, type NutHanhTrinh } from "@/lib/gui/dich-vu";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { thongTinTaiLieuGui, thaoTacHopLe } from "@/lib/gui/doc";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import type { DauVaoSoCai, NguoiDungPhien } from "@/lib/types";
import { boSinh, khoTam, tep, datCauHinh, xoaCauHinh } from "../fixtures/chuan-bi";
import { goi, tomTatGiaLap } from "../fixtures/gia-lap";

let q: Q;
const U: Record<string, NguoiDungPhien> = {};

async function viTri(taiLieuId: string) {
  const { rows } = await q.query<{ don_vi_id: string; loai: string; nhan: string | null }>(
    `SELECT t.don_vi_id, t.loai, v.nhan FROM docflow.vi_tri v JOIN docflow.thu_muc t ON t.id = v.thu_muc_id
     WHERE v.tai_lieu_id = $1 AND NOT v.da_xoa ORDER BY v.them_luc`,
    [taiLieuId],
  );
  return rows;
}

async function buoc(id: string) {
  const { rows } = await q.query<{ trang_thai: string; loai: string; nhan_luc: unknown }>("SELECT * FROM docflow.buoc_hanh_trinh WHERE id = $1", [id]);
  return rows[0];
}

async function taiLen(nd: NguoiDungPhien, ten: string) {
  const r = await tx((t) => taiLenVaKiemTra(t, nd, { tep: tep(ten) }));
  return r;
}

/** Hình dạng cây: [loai→đơn vị nhận, con...] để so sánh gọn. */
function hinh(n: NutHanhTrinh): unknown {
  const nhan = `${n.loai}→${n.den_nguoi ?? n.den_don_vi ?? "-"}`;
  return n.con.length ? { [nhan]: n.con.map(hinh) } : nhan;
}

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
  for (const e of ["nv.enc", "gd.enc", "nv.dtpc", "truong.dtpc", "photgd", "tgd", "truong.tckt", "hung.tv", "nguoimoi", "nv.bqlda", "truong.ktvh"]) {
    U[e] = await nguoi(`${e}@scigroup.vn`);
  }
});

describe("kịch bản SCI E&C · báo cáo tháng 7 (Form 6)", () => {
  let enc = "";
  let b1 = "";
  let bTraLai = "";
  let bGuiLai = "";

  it("gửi bản 1 cho P.ĐT&PC (mặc định theo dòng 'Gửi:'): vào Đến nơi nhận + Đi người gửi, 5 việc vào sổ cái", async () => {
    const t = await taiLen(U["nv.enc"], "BaoCao_Thang7_SCI_ENC.docx");
    expect(t.ket_qua.dat).toBe(true);
    enc = t.tai_lieu_id!;
    const kq = await tx((x) => gui(x, U["nv.enc"], { tai_lieu_id: enc, den: [] }));
    expect(kq.buoc_ids).toHaveLength(1);
    b1 = kq.buoc_ids[0];
    expect(await buoc(b1)).toMatchObject({ loai: "gui", trang_thai: "cho_nhan", den_don_vi: "p-dtpc", tu_don_vi: "sci-enc" });
    const vt = await viTri(enc);
    expect(vt).toEqual(expect.arrayContaining([expect.objectContaining({ don_vi_id: "p-dtpc", loai: "den" }), expect.objectContaining({ don_vi_id: "sci-enc", loai: "di" })]));
    const ghi = goi("ghiVaoSoCai").at(-1)!.doi[1] as DauVaoSoCai;
    expect(ghi.cong_viec).toHaveLength(5); // 5 việc chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC THÁNG TỚI" (kiến nghị không sinh việc từ mẫu phiên bản 4)
    expect(ghi).toMatchObject({ tai_lieu_id: enc, phien_ban: 1, mau_ma: "form-6", don_vi_id: "sci-enc", cap: 3, nhan: "SCI E&C · Form 6 · tháng 7" });
    const ls = await q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'gui'", [enc]);
    expect(ls.rows).toHaveLength(1);
    const tb = await q.query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = 'truong.dtpc@scigroup.vn' AND loai = 'nhan_tai_lieu'");
    expect(tb.rows.length).toBeGreaterThan(0);
    // Chuông (chốt 30/09): cả đơn vị lập (SCI E&C) cũng nhận, trừ chính người gửi; tin trỏ /tai-lieu để mở thẳng file
    const cungDv = await q.query<{ nguoi_nhan: string; lien_ket: string }>(
      "SELECT nguoi_nhan, lien_ket FROM docflow.thong_bao WHERE loai = 'nhan_tai_lieu' AND nguoi_nhan IN ('gd.enc@scigroup.vn','nv.enc@scigroup.vn')",
    );
    expect(cungDv.rows).toEqual([{ nguoi_nhan: "gd.enc@scigroup.vn", lien_ket: `/tai-lieu/${enc}` }]);
    // Đã gửi thì không Gửi lần nữa (dùng chuyển tiếp / gửi mới)
    await expect(tx((x) => gui(x, U["nv.enc"], { tai_lieu_id: enc, den: ["p-dtpc"] }))).rejects.toThrow(/đã được gửi/);
  });

  it("người ngoài nơi nhận không nhận/trả lại được", async () => {
    await expect(tx((x) => nhan(x, U["hung.tv"], b1))).rejects.toMatchObject({ status: 403 });
  });

  it("P.ĐT&PC trả lại: bắt buộc lý do; về Đến của SCI E&C gắn nhãn 'Bị trả lại'; việc chờ sửa", async () => {
    await expect(tx((x) => traLai(x, U["truong.dtpc"], { buoc_id: b1, ly_do: "  " }))).rejects.toThrow(/lý do/);
    bTraLai = await tx((x) => traLai(x, U["truong.dtpc"], { buoc_id: b1, ly_do: "thiếu số liệu thu vốn NK1" }));
    expect(await buoc(b1)).toMatchObject({ trang_thai: "bi_tra_lai" });
    expect(await buoc(bTraLai)).toMatchObject({ loai: "tra_lai", den_don_vi: "sci-enc", ly_do: "thiếu số liệu thu vốn NK1", trang_thai: "cho_nhan" });
    expect((await viTri(enc)).find((v) => v.don_vi_id === "sci-enc" && v.loai === "den")?.nhan).toBe("bi_tra_lai");
    const dd = goi("danhDauChoSua").at(-1)!.doi;
    expect(dd.slice(1, 3)).toEqual([enc, true]);
    const tt = await q.query<{ trang_thai: string }>("SELECT trang_thai FROM docflow.tai_lieu WHERE id = $1", [enc]);
    expect(tt.rows[0].trang_thai).toBe("bi_tra_lai");
    // bước đã trả lại không chuyển tiếp được nữa
    await expect(tx((x) => chuyenTiep(x, U["truong.dtpc"], { buoc_id: b1, den: ["ban-tgd"] }))).rejects.toMatchObject({ status: 409 });
  });

  it("SCI E&C gửi lại bản 2 (đã bổ sung mục IV): cùng hành trình, bản 1 còn trong lịch sử, sổ cái đè bằng bản 2", async () => {
    const kq = await tx((x) =>
      guiLai(x, U["nv.enc"], { buoc_tra_lai_id: bTraLai, tep: tep("BaoCao_Thang7_SCI_ENC_ban2.docx") }),
    );
    expect(kq.phien_ban).toBe(2);
    bGuiLai = kq.buoc_id;
    expect(await buoc(bGuiLai)).toMatchObject({ loai: "gui_lai", cha_id: bTraLai, den_don_vi: "p-dtpc", phien_ban: 2 });
    expect(await buoc(bTraLai)).toMatchObject({ trang_thai: "da_xu_ly" });
    expect((await viTri(enc)).find((v) => v.don_vi_id === "sci-enc" && v.loai === "den")?.nhan ?? null).toBeNull();
    const ban1 = await docPhienBan(q, enc, 1);
    expect(ban1.thong_tin.phien_ban).toBe(1);
    const ghi = goi("ghiVaoSoCai").at(-1)!.doi[1] as DauVaoSoCai;
    expect(ghi).toMatchObject({ tai_lieu_id: enc, phien_ban: 2 });
    expect(goi("danhDauChoSua").at(-1)!.doi.slice(1, 3)).toEqual([enc, false]);
  });

  it("P.ĐT&PC nhận bản 2: người gửi thấy 'đã nhận lúc …'", async () => {
    await tx((x) => nhan(x, U["truong.dtpc"], bGuiLai));
    const b = await buoc(bGuiLai);
    expect(b.trang_thai).toBe("da_nhan");
    expect(b.nhan_luc).toBeTruthy();
    const tb = await q.query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = 'nv.enc@scigroup.vn' AND loai = 'da_nhan'");
    expect(tb.rows.at(-1)!.noi_dung).toMatch(/Phòng Đầu tư và Pháp chế đã nhận .* lúc \d\d:\d\d/);
    await expect(tx((x) => nhan(x, U["truong.dtpc"], bGuiLai))).rejects.toMatchObject({ status: 409 });
  });

  it("xử lý 3 hướng cùng lúc: A nguyên văn → Ban TGĐ, B kèm ý kiến pháp lý → P.TCKT, D gửi Form 1 mới → Phó TGĐ", async () => {
    const soGhiTruoc = goi("ghiVaoSoCai").length;
    const a = await tx((x) => chuyenTiep(x, U["truong.dtpc"], { buoc_id: bGuiLai, den: ["ban-tgd"] }));
    expect(await buoc(a.buoc_ids[0])).toMatchObject({ loai: "chuyen_tiep", den_don_vi: "ban-tgd", phien_ban: 2 });
    expect(goi("ghiVaoSoCai").length).toBe(soGhiTruoc); // nguyên văn: sổ cái không đổi

    const yk = await taiLen(U["nv.dtpc"], "YKien_PhapLy_ThuVon.docx");
    const b = await tx((x) => chuyenTiep(x, U["truong.dtpc"], { buoc_id: bGuiLai, den: ["p-tckt"], tep_kem: [yk.tai_lieu_id!] }));
    expect(await buoc(b.buoc_ids[0])).toMatchObject({ loai: "chuyen_tiep_kem", den_don_vi: "p-tckt" });
    const denTckt = async (id: string) => (await viTri(id)).some((v) => v.don_vi_id === "p-tckt" && v.loai === "den");
    expect(await denTckt(enc)).toBe(true);
    expect(await denTckt(yk.tai_lieu_id!)).toBe(true);

    const f1 = await taiLen(U["nv.dtpc"], "BaoCao_Tuan29_PDTPC.docx");
    expect(f1.ket_qua.dat).toBe(true);
    expect(f1.ket_qua.gui_den).toEqual(["ban-tgd"]);
    const d = await tx((x) =>
      guiMoi(x, U["nv.dtpc"], { tai_lieu_id: f1.tai_lieu_id!, den: ["nguoi:photgd@scigroup.vn"], lien_quan_den_tai_lieu: enc }),
    );
    const { rows } = await q.query<{ lien_quan_den: string; tu_buoc_id: string }>("SELECT lien_quan_den, tu_buoc_id FROM docflow.hanh_trinh WHERE id = $1", [d.hanh_trinh_id]);
    expect(rows[0].tu_buoc_id).toBe(bGuiLai);
    expect(await buoc(d.buoc_ids[0])).toMatchObject({ loai: "gui_moi", den_don_vi: "ban-tgd", den_nguoi: "photgd@scigroup.vn" });
    const tl = await q.query<{ lien_quan_den: string }>("SELECT lien_quan_den FROM docflow.tai_lieu WHERE id = $1", [f1.tai_lieu_id]);
    expect(tl.rows[0].lien_quan_den).toBe(enc);
    // chỉ Phó TGĐ (người nhận cụ thể) xử lý được bước này, TGĐ cùng Ban thì không
    await expect(tx((x) => nhan(x, U["tgd"], d.buoc_ids[0]))).rejects.toMatchObject({ status: 403 });
    await tx((x) => nhan(x, U["photgd"], d.buoc_ids[0]));
  });

  it("P.TCKT hoàn thành: nhánh dừng; cây hành trình đúng hình dạng ví dụ", async () => {
    const cay0 = await cayHanhTrinh(q, enc);
    const tckt = cay0[0].con[0].con[0].con.find((n) => n.den_don_vi === "p-tckt")!;
    await tx((x) => hoanThanh(x, U["truong.tckt"], tckt.buoc_id));

    const cay = await cayHanhTrinh(q, enc);
    expect(cay).toHaveLength(1);
    expect(hinh(cay[0])).toEqual({
      "gui→p-dtpc": [
        {
          "tra_lai→sci-enc": [
            {
              "gui_lai→p-dtpc": ["chuyen_tiep→ban-tgd", { "chuyen_tiep_kem→p-tckt": ["hoan_thanh→-"] }, "gui_moi→photgd@scigroup.vn"],
            },
          ],
        },
      ],
    });
    const goc = cay[0];
    expect(goc).toMatchObject({ trang_thai: "bi_tra_lai", tu_ten: "SCI E&C", den_ten: "Phòng Đầu tư và Pháp chế", phien_ban: 1 });
    const tl = goc.con[0];
    expect(tl.ly_do).toBe("thiếu số liệu thu vốn NK1");
    const gl = tl.con[0];
    expect(gl).toMatchObject({ phien_ban: 2, trang_thai: "da_xu_ly" });
    expect(gl.nhan_luc).toBeTruthy();
    const [ctA, ctB, moiD] = gl.con;
    expect(ctA.trang_thai).toBe("cho_nhan");
    expect(ctB.tep_kem).toEqual([expect.objectContaining({ ten: "YKien_PhapLy_ThuVon.docx" })]);
    expect(ctB.trang_thai).toBe("hoan_thanh");
    expect(moiD).toMatchObject({ lien_quan: true, den_ten: "Phó TGĐ phụ trách", tai_lieu_ten: "BaoCao_Tuan29_PDTPC.docx", trang_thai: "da_nhan" });

    // file kèm cũng thấy hành trình của nó; Form 1 mới có hành trình riêng
    expect((await cayHanhTrinh(q, ctB.tep_kem[0].tai_lieu_id)).length).toBe(1);
    const cayF1 = await cayHanhTrinh(q, moiD.tai_lieu_id);
    expect(cayF1.map(hinh)).toEqual(["gui_moi→photgd@scigroup.vn"]);
  });

  it("hộp xử lý chỉ hiện nút hợp lệ theo bước và quyền", async () => {
    const dtpc = await thongTinTaiLieuGui(q, U["truong.dtpc"], enc);
    const cuaDtpc = dtpc.buoc_cua_toi.find((b) => b.buoc_id === bGuiLai)!;
    expect(cuaDtpc.thao_tac).toEqual(["chuyen_tiep", "chuyen_tiep_kem", "gui_moi", "hoan_thanh"]);
    expect(dtpc.buoc_cua_toi.find((b) => b.buoc_id === b1)!.thao_tac).toEqual([]);
    const tgd = await thongTinTaiLieuGui(q, U["tgd"], enc);
    expect(tgd.buoc_cua_toi.map((b) => b.thao_tac)).toEqual([["nhan", "chuyen_tiep", "chuyen_tiep_kem", "tra_lai", "gui_moi", "hoan_thanh"]]);
    const hung = await thongTinTaiLieuGui(q, U["hung.tv"], enc);
    expect(hung.buoc_cua_toi).toEqual([]);
    expect(hung.cay).toHaveLength(1); // ai cũng xem được cây
    expect(thaoTacHopLe({ loai: "tra_lai", trang_thai: "cho_nhan", tu_don_vi: "p-dtpc" }, { nguoi_gui_that: null })).toEqual(["gui_lai", "hoan_thanh"]);
    expect(dtpc.tai_lieu_lien_quan.map((x) => x.ten)).toEqual(["BaoCao_Tuan29_PDTPC.docx"]);
    expect(dtpc.phien_ban.map((p) => p.phien_ban)).toEqual([1, 2]);
  });
});

describe("gửi nhiều nơi, cấu hình, người ngoài 9 đơn vị", () => {
  it("gửi một lần cho nhiều nơi: mỗi nơi một bước, một trạng thái riêng", async () => {
    const t = await taiLen(U["nv.bqlda"], "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const kq = await tx((x) => gui(x, U["nv.bqlda"], { tai_lieu_id: t.tai_lieu_id!, den: ["p-dtpc", "p-ktvh", "p-dtpc"] }));
    expect(kq.buoc_ids).toHaveLength(2);
    await tx((x) => nhan(x, U["truong.ktvh"], kq.buoc_ids[1]));
    expect((await buoc(kq.buoc_ids[0])).trang_thai).toBe("cho_nhan");
    expect((await buoc(kq.buoc_ids[1])).trang_thai).toBe("da_nhan");
    const cay = await cayHanhTrinh(q, t.tai_lieu_id!);
    expect(cay.map((n) => [n.den_don_vi, n.trang_thai])).toEqual([
      ["p-dtpc", "cho_nhan"],
      ["p-ktvh", "da_nhan"],
    ]);
  });

  it("bản chưa đạt kiểm tra không gửi được (nút Gửi khóa ở phía server)", async () => {
    // mẫu bản 6 bỏ ô Người lập: bản 1 chưa tích Kỳ báo cáo (ô bắt buộc còn lại)
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.o.ky_bao_cao = { chon: "", tuan: "......./2026" };
    const ban1 = await taoBaoCao("form-7", g);
    const t = await tx((x) => taiLenVaKiemTra(x, U["nv.bqlda"], { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx", ban1) }));
    expect(t.ket_qua.dat).toBe(false);
    await expect(tx((x) => gui(x, U["nv.bqlda"], { tai_lieu_id: t.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toThrow(/chưa đạt kiểm tra.*Chưa ghi số tuần/); // mẫu bản 9: không còn hộp tích kỳ
    // Tải lại bản đã sửa: phiên bản 2 cùng tài liệu, lịch sử giữ bản 1
    const t2 = await tx((x) => taiLenVaKiemTra(x, U["nv.bqlda"], { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), tai_lieu_id: t.tai_lieu_id }));
    expect(t2).toMatchObject({ tai_lieu_id: t.tai_lieu_id, phien_ban: 2 });
    expect(t2.ket_qua.dat).toBe(true);
    const ls = await q.query<{ chi_tiet: { dat: boolean; phien_ban: number } }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'kiem_tra' ORDER BY id",
      [t.tai_lieu_id],
    );
    expect(ls.rows.map((r) => [r.chi_tiet.phien_ban, r.chi_tiet.dat])).toEqual([
      [1, false],
      [2, true],
    ]);
    const kq = await tx((x) => gui(x, U["nv.bqlda"], { tai_lieu_id: t.tai_lieu_id!, den: ["p-dtpc"] }));
    expect(kq.buoc_ids).toHaveLength(1);
  });

  it("cấu hình 'ai được chuyển tiếp cho ai' và 'chuyển tiếp phải kiểm tra lại'", async () => {
    const t = await taiLen(U["nv.enc"], "BaoCao_Thang7_SCI_ENC_ban2.docx");
    const kq = await tx((x) => gui(x, U["nv.enc"], { tai_lieu_id: t.tai_lieu_id!, den: ["p-dtpc"] }));
    await datCauHinh(q, "gui", { ...MAC_DINH.gui, duoc_chuyen_tiep: { "*": ["*"], "p-dtpc": ["ban-tgd"] } });
    await expect(tx((x) => chuyenTiep(x, U["truong.dtpc"], { buoc_id: kq.buoc_ids[0], den: ["p-tckt"] }))).rejects.toMatchObject({ status: 403 });
    const ok = await tx((x) => chuyenTiep(x, U["truong.dtpc"], { buoc_id: kq.buoc_ids[0], den: ["ban-tgd"] }));
    expect(ok.buoc_ids).toHaveLength(1);
    // chuyển tiếp ngầm nhận bước đang chờ
    expect((await buoc(kq.buoc_ids[0])).trang_thai).toBe("da_xu_ly");
    await xoaCauHinh(q, "gui");
  });

  it("người chưa gán đơn vị: chặn gửi mặc định", async () => {
    const nd = U["nguoimoi"];
    const r = await tx((x) => taiLenVaKiemTra(x, nd, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx") }));
    expect(r.tai_lieu_id).toBeNull(); // không có thư mục đơn vị để lưu nháp
    const tl = await taiLen(U["nv.bqlda"], "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    await expect(tx((x) => gui(x, nd, { tai_lieu_id: tl.tai_lieu_id!, den: ["p-dtpc"] }))).rejects.toMatchObject({ status: 403 });
  });

  it("đơn vị riêng / nhóm Cá nhân: gửi tự do không sinh việc, tự chọn nơi nhận", async () => {
    await q.query(
      `INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, cha_id, loai, thu_tu) VALUES ('vp-hdqt','Văn phòng HĐQT','VP HĐQT',0,NULL,'rieng',20)
       ON CONFLICT DO NOTHING`,
    );
    await q.query("UPDATE identity.nguoi_dung SET don_vi_id = 'vp-hdqt', cap_chuc_vu = 0 WHERE id = 'nguoimoi@scigroup.vn'");
    const nd = await nguoi("nguoimoi@scigroup.vn");
    const t = await tx((x) => taiLenVaKiemTra(x, nd, { tep: tep("YKien_PhapLy_ThuVon.docx") }));
    expect(t.ket_qua).toMatchObject({ dat: true, tu_do: true, cong_viec: [] });
    await expect(tx((x) => gui(x, nd, { tai_lieu_id: t.tai_lieu_id!, den: [] }))).rejects.toThrow(/nơi nhận/);
    const soGhi = goi("ghiVaoSoCai").length;
    const kq = await tx((x) => gui(x, nd, { tai_lieu_id: t.tai_lieu_id!, den: ["ban-tgd"] }));
    expect(kq.so_cai).toEqual([]);
    expect(goi("ghiVaoSoCai").length).toBe(soGhi);
    await q.query("UPDATE identity.nguoi_dung SET don_vi_id = NULL, cap_chuc_vu = NULL WHERE id = 'nguoimoi@scigroup.vn'");
  });

  it("ghi chú giả lập", () => {
    // In ra để báo cáo: hàm nào của module khác phải giả lập khi chạy test này
    expect(typeof tomTatGiaLap()).toBe("string");
  });
});
