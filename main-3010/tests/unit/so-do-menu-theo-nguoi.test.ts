// ⭐ 18/10/2026 — vá hở S3 (thẻ ẩn theo người xem):
//   ① số đỏ mục Issue ở menu trái chỉ đếm thẻ người xem thấy được
//   ② nút 🤖 «Phân loại lại» chỉ đưa AI thẻ người bấm thấy — phân loại cũ của thẻ bị ẩn được GIỮ khi lưu
// Giả fetch — không gọi cổng thật, không gọi AI.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { duLieuManIssue, soIssueDoGanNhat } from "@/lib/issue-main/man-hinh";
import { docSoIssueMain, ghiSoIssueMain, luuPhanLoai } from "@/lib/issue-main/luu";
import { lyDoChanChonCanXem, type BoLocMat } from "@/lib/agent-mat-loc";

const THAY_HET: BoLocMat = { thayHet: true, thay: () => true };
/** Người chỉ thuộc NK1: không thấy Hợp đồng / Pháp lý / Công việc của HV */
const NGOAI_HV: BoLocMat = { thayHet: false, thay: (agent, duAn) => !["hopdong", "phaply", "base"].includes(agent ?? "") || duAn === "NK1" };

const the = (id: string, mucDo = "do", them: Record<string, unknown> = {}) => ({
  id,
  tieu_de: `thẻ ${id}`,
  mo_ta: "x",
  nguon_du_lieu: "sổ thử",
  dieu_kien_dong: "xử lý xong",
  mucDo,
  ...them,
});
const ISSUE_THEO_AGENT: Record<string, unknown[]> = {
  tiendo: [the("ISS-TD-1"), the("ISS-TD-2", "vang")],
  hopdong: [the("ISS-HD-1")],
  phaply: [the("ISS-PL-1")],
  base: [the("ISS-2026-41-002", "do", { ma_du_an: "HV" }), the("ISS-CV-NK1", "do", { ma_du_an: "NK1" })],
};

const KHOA_CU = process.env.AUTH_SECRET;
beforeAll(() => {
  process.env.AUTH_SECRET = KHOA_CU || "khoa-bai-kiem-so-do-menu";
  for (const ma of ["TIENDO", "HOPDONG", "PHAPLY", "BASE", "QUANSAT"]) process.env[`URL_AGENT_${ma}`] = `http://127.0.0.1:599${ma.length}0`;
  process.env.URL_AGENT_TIEN_DO = "http://127.0.0.1:59960";
});
afterEach(() => vi.unstubAllGlobals());

describe("Số đỏ menu trái theo người xem", () => {
  it("PM thấy 4 thẻ đỏ; người ngoài HV chỉ thấy 1 (Tiến độ) — thẻ 38,2 tỷ của agent Công việc không còn được đếm", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const than = JSON.parse(String(init?.body ?? "{}")) as { cong_cu: string };
        const ma = String(url).split("/api/mcp/")[1] ?? "";
        const tra =
          than.cong_cu.endsWith(".danh_sach_issue") && ISSUE_THEO_AGENT[ma]
            ? { ok: true, du_lieu: { issue: ISSUE_THEO_AGENT[ma] }, nguon: [{ loai: "thu", ma, file_goc: "x" }], thoi_diem_tra_loi: "", canh_bao: [] }
            : than.cong_cu === "tiendo.tim_dau_viec"
              ? { ok: true, du_lieu: { tasks: [], tong_so: 0, con_nua: false }, nguon: [{ loai: "thu", ma: "x", file_goc: "x" }], thoi_diem_tra_loi: "", canh_bao: [] }
              : { ok: false, ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: "không có" };
        return new Response(JSON.stringify(tra), { headers: { "content-type": "application/json" } });
      }),
    );
    const pid = `HV-SO-DO-${Date.now()}`;
    expect(soIssueDoGanNhat(pid, THAY_HET)).toBeNull();
    const dat = await duLieuManIssue(pid);
    expect(dat.issue.filter((i) => i.mucDo === "do").length).toBeGreaterThanOrEqual(4);
    const het = soIssueDoGanNhat(pid, THAY_HET)!;
    const ngoai = soIssueDoGanNhat(pid, NGOAI_HV)!;
    // ISS-CV-NK1 mang ma_du_an NK1 → người NK1 vẫn đếm; thẻ HV của Hợp đồng / Pháp lý / Công việc thì không
    expect(het.soDo - ngoai.soDo).toBe(3);
  });
});

describe("🤖 Phân loại lại — giữ nhóm cũ của thẻ người bấm không thấy", () => {
  it("lưu: dòng mới thay dòng cũ; thẻ ẩn giữ dòng cũ; thẻ thấy mà AI không nhắc thì bỏ (như trước)", () => {
    const pid = `THU-PHAN-LOAI-${Date.now()}`;
    const goc = docSoIssueMain(pid);
    ghiSoIssueMain(
      {
        ...goc,
        phanLoai: [
          { id: "A", nhomChinh: "tien-do", nhomPhu: [], ghiChu: "cũ A" },
          { id: "B", nhomChinh: "tien-do", nhomPhu: [], ghiChu: "cũ B" },
          { id: "C-AN", nhomChinh: "hop-dong", nhomPhu: [], ghiChu: "cũ C" },
        ] as never,
      },
      pid,
    );
    const moi = luuPhanLoai([{ id: "A", nhomChinh: "phap-ly", nhomPhu: [], ghiChu: "mới A" }] as never, pid, ["C-AN"]);
    expect(moi.phanLoai.map((d) => `${d.id}:${d.ghiChu}`)).toEqual(["A:mới A", "C-AN:cũ C"]);
  });
});

describe("⭐ Cần anh xem — chỉ người thấy HẾT thẻ của dự án mới chọn", () => {
  it("thấy hết → được chạy; thiếu thẻ → câu lý do nói số thẻ chưa thấy và nhờ PM / Admin", () => {
    expect(lyDoChanChonCanXem(0)).toBeNull();
    const cau = lyDoChanChonCanXem(7)!;
    expect(cau).toMatch(/bạn chưa thấy 7 thẻ của dự án này/);
    expect(cau).toMatch(/Nhờ PM hoặc Admin bấm/);
    expect(cau).not.toMatch(/token|chi phí|\$/i);
  });
});
