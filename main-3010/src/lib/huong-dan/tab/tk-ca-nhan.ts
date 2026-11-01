// Hướng dẫn bản 2 (tab) — menu tên người → «Tài khoản Claude cá nhân». Viết 20/10/2026 từ agent Main theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Tài khoản Claude cá nhân",
  ai: "Mọi tài khoản đăng nhập vào xem. Nối, đăng xuất, thử cần quyền ghi (PM, Admin, Người dùng); Người xem thấy nút mờ kèm lý do.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì, vì sao cần?",
          doan: ["Mỗi người có thể nối tài khoản Claude CỦA MÌNH làm dự phòng. Khi hai tài khoản Claude của công ty cùng hết hạn mức (chu kỳ 5 giờ hoặc tuần), câu hỏi của chính anh/chị cho trợ lý chạy bằng tài khoản này để làm tiếp ngay, không phải chờ. Việc máy tự chạy ban đêm hoặc chạy nền không dùng tài khoản cá nhân."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Trợ lý báo hết hạn mức của công ty", "Nối tài khoản cá nhân (một lần)", "Trợ lý tự chuyển sang tài khoản này khi công ty hết; thống kê dùng AI ghi lượt theo «cá nhân»"],
          ],
        },
        {
          tieuDe: "Các phần trên màn",
          bang: [
            ["Phần", "Để làm gì"],
            ["Thẻ «Tài khoản Claude cá nhân» (vai dự phòng)", "Tình trạng, nút đăng nhập, thử, đăng xuất"],
            ["Dòng phụ", "Cho biết tài khoản công ty còn dùng được không, và 7 ngày qua đã dùng bao nhiêu lượt"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Đăng nhập Claude bằng link, dán mã, bấm thử hoặc đăng xuất", "Cấp link đăng nhập, kiểm đăng nhập, chọn tài khoản khi công ty hết hạn mức, đếm lượt 7 ngày", "🤖 Chỉ nút «Thử trợ lý AI» gọi AI thật một câu rất ngắn để thử tài khoản"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Người đăng nhập → máy ghi nhớ tài khoản → khi cần máy tự dùng; 🤖 AI chỉ chạy khi anh/chị hỏi trợ lý hoặc bấm «Thử trợ lý AI».", "Người kiểm trạng thái ở thẻ; AI không tự đổi tài khoản."],
        },
      ],
    },
    {
      ten: "① Nối và thử",
      khoi: [
        {
          bam: [
            "Bấm nút đăng nhập — lấy link đăng nhập Claude (dùng được 15 phút).",
            "Mở link ở tab mới, đăng nhập bằng tài khoản Claude của anh/chị, rồi chép mã trang hiện ra («Copy Code»).",
            "Dán mã vào ô «Dán mã trang Claude hiện ra» — dán xong tự gửi. Mỗi mã dùng một lần.",
            "«Kiểm tra nhanh (không tốn token)» chỉ kiểm tra đăng nhập; «Thử trợ lý AI» hỏi thử một câu ngắn; «Đăng xuất» để ngắt.",
          ],
        },
        {
          ai: ["🤖 «Thử trợ lý AI» gọi AI thật bằng đúng tài khoản này một câu rất ngắn để biết còn chạy.", "AI không đụng dữ liệu nào, chỉ trả lời câu thử.", "Người đọc kết quả xanh hay đỏ trong thẻ."],
        },
        {
          viDu: ["Dòng phụ có thể ghi «Tài khoản Claude của công ty đang dùng được — trợ lý chưa cần tới tài khoản này.» Khi công ty hết hạn mức và anh/chị đã nối, dòng đổi thành «câu hỏi của anh/chị đang chạy bằng tài khoản này» và hiện số lượt 7 ngày qua."],
        },
        {
          luuY: ["Phải dùng gói Claude có thuê bao; chế độ «Kết nối AI» của hệ phải là Gói Claude.", "Mất đăng nhập (đổi mật khẩu Claude…) thì thẻ báo; đăng nhập lại."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút mờ", "Anh/chị là Người xem."],
            ["Dán mã không vào", "Link quá 15 phút hoặc mã đã dùng; lấy link mới."],
            ["Hỏi trợ lý vẫn báo hết hạn mức", "Chưa nối tài khoản cá nhân, hoặc chính tài khoản đó hết hạn mức."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt Mr. Đại 04/10/2026 (quản lý lượng dùng AI; tài khoản Claude cá nhân dự phòng).",
};
