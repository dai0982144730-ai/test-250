// Dạng luật code chạy trên FILE VÍ DỤ THẬT (mau-word/vi-du/*.docx, mau-word/form-6.docx) qua docWord,
// với định nghĩa mẫu thật (mau-word/dinh-nghia.json) và phân giải tên bằng danh bạ gieo sẵn (CSDL RAM).
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { docWord, type NoiDungWord } from "@/lib/kiem-tra/doc-word";
import { docKyBaoCao } from "@/lib/kiem-tra/chuan-hoa";
import { napDanhBa, timTen, type DanhBa } from "@/lib/kiem-tra/phan-giai";
import { LOAI_LUAT, kiemThamSo, docThanhLoi } from "@/lib/luat/loai-luat";
import type { NguCanhKiem } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";
import DINH_NGHIA from "../../mau-word/dinh-nghia.json";
import { csdlMoi } from "../helpers/csdl";

type MauJson = { ma: string; ten: string; dinh_nghia: { o_nhap: DinhNghiaMauRutGon["o_nhap"]; bang: DinhNghiaMauRutGon["bang"]; muc_bat_buoc: string[] } };

function mauRutGon(ma: string): DinhNghiaMauRutGon {
  const m = (DINH_NGHIA as unknown as MauJson[]).find((x) => x.ma === ma)!;
  return { ma: m.ma, ten: m.ten, o_nhap: m.dinh_nghia.o_nhap, bang: m.dinh_nghia.bang, muc_bat_buoc: m.dinh_nghia.muc_bat_buoc };
}

const VI_DU = path.join(process.cwd(), "mau-word", "vi-du");
const docTep = (duong: string) => docWord(fs.readFileSync(duong));

let danhBa: DanhBa;
const baoCao: Record<string, NoiDungWord> = {};

beforeAll(async () => {
  const q = await csdlMoi();
  danhBa = await napDanhBa(q);
  for (const f of fs.readdirSync(VI_DU)) baoCao[f] = await docTep(path.join(VI_DU, f));
  baoCao["form-6.docx"] = await docTep(path.join(process.cwd(), "mau-word", "form-6.docx"));
});

/** nop = ngày nộp máy ghi (mẫu bản 6 bỏ ô Ngày lập) — test truyền khi cần. */
function ngCanh(nd: NoiDungWord, coDanhBa = true, nop?: string): NguCanhKiem {
  const ky = docKyBaoCao(nd.o_nhap.ky_bao_cao ?? "");
  return {
    mau_ma: nd.mau_ma,
    ky_bao_cao: { tu: ky.tu, den: ky.den, ...(nop ? { nop } : {}) },
    gia_tri_chua_dien: ["......"],
    dinh_nghia_mau: nd.mau_ma ? mauRutGon(nd.mau_ma) : null,
    ...(coDanhBa ? { phan_giai_ten: (t: string) => timTen(t, danhBa) !== null } : {}),
  };
}

/** Chạy một luật trên một file (kiểm tham số theo mẫu thật trước). */
function chay(tep: string, loai: string, ts: Record<string, unknown>, nop?: string) {
  const nd = baoCao[tep];
  expect(nd?.mau_ma, tep).toBeTruthy();
  expect(kiemThamSo(loai, ts, mauRutGon(nd.mau_ma!)), `${loai} trên ${nd.mau_ma}`).toEqual([]);
  return LOAI_LUAT[loai].kiem(nd, ts, ngCanh(nd, true, nop));
}

const CO_BANG_CONG_VIEC = ["BaoCao_Thang7_SCI_ENC.docx", "BaoCao_HopNhat_Tuan30.docx", "BaoCao_Tuan28_BQLDA_QuangTri.docx", "BaoCao_Tuan29_BQLDA_MatO.docx", "BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "BaoCao_Tuan29_NM_NamXe.docx", "BaoCao_Tuan29_PDTPC.docx"];

describe("bảng Công việc trên các báo cáo thật", () => {
  it("có ít nhất 1 dòng (đạt mọi file); đòi 3 dòng thì Form 0/1/8 không đạt", () => {
    for (const f of CO_BANG_CONG_VIEC) expect(chay(f, "bang_toi_thieu", { bang: "bang_cong_viec", so_dong: 1 }), f).toEqual([]);
    expect(chay("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "bang_toi_thieu", { bang: "bang_cong_viec", so_dong: 3 })).toEqual([]);
    expect(chay("BaoCao_Tuan29_NM_NamXe.docx", "bang_toi_thieu", { bang: "bang_cong_viec", so_dong: 3 })).toEqual([
      { thong_diep: 'Bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI" mới có 1 dòng có nội dung, cần ít nhất 3 dòng', vi_tri: { bang: "bang_cong_viec" } },
    ]);
  });

  it("ngày bắt đầu ≤ ngày kết thúc: đạt trên file thật, bắt được khi đảo ngày", () => {
    const ts = { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "ket_thuc" } };
    for (const f of CO_BANG_CONG_VIEC) expect(chay(f, "so_sanh_ngay", ts), f).toEqual([]);
    const nd = structuredClone(baoCao["BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"]);
    nd.bang.bang_cong_viec[2].bat_dau = "20/08/2026";
    expect(LOAI_LUAT.so_sanh_ngay.kiem(nd, ts, ngCanh(nd))).toEqual([
      {
        thong_diep: 'Dòng 3 bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI": cột "Bắt đầu" (20/08/2026) phải trước hoặc bằng cột "Kết thúc" (15/08/2026)',
        vi_tri: { bang: "bang_cong_viec", dong: 3, cot: "bat_dau" },
      },
    ]);
  });

  it("nếu có tên việc thì phải có ngày kết thúc (BQLDA: dòng 2 trống); Form 0 cột Bộ phận phụ trách phải điền", () => {
    // Mẫu phiên bản 4: chỉ Form 0 có cột phụ trách — mẫu khác không có cột thì luật báo sai tham số
    expect(kiemThamSo("cot_bat_buoc", { bang: "bang_cong_viec", cot: "phu_trach" }, mauRutGon("form-7"))[0]).toMatch(/không có cột "phu_trach"/);
    expect(chay("BaoCao_HopNhat_Tuan30.docx", "cot_bat_buoc", { bang: "bang_cong_viec", cot: "phu_trach" })).toEqual([]);
    const nt = chay("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "neu_thi", {
      neu: { tham_chieu: { bang: "bang_cong_viec", cot: "ten" }, phep: "co_gia_tri" },
      thi: { tham_chieu: { bang: "bang_cong_viec", cot: "ket_thuc" }, phep: "co_gia_tri" },
    });
    expect(nt.map((l) => l.vi_tri)).toEqual([{ bang: "bang_cong_viec", dong: 2, cot: "ket_thuc" }]);
    expect(nt[0].thong_diep).toBe('Dòng 2 bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI": vì cột "Công việc" có giá trị nên cột "Kết thúc" phải có giá trị (đang trống)');
  });

  it("tên việc không trùng", () => {
    for (const f of CO_BANG_CONG_VIEC) expect(chay(f, "khong_trung", { bang: "bang_cong_viec", cot: "ten" }), f).toEqual([]);
  });
});

describe("phụ trách hợp lệ (danh bạ thật)", () => {
  it('Form 0 cột Bộ phận phụ trách: bắt được "Các GS trưởng công trường"', () => {
    const nd = structuredClone(baoCao["BaoCao_HopNhat_Tuan30.docx"]);
    nd.bang.bang_cong_viec[0].phu_trach = "SCI E&C; Các GS trưởng công trường";
    const loi = LOAI_LUAT.phu_trach_hop_le.kiem(nd, { bang: "bang_cong_viec", cot: "phu_trach" }, ngCanh(nd));
    expect(loi).toHaveLength(1);
    expect(loi[0].vi_tri).toMatchObject({ bang: "bang_cong_viec", dong: 1, cot: "phu_trach" });
    expect(loi[0].thong_diep).toMatch(/^Dòng 1 bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI": cột "Bộ phận phụ trách" có "Các GS trưởng công trường" không nhận ra/);
  });

  it("báo cáo thật đúng tên: đạt", () => {
    expect(chay("BaoCao_HopNhat_Tuan30.docx", "phu_trach_hop_le", { bang: "bang_cong_viec" })).toEqual([]);
  });

  it("không có danh bạ trong ngữ cảnh: bỏ qua", () => {
    const nd = structuredClone(baoCao["BaoCao_HopNhat_Tuan30.docx"]);
    nd.bang.bang_cong_viec[0].phu_trach = "Các GS trưởng công trường";
    expect(LOAI_LUAT.phu_trach_hop_le.kiem(nd, { bang: "bang_cong_viec" }, ngCanh(nd, false))).toEqual([]);
  });
});

describe("ô, mục, danh sách, khoảng số trên file thật", () => {
  it("kỳ báo cáo phải điền: ban2 đạt; còn ...... bị bắt; bản mất ô bị bắt (mẫu bản 6 bỏ ô Người lập / Người kiểm soát)", () => {
    const ts = { o: "ky_bao_cao" };
    expect(chay("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "o_co_gia_tri", ts)).toEqual([]);
    expect(kiemThamSo("o_co_gia_tri", { o: "nguoi_lap" }, mauRutGon("form-7"))[0]).toMatch(/ô "nguoi_lap" không có trong mẫu/);
    const chuaDien = structuredClone(baoCao["BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"]);
    chuaDien.o_nhap.ky_bao_cao = "......";
    expect(LOAI_LUAT.o_co_gia_tri.kiem(chuaDien, ts, ngCanh(chuaDien))).toEqual([
      { thong_diep: 'Ô "Kỳ báo cáo" còn để "......", cần điền', vi_tri: { tag: "ky_bao_cao" } },
    ]);
    const matO = structuredClone(baoCao["BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"]);
    delete matO.o_nhap.ky_bao_cao;
    expect(LOAI_LUAT.o_co_gia_tri.kiem(matO, ts, ngCanh(matO))[0].thong_diep).toMatch(/Không thấy ô "Kỳ báo cáo"/);
  });

  it("ngày nộp (máy ghi, mẫu bản 6) không trước ngày cuối kỳ − 3 ngày; ô Ngày lập không còn trong mẫu", () => {
    expect(kiemThamSo("o_khop_mau", { tham_chieu: { o: "ngay_lap" }, dinh_dang: "ngay" }, mauRutGon("form-7"))[0]).toMatch(/ô "ngay_lap" không có trong mẫu/);
    const ts = { a: { ky: "nop" }, phep: ">=", b: { ky: "den" }, lech_ngay: -3 };
    expect(chay("BaoCao_Thang7_SCI_ENC.docx", "so_sanh_ngay", ts, "2026-08-03")).toEqual([]);
    // PĐTPC tuần 29 (13/07–19/07 — tuần ISO, ví dụ sửa 01/10) nộp ngày 16/07: vừa đúng 19/07 − 3 ngày; siết còn − 2 ngày thì không đạt
    expect(chay("BaoCao_Tuan29_PDTPC.docx", "so_sanh_ngay", ts, "2026-07-16")).toEqual([]);
    expect(chay("BaoCao_Tuan29_PDTPC.docx", "so_sanh_ngay", { ...ts, lech_ngay: -2 }, "2026-07-16")).toEqual([
      { thong_diep: "Ngày nộp báo cáo (16/07/2026) phải sau hoặc bằng ngày cuối kỳ báo cáo − 2 ngày (17/07/2026)", vi_tri: { tag: "ky_bao_cao" } },
    ]);
    // chưa có ngày nộp (chạy thử không qua kiểm tra) → bỏ qua
    expect(chay("BaoCao_Tuan29_PDTPC.docx", "so_sanh_ngay", { ...ts, lech_ngay: -2 })).toEqual([]);
  });

  it("mục có nội dung: mục chỉ có bảng gắn mã vẫn đạt; bản mất mục bị bắt", () => {
    const ts = { muc: "RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC" };
    expect(chay("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "muc_co_noi_dung", ts)).toEqual([]);
    expect(chay("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "muc_co_noi_dung", { muc: "TIẾN ĐỘ TỔNG THỂ", so_ky_tu: 50 })).toEqual([]);
    expect(chay("BaoCao_Tuan29_BQLDA_MatO.docx", "muc_co_noi_dung", ts)).toEqual([
      { thong_diep: 'Không thấy mục "RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC" trong báo cáo', vi_tri: { tag: "muc:RỦI RO & KIẾN NGHỊ PHÒNG ĐT&PC" } },
    ]);
  });

  it("mức độ kiến nghị thuộc danh sách: ENC đạt, Nậm Xe ghi 'Trung bình' bị bắt đúng dòng", () => {
    const ts = { tham_chieu: { bang: "bang_kien_nghi", cot: "muc_do" }, danh_sach: ["Cao", "TB", "Thấp"] };
    expect(chay("BaoCao_Thang7_SCI_ENC.docx", "thuoc_danh_sach", ts)).toEqual([]);
    const loi = chay("BaoCao_Tuan29_NM_NamXe.docx", "thuoc_danh_sach", ts);
    expect(loi.map((l) => l.vi_tri?.dong)).toEqual([2, 3]);
    expect(loi[0].thong_diep).toBe('Dòng 2 bảng "VẤN ĐỀ NỔI BẬT & KIẾN NGHỊ PHÒNG KT&VH / LÃNH ĐẠO": cột "Mức độ" = "Trung bình", phải là một trong: Cao, TB, Thấp');
  });

  it("ưu tiên (Form 0) từ 1 đến 5 và không trùng", () => {
    const loi = chay("BaoCao_HopNhat_Tuan30.docx", "khoang_so", { tham_chieu: { bang: "bang_quyet_dinh", cot: "uu_tien" }, tu: 1, den: 5 });
    expect(loi).toEqual([
      {
        thong_diep: 'Dòng 5 bảng "VIỆC CẦN LÃNH ĐẠO QUYẾT ĐỊNH TUẦN NÀY": cột "Ưu tiên" = 6, phải từ 1 đến 5',
        vi_tri: { bang: "bang_quyet_dinh", dong: 5, cot: "uu_tien" },
      },
    ]);
    expect(chay("BaoCao_HopNhat_Tuan30.docx", "khong_trung", { bang: "bang_quyet_dinh", cot: "uu_tien" })).toEqual([]);
    expect(chay("BaoCao_HopNhat_Tuan30.docx", "so_sanh_ngay", { a: { bang: "bang_quyet_dinh", cot: "han_quyet_dinh" }, phep: ">=", b: { ky: "tu" } })).toEqual([]);
  });
});

describe("kiemThamSo / docThanhLoi với mẫu thật", () => {
  it("bắt tag sai theo từng mẫu", () => {
    const f6 = mauRutGon("form-6");
    expect(kiemThamSo("bang_toi_thieu", { bang: "bang_ke_hoach" }, f6)).toEqual(['"Bảng": bảng "bang_ke_hoach" không có trong mẫu Báo cáo tuần SCI E&C (Form 6)']);
    expect(kiemThamSo("bang_toi_thieu", { bang: "bang_cong_viec" }, f6)).toEqual([]);
    expect(kiemThamSo("so_sanh_ngay", { a: { bang: "bang_cong_viec", cot: "han_ht" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "ket_thuc" } }, f6)).toEqual([
      '"Ngày A": bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI" không có cột "han_ht"',
    ]);
    // mẫu bản 9: Form 1 có dòng "Gửi:" ở đầu trang như mọi mẫu khác
    expect(kiemThamSo("o_co_gia_tri", { o: "gui_den" }, mauRutGon("form-1"))).toEqual([]);
    expect(kiemThamSo("o_co_gia_tri", { o: "gui_den" }, f6)).toEqual([]);
    // 20/10/2026: Form 6 bỏ chương NHÂN LỰC & AN TOÀN LAO ĐỘNG → luật trỏ vào chương đó bị bắt
    expect(kiemThamSo("muc_co_noi_dung", { muc: "VẤN ĐỀ NỔI BẬT VÀ KIẾN NGHỊ LÃNH ĐẠO" }, f6)).toEqual([]);
    expect(kiemThamSo("muc_co_noi_dung", { muc: "NHÂN LỰC & AN TOÀN LAO ĐỘNG" }, f6)).toHaveLength(1);
  });

  it("đọc thành lời bằng nhãn thật", () => {
    expect(docThanhLoi("so_sanh_ngay", { a: { bang: "bang_cong_viec", cot: "bat_dau" }, phep: "<=", b: { bang: "bang_cong_viec", cot: "ket_thuc" } }, mauRutGon("form-7"))).toBe(
      'Ở mỗi dòng bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI": cột "Bắt đầu" phải trước hoặc bằng cột "Kết thúc"',
    );
    expect(docThanhLoi("phu_trach_hop_le", { bang: "bang_cong_viec" }, mauRutGon("form-0"))).toBe(
      'Mỗi tên trong cột "Bộ phận phụ trách" của bảng "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI" phải là đơn vị hoặc người có trong hệ thống',
    );
    expect(docThanhLoi("o_co_gia_tri", { o: "ky_bao_cao" }, mauRutGon("form-1"))).toBe('Ô "Kỳ báo cáo" phải được điền (không để trống hay "......")');
  });
});
