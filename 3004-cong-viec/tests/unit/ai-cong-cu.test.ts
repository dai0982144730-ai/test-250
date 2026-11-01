// Bộ công cụ chat của Trợ lý SCI công việc: chỉ đọc đúng phần người hỏi có quyền, không sập khi module khác chưa xong.
// Hàm dịch vụ của module khác được MOCK; CSDL RAM thật cho cây đơn vị, người dùng, tài liệu, lịch sử.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, type Q } from "@/lib/db";
import type { DongLichSu, NguoiDungPhien, PhanViec } from "@/lib/types";
import type { DongSoCai } from "@/lib/so-cai/dich-vu";

vi.mock("@/lib/so-cai/dich-vu", async (goc) => ({
  ...(await goc<typeof import("@/lib/so-cai/dich-vu")>()),
  danhSachSoCai: vi.fn(),
  chiTietViec: vi.fn(),
  viecDaXong: vi.fn(),
}));
vi.mock("@/lib/lich-su/doc", async (goc) => ({
  ...(await goc<typeof import("@/lib/lich-su/doc")>()),
  lichSuDoiTuong: vi.fn(async () => []),
  timLichSu: vi.fn(),
}));
vi.mock("@/lib/thu-muc/dich-vu", async (goc) => ({
  ...(await goc<typeof import("@/lib/thu-muc/dich-vu")>()),
  docPhienBan: vi.fn(),
}));
vi.mock("@/lib/kiem-tra/doc-word", async (goc) => ({
  ...(await goc<typeof import("@/lib/kiem-tra/doc-word")>()),
  docWord: vi.fn(async () => {
    throw new Error("Chưa làm");
  }),
}));

import { danhSachSoCai, viecDaXong } from "@/lib/so-cai/dich-vu";
import { timLichSu } from "@/lib/lich-su/doc";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { congCuDuocDung, runTool } from "@/lib/ai/chat-tools";
import { thayViec, xemDuocNoiDung } from "@/lib/ai/quyen-doc";
import { timDonVi, layCay } from "@/lib/ai/tra-cuu";
import { BI_DANH, NHOM_LOI, chonCongCu } from "@/lib/ai/chon-cong-cu";
import { TOOL_SPECS } from "@/lib/ai/chat-types";
import { parseModelReply } from "@/lib/ai/chat-agent";

const mDanhSach = vi.mocked(danhSachSoCai);
const mDaXong = vi.mocked(viecDaXong);
const mTim = vi.mocked(timLichSu);
const mDoc = vi.mocked(docPhienBan);

function pv(loai: "nguoi" | "don_vi", id: string, ten: string): PhanViec {
  return {
    id: `pv-${id}`,
    cong_viec_id: "x",
    phu_trach_loai: loai,
    phu_trach_id: id,
    phu_trach_ten: ten,
    noi_dung: "Làm",
    luon_mo: false,
    bat_dau: null,
    ket_thuc: "2026-10-01",
    trang_thai: "dang_lam",
    ket_thuc_boi: null,
    ket_thuc_luc: null,
    ghi_chu: null,
  };
}

function viec(id: string, phan: PhanViec[], giao_boi: string | null = null, canh_bao: DongSoCai["canh_bao"] = null): DongSoCai {
  return {
    id,
    ten: `Việc ${id}`,
    du_an: null,
    hang_muc: null,
    ket_qua_can_co: null,
    luon_mo: false,
    bat_dau: null,
    ket_thuc: "2026-10-01",
    trang_thai: "dang_mo",
    cho_sua: false,
    giao_boi,
    don_vi_giao: null,
    nguon_hien_hanh_id: null,
    tao_luc: "2026-09-01",
    dong_luc: null,
    ly_do_dong: null,
    phan_viec: phan,
    tien_do: `0/${phan.length}`,
    canh_bao,
    treo: false,
    phu_thuoc: [],
    nguon_hien_hanh: null,
    so_ban_da_de: 0,
  };
}

/** Bản sao người dùng với một quyền đổi phạm vi (hoặc bỏ hẳn) */
function voiQuyen(nd: NguoiDungPhien, doi: Partial<NguoiDungPhien["quyen"]>, bo: string[] = []): NguoiDungPhien {
  const quyen = { ...nd.quyen, ...doi };
  for (const b of bo) delete (quyen as Record<string, unknown>)[b];
  return { ...nd, quyen };
}

let q: Q;
let hung: NguoiDungPhien; // Trần Văn Hùng — nhân viên P.KT&VH

const SO_CAI = [
  viec("CV-2026-0001", [pv("don_vi", "p-ktvh", "P.KT&VH")], null, "qua_han"),
  viec("CV-2026-0002", [pv("don_vi", "p-dtpc", "P.ĐT&PC")]),
  viec("CV-2026-0003", [pv("nguoi", "hung.tv@scigroup.vn", "Trần Văn Hùng")]),
  viec("CV-2026-0004", [pv("don_vi", "nm-namxe", "NM Nậm Xe")], null, "sap_den_han"),
];

describe("công cụ chat — lọc theo quyền", () => {
  beforeAll(async () => {
    q = await csdlMoi();
    hung = await nguoi("hung.tv@scigroup.vn");
  });
  beforeEach(() => {
    mDanhSach.mockReset();
    mDanhSach.mockResolvedValue(SO_CAI);
    mDaXong.mockReset();
    mTim.mockReset();
    mDoc.mockReset();
  });

  it("sổ cái phạm vi toàn bộ: thấy đủ 4 việc, quá hạn lên đầu", async () => {
    const kq = await runTool("socai.danh_sach_viec", {}, { nd: voiQuyen(hung, { "so_cai.xem": "toan_bo" }), q });
    expect(kq.ok).toBe(true);
    const d = kq.data as { tong: number; viec: { ma_viec: string }[]; qua_han: number };
    expect(d.tong).toBe(4);
    expect(d.qua_han).toBe(1);
    expect(d.viec[0]!.ma_viec).toBe("CV-2026-0001");
  });

  it("sổ cái phạm vi đơn vị: chỉ việc của P.KT&VH và việc giao cho chính mình", async () => {
    const kq = await runTool("socai.danh_sach_viec", {}, { nd: voiQuyen(hung, { "so_cai.xem": "don_vi" }), q });
    const d = kq.data as { viec: { ma_viec: string }[]; an_do_quyen: number };
    expect(d.viec.map((v) => v.ma_viec).sort()).toEqual(["CV-2026-0001", "CV-2026-0003"]);
    expect(d.an_do_quyen).toBe(2);
  });

  it("sổ cái đơn vị và cấp dưới (trưởng P.KT&VH): thấy cả NM Nậm Xe", async () => {
    const truong = await nguoi("truong.ktvh@scigroup.vn");
    const kq = await runTool("socai.danh_sach_viec", {}, { nd: voiQuyen(truong, { "so_cai.xem": "don_vi_va_cap_duoi" }), q });
    const ma = (kq.data as { viec: { ma_viec: string }[] }).viec.map((v) => v.ma_viec).sort();
    expect(ma).toEqual(["CV-2026-0001", "CV-2026-0004"]);
  });

  it("không có quyền xem sổ cái: từ chối, KHÔNG gọi dịch vụ", async () => {
    const kq = await runTool("socai.danh_sach_viec", {}, { nd: voiQuyen(hung, {}, ["so_cai.xem"]), q });
    expect(kq.ok).toBe(false);
    expect(kq.summary).toMatch(/quyền/);
    expect(mDanhSach).not.toHaveBeenCalled();
    expect(congCuDuocDung(voiQuyen(hung, {}, ["so_cai.xem", "lich_su.xem"]))).not.toContain("socai.danh_sach_viec");
  });

  it("lọc đơn vị theo tên gõ tự do; đơn vị lạ báo lỗi tiếng Việt", async () => {
    await runTool("socai.viec_cua_don_vi", { don_vi: "Phòng ĐT&PC" }, { nd: hung, q });
    expect(mDanhSach).toHaveBeenCalledWith(q, { don_vi_id: "p-dtpc" });
    const la = await runTool("socai.viec_cua_don_vi", { don_vi: "Phòng Vũ Trụ" }, { nd: hung, q });
    expect(la.ok).toBe(false);
    expect(la.summary).toMatch(/Không nhận ra đơn vị/);
    const cay = await layCay(q);
    expect(timDonVi(cay, "SCI E&C")?.id).toBe("sci-enc");
    expect(timDonVi(cay, "P.ĐT&PC")?.id).toBe("p-dtpc");
    expect(timDonVi(cay, "BQLDA Quảng Trị")?.id).toBe("bqlda-qt");
    expect(timDonVi(cay, "nậm xe")?.id).toBe("nm-namxe");
  });

  it("module sổ cái chưa xong ('Chưa làm') → câu tiếng Việt, không sập", async () => {
    mDanhSach.mockRejectedValueOnce(new Error("Chưa làm"));
    const kq = await runTool("socai.danh_sach_viec", {}, { nd: hung, q });
    expect(kq.ok).toBe(false);
    expect(kq.summary).toMatch(/đang được xây dựng/);
    mDaXong.mockRejectedValueOnce(new Error("Chưa làm"));
    expect((await runTool("lichsu.tra_cuu_viec", {}, { nd: hung, q })).summary).toMatch(/đang được xây dựng/);
  });

  it("lịch sử phạm vi của mình: dòng của người khác bị lọc", async () => {
    const dongLs = (nguoiLam: string, dv: string | null): DongLichSu => ({
      id: 1,
      luc: "2026-09-20T01:00:00Z",
      nguoi: nguoiLam,
      thay_cho: null,
      don_vi_id: dv,
      thiet_bi: null,
      doi_tuong_loai: "tai_lieu",
      doi_tuong_id: "tl-1",
      hanh_dong: "gui",
      chi_tiet: {},
      hash_truoc: null,
      hash: "h",
    });
    mTim.mockResolvedValue([dongLs(hung.id, "p-ktvh"), dongLs("truong.dtpc@scigroup.vn", "p-dtpc")]);
    const kq = await runTool("lichsu.tim", {}, { nd: voiQuyen(hung, { "lich_su.xem": "cua_minh" }), q });
    expect((kq.data as { dong: unknown[] }).dong.length).toBe(1);
    const khong = await runTool("lichsu.tim", {}, { nd: voiQuyen(hung, {}, ["lich_su.xem"]), q });
    expect(khong.ok).toBe(false);
  });

  it("đọc nội dung tài liệu: cần quyền xem; đọc được thì ghi lịch sử mo_xem", async () => {
    await query(
      `INSERT INTO docflow.tai_lieu (id, ten, don_vi_lap, nguoi_tao) VALUES ('tl-test-1', 'BC tuần 29 P.ĐT&PC', 'p-dtpc', 'nv.dtpc@scigroup.vn')
       ON CONFLICT (id) DO NOTHING`,
    );
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const buf = Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun("Nậm Mô 1 đập chính 78%")] })] }] })));
    mDoc.mockResolvedValue({
      thong_tin: {
        tai_lieu_id: "tl-test-1",
        phien_ban: 1,
        ten_tep: "BC.docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        kich_thuoc: buf.length,
        sha256: "x",
        khoa_luu: "x",
        tai_len_boi: "nv.dtpc@scigroup.vn",
        tai_len_luc: "2026-09-20",
        ket_qua_kiem_tra: null,
      },
      noi_dung: buf,
    });
    const cam = await runTool("thumuc.doc", { tai_lieu_id: "tl-test-1" }, { nd: voiQuyen(hung, {}, ["tai_lieu.xem"]), q });
    expect(cam.ok).toBe(false);
    expect(mDoc).not.toHaveBeenCalled();
    const doc = await runTool("thumuc.doc", { tai_lieu_id: "tl-test-1" }, { nd: hung, q });
    expect(doc.ok).toBe(true);
    expect((doc.data as { noi_dung: string }).noi_dung).toContain("78%");
    const ls = await query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_id = 'tl-test-1' AND hanh_dong = 'mo_xem' AND nguoi = $1", [hung.id]);
    expect(ls.rows.length).toBe(1);
    expect((await runTool("thumuc.doc", { tai_lieu_id: "khong-co" }, { nd: hung, q })).ok).toBe(false);
  });

  it("xem nội dung phòng khác theo cấu hình 'theo_quyen' (thuần)", async () => {
    const cay = await layCay(q);
    const tl = { nguoi_tao: "nv.dtpc@scigroup.vn", don_vi: ["p-dtpc"] };
    const nvDonVi = voiQuyen(hung, { "tai_lieu.xem": "don_vi" });
    expect(xemDuocNoiDung(nvDonVi, cay, tl, "tat_ca")).toBe(true);
    expect(xemDuocNoiDung(nvDonVi, cay, tl, "theo_quyen")).toBe(false);
    expect(xemDuocNoiDung(nvDonVi, cay, { ...tl, don_vi: ["p-ktvh"] }, "theo_quyen")).toBe(true);
    expect(thayViec(voiQuyen(hung, { "so_cai.xem": "cua_minh" }), cay, SO_CAI[2]!)).toBe(true);
    expect(thayViec(voiQuyen(hung, { "so_cai.xem": "cua_minh" }), cay, SO_CAI[0]!)).toBe(false);
  });

  it("cây thư mục ai cũng xem; mo_trang chỉ nhận trang có thật; tên công cụ lạ bị bỏ qua", async () => {
    const cay = await runTool("thumuc.cay", {}, { nd: voiQuyen(hung, {}, ["tai_lieu.xem", "so_cai.xem"]), q });
    expect(cay.ok).toBe(true);
    expect((cay.data as { don_vi: unknown[] }).don_vi.length).toBe(26);
    expect((await runTool("mo_trang", { path: "/so-cai" }, { nd: hung, q })).uiAction).toEqual({ type: "navigate", path: "/so-do" }); // link cũ → màn trên menu (01/10)
    expect((await runTool("mo_trang", { path: "/cong-viec/CV-2026-0412" }, { nd: hung, q })).uiAction).toEqual({ type: "navigate", path: "/so-do?viec=CV-2026-0412" });
    expect((await runTool("mo_trang", { path: "/lich-su" }, { nd: hung, q })).ok).toBe(false);
    expect((await runTool("mo_trang", { path: "https://ngoai.vn" }, { nd: hung, q })).ok).toBe(false);
    expect((await runTool("xoa_tat_ca", {}, { nd: hung, q })).ok).toBe(false);
    expect((await runTool("tim_kiem_web", { query: "nghị định" }, { nd: hung, q })).summary).toMatch(/TẮT/);
  });

  it("chọn công cụ: bí danh và nhóm lõi đều là tên công cụ thật; lọc theo quyền", () => {
    const ten = new Set(TOOL_SPECS.map((s) => s.name));
    for (const k of Object.keys(BI_DANH)) expect(ten.has(k)).toBe(true);
    for (const k of NHOM_LOI) expect(ten.has(k)).toBe(true);
    const chiThuMuc = chonCongCu("việc nào sắp trễ", ["thumuc.cay", "thumuc.liet_ke", "mo_trang"]);
    expect(chiThuMuc.every((s) => s.name.startsWith("thumuc.") || s.name === "mo_trang")).toBe(true);
  });

  it("bóc JSON trả lời của mô hình (kể cả bọc ```json)", () => {
    expect(parseModelReply('{"reply":"Chào","actions":[]}')).toEqual({ reply: "Chào", actions: [] });
    const r = parseModelReply('Đây:\n```json\n{"reply":"x","actions":[{"name":"socai.danh_sach_viec","args":{"don_vi":"SCI E&C"}}]}\n```');
    expect(r?.actions[0]).toEqual({ name: "socai.danh_sach_viec", args: { don_vi: "SCI E&C" } });
    expect(parseModelReply("không phải json")).toBeNull();
  });
});
