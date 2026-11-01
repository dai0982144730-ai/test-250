// ============================================================
// Cổng base — 6 công cụ đọc «Đợt 3a Main» (KE-HOACH/31, 27/10/2026) + hai công cụ cũ hỏi KHÔNG cần mã dự án.
// Câu hỏi kiểm: CV-10/11 báo cáo đã nộp · CV-12 kiến nghị cần quyết · CV-14 phòng họp trống · CV-17 báo cáo tuần · CV-18 việc đã xong ·
// CV-19 thông báo chưa đọc. CSDL RAM (không mở database thật), không gọi AI thật (AI viết báo cáo tuần là hàm giả).
// ============================================================
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, boSinh, tep } from "../fixtures/chuan-bi";
import { tx } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { taoThongBao } from "@/lib/thong-bao";
import { datHop } from "@/lib/phong-hop/dich-vu";
import { vietBaoCaoTuan } from "@/lib/bao-cao-tuan/viet";
import { congNgay, tuanCua } from "@/lib/phong/tuan";
import { gioVn } from "@/lib/chung/gio-vn";
import type { NguoiDungPhien } from "@/lib/types";
import { boLienKet, cauBuoi, docTuanHoi, khoangTrong, nhacDuAn, thuHaiCuaTuan, traDonVi, traPhongHop } from "@/lib/mcp/cong-base-them-thuan";

type Kq = { ok: boolean; ma_loi?: string; thong_diep?: string; du_lieu: Record<string, unknown>; canh_bao?: string[] };
async function hoi(cc: string, ts: Record<string, unknown>, ma?: string): Promise<Kq> {
  const { chayCongCu } = await import("@/lib/mcp/cong-base");
  return (await chayCongCu(cc, ts, ma)) as unknown as Kq;
}

const HN = gioVn(new Date()).ngay;
const N = (n: number) => congNgay(HN, n);
const TUAN = tuanCua(HN);
const dd = (iso: string) => iso.split("-").reverse().join("/");

let nvBq: NguoiDungPhien;

describe("phần thuần", () => {
  it("tuần ISO: tuần 43/2026 = 19/10 – 25/10; ngay → tuần chứa ngày; sai số tuần → câu lỗi tiếng Việt", () => {
    expect(thuHaiCuaTuan(43, 2026)).toBe("2026-10-19");
    expect(thuHaiCuaTuan(53, 2026)).toBe("2026-12-28");
    expect(thuHaiCuaTuan(54, 2026)).toBeNull();
    const t = docTuanHoi({ tuan: "43" }, "2026-10-27");
    expect(t.ok && t.tuan).toMatchObject({ so: 43, tu: "2026-10-19", den: "2026-10-25" });
    const n = docTuanHoi({ ngay: "2026-10-27" }, "2026-10-27");
    expect(n.ok && n.tuan.so).toBe(44);
    const md = docTuanHoi({}, "2026-10-27");
    expect(md.ok && md.coChi).toBe(false);
    const sai = docTuanHoi({ tuan: "99" }, "2026-10-27");
    expect(!sai.ok && sai.loi.ok === false && sai.loi.thong_diep).toMatch(/Không hiểu tuần/);
  });

  it("tra đơn vị theo lời thường: «phòng Cơ điện», «P.CĐ», mã; trùng nhiều → hỏi lại", () => {
    const ds = [
      { id: "p-cd", ten: "Phòng Cơ điện", ten_ngan: "P.CĐ", loai: "phong" },
      { id: "p-ktvh", ten: "Phòng Kinh tế và Vận hành", ten_ngan: "P.KT&VH", loai: "phong" },
      { id: "p-kt", ten: "Phòng Kỹ thuật", ten_ngan: "P.KT", loai: "phong" },
    ];
    const id = (s: string) => {
      const r = traDonVi(s, ds);
      return r.ok ? r.dv.id : r.loi.ok === false ? r.loi.ma_loi : "";
    };
    expect(id("phòng Cơ điện")).toBe("p-cd");
    expect(id("P.CĐ")).toBe("p-cd");
    expect(id("p-ktvh")).toBe("p-ktvh");
    expect(id("phòng Kỹ thuật")).toBe("p-kt");
    expect(id("Vận hành")).toBe("p-ktvh");
    expect(id("phòng")).toBe("KHONG_HIEU_YEU_CAU");
    expect(id("Phòng Kế hoạch")).toBe("KHONG_CO_DU_LIEU");
  });

  it("phòng họp: «01», «P.01», «Phòng họp 01», «1» đều ra p01; phòng lạ → null", () => {
    for (const s of ["01", "P.01", "Phòng họp 01", "1", "p01"]) expect(traPhongHop(s)?.id).toBe("p01");
    expect(traPhongHop("05")).toBeNull();
  });

  it("khoảng trống buổi chiều: trừ cuộc họp, hôm nay bỏ giờ đã qua, ngày đã qua không còn trống", () => {
    const bay = { ngay: "2026-10-27", phut: 8 * 60 + 10 };
    const tr = khoangTrong([{ tu: "14:00", den: "15:00" }], "2026-10-27", 1, bay);
    expect(tr).toEqual([{ tu: "13:30", den: "14:00" }, { tu: "15:00", den: "17:00" }]);
    expect(cauBuoi(1, tr, 1, false)).toBe("Buổi chiều: còn trống 30 phút · 13:30 – 14:00; 2 giờ · 15:00 – 17:00");
    expect(cauBuoi(1, khoangTrong([], "2026-10-28", 1, bay), 0, false)).toBe("Buổi chiều: trống cả buổi (3 giờ 30 phút · 13:30 – 17:00)");
    expect(khoangTrong([], "2026-10-27", 1, { ngay: "2026-10-27", phut: 15 * 60 + 40 })).toEqual([{ tu: "15:30", den: "17:00" }]);
    expect(khoangTrong([], "2026-10-26", 1, bay)).toEqual([]);
  });

  it("bỏ cú pháp liên kết trong chữ AI; câu nhắc dự án theo tên hoặc mã", () => {
    expect(boLienKet("Đơn vị [[dv:bqlda-qt:qua_han|BQLDA Quảng Trị]] có [[CV-2026-0001|việc móng]] trễ")).toBe("Đơn vị BQLDA Quảng Trị có việc móng trễ");
    const hv = { id: "HV", ten: "Hướng Việt", ten_khac: ["ĐG Hướng Việt"] };
    expect(nhacDuAn("Dự án Hướng Việt còn 2 việc trễ", hv)).toBe(true);
    expect(nhacDuAn("HV chậm đổ móng", hv)).toBe(true);
    expect(nhacDuAn("Tân Thành ổn định", hv)).toBe(false);
  });
});

describe("chạy trên CSDL RAM", () => {
  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    nvBq = await nguoi("nv.bqlda@scigroup.vn");
    // BQLDA Quảng Trị nộp báo cáo tuần NÀY (Form 7), có 2 dòng kiến nghị — đường nộp thật của màn Gửi báo cáo
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(TUAN.so, "Lý Thị Nga");
    g.o.ky_bao_cao = { chon: "tuan", tuan: `${TUAN.so}/${TUAN.nam}   (${dd(TUAN.tu)} – ${dd(TUAN.den)})` };
    g.bang.bang_cong_viec = [{ ten: "Đổ bê tông móng trụ T60", du_an: "ĐG Hướng Việt", phu_trach: "BQLDA Quảng Trị", ket_thuc: "31/12/2026" }];
    g.bang.bang_kien_nghi = [
      { stt: "1", noi_dung: "Thiếu kỹ sư giám sát an toàn điện cho đợt đóng điện trạm 110 kV", muc_do: "Cao", anh_huong: "Chậm đóng điện", kien_nghi: "Đề nghị TGĐ điều động 2 kỹ sư từ P.CĐ" },
    ];
    const buf = await taoBaoCao("form-7", g);
    const r = await tx((q) => taiLenVaKiemTra(q, nvBq, { tep: tep("bc.docx", buf) }));
    expect(r.ket_qua.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep)).toEqual([]);
    await tx((q) => gui(q, nvBq, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
    // Việc đã xong / sắp hạn của Phòng Cơ điện (chèn thẳng như bài kiểm 18/10)
    await tx(async (q) => {
      const viec: [string, string, string | null, string, string | null, string | null][] = [
        ["CV-3A-1", "Bảo dưỡng máy biến áp T1", null, "hoan_thanh", N(-6), N(-8)],
        ["CV-3A-2", "Thay dầu máy phát tổ 2", "ĐG Hướng Việt", "hoan_thanh", N(-3), N(-1)],
        ["CV-3A-3", "Kiểm tra rơ le bảo vệ", null, "dang_mo", N(3), null],
        ["CV-3A-4", "Lập kế hoạch đại tu", "ĐG Hướng Việt", "dang_mo", N(40), null],
      ];
      for (const [id, ten, duAn, tt, han, xong] of viec) {
        await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai, ket_thuc, dong_luc) VALUES ($1,$2,$3,$4,$5,$6)", [id, ten, duAn, tt, han, xong ? `${xong}T03:00:00Z` : null]);
        await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,'don_vi','p-cd',$3,'chu_tri')", [`${id}-p`, id, ten]);
      }
      // Người không có vai nào → không có quyền xem sổ cái
      await q.query("DELETE FROM identity.gan_vai_tro WHERE nguoi_dung_id = 'nguoimoi@scigroup.vn'");
    });
  });

  it("CV-10/11 base.bao_cao_da_nop: BQLDA Quảng Trị đã nộp (ai nộp, lúc nào); đơn vị khác chưa nộp kèm hạn", async () => {
    const kq = await hoi("base.bao_cao_da_nop", {});
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { tuan: string; so_da_nop: number; so_chua_nop: number; da_nop: { don_vi: string; nguoi_nop: string; nop_luc: string; tinh_trang: string }[]; chua_nop: { don_vi: string; han_nop: string; tinh_trang: string }[] };
    expect(d.tuan).toBe(`Tuần ${TUAN.so} · 7 ngày · ${dd(TUAN.tu)} – ${dd(TUAN.den)}`);
    const bq = d.da_nop.find((x) => x.don_vi === "BQLDA Quảng Trị")!;
    expect(bq).toBeTruthy();
    expect(bq.nguoi_nop).toBe("Lý Thị Nga");
    expect(bq.nop_luc).toMatch(/^\d{2}:\d{2} Thứ .+ \d{2}\/\d{2}\/\d{4}$/);
    expect(d.so_chua_nop).toBeGreaterThan(0);
    const cd = d.chua_nop.find((x) => x.don_vi === "Phòng Cơ điện")!;
    expect(cd.han_nop).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(cd.tinh_trang).toMatch(/^Chưa nộp/);
    // Hỏi một phòng · hỏi theo người
    const mot = await hoi("base.bao_cao_da_nop", { don_vi: "phòng Cơ điện" });
    expect((mot.du_lieu as { so_don_vi: number; so_da_nop: number }).so_don_vi).toBe(1);
    expect((mot.du_lieu as { so_da_nop: number }).so_da_nop).toBe(0);
    const toi = await hoi("base.bao_cao_da_nop", { nguoi: "nv.bqlda@scigroup.vn" });
    expect((toi.du_lieu as { so_da_nop: number; loc: string }).so_da_nop).toBe(1);
    // Tuần chỉ rõ trước đó: không ai nộp
    const cu = await hoi("base.bao_cao_da_nop", { ngay: congNgay(TUAN.tu, -14) });
    expect((cu.du_lieu as { so_da_nop: number }).so_da_nop).toBe(0);
    expect(JSON.stringify(kq.du_lieu)).not.toMatch(/\/[a-z-]+\?|\.docx|tai_lieu_id/);
  });

  it("CV-12 base.kien_nghi_can_quyet: kiến nghị chưa có việc nằm ở cho_quyet, kèm đơn vị nêu; người không quyền bị chặn", async () => {
    const kq = await hoi("base.kien_nghi_can_quyet", {}, "nv.dtpc");
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { so_cho_quyet: number; cho_quyet: { noi_dung: string; kien_nghi: string; don_vi_neu: string[]; muc_do: string }[] };
    const k = d.cho_quyet.find((x) => x.noi_dung.includes("kỹ sư giám sát an toàn điện"))!;
    expect(k).toBeTruthy();
    expect(k.kien_nghi).toBe("Đề nghị TGĐ điều động 2 kỹ sư từ P.CĐ");
    expect(k.muc_do).toBe("Cao");
    expect(k.don_vi_neu).toHaveLength(1);
    const chan = await hoi("base.kien_nghi_can_quyet", {}, "nguoimoi");
    expect(chan.ok).toBe(false);
    expect(chan.ma_loi).toBe("KHONG_CO_QUYEN");
  });

  it("CV-17 base.bao_cao_tuan: phần dự án HV có việc + câu 🤖 nhắc HV; không có điểm độ khó; tuần chưa viết → câu rõ", async () => {
    const chua = await hoi("base.bao_cao_tuan", { ngay: TUAN.tu, ma_du_an: "HV" });
    expect(chua.ok).toBe(false);
    expect(chua.thong_diep).toMatch(/chưa có báo cáo tuần/);
    // AI giả — không gọi AI thật
    const goiAi = async () => JSON.stringify({ nhan_dinh: ["Dự án Hướng Việt đang dồn việc móng trụ.", "Khối văn phòng giữ nhịp."], nhan_xet: {}, can_quyet: [], diem_nong: {} });
    await tx((q) => vietBaoCaoTuan(q, TUAN.tu, "viet_lai", goiAi));
    const kq = await hoi("base.bao_cao_tuan", { tuan: TUAN.so, nam: TUAN.nam, ma_du_an: "HV" }, "nv.dtpc");
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { tuan: string; du_an: { ma: string; so_viec_dang_mo: number; nhan_dinh_nhac_du_an: string[]; viec_dang_mo_con_trong_han: { ten_gon: string }[] }; so_lieu_toan_cong_ty: Record<string, unknown> };
    expect(d.du_an.ma).toBe("HV");
    expect(d.du_an.so_viec_dang_mo).toBeGreaterThan(0);
    expect(d.du_an.nhan_dinh_nhac_du_an).toEqual(["🤖 Dự án Hướng Việt đang dồn việc móng trụ."]);
    // Luật 30: chủ trì ghi TÊN đơn vị, không ghi mã trần
    const chuTri = d.du_an.viec_dang_mo_con_trong_han.map((v) => (v as { chu_tri?: string }).chu_tri);
    expect(chuTri).toContain("BQLDA Quảng Trị");
    expect(chuTri).not.toContain("bqlda-qt");
    expect(JSON.stringify(kq.du_lieu)).not.toMatch(/"diem"/);
    // Không mã dự án → cả nhận định
    const tong = await hoi("base.bao_cao_tuan", {});
    expect((tong.du_lieu as { nhan_dinh: string[] }).nhan_dinh).toHaveLength(2);
  });

  it("CV-18 base.viec_da_xong: Phòng Cơ điện xong 2 việc trong 30 ngày, ghi đúng / trễ bằng NGÀY so với hạn; lọc dự án", async () => {
    const kq = await hoi("base.viec_da_xong", { tu_ngay: N(-30), den_ngay: HN, don_vi: "phòng Cơ điện" });
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { so_viec: number; viec: { ma_viec_base: string; dung_han: string; xong_ngay: string; chu_tri: string }[] };
    expect(d.viec.map((v) => v.ma_viec_base)).toEqual(["CV-3A-2", "CV-3A-1"]); // mới xong lên đầu
    expect(d.viec.find((v) => v.ma_viec_base === "CV-3A-2")!.dung_han).toBe("Xong trễ 2 ngày so với hạn của việc");
    expect(d.viec.find((v) => v.ma_viec_base === "CV-3A-1")!.dung_han).toBe("Xong đúng hạn");
    expect(d.viec[0]!.xong_ngay).toBe(dd(N(-1)));
    expect(d.viec[0]!.chu_tri).toBe("Phòng Cơ điện");
    const hv = await hoi("base.viec_da_xong", { tu_ngay: N(-30), den_ngay: HN, ma_du_an: "HV" });
    expect((hv.du_lieu as { viec: { ma_viec_base: string }[] }).viec.map((v) => v.ma_viec_base)).toEqual(["CV-3A-2"]);
    const rong = await hoi("base.viec_da_xong", { tu_ngay: N(10), den_ngay: N(20), don_vi: "phòng Cơ điện" });
    expect(rong.ma_loi).toBe("KHONG_CO_DU_LIEU");
  });

  it("base.viec_co_han_trong_khoang KHÔNG mã dự án: ra cả việc không thuộc dự án; lọc theo đơn vị", async () => {
    const kq = await hoi("base.viec_co_han_trong_khoang", { tu_ngay: HN, den_ngay: N(7), don_vi: "phòng Cơ điện" });
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { ma_du_an: null; viec: { ma_viec_base: string; ten_gon: string; trang_thai_chu: string; ten_nguoi_phu_trach: string }[] };
    expect(d.ma_du_an).toBeNull();
    expect(d.viec.map((v) => v.ma_viec_base)).toEqual(["CV-3A-3"]);
    expect(d.viec[0]!.trang_thai_chu).toBe("Đang mở — còn 3 ngày");
    expect(d.viec[0]!.ten_nguoi_phu_trach).toBe("Phòng Cơ điện");
  });

  it("base.tai_viec_theo_nguoi KHÔNG mã dự án: dòng Phòng Cơ điện có ĐỦ việc đang mở, việc găng null (chưa biết)", async () => {
    const kq = await hoi("base.tai_viec_theo_nguoi", { nguoi: "phòng Cơ điện" });
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { nguoi: { ma_base: string; loai: string; dang_mo: number; viec_gang: null; viec_nang: { ma_viec_base: string }[] }[] };
    const cd = d.nguoi.find((x) => x.ma_base === "p-cd")!;
    expect(cd.loai).toBe("phong");
    expect(cd.viec_gang).toBeNull();
    expect(cd.viec_nang.map((v) => v.ma_viec_base).sort()).toEqual(["CV-3A-3", "CV-3A-4"]);
    expect(cd.dang_mo).toBe(2);
  });

  it("CV-19 base.thong_bao_cua_toi: đúng tin chưa đọc của người hỏi, đọc xong vẫn chưa đọc; không xem được chuông người khác", async () => {
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    await tx(async (q) => {
      await taoThongBao(q, { nguoi_nhan: nv.id, loai: "giao_viec", noi_dung: "Bạn được giao việc kiểm tra hồ sơ test", lien_ket: "/so-do?viec=CV-X" });
      await taoThongBao(q, { nguoi_nhan: "truong.ktvh@scigroup.vn", loai: "giao_viec", noi_dung: "Tin của người khác test", lien_ket: null });
    });
    const kq = await hoi("base.thong_bao_cua_toi", {}, "nv.dtpc");
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { so_chua_doc: number; thong_bao: { noi_dung: string; loai: string; luc: string }[] };
    expect(d.thong_bao.some((t) => t.noi_dung === "Bạn được giao việc kiểm tra hồ sơ test")).toBe(true);
    expect(d.thong_bao.some((t) => t.noi_dung.includes("người khác"))).toBe(false);
    expect(JSON.stringify(d)).not.toContain("/so-do");
    const sau = await hoi("base.thong_bao_cua_toi", {}, "nv.dtpc");
    expect((sau.du_lieu as { so_chua_doc: number }).so_chua_doc).toBe(d.so_chua_doc);
    expect((await hoi("base.thong_bao_cua_toi", {})).ma_loi).toBe("KHONG_HIEU_YEU_CAU");
    expect((await hoi("base.thong_bao_cua_toi", { nguoi: "truong.ktvh@scigroup.vn" }, "nv.dtpc")).ma_loi).toBe("KHONG_CO_QUYEN");
  });

  it("6 công cụ mới khai trong nang_luc", async () => {
    const kq = await hoi("nang_luc", {});
    const ten = (kq.du_lieu.cong_cu as { ten: string }[]).map((c) => c.ten);
    for (const t of ["base.bao_cao_da_nop", "base.kien_nghi_can_quyet", "base.bao_cao_tuan", "base.lich_phong", "base.viec_da_xong", "base.thong_bao_cua_toi"]) expect(ten).toContain(t);
  });
});

describe("CV-14 base.lich_phong (đồng hồ giả giờ VN)", () => {
  const LUC = Date.UTC(2026, 9, 26, 1, 10); // Thứ Hai 26/10/2026 08:10 giờ VN
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(LUC);
    const tp = await nguoi("truong.dtpc@scigroup.vn");
    const nv = await nguoi("nv.dtpc@scigroup.vn");
    await tx((q) =>
      datHop(q, tp, { phong: "p01", ngay: "2026-10-27", tu: "14:00", den: "15:00", noi_dung: "Họp phòng test", ghi_chu: "Mang hồ sơ test", moi: [{ loai: "nguoi", id: nv.id }] }),
    );
  });
  afterAll(() => vi.useRealTimers());

  it("«Phòng họp 01 chiều 27/10 có trống không?» → còn trống 13:30–14:00 và 15:00–17:00, có cuộc 14:00–15:00", async () => {
    const kq = await hoi("base.lich_phong", { phong: "01", ngay: "2026-10-27", buoi: "chieu" }, "nv.dtpc");
    expect(kq.ok).toBe(true);
    const d = kq.du_lieu as { phong: string; ngay: { ngay: string; tom_tat: string; cuoc: { gio: string; noi_dung: string; ghi_chu?: string; chi_tiet?: string }[] }[] };
    expect(d.phong).toBe("Phòng họp 01 (8 ghế)");
    expect(d.ngay[0]!.ngay).toBe("Thứ Ba 27/10/2026");
    expect(d.ngay[0]!.tom_tat).toBe("Buổi chiều: còn trống 30 phút · 13:30 – 14:00; 2 giờ · 15:00 – 17:00");
    expect(d.ngay[0]!.cuoc[0]).toMatchObject({ gio: "1 giờ · 14:00 – 15:00", noi_dung: "Họp phòng test", ghi_chu: "Mang hồ sơ test" });
    // Người không được mời: thấy phòng bận, không thấy ghi chú
    const ngoai = await hoi("base.lich_phong", { phong: "Phòng họp 01", ngay: "2026-10-27" }, "truong.ktvh");
    const c = (ngoai.du_lieu as { ngay: { cuoc: { ghi_chu?: string; chi_tiet?: string }[] }[] }).ngay[0]!.cuoc[0]!;
    expect(c.ghi_chu).toBeUndefined();
    expect(c.chi_tiet).toMatch(/chỉ người đặt/);
    // Phòng trống cả buổi; phòng lạ
    const p3 = await hoi("base.lich_phong", { phong: "03", ngay: "2026-10-27", buoi: "chieu" });
    expect((p3.du_lieu as { ngay: { tom_tat: string }[] }).ngay[0]!.tom_tat).toBe("Buổi chiều: trống cả buổi (3 giờ 30 phút · 13:30 – 17:00)");
    expect((await hoi("base.lich_phong", { phong: "05" })).ma_loi).toBe("KHONG_HIEU_YEU_CAU");
  });
});
