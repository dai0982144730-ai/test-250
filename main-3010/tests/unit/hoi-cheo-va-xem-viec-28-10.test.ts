// Đợt 5 (hỏi chéo qua Main) + B2 (xem việc người khác theo quyền) — KE-HOACH/31, 28/10/2026. Không gọi AI, không gọi mạng.
import { describe, expect, it } from "vitest";
import { nguoiCanXemViec, type ToolContext } from "@/lib/ai/chat-tools";
import { chayCongCu, DANH_MUC_CONG_CU } from "@/lib/cau-hinh-chung/cong-mcp";
import { traLoiCauHoiCheo } from "@/lib/mcp/cua-hoi-cheo";
import { chuyenCongCu, congCuChuyenDuoc } from "@/lib/mcp/cua-chuyen-cong-cu";

const ctx = (loai: "pm" | "admin" | "engineer" | "viewer"): ToolContext => ({
  projectId: "p",
  email: "toi@scigroup.vn",
  role: loai === "pm" || loai === "admin" ? "pm" : "engineer",
  loai,
  userMessage: "",
});

describe("B2 — xem việc người khác theo quyền", () => {
  it("bỏ trống hoặc chính mình → luôn được", async () => {
    expect(await nguoiCanXemViec(ctx("engineer"), "")).toEqual({ email: "toi@scigroup.vn" });
    expect(await nguoiCanXemViec(ctx("engineer"), "Toi@scigroup.vn")).toEqual({ email: "toi@scigroup.vn" });
  });
  it("Người dùng / Người xem hỏi người khác → từ chối bằng lời thường", async () => {
    for (const l of ["engineer", "viewer"] as const) {
      const kq = await nguoiCanXemViec(ctx(l), "thinhhp@scigroup.vn");
      expect("loi" in kq && kq.loi).toContain("PM hoặc Admin");
    }
  });
  it("PM / Admin hỏi email đầy đủ → được, không cần tra danh bạ", async () => {
    expect(await nguoiCanXemViec(ctx("pm"), "@thinhhp@scigroup.vn")).toEqual({ email: "thinhhp@scigroup.vn" });
    expect(await nguoiCanXemViec(ctx("admin"), "thanhnv@scigroup.vn")).toEqual({ email: "thanhnv@scigroup.vn" });
  });
});

describe("Đợt 5 — cổng main.tra_loi_cau_hoi", () => {
  it("có trong danh mục công cụ và sẵn sàng", () => {
    const c = DANH_MUC_CONG_CU.find((x) => x.ten === "main.tra_loi_cau_hoi");
    expect(c?.san_sang).toBe(true);
  });
  it("thiếu câu hỏi hoặc thiếu người hỏi → KHONG_HIEU_YEU_CAU", async () => {
    const a = await traLoiCauHoiCheo({ nguoi_hoi: "x@scigroup.vn" }, "tien-do");
    const b = await traLoiCauHoiCheo({ cau_hoi: "Hợp đồng 548 phạt chậm bao nhiêu?" }, "tien-do");
    expect(!a.ok && a.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
    expect(!b.ok && b.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
  });
  it("tài khoản không có trong Main → KHONG_CO_QUYEN, không gọi AI", async () => {
    const kq = await chayCongCu("main.tra_loi_cau_hoi", { cau_hoi: "Hợp đồng 548 phạt chậm bao nhiêu?", nguoi_hoi: "khong-co-ai@scigroup.vn" }, { agentGoi: "tien-do", lyDoGoi: "kiểm" });
    expect(!kq.ok && kq.ma_loi).toBe("KHONG_CO_QUYEN");
  });
});

describe("Đường lai — cổng main.chuyen_cong_cu (chạy bằng code, không AI)", () => {
  it("có trong danh mục công cụ và sẵn sàng", () => {
    expect(DANH_MUC_CONG_CU.find((x) => x.ten === "main.chuyen_cong_cu")?.san_sang).toBe(true);
  });
  it("danh sách được chuyển chỉ có công cụ đọc, không có công cụ ghi", () => {
    const ds = congCuChuyenDuoc();
    expect(ds.length).toBeGreaterThan(5);
    expect(ds.some((t) => /(^|_)(giao_viec|sua|xoa|tao|ghi|duyet|gui)(_|$)/.test(t))).toBe(false);
  });
  it("công cụ lạ hoặc thiếu tên → báo lỗi kèm danh sách tên hợp lệ", async () => {
    const a = await chuyenCongCu({ cong_cu: "khong_co_cong_cu_nay", nguoi_hoi: "x@scigroup.vn" }, "tien-do");
    const b = await chuyenCongCu({ nguoi_hoi: "x@scigroup.vn" }, "tien-do");
    expect(!a.ok && a.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
    expect(!a.ok && a.thong_diep).toContain(congCuChuyenDuoc()[0]);
    expect(!b.ok && b.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
  });
  it("thiếu người hỏi hoặc tài khoản lạ → chặn trước khi chạy", async () => {
    const ten = congCuChuyenDuoc()[0];
    const a = await chuyenCongCu({ cong_cu: ten }, "tien-do");
    const b = await chuyenCongCu({ cong_cu: ten, nguoi_hoi: "khong-co-ai@scigroup.vn" }, "tien-do");
    expect(!a.ok && a.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
    expect(!b.ok && b.ma_loi).toBe("KHONG_CO_QUYEN");
  });
});
