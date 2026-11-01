// thu-muc: tên tài liệu đi theo tên file của phiên bản hiện tại (bản cũ giữ tên cũ trong phiên bản + lịch sử),
// tên tự đặt (trích yếu) giữ nguyên; lịch sử tải lên / xóa / khôi phục có thiết bị khi chạy trong ngữ cảnh yêu cầu.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query, tx } from "@/lib/db";
import { taoTaiLieu, themPhienBan, thuMucCuaDonVi, datVaoThuMuc, xoaViTri, khoiPhucViTri, docPhienBan, tenSauPhienBanMoi } from "@/lib/thu-muc/dich-vu";
import { noiDungThuMuc, timTaiLieu } from "@/lib/thu-muc/truy-van";
import { lichSuDoiTuong } from "@/lib/lich-su/doc";
import { kiemTraChuoi } from "@/lib/lich-su/ghi";
import { chayVoiNguCanh } from "@/lib/ngu-canh";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui, guiLai, traLai } from "@/lib/gui/dich-vu";
import { khoTam, tep as tepWord } from "../fixtures/chuan-bi";

const tep = (ten: string, noiDung: string) => ({ ten_tep: ten, mime: "text/plain", noi_dung: Buffer.from(noiDung, "utf8") });
const BAN1 = "BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx";
const BAN2 = "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx";

describe("thu-muc · tên theo bản mới, thiết bị trong lịch sử", () => {
  beforeAll(async () => {
    khoTam(); // kho file tạm, không ghi vào data/files
    await csdlMoi();
  });

  it("quy tắc đặt tên: tên đang là tên file cũ → theo file mới; tên tự đặt → giữ", () => {
    expect(tenSauPhienBanMoi("a_ban1.docx", ["a_ban1.docx"], "a_ban2.docx")).toBe("a_ban2.docx");
    expect(tenSauPhienBanMoi("a_ban2.docx", ["a_ban1.docx", "a_ban2.docx"], "a_ban3.docx")).toBe("a_ban3.docx");
    expect(tenSauPhienBanMoi("Công văn số 12 về GPMB", ["cv12.pdf"], "cv12_sua.pdf")).toBe("Công văn số 12 về GPMB");
    expect(tenSauPhienBanMoi("a.docx", ["a.docx"], "  ")).toBe("a.docx");
  });

  it("bản 2 đổi tên tài liệu ở mọi thư mục; bản 1 giữ tên cũ trong phiên bản và lịch sử", async () => {
    const q = await layQ();
    const gd = await nguoi("gd.bqlda@scigroup.vn");
    const tgd = await nguoi("tgd@scigroup.vn");
    const di = await thuMucCuaDonVi(q, "bqlda-qt", "di");
    const den = await thuMucCuaDonVi(q, "p-dtpc", "den");
    const a = await tx((t) => taoTaiLieu(t, { ten: BAN1, nguoi: gd.id, don_vi_lap: "bqlda-qt", thu_muc_id: di, tep: tep(BAN1, "bản 1") }));
    await datVaoThuMuc(q, { tai_lieu_id: a.tai_lieu_id, thu_muc_id: den, vai: "den", nguoi: gd.id });

    const pb2 = await chayVoiNguCanh({ thiet_bi: "10.1.1.7 Edge" }, () =>
      tx((t) => themPhienBan(t, a.tai_lieu_id, { nguoi: gd.id, tep: tep(BAN2, "bản 2") })),
    );
    expect(pb2).toBe(2);

    const { rows } = await query<{ ten: string }>("SELECT ten FROM docflow.tai_lieu WHERE id = $1", [a.tai_lieu_id]);
    expect(rows[0].ten).toBe(BAN2);
    expect((await docPhienBan(q, a.tai_lieu_id, 1)).thong_tin.ten_tep).toBe(BAN1);
    expect((await docPhienBan(q, a.tai_lieu_id)).thong_tin.ten_tep).toBe(BAN2);

    // Thư mục Đi của nơi gửi và Đến của nơi nhận cùng thấy tên mới
    for (const tm of [di, den]) {
      const nd = await noiDungThuMuc(q, tgd, tm);
      const dong = nd.tai_lieu.find((d) => d.tai_lieu_id === a.tai_lieu_id)!;
      expect(dong.ten).toBe(BAN2);
      expect(dong.ten_tep).toBe(BAN2);
      expect(dong.phien_ban).toBe(2);
    }
    expect((await timTaiLieu(q, "ban2")).some((d) => d.tai_lieu_id === a.tai_lieu_id)).toBe(true);

    const ls = await lichSuDoiTuong(q, "tai_lieu", a.tai_lieu_id);
    expect(ls.map((d) => d.hanh_dong)).toEqual(["tai_len", "tai_len"]);
    expect(ls[0].chi_tiet.ten).toBe(BAN1);
    expect(ls[0].chi_tiet.ten_tep).toBe(BAN1);
    expect(ls[0].thiet_bi).toBeNull(); // ngoài ngữ cảnh yêu cầu
    expect(ls[1].chi_tiet).toMatchObject({ phien_ban: 2, ten_tep: BAN2, ten_cu: BAN1, ten: BAN2 });
    expect(ls[1].thiet_bi).toBe("10.1.1.7 Edge");

    // Bản 3 cùng tên file → không đổi tên, không ghi ten_cu
    await tx((t) => themPhienBan(t, a.tai_lieu_id, { nguoi: gd.id, tep: tep(BAN2, "bản 3") }));
    const ls3 = await lichSuDoiTuong(q, "tai_lieu", a.tai_lieu_id);
    expect(ls3[2].chi_tiet.ten_cu).toBeUndefined();
    expect(await kiemTraChuoi(q)).toBeNull();
  });

  it("tên tự đặt (trích yếu) không bị file bản mới ghi đè", async () => {
    const q = await layQ();
    const gd = await nguoi("gd.bqlda@scigroup.vn");
    const di = await thuMucCuaDonVi(q, "bqlda-qt", "di");
    const a = await tx((t) =>
      taoTaiLieu(t, { ten: "Công văn xin gia hạn GPMB", nguoi: gd.id, don_vi_lap: "bqlda-qt", thu_muc_id: di, tep: tep("cv.pdf", "1") }),
    );
    await tx((t) => themPhienBan(t, a.tai_lieu_id, { nguoi: gd.id, tep: tep("cv_sua.pdf", "2") }));
    const { rows } = await query<{ ten: string }>("SELECT ten FROM docflow.tai_lieu WHERE id = $1", [a.tai_lieu_id]);
    expect(rows[0].ten).toBe("Công văn xin gia hạn GPMB");
    expect((await docPhienBan(q, a.tai_lieu_id)).thong_tin.ten_tep).toBe("cv_sua.pdf");
  });

  it("tải lên, xóa, khôi phục trong ngữ cảnh yêu cầu đều ghi thiết bị (không đổi chữ ký hàm)", async () => {
    const q = await layQ();
    const hung = await nguoi("hung.tv@scigroup.vn");
    const di = await thuMucCuaDonVi(q, "p-ktvh", "di");
    const tb = "172.16.0.3 Mozilla/5.0 (Windows NT 10.0)";
    const id = await chayVoiNguCanh({ thiet_bi: tb, nguoi: hung.id }, async () => {
      const a = await tx((t) => taoTaiLieu(t, { ten: "X.docx", nguoi: hung.id, don_vi_lap: "p-ktvh", thu_muc_id: di, tep: tep("X.docx", "x") }));
      const vt = await query<{ id: string }>("SELECT id FROM docflow.vi_tri WHERE tai_lieu_id = $1", [a.tai_lieu_id]);
      await tx((t) => xoaViTri(t, hung, vt.rows[0].id));
      await tx((t) => khoiPhucViTri(t, hung, vt.rows[0].id));
      return a.tai_lieu_id;
    });
    const ls = await lichSuDoiTuong(q, "tai_lieu", id);
    expect(ls.map((d) => d.hanh_dong)).toEqual(["tai_len", "xoa", "khoi_phuc"]);
    expect(ls.every((d) => d.thiet_bi === tb)).toBe(true);
    expect(await kiemTraChuoi(q)).toBeNull();
  });

  it("gửi lại bản 2 (guiLai): tên mới ở Đến/Đi mọi đơn vị, thông báo dùng tên mới, dòng gui_lai có thiết bị", async () => {
    const q = await layQ();
    const nv = await nguoi("nv.enc@scigroup.vn");
    const truong = await nguoi("truong.dtpc@scigroup.vn");
    const tgd = await nguoi("tgd@scigroup.vn");
    const B1 = "BaoCao_Thang7_SCI_ENC.docx";
    const B2 = "BaoCao_Thang7_SCI_ENC_ban2.docx";
    const t = await tx((x) => taiLenVaKiemTra(x, nv, { tep: tepWord(B1) }));
    const id = t.tai_lieu_id!;
    const kq = await tx((x) => gui(x, nv, { tai_lieu_id: id, den: [] }));
    const bTra = await tx((x) => traLai(x, truong, { buoc_id: kq.buoc_ids[0], ly_do: "thiếu số liệu" }));
    const tb = "10.9.9.9 Chrome/130";
    const r = await chayVoiNguCanh({ thiet_bi: tb }, () => tx((x) => guiLai(x, nv, { buoc_tra_lai_id: bTra, tep: tepWord(B2) })));
    expect(r.phien_ban).toBe(2);

    const vt = await query<{ thu_muc_id: string; don_vi_id: string; loai: string }>(
      `SELECT v.thu_muc_id, t.don_vi_id, t.loai FROM docflow.vi_tri v JOIN docflow.thu_muc t ON t.id = v.thu_muc_id
       WHERE v.tai_lieu_id = $1 AND NOT v.da_xoa`,
      [id],
    );
    expect(vt.rows.map((v) => `${v.don_vi_id}:${v.loai}`)).toEqual(expect.arrayContaining(["p-dtpc:den", "sci-enc:di", "sci-enc:den"]));
    for (const v of vt.rows) {
      const nd = await noiDungThuMuc(q, tgd, v.thu_muc_id);
      const dong = nd.tai_lieu.find((d) => d.tai_lieu_id === id)!;
      expect(dong.ten).toBe(B2);
      expect(dong.phien_ban).toBe(2);
    }
    expect((await docPhienBan(q, id, 1)).thong_tin.ten_tep).toBe(B1);
    const ls = await lichSuDoiTuong(q, "tai_lieu", id);
    const taiLen = ls.filter((d) => d.hanh_dong === "tai_len");
    expect(taiLen[0].chi_tiet.ten_tep).toBe(B1);
    expect(taiLen.at(-1)!.chi_tiet).toMatchObject({ ten_cu: B1, ten: B2, phien_ban: 2 });
    const dongGuiLai = ls.find((d) => d.hanh_dong === "gui_lai")!;
    expect(dongGuiLai.thiet_bi).toBe(tb);
    expect(ls.filter((d) => d.hanh_dong === "gui" || d.hanh_dong === "tra_lai").every((d) => d.thiet_bi === null)).toBe(true);
    const tbao = await query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE noi_dung LIKE '%gửi lại bản 2%' ORDER BY id DESC LIMIT 1");
    expect(tbao.rows[0]?.noi_dung).toContain(B2);
    expect(await kiemTraChuoi(q)).toBeNull();
  });
});
