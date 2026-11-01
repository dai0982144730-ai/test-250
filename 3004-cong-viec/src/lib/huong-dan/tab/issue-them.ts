// Hướng dẫn bản 2 (tab) — khung phải «👤 Thêm issue — người thêm» (nút «+ Thêm issue»). Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/issue/PhaiIssue.tsx (KhungThem: các ô, «Huỷ», «Ghi vào sổ») · lib/cay-viec/issue/so-issue.ts (themIssueNguoi) · quyen.ts (ghi = cong_viec.sua).
// Khung này KHÔNG dùng AI. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Thêm issue do người nhập",
  ai: "Cần quyền «Sửa việc» (quản trị luôn có). Người không có quyền sẽ không thấy nút «+ Thêm issue».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Form này là gì?",
          doan: ["Form ở cột phải để bạn tự ghi một vấn đề (issue) của dự án vào sổ. Khác với thẻ máy sinh, thẻ này do bạn viết nên bạn phải nói rõ vấn đề là gì, mức nào và nên làm gì."],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: ["Vấn đề ngoài sổ việc (hiện trường, họp, trao đổi miệng) máy không thấy; form đưa nó vào chung một sổ với các issue khác.", "Buộc ghi đề xuất xử lý để thẻ có đường đi tiếp, không chỉ là than phiền."],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của form"],
            ["Trước", "Bạn phát hiện vấn đề", "—"],
            ["Form này", "Ghi vào sổ", "Màn bạn đang xem"],
            ["Sau", "Thẻ hiện ở tab «👤 Issue do người thêm»; giao việc xử lý ở khối dưới thẻ", "Tab «Do người thêm»"],
          ],
        },
        {
          tieuDe: "④ Form có những ô nào?",
          bang: [
            ["Ô", "Điền gì", "Bắt buộc"],
            ["«Đối tượng: mã WBS (vd 7.2.3)»", "Mã đầu việc WBS liên quan, nếu có", "Không"],
            ["«Mức: 🟡 Cần xem» / «Mức: 🔴 Nghiêm trọng»", "Chọn một trong hai", "Có (mặc định Cần xem)"],
            ["«Tiêu đề vấn đề *»", "Một câu ngắn nêu vấn đề", "Có"],
            ["«Mô tả vấn đề *»", "Chuyện gì xảy ra, ở đâu, từ khi nào", "Có"],
            ["«Đề xuất xử lý *»", "Nên làm gì; thẻ không nói nên làm gì thì không được hiện", "Có"],
            ["«Ước ảnh hưởng COD (ngày)»", "Ước số ngày vấn đề đẩy lùi ngày hoàn thành mục tiêu", "Không"],
            ["«👤 Người theo dõi»", "Ai theo dõi vấn đề này", "Không"],
            ["Hạn xử lý", "Ngày dd/mm/yyyy cần xử lý xong", "Không"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Điền các ô · bấm «Ghi vào sổ» hoặc «Huỷ»", "Người quyết nội dung"],
            ["MÁY", "Tự điền dự án, người mở, mã issue, thời điểm · cho thẻ vào sổ ngay · kiểm ô bắt buộc", "Chính xác như đã lưu"],
            ["🤖 AI", "Form KHÔNG dùng AI", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Không có bước AI. Người viết, máy ghi vào sổ."],
        },
      ],
    },
    {
      ten: "① Điền và ghi",
      khoi: [
        {
          bam: [
            "Chọn «Mức». Dùng 🔴 Nghiêm trọng khi vấn đề có thể làm lùi ngày hoàn thành mục tiêu hoặc gây rủi ro an toàn; còn lại chọn 🟡 Cần xem.",
            "Gõ «Tiêu đề vấn đề», «Mô tả vấn đề», «Đề xuất xử lý».",
            "Tuỳ chọn: mã WBS liên quan, ước ảnh hưởng COD bằng số ngày, người theo dõi, hạn xử lý.",
            "Bấm «Ghi vào sổ».",
          ],
          ketQua: ["Thẻ mở ngay ở cột phải với mã mới; hiện trong tab «👤 Issue do người thêm». Không cần ai duyệt. Muốn thôi thì bấm «Huỷ» (về lại cột phải tổng quan)."],
          luuY: ["Ước ảnh hưởng COD là số bạn ước, máy không kiểm; để trống thì máy ghi 0 ngày. Thiếu ô bắt buộc thì máy báo lỗi ngay dưới form."],
          viDu: ["Tình huống minh hoạ: Mức 🔴 Nghiêm trọng; Tiêu đề «Thiếu cần cẩu đợt lắp tuabin»; Mô tả «Nhà thầu báo cần cẩu đang kẹt ở công trình khác, dự kiến chậm vào hiện trường»; Đề xuất «Làm việc với nhà thầu cẩu thuê ngoài trong tuần này»; Người theo dõi «Giám đốc dự án»; Hạn xử lý cuối tuần. Bấm «Ghi vào sổ»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Bấm «Ghi vào sổ» báo lỗi đỏ dưới form", "Thiếu hoặc quá ngắn (dưới 3 ký tự) một trong ba ô bắt buộc, hoặc mất kết nối. Điền đủ rồi bấm lại."],
            ["Máy báo «Phải có tiêu đề và mô tả vấn đề»", "Tiêu đề hoặc mô tả quá ngắn (dưới 3 ký tự). Viết rõ hơn rồi ghi lại."],
            ["Ghi nhầm", "Không có nút Xoá. Bấm «Bỏ qua» ở khối dưới thẻ để thẻ rời danh sách."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (form thêm issue ở khung phải, ghi thẳng vào sổ, hiệu lực ngay) · luật chặn: thẻ thiếu «Đề xuất xử lý» hoặc «Ảnh hưởng COD» thì không được hiện.",
};
