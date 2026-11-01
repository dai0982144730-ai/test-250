// Trợ lý chat Main CHỈ ÁNH XẠ số tiến độ qua cổng (Mr. Đại chốt 24/09)
import { beforeEach, describe, expect, it, vi } from "vitest";

const goi: { maAgent: string; congCu: string; lyDo: string; thamSo: unknown }[] = [];

vi.mock("@/lib/nguon/hoi-agent", () => ({
  noiGoi: () => ({ diaChi: "http://127.0.0.1:3003", duongDan: "/api/mcp/tiendo", ten: "Agent Tiến độ", loi: null }),
  hoiAgent: async (maAgent: string, congCu: string, lyDo: string, tc: { tham_so?: unknown }) => {
    goi.push({ maAgent, congCu, lyDo, thamSo: tc.tham_so });
    return {
      ok: true,
      du_lieu: { cod_du_bao: "2027-08-08", cham_ngay_so_muc_tieu: 50, tom_tat: "COD dự báo 2027-08-08." },
      nguon: [{ loai: "tien-do", ma: "hv", file_goc: "D:/x/5-Agent-tien-do/data/projects/hv/schedule.json" }],
      thoi_diem_tra_loi: "2026-09-24T00:00:00Z",
      canh_bao: [],
    };
  },
}));

// ⭐ 12/10/2026: trợ lý Main không hỏi HỘ phần mật (Hợp đồng · Pháp lý) của dự án người hỏi không thuộc — bộ lọc thật đọc sơ đồ tổ
// chức; ở đây giả bộ lọc: mặc định thấy hết (bài kiểm ĐỊNH TUYẾN), `chanMat.bat` = người ngoài dự án (bài kiểm CHẶN).
const chanMat = { bat: false };
vi.mock("@/lib/agent-mat-tren-main", () => ({
  boLocMatCuaNguoi: () => ({ thayHet: !chanMat.bat, thay: (agent: string) => !chanMat.bat || (agent !== "hopdong" && agent !== "phaply") }),
}));

import { CONG_TIEN_DO, DA_CHUYEN_SANG_TIEN_DO, runTool } from "@/lib/ai/chat-tools";
import { TOOL_SPECS } from "@/lib/ai/chat-types";

const ctx = { projectId: "hv", email: "pm@sci.vn", role: "pm" as const, userMessage: "HV chậm bao nhiêu ngày" };

beforeEach(() => {
  goi.length = 0;
  chanMat.bat = false;
});

describe("trợ lý Main — số tiến độ đi hỏi cổng tiendo", () => {
  it("mọi công cụ HỎI AGENT TIẾN ĐỘ đều có trong TOOL_SPECS và trỏ về tiendo.*", () => {
    const ten = new Set(TOOL_SPECS.map((s) => s.name));
    for (const [k, v] of Object.entries(CONG_TIEN_DO)) {
      expect(ten, k).toContain(k);
      expect(v.congCu).toBe(`tiendo.${k}`);
    }
  });

  it("gọi tom_tat_du_an = một lời hoiAgent('tiendo') kèm ma_du_an đang mở + lý do là câu hỏi", async () => {
    const kq = await runTool("tom_tat_du_an", {}, ctx);
    expect(kq.ok).toBe(true);
    expect(goi).toHaveLength(1);
    expect(goi[0]!.maAgent).toBe("tiendo");
    expect(goi[0]!.congCu).toBe("tiendo.tom_tat_du_an");
    expect(goi[0]!.thamSo).toEqual({ ma_du_an: "hv" });
    expect(goi[0]!.lyDo).toContain("HV chậm bao nhiêu ngày");
    expect(kq.summary).toContain("Nguồn:");
  });

  it("mô hình không đổi được dự án qua tham số lạ", async () => {
    await runTool("nang_suat", { ma_du_an: "du-an-khac", thau_phu: "SNP" }, ctx);
    expect(goi[0]!.thamSo).toEqual({ ma_du_an: "hv", thau_phu: "SNP" });
  });

  it("công cụ GHI cũ → câu chỉ đường sang Agent tiến độ, không gọi cổng", async () => {
    for (const cu of ["update_task_pct", "lock_baseline", "run_analysis", "viet_nhap_bao_cao"]) {
      const kq = await runTool(cu, {}, ctx);
      expect(kq.ok).toBe(false);
      expect(kq.summary).toContain("http://localhost:3003");
      expect(kq.summary).toContain("Agent tiến độ");
    }
    expect(goi).toHaveLength(0);
    // tên đọc cũ → chỉ tên mới
    expect(DA_CHUYEN_SANG_TIEN_DO.project_summary!.thay).toBe("tom_tat_du_an");
  });
});

// ⭐ 25/09 — bỏ màn "Hỏi vắt ngang các ban", dồn vào trợ lý: công cụ đọc của
// pháp lý · hợp đồng · Base + tham số du_an nhận mã ngắn / tên dự án.
import { CONG_AGENT_KHAC } from "@/lib/ai/chat-tools";
import { timDuAn } from "@/lib/projects";

describe("trợ lý Main — hỏi vắt ngang pháp lý · hợp đồng · Base", () => {
  it("mọi công cụ hỏi 3 agent có trong TOOL_SPECS, cửa Xem, trỏ đúng agent", () => {
    for (const [k, v] of Object.entries(CONG_AGENT_KHAC)) {
      const spec = TOOL_SPECS.find((s) => s.name === k);
      expect(spec, k).toBeDefined();
      expect(spec!.cua).toBe("xem");
      expect(spec!.writes).toBeFalsy();
      expect(v.congCu.startsWith(`${v.agent}.`), k).toBe(true);
    }
    expect(Object.keys(CONG_AGENT_KHAC).length).toBeGreaterThanOrEqual(5);
    for (const bat of ["phaply.ho_so_thieu", "hopdong.phieu_gia_dang_cho", "hopdong.gia_tri_luy_ke", "base.viec_qua_han"]) {
      expect(Object.values(CONG_AGENT_KHAC).map((v) => v.congCu)).toContain(bat);
    }
  });

  it("tra dự án theo mã ngắn / tên — không so slug", () => {
    const hv = timDuAn("HV");
    expect(hv?.ma).toBe("HV");
    expect(timDuAn("hv")?.id).toBe(hv?.id);
    expect(timDuAn("Hướng Việt")?.id).toBe(hv?.id);
    expect(timDuAn("dự án HV")?.id).toBe(hv?.id);
    expect(timDuAn("nậm săm 3A")?.ma).toBe("N3A");
    expect(timDuAn("Tân Thành")?.ma).toBe("TT");
    expect(timDuAn("không có dự án này")).toBeNull();
  });

  it("người ngoài dự án: trợ lý KHÔNG gọi sang Pháp lý, trả câu «chỉ thành viên dự án»; Tiến độ và Công việc vẫn hỏi được (12/10/2026)", async () => {
    chanMat.bat = true;
    const kq = await runTool("phaply_ho_so_thieu", { du_an: "HV" }, ctx);
    expect(kq.ok).toBe(false);
    expect(kq.summary).toMatch(/Hồ sơ pháp lý của dự án chỉ thành viên dự án xem được/);
    expect(goi).toHaveLength(0); // chặn TRƯỚC khi gọi sang agent
    await runTool("tom_tat_du_an", { du_an: "HV" }, ctx);
    await runTool("base_viec_qua_han", { du_an: "HV", gioi_han: 5 }, ctx);
    expect(goi.map((g) => g.maAgent)).toEqual(["tiendo", "base"]);
  });

  it("vì sao HV chậm: du_an 'HV' → hỏi đúng dự án HV ở pháp lý, Base, tiến độ", async () => {
    const hv = timDuAn("HV")!;
    await runTool("phaply_ho_so_thieu", { du_an: "HV" }, ctx);
    await runTool("base_viec_qua_han", { du_an: "Hướng Việt", gioi_han: 5 }, ctx);
    await runTool("tom_tat_du_an", { du_an: "HV" }, ctx);
    expect(goi.map((g) => [g.maAgent, g.congCu])).toEqual([
      ["phaply", "phaply.ho_so_thieu"],
      ["base", "base.viec_qua_han"],
      ["tiendo", "tiendo.tom_tat_du_an"],
    ]);
    expect(goi.map((g) => (g.thamSo as { ma_du_an: string }).ma_du_an)).toEqual([hv.id, hv.id, hv.id]);
    expect((goi[1]!.thamSo as { gioi_han: number }).gioi_han).toBe(5);
  });

  it("dự án không nhận ra → không gọi cổng, liệt kê dự án đang có", async () => {
    const kq = await runTool("hopdong_gia_tri_luy_ke", { du_an: "XYZ không tồn tại" }, ctx);
    expect(kq.ok).toBe(false);
    expect(kq.summary).toContain("Không nhận ra dự án");
    expect(kq.summary).toContain("HV");
    expect(goi).toHaveLength(0);
  });

  it("thiếu mã bắt buộc → không gọi cổng", async () => {
    const kq = await runTool("phaply_ho_so_cua_wbs", {}, ctx);
    expect(kq.ok).toBe(false);
    expect(goi).toHaveLength(0);
  });
});
