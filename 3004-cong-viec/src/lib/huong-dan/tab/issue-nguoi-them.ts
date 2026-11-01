// Hướng dẫn bản 2 (tab) — màn Cảnh báo, tab «👤 Issue do người thêm». Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/issue/IssueView.tsx (tab «nguoi», dòng gợi ý «Nhập issue mới bằng nút + Thêm issue…») · PhaiIssue.tsx (KhungThe: Người mở, Người theo dõi · hạn) · KhoiViecIssue.tsx (khối giao việc)
// · lib/cay-viec/issue/so-issue.ts (themIssueNguoi: vào sổ ngay). Tab này KHÔNG dùng AI. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo tab «Do người thêm» — vấn đề tự ghi vào sổ",
  ai: "Mọi người có quyền xem sổ cái đều đọc được. «+ Thêm issue» cần quyền «Sửa việc»; «Giao việc» và «Sửa» cần quyền «Giao việc». Người không có quyền sẽ không thấy các nút đó (nút ẨN).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: [
            "Máy chỉ biết soi những gì có trong sổ việc. Còn vấn đề bạn thấy ngoài hiện trường hay trong cuộc họp (thiếu nhân lực, nhà thầu chậm vật tư, hồ sơ chưa đủ…) thì máy không biết. Tab «👤 Issue do người thêm» là nơi bạn tự ghi những vấn đề đó thành thẻ.",
            "Thẻ người thêm vào sổ NGAY, có hiệu lực ngay, không cần ai duyệt.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Để vấn đề quan trọng ngoài sổ việc không chỉ nằm trong đầu một người hay trong tin nhắn.",
            "Có mức nghiêm trọng, ước ảnh hưởng ngày hoàn thành mục tiêu (COD), người theo dõi và hạn: cả ban nhìn thấy cùng một thẻ.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của tab"],
            ["Trước", "Bạn gặp vấn đề ngoài hiện trường hoặc họp ban", "Nguồn của thẻ"],
            ["Tab này", "Ghi issue, giao việc xử lý", "Màn bạn đang xem"],
            ["Sau", "Việc xử lý xong thì máy tự đóng thẻ", "Xem lại ở «Đã đóng — xem lại»"],
          ],
        },
        {
          tieuDe: "④ Tab có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Nút «+ Thêm issue»", "Mở form ghi vấn đề ở cột phải (xem hướng dẫn «Thêm issue do người nhập»)"],
            ["Thẻ", "Có thêm: người mở, người theo dõi và hạn xử lý nếu bạn đã khai"],
            ["Khối dưới thẻ", "Việc soạn sẵn từ thẻ với «Giao việc» · «Sửa» · «Bỏ qua»; khi đã giao ghi «✓ Đã giao việc CV-…»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Viết thẻ · chọn mức · giao việc xử lý · bỏ qua", "Người quyết hoàn toàn"],
            ["MÁY", "Cho thẻ vào sổ, điền dự án, người mở, mã issue, thời điểm · soạn sẵn tên việc, hạn, kết quả cần có từ thẻ · tạo việc khi người bấm · tự đóng thẻ khi việc đã giao xong", "Chính xác như đã lưu"],
            ["🤖 AI", "Tab này KHÔNG dùng AI để viết thẻ. Khi giao việc, AI của các agent khác chỉ xét giúp việc có trùng không", "🤖 Chỉ báo; bạn vẫn quyết"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người bấm «+ Thêm issue» và điền form; bấm «Ghi vào sổ».",
            "Máy cho thẻ vào sổ ngay. Thẻ hiện ở tab này.",
            "Người bấm «Giao việc» ở khối dưới thẻ (chọn người nhận). Máy hỏi các agent khác xem có trùng không, 🤖 AI của các agent đó phán nếu có ứng viên giống.",
            "Việc xong thì máy tự đóng thẻ.",
          ],
          ai: ["AI không viết hay đổi thẻ của người. AI chỉ có mặt ở bước hỏi trùng khi giao việc."],
        },
      ],
    },
    {
      ten: "① Ghi vấn đề",
      khoi: [
        {
          bam: [
            "Bấm «+ Thêm issue» (góc phải hàng tab). Người không có quyền «Sửa việc» sẽ không thấy nút.",
            "Điền form, nhất là «Tiêu đề vấn đề», «Mô tả vấn đề», «Đề xuất xử lý» (ba ô bắt buộc).",
            "Bấm «Ghi vào sổ». Thẻ mở ngay ở cột phải và hiện trong tab.",
          ],
          luuY: ["Thẻ không có đề xuất xử lý thì không được hiện, nên ô đề xuất là bắt buộc."],
          viDu: ["Tình huống minh hoạ: trong họp giao ban, nhà thầu báo thiếu cần cẩu cho đợt lắp tuabin. Bạn thêm issue «Thiếu cần cẩu đợt lắp tuabin», mức 🔴 Nghiêm trọng, đề xuất «Làm việc với nhà thầu cẩu thuê ngoài trong tuần này», người theo dõi là Giám đốc dự án, hạn xử lý cuối tuần."],
        },
      ],
    },
    {
      ten: "② Giao việc xử lý",
      khoi: [
        {
          bam: [
            "Dưới thẻ đọc việc soạn sẵn: «Tên việc» ghi «Xử lý issue <mã>: <tiêu đề>», «Hạn» là hạn xử lý của thẻ (nếu đã qua thì hôm nay cộng 7 ngày), «Kết quả cần có» lấy từ đề xuất xử lý.",
            "Chọn người hoặc đơn vị nhận ở ô chọn bên cạnh «Giao việc» (dòng «Giao cho» ban đầu để trống).",
            "Bấm «Giao việc», hoặc «Sửa» để chỉnh nội dung (hướng dẫn «Ô giao việc khi bấm Sửa»).",
          ],
          ketQua: ["Việc thật được tạo trong sổ cái, người nhận có chuông, thẻ chuyển «Xử lý: Đã giao việc». Việc xong thì thẻ tự đóng."],
          luuY: ["Không cần giao nữa thì «Bỏ qua» (nhớ 30 ngày). Thẻ người thêm không có nút Xoá hay Đóng tay; máy tự đóng khi việc xong."],
          viDu: ["Tình huống minh hoạ: thẻ «Thiếu cần cẩu đợt lắp tuabin» có Hạn xử lý cuối tuần. Dưới thẻ, Tên việc soạn sẵn là «Xử lý issue ISS-…: Thiếu cần cẩu đợt lắp tuabin», Kết quả cần có là chính phần đề xuất xử lý bạn đã ghi. Bạn chọn Giám đốc dự án ở ô chọn rồi bấm «Giao việc»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «+ Thêm issue»", "Bạn thiếu quyền «Sửa việc» — nút ẩn."],
            ["Ghi nhầm issue", "Màn không có nút Xoá. Bấm «Bỏ qua» để thẻ rời danh sách."],
            ["Không có nút «Giao việc»", "Thiếu quyền «Giao việc», hoặc thẻ đã giao rồi (ghi «✓ Đã giao việc»)."],
            ["Muốn nhắc người theo dõi", "Giao việc cho họ hoặc nhắc trong thẻ việc bằng ý kiến có @."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (tab «Issue do người thêm», vào sổ ngay) và 07/10/2026 (khuôn Issue hai loại: bỏ Ghi nhận/Đóng/Ẩn/Xoá, chỉ còn Giao việc · Sửa · Bỏ qua) · luật 17 riêng 3004.",
};
