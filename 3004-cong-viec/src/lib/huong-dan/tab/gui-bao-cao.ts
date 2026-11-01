// Hướng dẫn bản 2 (tab) — màn Báo cáo («Nạp file & gửi báo cáo»), phần CHUNG của cả màn. Viết lại 20/10/2026 (nhóm A2).
// Chi tiết từng bước nằm ở năm hướng dẫn riêng: gb-buoc-1 (Nộp báo cáo) · gb-buoc-2 (Sửa lỗi) · gb-buoc-3 (Soát nội dung) · gb-buoc-4 (Duyệt vào kế hoạch) · gb-buoc-5 (Kết thúc & lưu).
// Căn cứ code: components/gui/KhungSoanGui.tsx (mảng buoc, thanh tiến trình, lý do khoá nút Gửi) · gui/ThanhTienTrinhNop.tsx (ThanhTienTrinhNop, KhoiBuoc) · app/api/gui/noi-nhan/route.ts (quyền Gửi tài liệu)
// · app/api/gui/route.ts. Màn cũ /thu-muc, /soan-gui, /van-thu chuyển về đây.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gửi báo cáo — nộp báo cáo tuần hoặc tháng của đơn vị, 5 bước",
  ai: "Người có quyền Gửi tài liệu và đã được gán đơn vị (trưởng đơn vị hoặc người được giao nộp). Người CHƯA gán đơn vị vẫn kiểm tra thử tệp được nhưng chưa gửi được (Quản trị đã được báo). Người không có quyền gửi tài liệu thì nút «Gửi» không dùng được.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì?",
          doan: [
            "Đây là nơi đơn vị NỘP báo cáo tuần hoặc tháng bằng tệp Excel (.xlsx) theo mẫu của công ty (từ 22/10/2026; trước đó là Word). Bạn thả tệp vào, máy kiểm từng ô, AI soát nội dung, bạn duyệt các việc trong báo cáo rồi bấm «Gửi». Việc ghi trong báo cáo tự vào sổ cái công việc, không phải gõ lại.",
            "Màn có thanh tiến trình 5 khối ở đầu và 5 khối làm việc xếp dọc bên dưới, đúng thứ tự thanh tiến trình. Mỗi bước có một hướng dẫn riêng: bước nào đang mở thì nút «? Hướng dẫn» tự chuyển sang hướng dẫn của bước đó.",
          ],
        },
        {
          tieuDe: "② Vì sao phải làm?",
          ds: [
            "Báo cáo tuần là nguồn việc chính của sổ cái: việc trong chương «Kết quả và kế hoạch việc» của tệp thành việc có người làm, có hạn, theo dõi được ở Sơ đồ tổ chức và Việc của tôi.",
            "Máy chặn lỗi ngay lúc nộp (thiếu ô bắt buộc, thiếu hạn, ngày sai) nên cấp trên không phải trả báo cáo về sửa.",
            "Nộp trước hạn hay sau hạn đều được ghi để Báo cáo tuần của lãnh đạo hiện ở khối «Thời điểm gửi báo cáo».",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn Báo cáo"],
            ["1 · Làm báo cáo", "Điền tờ «Mẫu trắng» của mẫu Excel (hoặc nhờ Trợ lý chat làm giúp bằng lệnh /lam-bao-cao)", "Lấy mẫu ở liên kết «Tải mẫu báo cáo»; Trợ lý làm xong có nút «Nộp báo cáo này» dẫn về đây"],
            ["2 · Nộp", "Màn này, 5 bước", "Kiểm, soát, duyệt, gửi"],
            ["3 · Vào sổ cái", "Việc trong báo cáo thành việc thật", "Hiện ở Sơ đồ tổ chức, Việc của tôi"],
            ["4 · Lãnh đạo xem", "Báo cáo tuần tổng hợp", "Đọc ở menu Báo cáo tuần"],
          ],
        },
        {
          tieuDe: "④ Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem hướng dẫn"],
            ["Đầu màn «Nạp file & gửi báo cáo» và liên kết «Tải mẫu báo cáo»", "Mô tả ngắn; sang màn Mẫu báo cáo để lấy mẫu đúng loại báo cáo", "Tab ① Cách đọc màn (bên dưới)"],
            ["Thanh tiến trình «1 · Nộp báo cáo» … «5 · Kết thúc & lưu»", "Biết đang ở bước nào; bấm khối để nhảy tới bước", "Tab ① Cách đọc màn"],
            ["Khung «Bấm hoặc kéo thả tệp Excel (.xlsx) vào đây» và «Bản nháp chưa gửi của tôi · N»", "Nạp tệp, mở lại bản nháp", "Hướng dẫn «Bước 1 · Nộp báo cáo»"],
            ["Năm khối bước", "Làm việc thật", "Mỗi bước một hướng dẫn: Bước 1 đến Bước 5"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Nộp tệp · sửa chữ mới · bấm «Đồng ý» hay «Bỏ qua» từng dòng · «Duyệt» hay «Bỏ» từng việc · chọn nơi nhận · bấm «Gửi»", "Người quyết cuối; không có gì vào sổ cái nếu bạn chưa duyệt"],
            ["MÁY", "Nhận ra mẫu · đọc từng ô, từng bảng · kiểm luật cố định (thiếu ô, thiếu hạn, ngày sai, việc trùng theo chữ) · tách việc trong bảng «Kết quả và kế hoạch việc» · ghi chữ đã đồng ý vào đúng ô của tệp · tạo bản mới · gửi và ghi sổ cái", "Cùng tệp thì luôn ra cùng kết quả"],
            ["🤖 AI", "🤖 Bước 2: giải thích vì sao lỗi và đề xuất chữ mới «Cũ → Mới»", "🤖 Có thể đề xuất chưa hay; chữ gốc do máy đọc, ngày không do AI bịa (chỗ hạn để người chọn ngày)"],
            ["🤖 AI", "🤖 Bước 3: soát luật nội dung của đơn vị và góp ý (mục trống, mâu thuẫn, sai chính tả tên…)", "🤖 Góp ý không bao giờ chặn gửi. Luật mức «Chặn gửi» chưa đạt thì phải sửa mới gửi được"],
            ["🤖 AI", "🤖 Bước 4: đọc cả báo cáo tìm việc viết NGOÀI bảng, gợi ý tên việc, nhận ra việc trùng theo nghĩa", "🤖 Chỉ là gợi ý; việc AI tìm chỉ vào sổ cái khi bạn bấm Duyệt"],
          ],
          ai: [
            "🤖 Mỗi lúc chỉ chạy MỘT lượt AI cho một phiên bản tệp. Kết quả soát được chép sang bản mới sau khi sửa, AI không soát lại từ đầu.",
            "🤖 Khi bấm Gửi mà bản này chưa có kết quả bước 4, hệ thống tự chạy AI đọc trước khi gửi. AI lỗi thì ghi lỗi và VẪN gửi được.",
            "Mất kết nối AI: bước 3 và 4 báo «AI chưa đọc được báo cáo … (không ảnh hưởng việc gửi)»; bạn tự duyệt theo bảng máy tách.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "NGƯỜI + MÁY", "Bạn thả tệp; máy nhận ra mẫu và kiểm ngay"],
            ["2", "🤖 AI + NGƯỜI", "🤖 AI đề xuất chữ sửa cho từng lỗi; bạn Đồng ý từng dòng; máy ghi vào tệp thành bản mới"],
            ["3", "🤖 AI + NGƯỜI", "🤖 AI soát luật nội dung và góp ý; bạn Đồng ý hoặc Bỏ qua; máy ghi một lần thành bản mới"],
            ["4", "MÁY + 🤖 AI + NGƯỜI", "Máy tách việc trong bảng; 🤖 AI tìm việc ngoài bảng; bạn Duyệt hoặc Bỏ từng việc"],
            ["5", "NGƯỜI + MÁY", "Bạn chọn nơi nhận, bấm Gửi; máy gửi tệp, gửi chuông, ghi các việc đã duyệt vào sổ cái"],
          ],
          viDu: ["Trưởng phòng Kỹ thuật nộp báo cáo tuần lúc 14:00 thứ Năm (tình huống minh hoạ): thả tệp, bước 2 báo thiếu hạn ở hai việc, bạn chọn ngày và Đồng ý, AI soát nội dung không có góp ý, bước 4 duyệt 5 việc từ bảng và bỏ 1 việc AI tìm không đúng, bước 5 bấm «Gửi». Cả quy trình vài phút."],
        },
      ],
    },
    {
      ten: "① Cách đọc màn",
      khoi: [
        {
          tieuDe: "Thanh tiến trình",
          doan: ["Năm khối dẹt nối bằng đường dòng chảy: «1 · Nộp báo cáo» → «2 · Sửa lỗi» → «3 · Soát nội dung» → «4 · Duyệt vào kế hoạch» → «5 · Kết thúc & lưu». Mỗi khối có dòng phụ ghi tình trạng ngắn."],
          bang: [
            ["Dạng khối", "Nghĩa", "Bấm được không"],
            ["Phát sáng", "Bước đang làm", "Có: bung khối làm việc và cuộn tới"],
            ["Đặc, có dấu ✓ đứng trước tên", "Bước đã xong", "Có"],
            ["Mờ", "Bước chưa tới (cần xong bước trước)", "Không bấm được (hiện mờ chứ không ẩn, để bạn thấy con đường tồn tại)"],
          ],
          viDu: ["Sau khi tải tệp, khối «2 · Sửa lỗi» ghi dòng phụ «2 chặn gửi · 3 cảnh báo» (tình huống minh hoạ), khối «3 · Soát nội dung» còn mờ ghi «chờ hết lỗi». Sửa hết lỗi thì khối 2 có dấu ✓ và khối 3 phát sáng."],
        },
        {
          tieuDe: "Khối làm việc của từng bước",
          ds: [
            "Tiêu đề đúng như thanh tiến trình «N · Tên» và dòng tình trạng. Bước đang làm mở sẵn, bước xong tự co lại.",
            "Bấm tiêu đề để bung hoặc co tay. Phần thân chỉ bị ẩn khi co, không bị gỡ, nên lượt AI đang chạy không bị cắt.",
            "Bước 1 có tên tệp và liên kết «Tài liệu khác» bên phải; bước 4 có thêm các nút «Duyệt tất cả việc trong bảng (N)», «Bỏ tất cả việc AI tìm (N)», «AI đọc lại».",
          ],
        },
        {
          tieuDe: "Liên kết «Tải mẫu báo cáo»",
          doan: ["Ở góc đầu màn, mở màn Mẫu báo cáo để tải đúng tệp Excel của đơn vị bạn (xem hướng dẫn của màn đó)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["«Bạn chưa được gán đơn vị nên chưa gửi được tài liệu»", "Quản trị cần gán đơn vị cho tài khoản (đã được báo). Trong lúc chờ vẫn dùng để kiểm thử tệp."],
            ["Nút «Gửi» mờ mãi", "Đọc câu cạnh nút (xem hướng dẫn Bước 5). Thường là còn dòng chưa duyệt ở bước 4 hoặc AI chưa đọc xong."],
            ["Khối bước 3, 4, 5 còn mờ", "Cần xong bước trước. Khối mờ không bấm được."],
            ["AI báo lỗi nhưng vẫn muốn gửi", "Bước 4 ghi «không ảnh hưởng việc gửi». Chỉ luật mức «Chặn gửi» mới khoá nút Gửi."],
            ["Muốn nộp lại sau khi sửa", "Tải bản đã sửa, thành bản 2. Chưa gửi thì bản cũ nằm ở «Bản nháp chưa gửi của tôi»."],
            ["Mở link /thu-muc, /soan-gui hoặc /van-thu", "Đã gộp: các đường cũ tự chuyển về màn Báo cáo."],
            ["Tệp Trợ lý làm đã hết hạn", "Chỉ giữ 7 ngày. Gõ «làm lại file» trong phiên chat."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 28–29/09/2026 (năm bước nối tiếp, một kiểu dòng Vấn đề · Đề xuất · Duyệt, bước đang làm mở sẵn, bước xong tự co) · phân vai: máy kiểm và ghi, AI đề xuất, người duyệt · luật 17 (khối chưa tới hiện mờ) · luật 19 (🤖 đứng trước chữ do AI viết).",
};
