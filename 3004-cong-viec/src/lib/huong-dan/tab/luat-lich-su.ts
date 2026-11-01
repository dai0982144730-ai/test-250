// Hướng dẫn bản 2 (tab) — Hộp «Lịch sử phiên bản» của MỘT luật kiểm tra. Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/luat/LichSuLuat.tsx (dòng thời gian, nhãn thay đổi, «Quay lại bản này» › «Đồng ý» / «Thôi») · lib/luat/kho-luat.ts (quayLaiLuat: tạo phiên bản MỚI mang nội dung cũ, quyền sửa luật).
// Khác mục «Lịch sử» của Cài đặt (nhóm B4): đây chỉ là phiên bản của một luật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Lịch sử phiên bản của một luật",
  ai: "Ai mở được danh sách luật cũng xem được lịch sử. Nút «Quay lại bản này» chỉ hiện với người sửa được luật (quản trị viên, người có quyền «cau_hinh.sua», hoặc người được mục «Phân quyền cài đặt» cho phép); người không có quyền sẽ không thấy nút.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Hộp này là gì",
          doan: [
            "Mỗi lần ai đó lưu một luật (đổi câu, bật tắt, đổi mức, đổi mẫu áp dụng…) máy ghi thành một «phiên bản» mới đánh số 1, 2, 3… Hộp «Lịch sử phiên bản · tên luật» liệt kê tất cả các phiên bản của riêng luật đó, mới nhất ở trên, kèm ai sửa, lúc nào, đổi cái gì so với bản trước.",
            "Đừng nhầm với mục «Lịch sử» của Cài đặt: mục đó ghi mọi thao tác của cả hệ thống. Hộp này chỉ nói về MỘT luật.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Biết ai đổi luật làm báo cáo của đơn vị bỗng bị chặn gửi, và đổi từ gì sang gì.",
            "Lỡ sửa sai thì quay về bản cũ trong vài cú bấm, không cần nhớ giá trị cũ.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Ở danh sách luật, bấm «⋯» của dòng luật › «Lịch sử phiên bản»"],
            ["Hộp này", "Đọc lịch sử, quay về bản cũ nếu cần"],
            ["Sau", "Luật chạy theo bản vừa chọn, từ báo cáo tải lên kế tiếp"],
          ],
        },
        {
          tieuDe: "④ Các khối",
          bang: [
            ["Khối", "Để làm gì"],
            ["Dòng thời gian bên trái, mỗi chấm một phiên bản", "Chấm đặc màu nhấn là bản đang dùng, kèm chữ «Đang dùng»"],
            ["Dòng đầu mỗi phiên bản: «Phiên bản N», huy hiệu cách kiểm, mức, chữ «đã tắt»", "Nhìn nhanh bản đó cấu hình thế nào"],
            ["Dòng chữ nhỏ: người sửa và giờ", "Ai làm lúc nào; lần ghi do hệ thống thì hiện «Hệ thống»"],
            ["Danh sách đổi gì so với bản liền trước", "Chữ gạch ngang là giá trị cũ, chữ màu nhấn là giá trị mới"],
            ["Nút «Quay lại bản này»", "Chỉ cho người sửa được, không có ở bản đang dùng"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Đọc lịch sử; người có quyền bấm «Quay lại bản này» rồi «Đồng ý»."],
            ["Máy", "Ghi phiên bản mỗi lần lưu; so từng bản với bản trước để liệt kê thay đổi; khi quay lại thì tạo phiên bản mới."],
            ["🤖 AI", "— Hộp này không dùng AI."],
          ],
        },
        { tieuDe: "⑥ Quy trình người ↔ AI", doan: ["Hộp này không dùng AI: máy ghi, người đọc và quyết định quay lại."] },
      ],
    },
    {
      ten: "① Đọc lịch sử",
      khoi: [
        { doan: ["Mỗi phiên bản liệt kê những thứ đã đổi so với bản liền trước. Bản đầu tiên ghi «Tạo luật»."] },
        {
          bang: [
            ["Dòng thay đổi", "Nghĩa"],
            ["Trạng thái: Bật → Tắt", "Công tắc bật tắt luật đổi"],
            ["Mức: Cảnh báo → Chặn gửi", "Mức khi không đạt đổi"],
            ["Cách kiểm", "Đổi giữa Code, AI, Code + AI"],
            ["Tên · Câu luật · Nhóm", "Chữ đổi (hiện giá trị cũ gạch ngang và giá trị mới)"],
            ["Áp dụng", "Đổi mẫu áp dụng (ví dụ từ «Mọi mẫu» sang «Form 7»)"],
            ["Dạng luật / tham số đã đổi", "Đổi dạng luật hoặc các ô tham số (không liệt kê từng ô)"],
            ["Hướng dẫn cho AI đã đổi", "Đổi hướng dẫn cho luật có phần AI"],
            ["Khi AI lỗi: Cho gửi ↔ Chặn", "Đổi cách xử lý khi AI trục trặc"],
            ["Lưu lại, không đổi nội dung", "Có người bấm lưu nhưng không đổi gì"],
          ],
        },
        {
          viDu: [
            "Hôm nay nhiều đơn vị báo không gửi được báo cáo. Quản trị mở lịch sử luật «Công việc có tên; phụ trách trống thì gán đơn vị lập», thấy phiên bản mới nhất ghi «Mức: Cảnh báo → Chặn gửi» do một người sửa lúc sáng. Nguyên nhân rõ: có người đã nâng mức luật lên chặn.",
          ],
        },
        { luuY: ["Luật hệ thống có thêm các phiên bản ghi tự động khi đồng bộ từ Cài đặt › «Luật hệ thống». Chúng vẫn là các bản bình thường."] },
      ],
    },
    {
      ten: "② Quay lại bản cũ",
      khoi: [
        { doan: ["Quay lại KHÔNG xoá phiên bản nào. Máy tạo một phiên bản MỚI mang nội dung của bản cũ bạn chọn, nên lịch sử vẫn đầy đủ và bạn quay tới quay lui bao nhiêu lần cũng được."] },
        {
          bam: [
            "Tìm phiên bản muốn quay về (bản «Đang dùng» không có nút).",
            "Bấm «Quay lại bản này». Dòng đó hỏi «Quay lại bản này?» với hai nút.",
            "Bấm «Đồng ý» (hoặc «Thôi» để hủy).",
          ],
        },
        {
          ketQua: [
            "Hộp đóng; danh sách luật hiện «Đã quay lại phiên bản N của “tên luật”» và dòng luật nháy một vạch bên trái.",
            "Luật có thêm một phiên bản mới nhất, nội dung giống bản N.",
          ],
        },
        {
          viDu: [
            "Tiếp ví dụ trên: quản trị bấm «Quay lại bản này» ở phiên bản liền trước (mức «Cảnh báo»), «Đồng ý». Luật trở lại cảnh báo, báo cáo của các đơn vị gửi được lại từ lần tải lên kế tiếp. Lịch sử có thêm phiên bản mới ghi «Mức: Chặn gửi → Cảnh báo».",
          ],
        },
        { luuY: ["Quay lại bản cũ cũng đổi mẫu áp dụng, câu luật, tham số về như bản đó, không chỉ riêng mức. Nếu chỉ muốn đổi mức, dùng thẻ mức ở danh sách luật cho gọn."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «Quay lại bản này»", "Đó là bản đang dùng, hoặc bạn không có quyền sửa luật."],
            ["Hộp ghi «Luật chưa có phiên bản nào được ghi»", "Luật mới tạo hoặc dữ liệu cũ chưa ghi lịch sử. Sửa và lưu một lần là có."],
            ["Quay lại rồi mà báo cáo cũ không đổi", "Luật chỉ kiểm báo cáo tải lên sau khi quay lại."],
            ["Muốn xóa hẳn một phiên bản", "Không xóa phiên bản được; lịch sử chỉ ghi thêm."],
          ],
        },
      ],
    },
  ],
  canCu: "Phiên bản luật trong bộ luật kiểm tra: mỗi lần lưu thêm một bản, quay lại tạo bản mới; quyền theo quyền sửa luật.",
};
