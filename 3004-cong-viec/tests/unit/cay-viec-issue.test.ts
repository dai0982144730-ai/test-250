// Màn Issue agent Công việc (/cay-viec/issue — chép màn Issue của agent Base, Mr. Đại chốt 03/10/2026): 4 luật trên sổ cái giả,
// luật "chỉ mã ĐÃ DUYỆT mới tính là gắn mã" (Mr. Đại chốt 03/10), sổ issue (hoà, hạ bậc, sổ đã bác), ngưỡng + vết, nhóm 5 dựng thẻ,
// và bộ sinh chạy thật trên CSDL RAM (agent Tiến độ là hàm giả). Offline: DOCFLOW_DB=memory, thư mục dữ liệu tạm.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import type { DauViecCay } from "@/lib/cay-viec/thuan";
import { sinhLuat, locNutGangChuaAiNhan, type DauVaoSinh, type ViecIssue } from "@/lib/cay-viec/issue/sinh";
import { bo_trung, maIssueMoi, theHopLe, tongCanhBao, tuNangMuc, type TheCanhBao } from "@/lib/cay-viec/issue/model";
import { docSo, hoaVaoSo, xoaIssue, ghiNhanXuLy, dongIssue, themIssueNguoi, duyetDeXuat, bacBoDeXuat, hoaDeXuatMay, docSoDaBac } from "@/lib/cay-viec/issue/so-issue";
import { docNguong, luuNguong } from "@/lib/cay-viec/issue/nguong-luu";
import { quyenIssue } from "@/lib/cay-viec/issue/quyen";
import { BANG_NHOM5, docTraLoi5, xayTheNhom5, trichDong, nhacDuAn } from "@/lib/cay-viec/issue/nhom5-thuan";
import { chaySinhIssue, type NguonHoiIssue } from "@/lib/cay-viec/issue/chay";
import { nguoi } from "../helpers/csdl";

const HOM_NAY = "2026-10-03";
const CAY: DauViecCay[] = [
  { wbs: "7", name: "Thi công", critical: true, pct: 10, start: "2026-01-01", end: "2027-06-30" },
  { wbs: "7.2", name: "San nền", critical: true, pct: 0, start: "2026-08-01" },
  { wbs: "7.2.3", name: "Thi công san nền", critical: true, pct: 0, start: "2026-09-01", end: "2026-11-15", contractor: "TS" },
  { wbs: "7.2.4", name: "Lu lèn", critical: true, pct: 0, start: "2026-09-20", end: "2026-11-20" },
  { wbs: "7.2.5", name: "Đắp nền năm sau", critical: true, pct: 0, start: "2027-03-01", end: "2027-04-01" },
  { wbs: "6", name: "Mua sắm", critical: false, pct: 100, start: "2026-01-01" },
  { wbs: "6.1", name: "Giao thiết bị Turbine", critical: true, pct: 0, start: "2026-09-01", end: "2026-12-01" },
];

const viec = (x: Partial<ViecIssue>): ViecIssue => ({
  id: "CV-1",
  ten: "Việc",
  nguoiPhuTrach: "a@sci",
  loaiPhuTrach: "nguoi",
  tenNguoi: "Nguyễn A",
  daXong: false,
  han: null,
  quaHanNgay: null,
  namImNgay: 3,
  link: "",
  duongGanMa: "nguoi",
  maWbs: null,
  aiGanChuaSoat: false,
  duyetDuoc: false,
  ngayXong: null,
  ...x,
});

const dauVao = (x: Partial<DauVaoSinh>): DauVaoSinh => ({
  homNay: HOM_NAY,
  N: 7,
  K: 7,
  tenDuAn: "Hướng Việt",
  viec: [],
  tasks: CAY,
  cayOk: true,
  chuoiGang: [{ wbs: "7.2.3", so_ngay_tre: 12 }],
  boQua: new Set(),
  nguonSoViec: "Sổ việc",
  nguonTienDo: "chung.wbs",
  hoiVungPhu: async () => ({ tu: "2026-09-01", den: "2026-10-02" }),
  hoiBcNgay: async () => false,
  ...x,
});

describe("bộ sinh 4 luật trên sổ cái giả (thuần)", () => {
  it("⭕ luật 3: chỉ nút găng LÁ đã đến ngày bắt đầu, chưa xong, chưa có việc ĐÃ DUYỆT; việc 🤖 chờ duyệt KHÔNG tính là đã có việc", async () => {
    const kq = await sinhLuat(
      dauVao({
        viec: [
          viec({ id: "CV-A", maWbs: "7.2.4", duongGanMa: "ai", aiGanChuaSoat: true }), // chờ duyệt → nút 7.2.4 vẫn CHƯA có việc
          viec({ id: "CV-B", maWbs: "6.1", daXong: true, ngayXong: "2026-05-01" }), // đã duyệt, đã xong → 6.1 coi như đã có việc
        ],
        boQua: new Set(["7.2.3"]),
      }),
    );
    const gang = kq.the.filter((t) => t.nguon === "gang");
    expect(gang.map((t) => t.wbs)).toEqual(["7.2.4"]); // 7.2.3 bỏ qua (không cần giao), 7.2.5 chưa tới ngày, 7/7.2 không phải lá
    expect(gang[0]).toMatchObject({ mucDo: "red", trenDuongGang: true, hanXuLy: "2026-11-20" });
    expect(gang[0].tieuDe).toBe("WBS 7.2.4 Lu lèn — trên đường găng, sổ việc không có việc nào gắn mã này");
    expect(gang[0].thieuDuLieu).toMatch(/^Ảnh hưởng COD: chưa lấy được/); // 7.2.4 ngoài chuỗi găng chốt COD
    expect(kq.deXuat.filter((t) => t.tieuDe.startsWith("Luật 3")).length).toBe(1);
    expect(kq.doDuoc).toMatchObject({ gangDenNgay: 3, gangKhongViec: 1 });
    expect(kq.dauViec["7.2.4"]).toEqual({ ten: "Lu lèn", end: "2026-11-20", gang: true });
  });

  it("⏰ luật 1: quá hạn ≥ N + mã ĐÃ DUYỆT, gộp theo người; đỏ khi có việc găng, COD lấy từ chuỗi găng; chờ duyệt / chưa mã thì không sinh", async () => {
    const kq = await sinhLuat(
      dauVao({
        viec: [
          viec({ id: "CV-1", ten: "San nền khu T5", maWbs: "7.2.3", quaHanNgay: 20, han: "2026-09-13" }),
          viec({ id: "CV-2", ten: "Hồ sơ mua sắm", maWbs: "6", quaHanNgay: 9, han: "2026-09-24" }),
          viec({ id: "CV-3", ten: "Quá hạn ít", maWbs: "6", quaHanNgay: 3 }),
          viec({ id: "CV-4", ten: "Chưa mã", maWbs: null, quaHanNgay: 30 }),
          viec({ id: "CV-5", ten: "AI gắn chưa duyệt", maWbs: "6", duongGanMa: "ai", aiGanChuaSoat: true, quaHanNgay: 30 }),
          viec({ id: "CV-6", ten: "Của B", maWbs: "6", quaHanNgay: 8, nguoiPhuTrach: "b@sci", tenNguoi: "Trần B" }),
          viec({ id: "CV-7", ten: "Không ai", maWbs: "6", quaHanNgay: 10, nguoiPhuTrach: "", tenNguoi: "" }),
        ],
      }),
    );
    const l1 = kq.the.filter((t) => t.nguon === "nang-suat");
    expect(l1.map((t) => t.wbs).sort()).toEqual(["người:a@sci", "người:b@sci", "người:chưa-giao"]);
    const a = l1.find((t) => t.wbs === "người:a@sci")!;
    expect(a).toMatchObject({ mucDo: "red", anhHuongCod: 12, wbsLienQuan: ["6", "7.2.3"] });
    expect(a.tieuDe).toBe("Nguyễn A tồn 2 việc quá hạn ≥ 7 ngày — lâu nhất 20 ngày · 1 việc trên găng");
    expect(a.phanTich).toContain('• CV-1 "San nền khu T5" — quá hạn 20 ngày · hạn 13/09/2026 · mã 7.2.3 Thi công san nền (găng)');
    expect(l1.find((t) => t.wbs === "người:b@sci")).toMatchObject({ mucDo: "yellow", anhHuongCod: 0 });
    expect(l1.find((t) => t.wbs === "người:chưa-giao")!.tieuDe).toMatch(/CHƯA GIAO CHO AI/);
    expect(kq.doDuoc.viecGanMaQuaHan).toBe(4);
  });

  it("🧱 luật 2: không có nguồn → 0 thẻ; tab đã bỏ 07/10 nên không ghi chú nữa", async () => {
    const kq = await sinhLuat(dauVao({}));
    expect(kq.the.filter((t) => t.nguon === "su-kien")).toHaveLength(0);
    expect(kq.ghiChu.join(" ")).not.toMatch(/Luật 2/);
  });

  it("📄 luật 4: xong (mã đã duyệt) + % = 0 + không BC ngày ±K trong vùng phủ → thẻ; ngoài vùng phủ / có BC / chờ duyệt thì không; chiều ngược nhắc đóng", async () => {
    const hoi: string[] = [];
    const kq = await sinhLuat(
      dauVao({
        viec: [
          viec({ id: "CV-X1", ten: "San nền xong", maWbs: "7.2.3", daXong: true, ngayXong: "2026-09-25" }),
          viec({ id: "CV-X2", ten: "Lu lèn xong", maWbs: "7.2.4", daXong: true, ngayXong: "2026-09-26" }), // có BC ngày → không dính
          viec({ id: "CV-X3", ten: "Xong tháng 5", maWbs: "6.1", daXong: true, ngayXong: "2026-05-01" }), // ngoài vùng phủ
          viec({ id: "CV-X4", ten: "Chờ duyệt", maWbs: "7.2.5", duongGanMa: "ai", aiGanChuaSoat: true, daXong: true, ngayXong: "2026-09-25" }),
          viec({ id: "CV-X5", ten: "Còn mở mà WBS 100%", maWbs: "6", han: "2026-10-30" }),
        ],
        hoiBcNgay: async (ma, tu, den) => (hoi.push(`${ma} ${tu} ${den}`), ma === "7.2.4"),
      }),
    );
    const l4 = kq.the.filter((t) => t.nguon === "xong-giay");
    const dinh = l4.find((t) => t.wbs === "xong-giấy:a@sci")!;
    expect(dinh).toMatchObject({ mucDo: "red", anhHuongCod: 12, wbsLienQuan: ["7.2.3"] });
    expect(dinh.phanTich).toContain("BC ngày 15 ngày · 18/09/2026 – 02/10/2026: không có"); // luật 31: khoảng ngày kèm số ngày
    expect(hoi).toEqual(["7.2.3 2026-09-18 2026-10-02", "7.2.4 2026-09-19 2026-10-03"]); // 6.1 ngoài vùng phủ không hỏi, 7.2.5 chờ duyệt không xét
    // 07/10 (đợt 2): chiều ngược KHÔNG còn là thẻ — thành danh sách chuông nhắc chủ trì
    expect(l4.find((t) => t.wbs === "chưa-đóng:a@sci")).toBeUndefined();
    expect(kq.nhacDong).toHaveLength(1);
    expect(kq.doDuoc).toMatchObject({ viecXongGanMa: 3, ungVienXongGiay: 3, xongTrenGiay: 1, maNgoaiVungPhu: 1, wbsXongViecConMo: 1 });
  });

  it("locNutGangChuaAiNhan: Map chỉ có mã đã duyệt — nút có việc thì loại", () => {
    const m = new Map([["7.2.3", [viec({ maWbs: "7.2.3" })]]]);
    expect(locNutGangChuaAiNhan(CAY, m, new Set(), HOM_NAY).map((t) => t.wbs)).toEqual(["7.2.4", "6.1"]);
  });
});

describe("mô hình thẻ (khuôn Base)", () => {
  const the = (x: Partial<TheCanhBao>): TheCanhBao => ({ id: "", nguon: "gang", mucDo: "yellow", tieuDe: "t", phanTich: "p", anhHuongCod: 0, nguonDuLieu: "n", deXuat: "d", dieuKien: "dang-vi-pham", xuLy: "chua-ai-dong", ghiNhan: [], ngayMo: HOM_NAY, ...x });
  it("luật chặn 10.0, không cộng dồn COD, tự nâng mức sau 3 tuần, không mở trùng giữ mã + lịch sử", () => {
    expect(theHopLe(the({ deXuat: "" }))).toBe(false);
    expect(theHopLe(the({ nguon: "ai" }))).toBe(false); // 🤖 phải trích nguyên văn
    const tong = tongCanhBao([the({ anhHuongCod: 5, mucDo: "red" }), the({ anhHuongCod: 9, trungChuoiVoi: "X" }), the({ anhHuongCod: 3 })]);
    expect(tong).toMatchObject({ soDangMo: 3, soDo: 1, codNangNhat: 5 });
    expect(tuNangMuc(the({ ngayMo: "2026-09-10" }), HOM_NAY).mucDo).toBe("red");
    const cu = the({ id: "ISS-1", wbs: "7.2.4", ghiNhan: [{ luc: "x", nguoi: "A", viecDaLam: "gọi", chuyenSang: "da-tiep-nhan" }], xuLy: "da-tiep-nhan", an: true, khongCanGiao: { nguoi: "B", luc: "y" } });
    const gop = bo_trung([cu], [the({ wbs: "7.2.4", tieuDe: "mới" })]);
    expect(gop).toHaveLength(1);
    // "không cần giao việc" (Bỏ qua ở khối dưới thẻ, chốt 04/10 tối) phải sống qua mỗi lượt bộ sinh như cờ ẩn
    expect(gop[0]).toMatchObject({ id: "ISS-1", tieuDe: "mới", xuLy: "da-tiep-nhan", an: true, khongCanGiao: { nguoi: "B", luc: "y" } });
    expect(maIssueMoi([{ id: "ISS-2026-40-001" }, { id: "ISS-2026-40-003" }], HOM_NAY)).toBe("ISS-2026-40-004");
  });
  it("quyền dùng quyền có sẵn: ghi = cong_viec.sua · phán xét = wbs.duyet · giao = cong_viec.giao", () => {
    expect(quyenIssue({ la_quan_tri: false, quyen: { "cong_viec.sua": "cua_minh" } })).toEqual({ ghi: true, duyet: false, giao: false });
    expect(quyenIssue({ la_quan_tri: true, quyen: {} })).toEqual({ ghi: true, duyet: true, giao: true });
  });
});

describe("nhóm 5 🤖 — phần thuần", () => {
  it("chỉ đọc Sự cố + Cảnh báo (Kiến nghị để tab Cần ra quyết định — chốt 07/10); lọc dòng nhắc tên dự án", () => {
    expect(BANG_NHOM5.map((b) => b.tag)).toEqual(["bang_su_co", "bang_canh_bao"]);
    expect(trichDong("bang_kien_nghi", { noi_dung: "Chậm GPMB trụ T5", kien_nghi: "Đề nghị UBND hỗ trợ" })).toBeNull();
    expect(trichDong("bang_canh_bao", { ho_so: "Hồ sơ TKKT", vuong_mac: "chờ thẩm tra" })?.trich).toBe("Hồ sơ TKKT — chờ thẩm tra");
    expect(nhacDuAn("Dự án ĐG Hướng Việt chậm", "Hướng Việt", [])).toBe(true);
    expect(nhacDuAn("Dự án khác", "Hướng Việt", ["HV"])).toBe(false);
  });
  it("dựng thẻ: CODE gắn trích nguyên văn, COD code tính (găng → số ngày chậm), dòng thiếu căn cứ bị loại", () => {
    const { dong, soLoai } = docTraLoi5('[{"cau":[1],"wbs":"7.2.3","tieuDe":"Chậm 4 ngày san nền","phanTich":"mưa","mucDo":"do","soNgayCham":4,"deXuat":"Tăng 2 máy trước 10/10"},{"tieuDe":"x"}]');
    expect(soLoai).toBe(1);
    const cay = new Map(CAY.map((t) => [t.wbs, t]));
    const t = xayTheNhom5(dong, [{ so: 1, trich: "Mưa 4 ngày, san nền chậm", nguonDuLieu: "Báo cáo tuần — BQL HV — bảng Vấn đề & kiến nghị dòng 1" }], cay, [], HOM_NAY);
    expect(t[0]).toMatchObject({ id: "DX-1", nguon: "ai", mucDo: "red", wbs: "7.2.3", anhHuongCod: 4, trichNguyenVan: "«Mưa 4 ngày, san nền chậm»", chuaVaoSo: true });
    expect(theHopLe(t[0])).toBe(true);
  });
});

describe("sổ issue + ngưỡng (file) + bộ sinh trên CSDL RAM", () => {
  let tmp = "";
  const nguon: NguonHoiIssue = {
    hoiGang: async () => ({ ok: true, du_lieu: { chuoi_gang: [{ wbs: "7.2.3", so_ngay_tre: 12 }] }, nguon: [], thoi_diem_tra_loi: "2026-10-03T02:00:00Z" }) as never,
    hoiCay: async () => ({ ok: true, du_lieu: { tasks: CAY }, nguon: [], thoi_diem_tra_loi: "" }) as never,
    hoiKhoiLuong: async (_m, loc) => (loc.ma_wbs ? ({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "" } as never) : ({ ok: true, du_lieu: { tu_ngay: "2026-09-01", den_ngay: "2026-10-02" }, nguon: [] } as never)),
  };
  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "issue-cv-"));
    process.env.DOCFLOW_AI_DATA = tmp;
    await csdlMoi();
    await tx(async (q) => {
      for (const [id, ten, tt, het] of [
        ["CV-I-1", "Thi công san nền khu trụ T5", "dang_mo", "2026-09-13"],
        ["CV-I-2", "Lu lèn đoạn 1", "dang_mo", "2026-09-01"],
      ]) {
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai, ket_thuc) VALUES ($1,$2,'Hướng Việt',$3,$4)", [id, ten, tt, het]);
        await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,'nguoi','hung.tv@scigroup.vn',$3,'chu_tri')", [`${id}-p`, id, ten]);
      }
      await q.query(
        `INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai) VALUES
          ('CV-I-1','HV','7.2.3','Thi công san nền','✎',NULL,'nguoi','da_duyet'),
          ('CV-I-2','HV','7.2.4','Lu lèn','🤖',0.8,'ai','cho_duyet')`,
      );
    });
  });
  afterAll(() => {
    delete process.env.DOCFLOW_AI_DATA;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("chạy thật: đọc sổ cái bằng layQ (không tx), sinh thẻ, hoà vào sổ; việc chờ duyệt không tính", async () => {
    const kq = await chaySinhIssue("HV", nguon, Date.parse("2026-10-03T03:00:00Z"));
    expect(kq.ok && !kq.khongChayDuoc).toBe(true);
    const so = docSo("HV");
    const theo = (n: string) => so.the.filter((t) => t.nguon === n).map((t) => t.wbs);
    expect(theo("gang").sort()).toEqual(["6.1", "7.2.4"]); // 7.2.4 có CV-I-2 nhưng còn chờ duyệt → vẫn "chưa ai nhận"
    expect(theo("nang-suat")).toEqual(["người:hung.tv@scigroup.vn"]); // chỉ CV-I-1 (đã duyệt); CV-I-2 chờ duyệt không vào
    expect(so.the.find((t) => t.nguon === "nang-suat")!.phanTich).toContain("CV-I-1");
    expect(so.the.find((t) => t.nguon === "nang-suat")!.phanTich).not.toContain("CV-I-2");
    expect(so.the.every((t) => t.id)).toBe(true);
    expect(so.lanChayCuoi).toBe("2026-10-03");
    // chạy lại: không mở trùng
    await chaySinhIssue("HV", nguon, Date.parse("2026-10-03T03:00:00Z"));
    expect(docSo("HV").the.filter((t) => t.nguon === "gang")).toHaveLength(2);
  });

  it("không có cây → không đo được, sổ giữ nguyên (không hạ bậc)", async () => {
    const truoc = docSo("HV").the.map((t) => t.dieuKien);
    const kq = await chaySinhIssue("HV", { ...nguon, hoiCay: async () => ({ ok: false, ma_loi: "KHONG_KET_NOI", thong_diep: "tắt" }) as never });
    expect(kq.khongChayDuoc).toBe(true);
    expect(docSo("HV").the.map((t) => t.dieuKien)).toEqual(truoc);
  });

  it("thẻ máy hết vi phạm → hạ bậc dần, không xoá; xoá issue sai → sổ đã bác, không sinh lại", () => {
    const so = docSo("HV");
    const g61 = so.the.find((t) => t.nguon === "gang" && t.wbs === "6.1")!;
    const conLai = so.the.filter((t) => t.nguon === "gang" && t.wbs !== "6.1");
    hoaVaoSo("HV", conLai.map((t) => ({ ...t })), HOM_NAY, {});
    expect(docSo("HV").the.find((t) => t.id === g61.id)!.dieuKien).toBe("het-vi-pham");
    const g724 = docSo("HV").the.find((t) => t.nguon === "gang" && t.wbs === "7.2.4")!;
    expect(xoaIssue("HV", g724.id, "", "A")).toMatchObject({ ok: false });
    expect(xoaIssue("HV", g724.id, "máy suy sai", "A")).toEqual({ ok: true });
    expect(docSoDaBac("HV")[0]).toMatchObject({ khoa: "gang|7.2.4", lyDo: "máy suy sai" });
    hoaVaoSo("HV", [{ ...g724, id: "" }], HOM_NAY, {});
    expect(docSo("HV").the.some((t) => t.nguon === "gang" && t.wbs === "7.2.4" && t.dieuKien !== "da-dong")).toBe(false);
  });

  it("ghi nhận chỉ đổi trục Xử lý; issue máy không đóng tay; người thêm → đóng được; đề xuất duyệt → ISS, bác bỏ bắt lý do", () => {
    const may = docSo("HV").the.find((t) => t.nguon === "nang-suat")!;
    expect(ghiNhanXuLy("HV", may.id, { luc: "2026-10-03T03:00:00Z", nguoi: "A", viecDaLam: "đã gọi", chuyenSang: "dang-xu-ly" })).toMatchObject({ ok: true });
    expect(docSo("HV").the.find((t) => t.id === may.id)).toMatchObject({ xuLy: "dang-xu-ly", dieuKien: may.dieuKien });
    expect(dongIssue("HV", may.id)).toMatchObject({ ok: false });
    const n = themIssueNguoi("HV", { mucDo: "yellow", tieuDe: "Thiếu xe", phanTich: "p", anhHuongCod: 0, nguonDuLieu: "tay", deXuat: "thuê", ngayMo: HOM_NAY });
    expect(n.agent).toBe("base");
    expect(dongIssue("HV", n.id)).toEqual({ ok: true });
    // 07/10 (đợt 2): bộ chạy không còn sinh bản sao DX-BASE (và đóng bản cũ) — hàm hoà vẫn giữ, dựng 2 đề xuất thử để kiểm Duyệt/Bác bỏ cũ
    hoaDeXuatMay("HV", [
      { ...may, id: "", nguon: "ai", chuaVaoSo: true, wbs: "dx-thu-1" },
      { ...may, id: "", nguon: "ai", chuaVaoSo: true, wbs: "dx-thu-2" },
    ]);
    const dx = docSo("HV").the.filter((t) => t.nguon === "ai" && t.dieuKien !== "da-dong");
    expect(dx.length).toBeGreaterThan(0);
    expect(dx.every((t) => t.id.startsWith("DX-BASE-"))).toBe(true);
    expect(dx.length).toBeGreaterThan(1);
    {
      const r = duyetDeXuat("HV", dx[1].id, "A", HOM_NAY);
      expect(r.ok && r.the?.id.startsWith("ISS-2026-40-")).toBe(true);
    }
    expect(bacBoDeXuat("HV", dx[0].id, "")).toMatchObject({ ok: false });
    expect(bacBoDeXuat("HV", dx[0].id, "trùng việc")).toEqual({ ok: true });
    hoaDeXuatMay("HV", [{ ...dx[0], id: "" }]); // đã bác → không sinh lại
    expect(docSo("HV").the.filter((t) => t.wbs === dx[0].wbs && t.nguon === "ai" && t.dieuKien !== "da-dong")).toHaveLength(0);
  });

  it("ngưỡng: mặc định 7·5·7, lưu ghi vết từ → sang, chặn số sai", () => {
    expect(docNguong()).toMatchObject({ N: 7, M: 5, K: 7, vet: [] });
    expect(luuNguong({ N: 0, M: 5, K: 7 }, "A")).toMatchObject({ ok: false });
    const kq = luuNguong({ N: 10, M: 5, K: 7 }, "Trần Văn Hùng");
    expect(kq).toMatchObject({ ok: true, soDoi: 1 });
    expect(docNguong().vet[0]).toMatchObject({ nguoi: "Trần Văn Hùng", truong: "N", tu: 7, sang: 10 });
  });

  it("bộ sinh không giữ khoá CSDL: một câu đọc khác chạy xen được trong lúc chờ agent Tiến độ", async () => {
    let xen = false;
    await chaySinhIssue("HV", {
      ...nguon,
      hoiCay: async (...a) => {
        await (await layQ()).query("SELECT 1");
        xen = true;
        return nguon.hoiCay(...a);
      },
    });
    expect(xen).toBe(true);
    void nguoi;
  });
});
