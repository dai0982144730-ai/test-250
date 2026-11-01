// Hướng dẫn bản 2 (tab) — Gửi báo cáo, BƯỚC 5 «Kết thúc & lưu» (chọn nơi nhận và Gửi). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/gui/KhungSoanGui.tsx (noiDungBuoc5, lyDoKhoaGui, coTheGui, gui(), tomTatSoCai) · components/gui/ChonNoiNhan.tsx (ChonNoiNhanGon: hai ô chọn Nơi nhận và Gửi thẳng một người, tối đa 1 đơn vị + 1 người)
// · app/api/gui/route.ts (gửi, ghi sổ cái, tự chạy AI đọc việc nếu bản này chưa có kết quả).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gửi báo cáo — Bước 5 · Kết thúc & lưu (chọn nơi nhận, Gửi)",
  ai: "Người nộp báo cáo, có quyền Gửi tài liệu và đã được gán đơn vị. Người chưa gán đơn vị vẫn thấy khối này nhưng nút «Gửi» không dùng được, có dòng thông báo ở đầu màn.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Bước này là gì?",
          doan: ["Bước cuối: chọn báo cáo gửi cho ai và bấm «Gửi». Tối đa MỘT đơn vị và MỘT người (ví dụ đơn vị cấp trên và Phó Tổng giám đốc phụ trách). Gửi xong, máy gửi tệp tới nơi nhận kèm chuông báo, lưu lịch sử và đưa các việc bạn đã duyệt ở Bước 4 vào sổ cái."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Có người nhận thì báo cáo mới đến tay cấp trên và được tính là đã nộp (trước hay sau hạn) ở Báo cáo tuần.",
            "Gửi là hành động THẬT: người nhận được báo ngay và việc vào sổ cái. Nên các bước trước phải xong hết mới mở nút.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Bước 5"],
            ["Trước", "Bước 4: Duyệt hoặc Bỏ mọi việc", "Điều kiện để mở nút Gửi"],
            ["Bước 5", "Chọn nơi nhận, bấm «Gửi»", "Hoàn tất nộp"],
            ["Sau", "Người nhận xem; việc vào sổ cái; Báo cáo tuần ghi giờ nộp", "Cả công ty thấy"],
          ],
        },
        {
          tieuDe: "④ Bước có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hai ô chọn «Nơi nhận» và «Gửi thẳng một người»", "Chọn nơi nhận", "① Chọn nơi nhận"],
            ["Nút «Gửi <tên nơi nhận>» và câu cạnh nút", "Gửi; biết còn thiếu gì", "② Bấm Gửi"],
            ["Sau khi gửi: dòng «Đã gửi …» và liên kết «Tải bản đã gửi»", "Biết kết quả", "③ Sau khi gửi"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn nơi nhận, bấm «Gửi»", "Người quyết gửi"],
            ["MÁY", "Gợi ý nơi nhận theo dòng «Gửi:» trong tệp; đánh dấu «(mặc định)» theo luồng nộp của đơn vị; khoá nút và nói một câu còn thiếu gì; gửi tệp, gửi chuông, ghi lịch sử, ghi các việc đã duyệt vào sổ cái", "Luật cố định"],
            ["🤖 AI", "🤖 Không làm trong khối này. Chỉ khi bản này chưa có kết quả đọc việc ở Bước 4, hệ thống tự chạy AI đọc trước khi gửi", "🤖 AI lỗi thì ghi lỗi và VẪN gửi được"],
          ],
          ai: [
            "🤖 Nếu bạn bấm «Gửi» khi bản này chưa có kết quả AI đọc việc, hệ thống tự chạy AI đọc trước khi gửi (không giữ khoá). Nút ghi «Đang chờ AI kiểm luật…» khi còn luật mức «Chặn gửi» đang được AI kiểm.",
            "🤖 AI không quyết việc nào vào sổ cái; chỉ những việc bạn đã «Duyệt» ở Bước 4 mới vào.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "NGƯỜI", "Chọn «Nơi nhận» và/hoặc «Gửi thẳng một người»"],
            ["2", "MÁY", "Mở nút «Gửi» khi mọi điều kiện đủ"],
            ["3", "NGƯỜI", "Bấm «Gửi»"],
            ["4", "MÁY", "Gửi tệp, chuông báo, lịch sử, ghi sổ cái các việc đã duyệt"],
            ["5", "NGƯỜI", "Đọc dòng kết quả, tải bản đã gửi nếu cần"],
          ],
        },
      ],
    },
    {
      ten: "① Chọn nơi nhận",
      khoi: [
        {
          bam: [
            "Ô «Nơi nhận» là danh sách đơn vị (tên ngắn). Đơn vị theo luồng nộp của bạn có chữ «(mặc định)» sau tên. Chọn «— Không gửi đơn vị —» nếu không gửi cho đơn vị nào.",
            "Ô «Gửi thẳng một người» là danh sách người (kèm chức vụ). Chọn «— Không gửi thẳng —» nếu không gửi cho cá nhân nào.",
            "Chọn xong là áp dụng ngay, không có nút xác nhận. Mỗi ô chọn một giá trị.",
          ],
          doan: ["Ô «Nơi nhận» tự điền sẵn khi tệp có dòng «Gửi:» ghi nơi nhận (lấy nơi đầu tiên). Nếu tệp không ghi, ô để trống và nút «Gửi» báo «Chọn nơi nhận.» cho tới khi bạn chọn."],
          viDu: ["Trưởng phòng Kỹ thuật gửi báo cáo tuần: để ô «Nơi nhận» là Ban Tổng giám đốc theo luồng mặc định, đồng thời chọn ở «Gửi thẳng một người» Phó Tổng giám đốc phụ trách kỹ thuật để người đó nhận được chuông ngay (tình huống minh hoạ)."],
          luuY: ["Tối đa MỘT đơn vị và MỘT người cho mỗi lần gửi."],
        },
      ],
    },
    {
      ten: "② Bấm Gửi",
      khoi: [
        {
          bam: [
            "Bấm nút «Gửi <tên nơi nhận>». Nút mờ thì cạnh nút có MỘT câu nói còn thiếu gì (bảng bên dưới).",
            "Trong lúc gửi nút ghi «Đang gửi…». Nếu còn luật «Chặn gửi» đang được AI kiểm, nút ghi «Đang chờ AI kiểm luật…».",
          ],
          bang: [
            ["Câu cạnh nút Gửi", "Nghĩa · việc cần làm"],
            ["Còn lỗi chặn gửi — sửa ở bước 2.", "Quay Bước 2"],
            ["Còn N cảnh báo chưa sửa / chưa bỏ qua ở bước 2.", "Sửa hoặc «Bỏ qua»"],
            ["Luật “…” chưa đạt — sửa ở bước 3.", "Quay Bước 3"],
            ["Chờ bước 3 soát nội dung xong. / Chờ AI đọc việc ở bước 4.", "Đợi AI xong, thường vài chục giây tới vài phút"],
            ["Còn N việc chưa Duyệt / Bỏ ở bước 4.", "Quyết hết các dòng ở Bước 4"],
            ["Chọn nơi nhận.", "Chọn ở hai ô nơi nhận"],
          ],
          ketQua: [
            "Máy gửi tệp tới nơi nhận (kèm chuông báo), ghi lịch sử và đưa các việc đã duyệt vào sổ cái.",
            "Nếu lỗi: hiện «Chưa gửi được: <lý do>» kèm liên kết «Thử gửi lại».",
          ],
          viDu: ["Nút mờ kèm câu «Còn 1 việc chưa Duyệt / Bỏ ở bước 4.»: bạn quay lên Bước 4, thấy việc viền vàng cần chọn «Việc mới» hay «Đúng là CV-…», chọn xong bấm «Duyệt», quay xuống thì nút «Gửi» đã sáng (tình huống minh hoạ)."],
          luuY: ["Gửi là hành động thật, người nhận được báo ngay. Kiểm kỹ Bước 4 trước khi bấm. Khi chưa có lỗi, góc nút có liên kết «Tải lại bản đã sửa» để nộp bản khác."],
        },
      ],
    },
    {
      ten: "③ Sau khi gửi",
      khoi: [
        {
          doan: ["Khối 5 hiện dòng xanh: «Đã gửi <nơi nhận> (N nơi nhận). Sổ cái: …». Phần «Sổ cái:» tóm tắt bằng chữ."],
          bang: [
            ["Mẩu chữ trong «Sổ cái:»", "Nghĩa"],
            ["«N việc mới»", "Đã tạo N việc mới"],
            ["«N việc được cập nhật (bản cũ vào lịch sử)»", "Đè lên việc đã có"],
            ["«N bản không được dùng»", "Bản báo cáo không dùng"],
            ["«N việc đóng»", "Đóng việc cũ theo báo cáo"],
            ["«N việc đã xong ghi vào sổ (lần nạp đầu)»", "Việc báo đã xong, ghi để có lịch sử"],
            ["«N việc có vẻ trùng»", "Việc còn nghi trùng"],
            ["«không có việc vào sổ cái»", "Báo cáo không có việc nào được duyệt"],
            ["«; N việc bạn bỏ không vào sổ cái»", "Số việc bạn bấm «Bỏ»"],
          ],
          bam: ["Bấm liên kết «Tải bản đã gửi» để lưu lại đúng bản đã gửi."],
          viDu: ["«Đã gửi Ban Tổng giám đốc (2 nơi nhận). Sổ cái: 4 việc mới, 1 việc được cập nhật (bản cũ vào lịch sử); 1 việc bạn bỏ không vào sổ cái.» — hiểu là báo cáo đã tới đơn vị và một người; 4 việc mới có mã, 1 việc cũ được cập nhật, 1 việc bạn đã bỏ (số liệu minh hoạ)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Gửi» mờ mãi", "Đọc câu cạnh nút (bảng ở tab ② Bấm Gửi). Thường là còn dòng chưa duyệt ở Bước 4 hoặc AI chưa đọc xong"],
            ["«Bạn chưa được gán đơn vị nên chưa gửi được tài liệu»", "Quản trị cần gán đơn vị (đã được báo). Trong lúc chờ chỉ kiểm thử được"],
            ["«Chưa gửi được: …»", "Máy chủ từ chối hoặc lỗi mạng. Đọc lý do, sửa nếu có, bấm «Thử gửi lại»"],
            ["Muốn gửi thêm một nơi nữa", "Mỗi lần gửi chỉ có 1 đơn vị + 1 người nhận"],
            ["Gửi nhầm nơi nhận", "Màn này không có nút rút lại bản đã gửi. Báo người nhận hoặc Quản trị"],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 28/09/2026: gọn thành hai danh sách chọn, tối đa 1 đơn vị + 1 người, chọn xong là áp dụng, không có nút xác nhận · 29/09/2026: một câu lý do duy nhất cho nút Gửi đang khoá · phân vai máy ghi và gửi, người duyệt.",
};
