// Hướng dẫn bản 2 (tab) — xem báo cáo tuần của một ô (bấm biểu tượng quyển sổ đã nộp) ở Sơ đồ tổ chức. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (BaoCaoTuan, nút so-bc, dauPhai «← Quay lại», IC_SO) · lib/phong/so-do.ts. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Xem báo cáo tuần của một đơn vị ngay trên Sơ đồ tổ chức",
  ai: "Mọi người đăng nhập đều xem được báo cáo tuần của mọi ô trên sơ đồ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì?",
          doan: [
            "Mỗi ô đơn vị có một biểu tượng quyển sổ ở bên trái. Quyển sổ viền xanh nghĩa là đơn vị đã nộp báo cáo tuần của tuần đang chọn. Bấm vào, cột bên phải đổi thành bản xem nhanh của chính báo cáo đó, kèm một dòng tóm tắt và đường tải bản Word.",
            "Bạn đọc báo cáo ngay trong màn hình, không phải đi tìm tệp hay mở menu «Báo cáo».",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Lãnh đạo xem đơn vị nào đã nộp và nộp gì, đối chiếu với số việc trên ô.",
            "Việc nào do máy lọc ra từ báo cáo này, dòng tóm tắt cho biết có bao nhiêu việc đã vào sổ cái.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Đơn vị lập và nộp báo cáo tuần", "Menu «Báo cáo»"],
            ["Bước này", "Người xem đọc báo cáo của đơn vị", "Cột phải của Sơ đồ tổ chức"],
            ["Sau", "Việc từ báo cáo (đã vào sổ cái) theo dõi ở cột việc; báo cáo chưa đạt thì nhắc đơn vị", "Cột việc, chuông"],
          ],
        },
        {
          tieuDe: "Màn có những khối nào?",
          bang: [
            ["Khối", "Nghĩa"],
            ["Dòng đường đi ở đầu cột phải, kết thúc «· báo cáo tuần N»", "Ô đang xem. Có nút «← Quay lại» nếu bạn tới đây từ danh sách soát báo cáo gửi lên"],
            ["Dòng tóm tắt", "Tên tệp, kỳ, ngày nộp, người nộp, kết quả «máy kiểm tra», số việc đã vào sổ cái, liên kết «Tải bản Word»"],
            ["Thân báo cáo", "Bản xem nhanh của báo cáo"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm quyển sổ, đọc, tải bản Word nếu cần", "Người đánh giá nội dung báo cáo"],
            ["MÁY", "Dựng bản xem nhanh từ tệp đã nộp, kiểm báo cáo đạt hay chưa đạt theo luật của mẫu, đếm việc đã vào sổ cái", "Cùng báo cáo thì cùng kết quả"],
            ["🤖 AI", "🤖 Khi đơn vị nộp, AI đọc phần lời văn để tìm thêm việc ngoài các bảng; số «việc vào sổ cái» ở dòng tóm tắt gồm cả những việc người nộp đã tích chọn từ gợi ý đó", "🤖 Có thể sót; xem báo cáo gốc để đối chiếu"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: đơn vị nộp báo cáo.",
            "MÁY: kiểm tra báo cáo, tách việc trong bảng; 🤖 AI: đề xuất thêm việc từ lời văn.",
            "NGƯỜI: người nộp tích chọn việc nào vào sổ.",
            "NGƯỜI: bạn xem báo cáo ở màn này.",
          ],
        },
      ],
    },
    {
      ten: "① Xem báo cáo",
      khoi: [
        {
          bam: [
            "Trên sơ đồ, bấm biểu tượng quyển sổ viền xanh bên trái ô.",
            "Chờ dòng «Đang mở báo cáo…» đổi thành nội dung.",
            "Đọc dòng tóm tắt, rồi cuộn thân báo cáo. Nếu «máy kiểm tra» ghi «chưa đạt» (chữ đỏ) thì báo cáo còn lỗi theo mẫu.",
            "Cần bản đầy đủ thì bấm «Tải bản Word».",
            "Bấm «← Quay lại» (nếu có) để về danh sách soát; hoặc bấm ô khác để đổi nơi xem.",
          ],
          luuY: ["Nếu máy chưa xem trước được định dạng tệp thì cột phải ghi hướng dẫn «Chưa xem trước được — bấm Tải bản Word»."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A họp giao ban, thấy ô một đơn vị ghi nhiều việc trễ. Chị bấm quyển sổ của ô, đọc báo cáo tuần của đơn vị, thấy mục khó khăn đã nêu từ tuần trước. Chị bấm «Tải bản Word» đính vào biên bản họp.",
          ],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Bấm quyển sổ nhưng hiện hộp «chưa nộp báo cáo tuần»", "Đơn vị chưa nộp (xem hướng dẫn «Soát báo cáo các đơn vị gửi lên và nhắc nộp»)."],
            ["Không có quyển sổ trên một ô", "Ô dự án (ô loại khác treo dưới một đơn vị, và toàn bộ cây ở menu Dự án) không nộp báo cáo tuần nên không có quyển sổ."],
            ["Xem sai tuần", "Tuần theo ô chọn tuần trên thanh trên của phần mềm; đổi tuần ở đó."],
            ["Đơn vị báo đã nộp mà chưa thấy", "Nhờ đơn vị mở «Báo cáo» kiểm tình trạng; sổ chỉ ghi bản đã nộp thành công."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt 28/09/2026 (sổ báo cáo tuần trên ô, viền xanh khi đã nộp) · mẫu báo cáo tuần và luật kiểm tra của mẫu khai ở Cài đặt · luật 12 (căn cứ dẫn nguồn bấm được).",
};
