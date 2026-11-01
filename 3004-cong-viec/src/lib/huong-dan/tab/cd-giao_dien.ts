// Hướng dẫn bản 2 (tab) — Cài đặt › Giao diện, sao lưu. Viết 20/10/2026. Nhãn ô chép từ lib/cau-hinh/bieu-mau.ts (nhóm giao_dien).
// Đối chiếu code 20/10: «Tên ứng dụng» được dùng trong thư email (lib/email/soan-thu.ts); «Hiện đơn vị không có việc» được Sơ đồ tổ chức đọc;
// «Màu chính», «Giờ sao lưu hằng ngày», «Số ngày giữ bản sao lưu» CHƯA có chỗ nào trong ứng dụng đọc (kịch bản sao lưu trên máy chủ dùng giá trị riêng) → ghi thẳng trong hướng dẫn.
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Giao diện, sao lưu",
  tab: "🔌 Kết nối",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép. Ai đăng nhập cũng xem được.",
  laGi: [
    "Mục gom vài tuỳ chọn chung của cả ứng dụng: tên gọi hiện trong thư gửi đi, một công tắc ẩn hiện trên Sơ đồ tổ chức, và ba ô liên quan màu chính và sao lưu.",
    "Trong năm ô, chỉ hai ô hiện có tác dụng (tên ứng dụng, hiện đơn vị không có việc). Ba ô còn lại đã có chỗ nhập nhưng ứng dụng chưa đọc — xem tab «② Ba ô chưa dùng».",
  ],
  vaoSao: [
    "Thư gửi đi cần xưng tên đúng tên công ty muốn dùng; Sơ đồ tổ chức đỡ rối nếu giấu bớt các ô đơn vị chưa có việc.",
  ],
  vongLam: [
    "Bước trước: bạn cài đặt máy chủ thư ở mục «Email, thông báo».",
    "Mục này: chọn tên xưng trong thư; chọn Sơ đồ tổ chức vẽ cả đơn vị không có việc hay không.",
    "Bước sau: thư gửi đi mang tên mới; Sơ đồ tổ chức vẽ lại ngay lần mở kế tiếp.",
  ],
  cacKhoi: [
    ["Tên ứng dụng", "Tên xưng trong thư email (trống thì dùng «SCI công việc»).", "Hai ô có tác dụng"],
    ["Sơ đồ tổ chức: hiện đơn vị không có việc", "Bật: vẽ mọi đơn vị. Tắt: ẩn đơn vị không có việc và đường nối tới nó.", "Hai ô có tác dụng"],
    ["Màu chính · Giờ sao lưu hằng ngày · Số ngày giữ bản sao lưu", "Có ô nhập nhưng chưa có tác dụng.", "Ba ô chưa dùng"],
  ],
  nguoi: "Quản trị đặt tên, bật tắt công tắc Sơ đồ, bấm «Lưu».",
  may: "Điền tên ứng dụng vào thư email; Sơ đồ tổ chức đọc công tắc rồi vẽ hoặc ẩn các ô đơn vị chưa có việc.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Hai ô có tác dụng",
      khoi: [
        {
          bang: [
            ["Ô", "Mặc định", "Tác dụng"],
            ["Tên ứng dụng", "SCI công việc", "Xuất hiện trong thư email do hệ thống gửi (xưng tên trong thư). Để trống thì máy dùng «SCI công việc»."],
            ["Sơ đồ tổ chức: hiện đơn vị không có việc", "Bật", "Bật: vẽ mọi đơn vị. Tắt: đơn vị không có việc nào (kể cả đơn vị con) bị ẩn cùng đường nối tới nó."],
          ],
        },
        { bam: ["Mở Cài đặt → tab «🔌 Kết nối» → mục «Giao diện, sao lưu».", "Gõ «Tên ứng dụng» hoặc bấm công tắc «Sơ đồ tổ chức: hiện đơn vị không có việc».", "Bấm «Lưu»."] },
        {
          viDu: [
            "Đổi «Tên ứng dụng» thành «SCI công việc – Ban QLDA». Thư giao việc kế tiếp xưng «SCI công việc – Ban QLDA».",
            "Tắt công tắc Sơ đồ: những đơn vị chưa có việc nào (ví dụ một Ban điều hành mới lập) biến khỏi Sơ đồ tổ chức, sơ đồ gọn hơn; bật lại là hiện đủ.",
          ],
        },
        { ketQua: ["Sơ đồ tổ chức đổi ngay lần mở kế tiếp (không cần đăng nhập lại). Thư đã nằm trong hàng đợi trước đó có thể vẫn mang tên cũ."] },
        { luuY: ["Đơn vị bị ẩn vì không có việc vẫn tồn tại; khi có việc đầu tiên nó tự hiện lại."] },
      ],
    },
    {
      ten: "② Ba ô chưa dùng",
      khoi: [
        { doan: ["Ba ô sau lưu được nhưng đến ngày 20/10/2026 chưa có chỗ nào trong ứng dụng đọc chúng. Ghi rõ ở đây để bạn không chờ một tác dụng chưa có."] },
        {
          bang: [
            ["Ô", "Mặc định", "Tình trạng"],
            ["Màu chính", "#1f6feb", "Màu giao diện đã cố định trong thiết kế; ô này chưa đổi được màu."],
            ["Giờ sao lưu hằng ngày", "04:30", "Việc sao lưu do kịch bản riêng trên máy chủ chạy, ứng dụng không đọc ô này."],
            ["Số ngày giữ bản sao lưu", "30", "Kịch bản sao lưu có giá trị riêng (cũng 30 ngày); đổi ô này không đổi kịch bản."],
          ],
        },
        { viDu: ["Bạn đổi «Giờ sao lưu hằng ngày» sang 02:00 và «Lưu». Việc sao lưu vẫn chạy theo giờ của kịch bản trên máy chủ; muốn đổi giờ thật, nhờ người quản lý máy chủ sửa kịch bản."] },
      ],
    },
  ],
  viDuLuu: ["Tắt công tắc «Sơ đồ tổ chức: hiện đơn vị không có việc» và bấm «Lưu» → nhật ký ghi «Sơ đồ tổ chức: hiện đơn vị không có việc: bật → tắt»; Sơ đồ tổ chức gọn lại."],
  vuong: [
    ["Đổi giờ sao lưu mà không thấy đổi", "Ô này chưa được dùng — xem tab «② Ba ô chưa dùng»."],
    ["Thư vẫn mang tên cũ", "Thư đã vào hàng đợi giữ nguyên nội dung; thư mới mới mang tên mới."],
    ["Sơ đồ thiếu một đơn vị", "Công tắc «hiện đơn vị không có việc» đang tắt và đơn vị đó chưa có việc."],
  ],
  canCu: "Nhóm «giao_dien» trong cài đặt; soạn thư email; vẽ Sơ đồ tổ chức.",
});
