// Main — siết mẫu nhận câu dieu_khien_giao_dien (26/09, khuôn tiến độ be1825c):
// động từ thao tác màn hình phải đứng thành từ riêng; câu HỎI ("đã … chưa?") không mở
// được dãy bấm hộ có bước GHI. Chỉ gọi cổng kiemCongCu — không chạy bước nào.
import { describe, expect, it } from "vitest";
import { kiemCongCu } from "@/lib/ai/chat-tools";
import { TOOL_SPECS } from "@/lib/ai/chat-types";

const ctx = (cau: string) => ({
  projectId: "default",
  email: "nguoidung@sci.vn",
  role: "engineer" as const,
  loai: "engineer" as const,
  userMessage: cau,
});
const BUOC_GHI = { buoc: [{ lenh: "alerts.duyet-ai", wbs: "DX-1" }] };
const BUOC_XEM = { buoc: [{ lenh: "chung.mo-trang", giaTri: "/alerts" }] };
const kiem = (cau: string, args: Record<string, unknown>) => kiemCongCu("dieu_khien_giao_dien", ctx(cau), TOOL_SPECS, args);

describe("dieu_khien_giao_dien — mẫu nhận câu đã siết", () => {
  it("câu không có động từ thao tác (mẫu cũ lọt vì 'ho ', 'lam ', 'giup') → chặn", () => {
    expect(kiem("cho tôi biết issue nào gấp", BUOC_XEM)).not.toBeNull();
    expect(kiem("làm sao để giảm issue đỏ", BUOC_XEM)).not.toBeNull();
    expect(kiem("giúp mình xem tình hình", BUOC_XEM)).not.toBeNull();
  });

  it("câu HỎI 'đã … chưa?' không mở được bước GHI", () => {
    expect(kiem("đã duyệt đề xuất DX-1 chưa?", BUOC_GHI)).not.toBeNull();
    expect(kiem("đã bấm duyệt DX-1 chưa", BUOC_GHI)).not.toBeNull();
    expect(kiem("vào Issue bấm duyệt đề xuất DX-1", BUOC_GHI)).toBeNull();
  });

  it("bước chỉ mở trang / lọc vẫn nhận câu nhờ lịch sự có dấu hỏi", () => {
    expect(kiem("mở màn Issue được không?", BUOC_XEM)).toBeNull();
    expect(kiem("vào Issue lọc nhóm Pháp lý", BUOC_XEM)).toBeNull();
  });
});
