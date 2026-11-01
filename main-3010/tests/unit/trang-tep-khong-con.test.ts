// Link tải tệp Trợ lý làm trong chat mà tệp đã tự xoá (quá 7 ngày) → trang HTML tiếng Việt mã 404, không phải JSON trần.
// Kiểm độc lập lần 7 (17/10/2026): bấm link cũ trong khung chat → trình duyệt mở trang {"ok":false,…}.
// Bài kiểm chạy trên thư mục dữ liệu THỬ của bộ kiểm (cửa tra tệp có dọn tệp quá hạn), không đụng data/ thật.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/providers", () => ({ runAI: vi.fn() }));
vi.mock("@/lib/route-auth", () => ({
  requireRole: vi.fn(async () => ({ ok: true, session: { email: "thu@scigroup.vn", role: "user" } })),
}));

import { trangTepKhongCon } from "@/lib/tro-ly/trang-tep-khong-con";
import { GET } from "@/app/api/tro-ly/xuat/tai/route";

if (!(process.env.THU_MUC_DU_LIEU ?? "").trim()) {
  throw new Error("Bài kiểm chưa được trỏ sang thư mục dữ liệu thử — dừng, không xoá gì");
}

describe("trang «tệp không còn» — link tải tệp chat đã quá 7 ngày", () => {
  it("mã 404, trang HTML tiếng Việt, không phải JSON", async () => {
    const r = trangTepKhongCon();
    expect(r.status).toBe(404);
    expect(r.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    const html = await r.text();
    expect(html.trimStart().startsWith("{")).toBe(false);
    expect(html).toContain('<html lang="vi">');
    expect(html).toContain("Tệp đã quá 7 ngày nên đã tự xoá");
    expect(html).toContain("xuất lại file Word");
    expect(html).not.toMatch(/"ok"\s*:/);
  });

  it("cửa GET /api/tro-ly/xuat/tai với mã không còn tệp → đúng trang đó", async () => {
    const r = await GET(new Request("http://localhost/api/tro-ly/xuat/tai?ma=zzzzzz99"));
    expect(r.status).toBe(404);
    expect(r.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await r.text()).toContain("Tệp đã quá 7 ngày nên đã tự xoá");
  });

  it("mã sai khuôn cũng ra trang HTML, không ném lỗi", async () => {
    const r = await GET(new Request("http://localhost/api/tro-ly/xuat/tai?ma=../../x"));
    expect(r.status).toBe(404);
    expect(r.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  });
});
