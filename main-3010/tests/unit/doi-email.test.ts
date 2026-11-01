// Đổi email tài khoản ở Main (Mr. Đại chốt 04/10/2026 — hung@scigroup.vn → hungnc@scigroup.vn, mật khẩu = email mới).
// Chạy trên BẢN SAO data/ (globalSetup) — không đụng dữ liệu thật; không đẩy sang agent thật (dayChoCacAgent giả).
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/day-sang-agent", async (goc) => ({
  ...((await goc()) as object),
  dayChoCacAgent: async () => [],
}));

import { doiEmailNguoiDung } from "@/lib/doi-email";
import { createUser, getUserByEmail, verifyUser } from "@/lib/users";
import { createSession, getSession } from "@/lib/ai/chat-store";
import { docPhien, ghiPhien } from "@/lib/telegram-tro-ly/kho";
import { docViecCho, themViecCho } from "@/lib/ai/cho-duyet-kho";
import { docBiDanhTaiKhoan } from "@/lib/bi-danh-tai-khoan";

describe("đổi email tài khoản", () => {
  it("giữ mã người, mật khẩu = email mới, chuyển phiên chat · Telegram · việc chờ, ghi bí danh", async () => {
    createUser({ email: "thu-doi-cu@scigroup.vn", name: "Người Thử Đổi Email", role: "engineer", password: "matkhau-cu-123" });
    const truoc = getUserByEmail("thu-doi-cu@scigroup.vn")!;
    const phien = createSession("default", "thu-doi-cu@scigroup.vn", "phiên của người sắp đổi email");
    ghiPhien("thu-doi-cu@scigroup.vn", { projectId: "default", sessionId: phien.id });
    themViecCho({ kenh: "web", email: "thu-doi-cu@scigroup.vn", projectId: "default", sessionId: phien.id, name: "x", args: {}, cauHoi: "x" });

    const kq = await doiEmailNguoiDung("Thu-Doi-Cu@scigroup.vn", " thu-doi-moi@scigroup.vn ", "quantri@scigroup.vn");
    expect(kq.emailMoi).toBe("thu-doi-moi@scigroup.vn");
    expect(kq.daChuyen).toMatchObject({ phienChat: 1, telegram: true, viecCho: 1 });

    const sau = getUserByEmail("thu-doi-moi@scigroup.vn")!;
    expect(sau.id).toBe(truoc.id); // mã người giữ nguyên
    expect(sau.name).toBe("Người Thử Đổi Email");
    expect(getUserByEmail("thu-doi-cu@scigroup.vn")).toBeNull();
    expect(verifyUser("thu-doi-moi@scigroup.vn", "thu-doi-moi@scigroup.vn")).not.toBeNull(); // mật khẩu = email mới
    expect(verifyUser("thu-doi-moi@scigroup.vn", "matkhau-cu-123")).toBeNull();

    expect(getSession("default", phien.id)!.createdBy).toBe("thu-doi-moi@scigroup.vn");
    expect(docPhien("thu-doi-moi@scigroup.vn")?.sessionId).toBe(phien.id);
    expect(docPhien("thu-doi-cu@scigroup.vn")).toBeNull();
    expect(docViecCho().filter((v) => v.sessionId === phien.id).map((v) => v.email)).toEqual(["thu-doi-moi@scigroup.vn"]);
    expect(docBiDanhTaiKhoan().find((b) => b.email_cu === "thu-doi-cu@scigroup.vn")?.email_moi).toBe("thu-doi-moi@scigroup.vn");

    // Đổi tiếp lần nữa: dòng bí danh cũ trỏ thẳng tới email đang dùng
    await doiEmailNguoiDung("thu-doi-moi@scigroup.vn", "thu-doi-ba@scigroup.vn", "quantri@scigroup.vn");
    const bd = docBiDanhTaiKhoan();
    expect(bd.find((b) => b.email_cu === "thu-doi-cu@scigroup.vn")?.email_moi).toBe("thu-doi-ba@scigroup.vn");
    expect(bd.find((b) => b.email_cu === "thu-doi-moi@scigroup.vn")?.email_moi).toBe("thu-doi-ba@scigroup.vn");
  });

  it("email mới trùng tài khoản khác / sai dạng / trùng email cũ → lỗi tiếng Việt, không đổi gì", async () => {
    createUser({ email: "thu-trung-a@scigroup.vn", name: "A", role: "engineer", password: "matkhau-123" });
    createUser({ email: "thu-trung-b@scigroup.vn", name: "B", role: "engineer", password: "matkhau-123" });
    await expect(doiEmailNguoiDung("thu-trung-a@scigroup.vn", "thu-trung-b@scigroup.vn", "qt")).rejects.toThrow(/đã là một tài khoản khác/);
    await expect(doiEmailNguoiDung("thu-trung-a@scigroup.vn", "khong-co-a-cong", "qt")).rejects.toThrow(/không đúng dạng/);
    await expect(doiEmailNguoiDung("thu-trung-a@scigroup.vn", "THU-TRUNG-A@scigroup.vn", "qt")).rejects.toThrow(/trùng email đang dùng/);
    expect(verifyUser("thu-trung-a@scigroup.vn", "matkhau-123")).not.toBeNull();
  });
});
