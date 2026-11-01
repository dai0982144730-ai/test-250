// ============================================================
// BA TAB DÙNG CHUNG. FILE THUẦN (luật 10): không fs, không mạng.
//
//   ① NHÓM A — đăng nhập & khung chung cả 5 agent  (A-01…A-08)
//   ② NHÓM E — bốn agent nói chuyện với nhau       (E-01…E-05)
//   ③ Dữ liệu thật hay dữ liệu thử                 (G-39…G-41) — ⏸ TẠM ẨN 04/10, xem TAB_TAM_AN cuối file
//
// NGUỒN: BAI-TEST-NGUOI-DUNG.md — nhóm A và nhóm E, bê nguyên nội dung, chỉ
// đổi cổng 3011 → 3010 và tên màn cho khớp Main. Nhóm ③ là bài ĐO TẬN NƠI
// ngày 07/09, không có trong tài liệu kia.
//
// ⚠ CHỖ ĐO ĐƯỢC, PHẢI GHI VÀO ĐÂY KẺO NGƯỜI TEST CHẤM SAI:
// Main KHÔNG có dải cảnh báo "đang chạy dữ liệu thử" như bốn agent kia —
// và đó là ĐÚNG. Bốn con kia đổi dữ liệu bằng biến môi trường (DU_LIEU_THU,
// DATABASE_URL) nên phải có dải đỏ báo "mọi con số trên màn là số giả";
// Main không giữ dữ liệu nghiệp vụ nên không có gì để đổi — chính
// DLtest\BAT-DU-LIEU-THU.ps1 cũng bật Main y hệt ở cả hai mô hình.
// Bài G-39 kiểm đúng điều đó, đừng chấm Không đạt vì "thiếu dải".
// ============================================================

import type { TabTest } from "./kich-ban-chung";

export const TAB_CHUNG: TabTest[] = [
  // ────────────────────────────────────────────────────────────
  {
    ma: "A",
    ten: "Đăng nhập & khung chung",
    nhom: "NHÓM A · CHUNG CHO CẢ 5 AGENT",
    dan: "Tám bài chạy được ở bất kỳ agent nào, ở đây làm trên Main cổng 3010. A-05 là bài quan trọng nhất cả bộ: một agent hỏng KHÔNG được kéo agent khác chết theo.",
    bai: [
      {
        ma: "A-01",
        ten: "Chưa đăng nhập thì không vào thẳng được",
        goc: "quyen",
        buoc: ["Bấm Đăng xuất.", "Gõ thẳng vào thanh địa chỉ: 127.0.0.1:3010/bao-cao?tab=thang"],
        mongDoi: "Bị đá về trang đăng nhập, không vào thẳng được màn nào.",
      },
      {
        ma: "A-02",
        ten: "Sai mật khẩu — báo lỗi bằng tiếng Việt",
        goc: "viet",
        buoc: ["Ở trang đăng nhập, gõ dainc@scigroup.vn và mật khẩu sai abc123.", "Bấm Đăng nhập."],
        mongDoi:
          "Báo lỗi BẰNG TIẾNG VIỆT, kiểu “Email hoặc mật khẩu không đúng”. Không được hiện chữ Anh như Unauthorized, Invalid credentials.",
      },
      {
        ma: "A-03",
        ten: "Trang đăng nhập không còn tài khoản mẫu",
        goc: "thuan",
        buoc: ["Mở trang đăng nhập, kéo xuống cuối trang.", "Gõ dai@sci.vn / Sci@2026 (tài khoản mẫu cũ), bấm Đăng nhập."],
        mongDoi: "Không còn bảng tài khoản mẫu — chỉ một dòng chữ: tài khoản do Main cấp, email @scigroup.vn. Tài khoản mẫu cũ báo sai email hoặc mật khẩu (6g.6 T1, 03/10/2026).",
      },
      {
        ma: "A-04",
        ten: "Bấm hết mọi mục menu — không màn nào trắng",
        goc: "thuan",
        buoc: ["Bấm lần lượt HẾT 10 mục trong menu trái.", "Bấm thêm hai nút Test và Giới thiệu trên thanh trên cùng."],
        mongDoi: "Không màn nào trắng, không màn nào hiện chữ đỏ báo lỗi hệ thống.",
      },
      {
        ma: "A-05",
        ten: "★★ Một agent hỏng không kéo agent khác chết theo",
        goc: "bien",
        buoc: [
          "Cài đặt → 🔌 Kết nối → Danh bạ agent, bấm Dừng ở dòng Agent Tiến độ (hoặc đóng cửa sổ đen cổng 3003).",
          "Sang Báo cáo → tab Sáng, bấm Dựng lại.",
        ],
        mongDoi:
          "Trang vẫn mở được, báo cáo vẫn dựng được từ những con còn sống. Phần của Agent Tiến độ hiện hộp nói rõ TÊN con không thưa và lý do. Không được trắng trang, không được treo, không được ghi 0 thay cho thiếu số.",
      },
      {
        ma: "A-06",
        ten: "Bật lại agent thì số đầy đủ trở lại",
        goc: "thuan",
        buoc: ["Bấm Chạy lại dòng Agent Tiến độ trong Danh bạ, chờ 30–60 giây.", "Quay lại Báo cáo → tab Sáng, bấm Dựng lại."],
        mongDoi: "Phần của Agent Tiến độ hiện đầy đủ trở lại. Không phải khởi động lại Main.",
      },
      {
        ma: "A-07",
        ten: "Toàn bộ chữ trên màn là tiếng Việt",
        goc: "viet",
        buoc: ["Đọc lướt chữ trên mọi màn, kể cả các dòng thông báo và dòng báo lỗi."],
        mongDoi: "Tất cả tiếng Việt — không lọt Loading…, Error, Save, Delete, Cancel.",
      },
      {
        ma: "A-08",
        ten: "Nút bị mờ phải mờ chứ không ẩn, và giải thích được vì sao",
        goc: "thuan",
        buoc: ["Tìm một nút đang mờ (ví dụ Gửi Telegram ngay ở Báo cáo → tab Sáng khi chưa khai Telegram).", "Rê chuột vào nút đó."],
        mongDoi: "Nút hiện MỜ chứ không bị ẩn đi. Rê chuột vào có dòng giải thích phải làm gì cho hết mờ.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "E",
    ten: "Bốn agent nói chuyện với nhau",
    nhom: "NHÓM E · NỐI GIỮA CÁC AGENT",
    dan: "Nhật ký hỏi–đáp (nay xem ở Agent quan sát) là bằng chứng chống bịa của cả hệ: mười con số bất kỳ trong báo cáo phải truy về được một dòng ở đây. E-05 kiểm cơ chế ngắt mạch — một con chết thì các con kia ngừng hỏi nó chứ không treo chờ hết giờ.",
    bai: [
      {
        ma: "E-01",
        ten: "Nhật ký ghi đủ ai hỏi ai, công cụ gì, mất bao lâu",
        goc: "thuan",
        buoc: ["Mở Agent quan sát (menu trái → Agent quan sát ↗), xem nhật ký hỏi–đáp.", "Đọc một dòng bất kỳ."],
        mongDoi: "Mỗi dòng ghi giờ, agent hỏi → agent trả lời, tên công cụ, kết quả và số mili-giây.",
      },
      {
        ma: "E-02",
        ten: "★ Cột “vì sao hỏi” không được để trống",
        goc: "thuan",
        buoc: ["Bấm Chi tiết ở một dòng bất kỳ.", "Đọc lý do gọi."],
        mongDoi:
          "Có câu giải thích BẰNG TIẾNG VIỆT vì sao agent đi hỏi. Không được để trống — chỗ nào gọi mà không khai lý do thì dòng đó phải bị từ chối ghi.",
      },
      {
        ma: "E-03",
        ten: "Vừa bấm xong là có dòng mới",
        goc: "thuan",
        buoc: ["Mở Báo cáo → tab Sáng, bấm Dựng lại.", "Quay lại nhật ký hỏi–đáp ở Agent quan sát."],
        mongDoi: "Có dòng mới vừa được ghi thêm, giờ khớp với lúc vừa bấm.",
      },
      {
        ma: "E-04",
        ten: "Cột nguồn dẫn chỉ tới file gốc",
        goc: "thuan",
        buoc: ["Nhìn cột ↩ nguồn dẫn của vài dòng."],
        mongDoi:
          "Chỉ tới file/bản ghi đã sinh ra con số (kiểu data/ma-tran-goi.json, sổ issue của agent đó kèm số thẻ). Mảng nguồn rỗng là LỖI, không phải câu trả lời hợp lệ.",
      },
      {
        ma: "E-05",
        ten: "★★ Ngắt mạch — không treo chờ agent đã chết",
        goc: "bien",
        buoc: [
          "Dừng Agent Tiến độ (Danh bạ agent → Dừng, hoặc đóng cửa sổ cổng 3003).",
          "Ở trợ lý chat Main, hỏi 5 lần liên tiếp một câu cần số tiến độ (vd: HV chậm mấy ngày?).",
          "Để ý thời gian chờ của từng lần.",
        ],
        mongDoi:
          "Ba lần đầu chờ vài giây. Lần 4 và 5 trả lời gần như tức thì, kèm câu “Agent Tiến độ đang tắt hoặc đang được khởi động lại … Máy tự thử lại sau HH:mm — hỏi lại sau giờ đó.” Không có cơ chế này thì một agent chết kéo cả hệ treo theo.",
      },
    ],
  },
];

// ⏸ TẠM ẨN 04/10/2026 (Mr. Đại chốt, ô chọn): bộ dữ liệu thử DLtest (06/09) không còn chạy được — đường dẫn D:\SCI-AI-AGENT
// không còn, chỉ agent Base cũ có dải đỏ "dữ liệu thử" mà agent Base đã đóng (cổng 3011), agent Công việc chưa có chế độ thử.
// Ba bài dưới KHÔNG hiện trên màn, KHÔNG tính vào tổng số bài; kết quả đã chấm cũ vẫn tra được tên (timBai).
// Làm lại bộ dữ liệu thử cho cả hệ thì đưa nhóm này về TAB_CHUNG.
export const LY_DO_TAM_AN = "chờ làm lại bộ dữ liệu thử cho agent Công việc (bộ cũ dựa vào agent Base đã đóng)";
export const TAB_TAM_AN: TabTest[] = [
  // ────────────────────────────────────────────────────────────
  {
    ma: "DLT",
    ten: "Dữ liệu thật hay dữ liệu thử",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Bộ dữ liệu thử (DLtest\\, dự án “Điện gió Thử Nghiệm TN1”) dựng ngày 06/09 để test mà không đụng vào số thật. Ba bài dưới đây trả lời đúng một câu hỏi: người đang ngồi trước màn Main có biết mình đang xem SỐ THẬT hay SỐ GIẢ không.",
    bai: [
      {
        ma: "G-39",
        ten: "★ Main KHÔNG có dải cảnh báo dữ liệu thử — và đó là đúng",
        goc: "quyen",
        buoc: [
          "Bật cả hệ bằng dữ liệu thử: powershell -ExecutionPolicy Bypass -File D:\\SCI-AI-AGENT\\DLtest\\BAT-DU-LIEU-THU.ps1",
          "Mở 127.0.0.1:3011 (Agent Base) — nhìn đầu màn.",
          "Mở 127.0.0.1:3010 (Main) — nhìn đầu màn.",
        ],
        mongDoi:
          "Base có DẢI ĐỎ “ĐANG CHẠY DỮ LIỆU THỬ — MỌI CON SỐ TRÊN MÀN LÀ SỐ GIẢ”. Main KHÔNG có dải đó, và đó là ĐÚNG THIẾT KẾ: Main không giữ dữ liệu nghiệp vụ nên không có gì để đổi sang bản thử. Đừng chấm Không đạt vì thiếu dải. Cái Main phải làm là ở G-40.",
      },
      {
        ma: "G-40",
        ten: "Main nói được số nó đang bày lấy từ đâu",
        goc: "thuan",
        buoc: [
          "Đang chạy dữ liệu thử, mở ô chọn dự án ở góc trên bên phải, chọn Điện gió Thử Nghiệm TN1.",
          "Mở Báo cáo → tab Tháng, bấm Dựng bản nháp.",
          "Rê chuột vào vài ô có số.",
        ],
        mongDoi:
          "Tên dự án trên thanh trên cùng ghi rõ đang là dự án thử. Mỗi ô có số rê chuột vào là biết nó hỏi agent nào, công cụ gì — truy được về đúng con đang chạy dữ liệu thử. Không ô nào bày số mà không nói được lấy từ đâu.",
      },
      {
        ma: "G-41",
        ten: "Trả về dữ liệu thật rồi kiểm lại",
        goc: "bien",
        buoc: [
          "Đóng hết các cửa sổ đen đang chạy agent.",
          "Chạy: node D:\\SCI-AI-AGENT\\DLtest\\doi-mo-hinh.mjs that",
          "Bật lại bằng BAT-5-AGENT.bat, mở 127.0.0.1:3011 và 127.0.0.1:3010.",
        ],
        mongDoi:
          "Base KHÔNG còn dải cảnh báo. Ô chọn dự án trên Main quay về dự án thật. Nếu quên bước này thì lần sau mở máy mọi con số đều là số giả mà không ai biết — nên đây là bài bắt buộc chấm.",
      },
    ],
  },
];
