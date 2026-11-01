// ============================================================
// ai/ten-tinh-nang-ai.ts — TÊN TIẾNG VIỆT của các tính năng gọi AI ở Main (luật 30: không để mã trần ra màn Thống kê dùng AI).
// Mã = đường tệp gọi AI (so-dung-ai.ts đọc ngăn xếp lúc vào runAI). Tệp RIÊNG của từng agent — thêm chỗ gọi AI mới thì thêm dòng.
// ============================================================

export const TEN_TINH_NANG: Record<string, string> = {
  "lib/ai/chat-agent": "Trợ lý chat",
  "lib/tro-ly/xuat-theo-yeu-cau": "Trợ lý: xuất file theo yêu cầu",
  "app/api/skill/route": "Skill AI: soạn tệp SKILL.md",
  "lib/bang-dieu-hanh/nhan-dinh-mau-thuan": "Bảng điều hành: nhận định mâu thuẫn chéo",
  "lib/bang-dieu-hanh/tom-tat-ai": "Bảng điều hành: tóm tắt AI",
  "lib/bao-cao-sang/cau-hoi-ai": "Báo cáo sáng: câu hỏi AI",
  "lib/bao-cao-thang/nhan-xet": "Báo cáo tháng: nhận xét AI",
  "lib/chung/viec-ai-soan": "Soạn việc giao bằng AI",
  "lib/issue-main/chay-llm": "Issue: AI phân loại",
  "lib/ai/thu-tai-khoan": "Nút Thử trợ lý AI (thẻ tài khoản Claude)",
  "lib/ai/moi-phien": "Mồi phiên làm việc buổi sáng",
};
