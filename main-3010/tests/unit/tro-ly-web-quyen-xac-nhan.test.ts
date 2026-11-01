// Trợ lý chat WEB của Main — cửa quyền theo loại tài khoản + nút ✅ Làm / ❌ Bỏ
// (Mr. Đại chốt 25/09/2026). Cùng MỘT cổng kiemCongCu và MỘT bộ chạy
// xuLyViecCho với Telegram.
// KHÔNG gọi agent Công việc thật: giaoSangCongViec / dsNguoiNhanCV / layViecCuaToiCV là bản giả.
import "../ho-tro/telegram-du-lieu-rieng";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let traLoiAI = "";
vi.mock("@/lib/ai/providers", () => ({ runAI: async () => traLoiAI }));
vi.mock("@/lib/chung/hoi-trung-hoi", () => ({ hoiTrungTruocKhiSoan: async () => ({ trung: null, nghi: [], da_hoi: [], chua_hoi_duoc: [] }) })); // kiểm lần 5 🟡1: không hỏi agent thật
vi.mock("@/lib/skill/ky-nang", () => ({
  SKILL_CO_SCRIPT: [],
  docNoiDung: () => null,
  dongBoSandbox: () => "",
  layDanhSach: () => [],
}));
vi.mock("@/lib/ai/van-phong-luu", () => ({ docVanPhong: () => ({ noiDung: "" }) }));

// ---- Agent Công việc giả (04/10: trợ lý giao thẳng sang agent Công việc, Base.vn đã bỏ): ghi lại mọi lần giao,
// KHÔNG chạm mạng — kể cả công cụ đọc tự hỏi sẵn (danh_ba_base, viec_base) ----
const daTaoViec: { ten: string; giaoCho?: string }[] = [];
vi.mock("@/lib/chung/viec-cong-viec", async (goc) => ({
  ...((await goc()) as object),
  giaoSangCongViec: async (i: { ten: string; giaoCho?: string }) => {
    daTaoViec.push(i);
    return { ok: true, maViec: "CV-GIA-1" };
  },
  dsNguoiNhanCV: async () => ({ ok: true, ds: { nguoi: [{ id: "thinhhp", ten: "Hoàng Phú Thịnh", dv: "P.ĐT&PC" }], don_vi: [] } }),
  layViecCuaToiCV: async () => ({ ok: true, dem: { giao: 0, nhan: 0, phoi_hop: 0 }, ds: { giao: [], nhan: [], phoi_hop: [] } }),
}));

import { runChatAgent } from "@/lib/ai/chat-agent";
import { kiemCongCu } from "@/lib/ai/chat-tools";
import { TOOL_SPECS, type ToolSpec } from "@/lib/ai/chat-types";
import { canXacNhan } from "@/lib/ai/cho-duyet";
import { docViecCho, themViecCho, viecChoCuaPhien, xuLyViecCho } from "@/lib/ai/cho-duyet-kho";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { CAC_CUA, LY_DO_CHAN, type Role } from "@/lib/quyen";

const CAU_GIAO = "giao việc đổ bê tông móng cho thịnh, giao luôn lên base";

const vaoWeb = (loai: Role, message: string) => ({
  projectId: "default",
  email: `${loai}@sci.vn`,
  role: (loai === "pm" || loai === "admin" ? "pm" : "engineer") as "pm" | "engineer",
  loai,
  message,
  history: [],
  kenh: "web" as const,
});

/** Việc chờ như route /api/ai/chat vừa xếp vào kho */
function xepCho(email: string, name = "tao_viec_base", args: Record<string, unknown> = { ten: "Đổ bê tông móng", giaoCho: "thinhhp" }) {
  return themViecCho({ kenh: "web", email, projectId: "default", sessionId: "s-thu-abcd", name, args, cauHoi: CAU_GIAO });
}

beforeEach(() => {
  daTaoViec.length = 0;
  fs.rmSync(path.join(gocDuLieu(), "tro-ly"), { recursive: true, force: true });
});

describe("mỗi công cụ khai cửa quyền", () => {
  it("mọi công cụ đều có cửa hợp lệ; công cụ GHI không khai cửa xem", () => {
    for (const s of TOOL_SPECS) {
      expect(CAC_CUA, s.name).toContain(s.cua);
      if (s.writes) expect(s.cua, s.name).not.toBe("xem");
    }
  });
});

describe("cổng kiemCongCu theo loại tài khoản", () => {
  it("Người xem: hỏi đáp được (cửa Xem), gọi công cụ GHI bị chặn kèm lý do tiếng Việt", () => {
    const ctx = { projectId: "default", email: "xem@sci.vn", role: "engineer" as const, loai: "viewer" as const, userMessage: CAU_GIAO };
    expect(kiemCongCu("tom_tat_du_an", ctx)).toBeNull();
    const chan = kiemCongCu("tao_viec_base", ctx);
    expect(chan?.ok).toBe(false);
    expect(chan?.summary).toContain(LY_DO_CHAN.ghi);
  });

  it("Người dùng gọi công cụ Cài đặt → bị chặn; PM/Admin qua; Admin KHÔNG qua cửa Phê duyệt", () => {
    const caiDat: ToolSpec = { name: "doi_cai_dat", description: "", args: "", cua: "caidat" };
    const kyPhieu: ToolSpec = { name: "ky_phieu_gia", description: "", args: "", cua: "pheduyet" };
    const ctx = (loai: Role) => ({ projectId: "default", email: "a@sci.vn", role: "engineer" as const, loai, userMessage: "đổi cài đặt" });
    expect(kiemCongCu("doi_cai_dat", ctx("engineer"), [caiDat])?.summary).toContain(LY_DO_CHAN.caidat);
    expect(kiemCongCu("doi_cai_dat", ctx("pm"), [caiDat])).toBeNull();
    expect(kiemCongCu("doi_cai_dat", ctx("admin"), [caiDat])).toBeNull();
    expect(kiemCongCu("ky_phieu_gia", ctx("admin"), [kyPhieu])?.summary).toContain(LY_DO_CHAN.pheduyet);
    expect(kiemCongCu("ky_phieu_gia", ctx("pm"), [kyPhieu])).toBeNull();
  });
});

describe("trợ lý web — công cụ GHI chờ nút ✅ Làm", () => {
  it("Người dùng yêu cầu giao việc → KHÔNG tạo trên Base trong lượt chat, vào hàng chờ", async () => {
    traLoiAI = JSON.stringify({
      reply: "Mình sẽ giao việc.",
      actions: [{ name: "tao_viec_base", args: { ten: "Đổ bê tông móng", giaoCho: "thinhhp" } }],
    });
    const kq = await runChatAgent(vaoWeb("engineer", CAU_GIAO));
    expect(daTaoViec).toHaveLength(0);
    expect(kq.choDuyet).toEqual([{ name: "tao_viec_base", args: { ten: "Đổ bê tông móng", giaoCho: "thinhhp" } }]);
    expect(kq.actions).toHaveLength(0); // không hiện chip "đã chạy"
  });

  it("Người xem gọi công cụ GHI → bị chặn, không có nút, mô hình nhận câu từ chối", async () => {
    traLoiAI = JSON.stringify({ reply: "", actions: [{ name: "tao_viec_base", args: { ten: "x" } }] });
    const kq = await runChatAgent(vaoWeb("viewer", CAU_GIAO));
    expect(kq.choDuyet).toHaveLength(0);
    expect(daTaoViec).toHaveLength(0);
    expect(kq.actions[0]?.summary).toContain("Người xem");
  });

  it("soan_viec_giao trên web giữ hành vi cũ (nháp chờ «Giao ngay» trên màn) — không đòi bấm thêm ✅ Làm", () => {
    expect(canXacNhan("soan_viec_giao", { ten: "x" }, "web")).toBe(false);
    expect(canXacNhan("soan_viec_giao", { ten: "x" }, "telegram")).toBe(true);
    expect(canXacNhan("tao_viec_base", { ten: "x" }, "web")).toBe(true);
    expect(canXacNhan("tom_tat_du_an", {}, "web")).toBe(false);
  });

  it("bấm hộ giao diện: chỉ lọc/mở trang chạy ngay; có bước GHI thì chờ nút", () => {
    expect(canXacNhan("dieu_khien_giao_dien", { buoc: [{ lenh: "alerts.tab", giaTri: "⭐ Cần anh xem" }] }, "web")).toBe(false);
    expect(canXacNhan("dieu_khien_giao_dien", { buoc: [{ lenh: "alerts.tab" }, { lenh: "viec.gui-nhap" }] }, "web")).toBe(true);
  });
});

describe("bấm nút — bộ chạy chung xuLyViecCho", () => {
  it("✅ Làm: chạy đúng MỘT lần (Base giả), bấm đúp không chạy lại", async () => {
    const v = xepCho("nguoidung@sci.vn");
    expect(viecChoCuaPhien("default", "s-thu-abcd", "nguoidung@sci.vn", "web").map((x) => x.id)).toEqual([v.id]);
    const nguoi = { email: "nguoidung@sci.vn", loai: "engineer" as const };
    const lan1 = await xuLyViecCho({ id: v.id, hanhDong: "lam", kenh: "web", nguoi });
    expect(lan1.trangThai).toBe("da-lam");
    expect(lan1.action?.ok).toBe(true);
    expect(daTaoViec).toEqual([expect.objectContaining({ ten: "Đổ bê tông móng", giaoCho: "thinhhp" })]);
    const lan2 = await xuLyViecCho({ id: v.id, hanhDong: "lam", kenh: "web", nguoi });
    expect(lan2.trangThai).toBe("xong-truoc");
    expect(daTaoViec).toHaveLength(1);
    expect(viecChoCuaPhien("default", "s-thu-abcd", "nguoidung@sci.vn", "web")).toHaveLength(0);
  });

  it("❌ Bỏ: không chạy công cụ", async () => {
    const v = xepCho("nguoidung@sci.vn");
    const kq = await xuLyViecCho({ id: v.id, hanhDong: "bo", kenh: "web", nguoi: { email: "nguoidung@sci.vn", loai: "engineer" } });
    expect(kq.trangThai).toBe("da-bo");
    expect(daTaoViec).toHaveLength(0);
    expect(docViecCho().find((x) => x.id === v.id)?.trangThai).toBe("da-bo");
  });

  it("người khác bấm → từ chối, việc của chủ vẫn còn chờ", async () => {
    const v = xepCho("nguoidung@sci.vn");
    const kq = await xuLyViecCho({ id: v.id, hanhDong: "lam", kenh: "web", nguoi: { email: "dai@sci.vn", loai: "pm" } });
    expect(kq.trangThai).toBe("tu-choi");
    expect(daTaoViec).toHaveLength(0);
    expect(docViecCho().find((x) => x.id === v.id)?.trangThai).toBe("cho");
  });

  it("chủ bị hạ xuống Người xem trước khi bấm → cổng xét lại, không chạy", async () => {
    const v = xepCho("nguoidung@sci.vn");
    const kq = await xuLyViecCho({ id: v.id, hanhDong: "lam", kenh: "web", nguoi: { email: "nguoidung@sci.vn", loai: "viewer" } });
    expect(kq.action?.ok).toBe(false);
    expect(kq.action?.summary).toContain(LY_DO_CHAN.ghi);
    expect(daTaoViec).toHaveLength(0);
  });

  it("nút quá 24 giờ không chạy; nút Telegram không bấm được từ web", async () => {
    const v = xepCho("nguoidung@sci.vn");
    const nguoi = { email: "nguoidung@sci.vn", loai: "engineer" as const };
    const qua = await xuLyViecCho({ id: v.id, hanhDong: "lam", kenh: "web", nguoi, bay: Date.now() + 25 * 3600 * 1000 });
    expect(qua.trangThai).toBe("qua-han");
    const tg = themViecCho({ kenh: "telegram", chatId: "1", email: "nguoidung@sci.vn", projectId: "default", sessionId: "s-thu-abcd", name: "tao_viec_base", args: { ten: "x" }, cauHoi: CAU_GIAO });
    expect((await xuLyViecCho({ id: tg.id, hanhDong: "lam", kenh: "web", nguoi })).trangThai).toBe("khong-thay");
    expect(daTaoViec).toHaveLength(0);
  });
});
