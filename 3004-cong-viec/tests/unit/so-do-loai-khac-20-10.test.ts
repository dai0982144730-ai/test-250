// Mr. Đại chốt 20/10/2026 — Sơ đồ tổ chức + Báo cáo tuần:
//   mục 4–5  việc dự án Loại khác chỉ đếm lên tới SCI E&C / SCI PMC, không cộng vào P.ĐT&PC, Ban lãnh đạo
//   mục 7b   dự án Loại khác có Ban điều hành dưới E&C → ô Ban điều hành thay ô dự án, việc E&C của dự án dồn vào đó
//   mục 7    ô có dòng nhóm bung/gập cao thêm, giữ cột khi gập (bo-cuc.ts)
//   mục 6    4 nhóm của "Cần BLĐ ra quyết định" (can-quyet-nhom.ts)
import { describe, it, expect } from "vitest";
import { CAO_NHOM, docNhomGap, xepSoDo } from "@/components/phong/bo-cuc";
import { oBdhThayDuAn, oDemViecLoaiKhac, oTatCaCua, taoDoiViec, type DuLieuDoiViec } from "@/components/phong/doi-viec";
import type { ViecApi } from "@/components/phong/viec";
import type { OSoDo } from "@/lib/phong/so-do";
import type { DuAn } from "@/lib/phong/du-an-thuan";
import { xepNhomCanQuyet, type DuLieuXep } from "@/lib/bao-cao-tuan/can-quyet-nhom";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { kiemTra } from "@/lib/cau-hinh/kiem-tra";
import type { Q } from "@/lib/db";
import { ghepBdhLoaiKhac } from "@/lib/du-an-main-thuan";

const o = (id: string, cha: string | null, cap: number, thu_tu: number): OSoDo => ({ id, ten: id, ten_ngan: id, cap, loai: "don_vi", mau_ma: null, thu_tu, cha });
const O: OSoDo[] = [
  o("ban-tgd", null, 1, 0),
  o("p-dtpc", "ban-tgd", 2, 1),
  o("p-ktvh", "ban-tgd", 2, 2),
  o("sci-pmc", "p-dtpc", 3, 5),
  o("sci-enc", "p-dtpc", 3, 6),
  o("bqlda-qt", "p-dtpc", 3, 7),
  o("bdh-nammo1", "sci-enc", 4, 40),
  o("bdh-huongviet", "bqlda-qt", 4, 15),
  o("nm-namxe", "p-ktvh", 3, 8),
];
const da = (id: string, ten: string, nhom: "sci" | "khac", don_vi: string[], ban_dieu_hanh?: string): DuAn =>
  ({ id, ten, loai: "thuy_dien", nhom, don_vi, ban_dieu_hanh, ten_khac: [] }) as unknown as DuAn;
const DA: DuAn[] = [
  da("NM1", "Nậm Mô 1", "khac", ["sci-pmc", "sci-enc"], "bdh-nammo1"),
  da("NM2", "Nậm Mô 2", "khac", ["sci-enc"]),
  da("HV", "Hướng Việt", "sci", ["bqlda-qt", "sci-pmc", "sci-enc"], "bdh-huongviet"),
];
const DL: DuLieuDoiViec = { o: O, lanh_dao: [], nguoi: [], hom_nay: "2026-10-20", du_an: DA };

describe("7b — ô Ban điều hành thay ô dự án dưới SCI E&C", () => {
  it("NM1 có BĐH dưới SCI E&C → bỏ ô NM1@sci-enc, giữ NM1@sci-pmc; NM2 chưa có BĐH → giữ ô dự án; HV là dự án SCI → không đụng", () => {
    expect([...oBdhThayDuAn(DL)]).toEqual([["NM1@sci-enc", "bdh-nammo1"]]);
    const ids = oTatCaCua(DL).map((x) => x.id);
    expect(ids).not.toContain("NM1@sci-enc");
    expect(ids).toEqual(expect.arrayContaining(["NM1@sci-pmc", "NM2@sci-enc", "HV@sci-pmc", "HV@sci-enc"]));
  });
  // Kiểm độc lập lần 6, K2-2: dữ liệu thật 20/10 — Main KHÔNG gắn ban_dieu_hanh cho dự án Loại khác (rỗng / chuỗi trống),
  // ô BĐH vẫn nằm dưới SCI E&C → không thay ô nào, ô dự án dưới E&C giữ nguyên
  it("Loại khác chưa gắn Ban điều hành (như máy thật) → không thay ô; ô BĐH mồ côi vẫn đứng dưới SCI E&C", () => {
    const DA_THAT = DA.map((a) => (a.nhom === "sci" ? a : ({ ...a, ban_dieu_hanh: a.id === "NM1" ? "" : undefined } as DuAn)));
    const dl = { ...DL, du_an: DA_THAT };
    expect(oBdhThayDuAn(dl).size).toBe(0);
    const tat = oTatCaCua(dl);
    expect(tat.map((x) => x.id)).toEqual(expect.arrayContaining(["NM1@sci-enc", "NM1@sci-pmc", "NM2@sci-enc", "bdh-nammo1"]));
    expect(tat.find((x) => x.id === "bdh-nammo1")?.cha).toBe("sci-enc");
  });
  it("Ban điều hành có cha KHÔNG phải đơn vị làm dự án → không thay ô", () => {
    const dl = { ...DL, o: O.map((x) => (x.id === "bdh-nammo1" ? { ...x, cha: "p-ktvh" } : x)) };
    expect(oBdhThayDuAn(dl).size).toBe(0);
  });
});

describe("4–5 — việc dự án Loại khác dừng ở SCI E&C / SCI PMC", () => {
  const tat = oTatCaCua(DL);
  const theoId = Object.fromEntries(tat.map((x) => [x.id, x]));
  const bc = xepSoDo(tat.map((x) => ({ id: x.id, cha: x.cha, thu_tu: x.thu_tu })));
  const doi = taoDoiViec(DL, bc, theoId);
  const viec = (id: string, du_an: string | null, dv: string, ten = "Việc thử test"): ViecApi =>
    ({
      id,
      ten,
      du_an,
      ket_qua_can_co: null,
      luon_mo: false,
      bat_dau: "2026-10-01",
      ket_thuc: "2026-10-30",
      giao_boi: null,
      don_vi_giao: null,
      phan_viec: [{ id: `${id}-1`, phu_trach_loai: "don_vi", phu_trach_id: dv, ket_thuc: "2026-10-30", trang_thai: "dang_lam", vai: "chu_tri" }],
    }) as ViecApi;

  it("chuỗi đếm: BĐH Nậm Mô 1 → SCI E&C là dừng (không P.ĐT&PC, không Ban lãnh đạo)", () => {
    expect(oDemViecLoaiKhac(["bdh-nammo1"], DA[0], DA, theoId, "ban-tgd")).toEqual(["bdh-nammo1", "sci-enc"]);
    expect(oDemViecLoaiKhac(["NM2@sci-enc"], DA[1], DA, theoId, "ban-tgd")).toEqual(["NM2@sci-enc", "sci-enc"]);
    // không gặp đơn vị làm nào: dừng trước ô gốc; ô chủ trì luôn được đếm
    expect(oDemViecLoaiKhac(["p-ktvh"], DA[1], DA, theoId, "ban-tgd")).toEqual(["p-ktvh"]);
    expect(oDemViecLoaiKhac(["ban-tgd"], DA[1], DA, theoId, "ban-tgd")).toEqual(["ban-tgd"]);
  });
  it("việc của SCI E&C ghi dự án Nậm Mô 1 → dồn vào ô BĐH Nậm Mô 1, tên bên phụ trách vẫn là SCI E&C; chỉ đếm tới SCI E&C", () => {
    const v = doi(viec("CV-2026-9001", "Nậm Mô 1", "sci-enc"));
    expect(v.nut).toEqual(["bdh-nammo1"]);
    expect(v.pt[0].nut).toBe("sci-enc");
    expect(v.duoc).toEqual(["bdh-nammo1", "sci-enc"]);
  });
  it("việc của SCI PMC dự án Nậm Mô 1 → ô NM1@sci-pmc, đếm tới SCI PMC", () => {
    const v = doi(viec("CV-2026-9002", "Nậm Mô 1", "sci-pmc"));
    expect(v.nut).toEqual(["NM1@sci-pmc"]);
    expect(v.duoc).toEqual(["NM1@sci-pmc", "sci-pmc"]);
  });
  it("việc dự án SCI đầu tư và việc nội bộ không gắn dự án: không giới hạn — vẫn lên P.ĐT&PC (mục 5b)", () => {
    expect(doi(viec("CV-2026-9003", "Hướng Việt", "sci-enc")).duoc).toBeUndefined();
    const noiBo = doi(viec("CV-2026-9004", null, "sci-enc", "Họp giao ban nội bộ test"));
    expect(noiBo.nut).toEqual(["sci-enc"]);
    expect(noiBo.duoc).toBeUndefined();
  });
});

describe("7 — ô có dòng nhóm bung/gập", () => {
  const N = (id: string, cha: string | null, thu_tu: number) => ({ id, cha, thu_tu });
  const ds = [N("ban-tgd", null, 0), N("p-dtpc", "ban-tgd", 1), N("p-ktvh", "ban-tgd", 2), N("sci-pmc", "p-dtpc", 5), N("sci-enc", "p-dtpc", 6), N("bdh-nammo1", "sci-enc", 40), N("nm-namxe", "p-ktvh", 8)];
  it("không khai nhóm: cấp 3 y 161 (khe cấp 2→3 = 19, thu còn 1/2 từ 25/10), cấp 4 y 233, cột chồng 161", () => {
    const bc = xepSoDo(ds);
    expect(bc.VT["sci-enc"]).toMatchObject({ y: 161, h: 46 });
    expect(bc.VT["bdh-nammo1"]).toMatchObject({ y: 233, h: 38 });
    expect(bc.VT["nm-namxe"]).toMatchObject({ y: 161, h: 46 });
  });
  it("ô có nhóm cao thêm CAO_NHOM; P.KT&VH (cấp 2) có nhóm thì cả hàng cấp 3 dời xuống", () => {
    const bc = xepSoDo(ds, new Set(["sci-enc", "p-ktvh"]));
    expect(bc.VT["p-ktvh"].h).toBe(48 + CAO_NHOM);
    expect(bc.VT["sci-enc"]).toMatchObject({ y: 161 + CAO_NHOM, h: 46 + CAO_NHOM });
    expect(bc.VT["bdh-nammo1"].y).toBe(161 + CAO_NHOM + 46 + CAO_NHOM + 26);
  });
  it("đang gập (bỏ ô con khỏi bố cục) vẫn giữ cột: SCI PMC / SCI E&C đứng hàng ngang, P.KT&VH giữ cột riêng", () => {
    const gap = ds.filter((x) => x.id !== "bdh-nammo1" && x.id !== "nm-namxe");
    const nhom = new Set(["sci-enc", "p-ktvh"]);
    const mo = xepSoDo(ds, nhom);
    const dong = xepSoDo(gap, nhom);
    expect(dong.W).toBe(mo.W);
    for (const id of ["p-dtpc", "p-ktvh", "sci-pmc", "sci-enc"]) expect(dong.VT[id].x).toBe(mo.VT[id].x);
    expect(dong.VT["sci-pmc"].y).toBe(dong.VT["sci-enc"].y); // không bị xếp chồng dọc
    expect(dong.H).toBeLessThan(mo.H);
    // vùng cố định (cấp 1–3) KHÔNG đổi khi bung/gập: mọi ô cấp 1–3 cùng toạ độ, Hcd bằng nhau (25/10)
    expect(dong.Hcd).toBe(mo.Hcd);
    for (const id of ["ban-tgd", "p-dtpc", "p-ktvh", "sci-pmc", "sci-enc"]) expect(dong.VT[id]).toEqual(mo.VT[id]);
  });
  it("đọc dòng cấu hình «mã | nhãn | tên gọi ô con»; mặc định đủ 5 nhóm anh chốt", () => {
    expect(docNhomGap(["sci-enc | Đang thi công | dự án", "p-ktvh|Các nhà máy", "sai", "sci-enc | trùng"])).toEqual([
      { id: "sci-enc", nhan: "Đang thi công", ten_con: "dự án" },
      { id: "p-ktvh", nhan: "Các nhà máy", ten_con: "đơn vị" },
    ]);
    expect(docNhomGap(MAC_DINH.giao_dien.nhom_gap_so_do).map((n) => `${n.id}:${n.nhan}`)).toEqual([
      "sci-pmc:Đang thiết kế",
      "sci-enc:Đang thi công",
      "bqlda-lao:Các dự án Lào",
      "bqlda-qt:Các dự án QT",
      "p-ktvh:Các nhà máy",
    ]);
  });
  it("Cài đặt chặn dòng nhóm thiếu nhãn (database giả rỗng)", async () => {
    const q = { query: async () => ({ rows: [] }) } as unknown as Q;
    expect((await kiemTra(q, "giao_dien", { ...MAC_DINH.giao_dien, nhom_gap_so_do: ["sci-enc"] })).join(" ")).toContain("Nhóm bung/gập");
    expect(await kiemTra(q, "giao_dien", MAC_DINH.giao_dien)).toEqual([]);
  });
});

describe("6 — 4 nhóm Cần BLĐ ra quyết định", () => {
  const X: DuLieuXep = { du_an: DA, cha: { "bdh-nammo1": "sci-enc", "bdh-huongviet": "bqlda-qt", "sci-enc": "p-dtpc", "bqlda-qt": "p-dtpc", "p-dtpc": "ban-tgd", "p-hcth": "ban-tgd" } };
  const x = (noi_dung: string, ...dv: string[]) => xepNhomCanQuyet({ noi_dung, don_vi: dv.map((id) => ({ id })) }, X);
  it("dự án Loại khác — mọi giai đoạn → ENC đề xuất, kể cả khi SCI E&C gửi (Rotor Nậm Mô 1 · TKCS Hướng Phùng 1, tuần 40)", () => {
    expect(x("Chậm cấp vật tư cho mũi đào hầm", "bdh-nammo1")).toEqual({ nhom: "enc", chac: true, du_an: "NM1" });
    expect(x("Rotor turbine TĐ Nậm Mô 1 từ nhà máy TQ dự kiến về 10/08 — nếu trễ sẽ ảnh hưởng phát điện", "sci-enc")).toMatchObject({ nhom: "enc", chac: true });
    expect(x("Dự án Nậm Mô 2: TKCS chưa được BộCT phê duyệt", "sci-enc")).toMatchObject({ nhom: "enc", chac: true });
  });
  it("dự án SCI đầu tư, giai đoạn theo NỘI DUNG: pháp lý / GPMB / thiết kế / đấu thầu → Trước khởi công (GPMB lúc đang thi công vẫn vậy)", () => {
    expect(x("Hướng Việt vướng GPMB 3 hộ dân, đề nghị UBND huyện hỗ trợ", "bqlda-qt")).toMatchObject({ nhom: "truoc_khoi_cong", chac: true });
    expect(x("TKCS ĐG Hướng Việt bị Bộ Công Thương kéo dài thẩm định (77 ngày > KH 60 ngày)", "p-dtpc")).toMatchObject({ nhom: "truoc_khoi_cong", chac: true });
    expect(x("01 HSDT gói thầu MBA 110 kV Hướng Việt sai lệch kỹ thuật", "p-dtpc")).toMatchObject({ nhom: "truoc_khoi_cong", chac: true });
    expect(x("GPMB Trụ T12–T18 DA Hướng Việt chưa xong, gây chậm đường găng", "p-dtpc")).toMatchObject({ nhom: "truoc_khoi_cong", chac: true });
    // PMC gửi, không nhận ra dự án (chữ «Nam Khiên» không số), chữ chủ trương → đoán Trước khởi công, 🤖 AI xác nhận
    expect(x("TĐ Nam Khiên: Chưa có văn bản chính thức từ phía Lào về chủ trương", "sci-pmc")).toMatchObject({ nhom: "truoc_khoi_cong", chac: false });
  });
  it("thi công · nghiệm thu · thanh toán · quyết toán (kết thúc) → Thực thi, kiểm soát; BĐH tổng thầu gửi → Thực thi, kiểm soát", () => {
    expect(x("Hướng Việt: nhà thầu thi công chậm đổ bê tông móng trụ T5", "bqlda-qt")).toMatchObject({ nhom: "thuc_thi", chac: true });
    expect(x("Hướng Việt: quyết toán hạng mục đường dây chưa xong", "bqlda-qt")).toMatchObject({ nhom: "thuc_thi", chac: true });
    expect(x("Đề nghị BLĐ chốt phương án tăng ca", "bdh-huongviet")).toMatchObject({ nhom: "thuc_thi", chac: true, du_an: "HV" });
  });
  it("cả chữ trước khởi công lẫn chữ thực thi, hoặc không nhận ra dự án mà đơn vị gửi làm dự án → chưa chắc (🤖 AI xếp)", () => {
    expect(x("Hướng Việt: GPMB chậm làm nhà thầu thi công phải dừng", "bqlda-qt").chac).toBe(false);
    expect(x("Đề nghị phê duyệt phương án chung", "bqlda-qt").chac).toBe(false);
  });
  it("vận hành nhà máy, nội bộ phòng ban → Nhóm khác (chắc) — 🤖 AI tuần 40 đã xếp nhầm 2 dòng này", () => {
    expect(x("Relay bảo vệ R21 (differential relay máy phát TM2) có dấu hiệu bất thường khi kiểm tra", "nm-cannan1")).toEqual({ nhom: "khac", chac: true, du_an: null });
    expect(x("Tuabin WTG-05 ĐG Hướng Linh 8 dừng do lỗi hộp số; NCC chưa xác nhận bảo hành", "p-cd")).toEqual({ nhom: "khac", chac: true, du_an: null });
    expect(x("Đề nghị bổ sung 2 nhân sự văn thư", "p-hcth")).toEqual({ nhom: "khac", chac: true, du_an: null });
  });
  // Kiểm độc lập lần 6, F-A7: chữ giai đoạn có ranh giới từ — chuỗi con trong từ dài hơn không còn khớp
  it("ranh giới từ: «code», «update», «xây dựng quy chế» không phải chữ giai đoạn; nhiều dấu cách / xuống dòng giữa cụm vẫn khớp", () => {
    expect(x("Đề nghị cập nhật code phần mềm văn phòng", "p-hcth")).toEqual({ nhom: "khac", chac: true, du_an: null });
    expect(x("Update danh bạ nội bộ", "p-hcth")).toEqual({ nhom: "khac", chac: true, du_an: null });
    expect(x("Đề nghị xây dựng quy chế lương mới", "p-hcth")).toEqual({ nhom: "khac", chac: true, du_an: null });
    expect(x("Hướng Việt: xây dựng trạm 110 kV chậm", "bqlda-qt")).toMatchObject({ nhom: "thuc_thi", chac: true });
    expect(x("Hướng Việt: COD dự kiến lùi sang T12", "bqlda-qt")).toMatchObject({ nhom: "thuc_thi", chac: true });
    expect(x("Hướng Việt: giải   phóng mặt\nbằng còn 3 hộ", "bqlda-qt")).toMatchObject({ nhom: "truoc_khoi_cong", chac: true });
  });
});

// Mr. Đại chốt 20/10/2026 (Q1): «Ban điều hành dưới SCI E&C chính là dự án Loại khác» → máy ghép theo tên, Main không cần khai.
// Dữ liệu đúng như máy thật đo 20/10 (5 ban dưới SCI E&C, 6 dự án Loại khác, Main không gắn BĐH nào).
describe("Q1 — ghép Ban điều hành dưới SCI E&C với dự án Loại khác theo tên", () => {
  const dv = [
    { id: "bdh-nammo1", ten: "Ban điều hành dự án Nậm Mô 1", cha: "sci-enc" },
    { id: "bdh-nammo2", ten: "Ban điều hành dự án Nậm Mô 2", cha: "sci-enc" },
    { id: "bdh-huongphung1", ten: "Ban điều hành dự án Hướng Phùng 1", cha: "sci-enc" },
    { id: "bdh-mddt", ten: "Ban điều hành dự án Mỏ đá Dốc Đá Trắng", cha: "sci-enc" },
    { id: "bdh-namsam3a", ten: "Ban điều hành dự án Nậm Săm 3A", cha: "sci-enc" },
    { id: "bdh-huongviet", ten: "Ban điều hành dự án Hướng Việt", cha: "bqlda-qt" },
    { id: "p-dtpc", ten: "Phòng Đầu tư và Pháp chế", cha: "ban-tgd" },
  ];
  const lk = (id: string, ten: string, don_vi: string[], ten_khac: string[] = []): DuAn => ({ id, ten, loai: "", nhom: "khac", don_vi, ten_khac }) as unknown as DuAn;
  const ds: DuAn[] = [
    lk("NM1", "Nậm Mô 1", ["sci-pmc", "sci-enc"], ["NM 1", "TĐ Nậm Mô 1"]),
    lk("NM2", "Nậm Mô 2", ["sci-enc"]),
    lk("HP1", "Hướng Phùng 1", ["sci-pmc", "sci-enc"]),
    lk("MDDT", "Mỏ đá Dốc Đá Trắng", ["sci-enc"]),
    lk("N3A", "Nậm săm 3A", ["sci-enc"], ["Nam Sam 3A"]),
    lk("NX", "Thủy điện Nậm Xe", []),
    { ...DA[2], ban_dieu_hanh: undefined } as DuAn, // Hướng Việt — SCI đầu tư: Main giữ, không ghép dù có ban cùng tên
  ];
  it("5/5 ban ghép đúng dự án (chữ hoa/thường khác nhau vẫn ghép); dự án không có đơn vị làm và dự án SCI đầu tư không đụng", () => {
    const kq = Object.fromEntries(ghepBdhLoaiKhac(ds, dv).map((a) => [a.id, a.ban_dieu_hanh ?? null]));
    expect(kq).toEqual({ NM1: "bdh-nammo1", NM2: "bdh-nammo2", HP1: "bdh-huongphung1", MDDT: "bdh-mddt", N3A: "bdh-namsam3a", NX: null, HV: null });
  });
  it("sau khi ghép: ô BĐH thay ô dự án dưới SCI E&C (7b), ô dự án dưới SCI PMC giữ nguyên", () => {
    const o2 = [...O, o("bdh-nammo2", "sci-enc", 4, 41)];
    const dl = { ...DL, o: o2, du_an: ghepBdhLoaiKhac(DA.map((a) => (a.nhom === "sci" ? a : ({ ...a, ban_dieu_hanh: undefined } as DuAn))), [
      { id: "bdh-nammo1", ten: "Ban điều hành dự án Nậm Mô 1", cha: "sci-enc" },
      { id: "bdh-nammo2", ten: "BĐH Nậm Mô 2", cha: "sci-enc" },
    ]) };
    expect([...oBdhThayDuAn(dl)]).toEqual([["NM1@sci-enc", "bdh-nammo1"], ["NM2@sci-enc", "bdh-nammo2"]]);
    const ids = oTatCaCua(dl).map((x) => x.id);
    expect(ids).not.toContain("NM2@sci-enc");
    expect(ids).toContain("NM1@sci-pmc");
  });
  it("hai ban cùng khớp một dự án, hoặc tên không khớp → không ghép (không đoán)", () => {
    const hai = [...dv, { id: "bdh-nammo1-b", ten: "BĐH Nậm Mô 1", cha: "sci-enc" }];
    expect(ghepBdhLoaiKhac(ds, hai).find((a) => a.id === "NM1")?.ban_dieu_hanh).toBeUndefined();
    expect(ghepBdhLoaiKhac([lk("TA", "Trị An Mở Rộng", ["sci-enc"])], dv)[0].ban_dieu_hanh).toBeUndefined();
  });
});
