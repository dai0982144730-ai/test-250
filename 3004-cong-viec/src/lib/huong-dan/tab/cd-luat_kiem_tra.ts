// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Luật hệ thống. Viết 20/10/2026 (nhóm B3). Nhãn chép từ components/cai-dat/nhom.tsx (NhomLuatKiemTra).
// Đối chiếu code 20/10: màn chỉ còn (a) khung dẫn sang trang Luật kiểm tra và (b) ô «Chuỗi coi là “chưa điền”» (gia_tri_chua_dien). Ô này được đọc ở
// lib/kiem-tra/kiem-tra.ts (chuaDien), lib/luat/chay-luat.ts (nguCanhKiem) và các dạng luật trong lib/luat/loai/*. Mảng «luat» (bật tắt 9 luật gốc) không có ô nhập ở đây:
// sửa ở màn Luật kiểm tra (lib/luat/kho-luat.ts ghiSangCauHinh đồng bộ về nhóm này).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Luật hệ thống",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm luật kiểm tra (mặc định ghi sẵn: trưởng đơn vị của Phòng Đầu tư và Pháp chế). Ai đăng nhập cũng xem được.",
  laGi: [
    "Mục này gom hai việc nhỏ. Việc thứ nhất là một khung dẫn bạn sang trang «Luật kiểm tra», nơi bật tắt từng luật gốc, đổi mức chặn gửi, thêm luật riêng. Việc thứ hai là một danh sách các chữ mà máy coi là «chưa điền».",
    "Chữ «chưa điền» là các dấu chấm hoặc chữ mẫu còn sót trong báo cáo, ví dụ «......» hay «[điền]». Người lập báo cáo quên xóa chúng thì với máy, ô đó vẫn chưa có nội dung thật.",
  ],
  vaoSao: [
    "Mỗi phòng có thói quen khác nhau: có nơi để «……», có nơi để «(chưa có)». Nếu máy chỉ biết một vài kiểu thì ô còn trống vẫn bị coi là đã điền và lọt qua kiểm tra.",
    "Danh sách này dùng chung cho mọi luật nên chỉ cần khai một lần: sửa ở đây là luật «Ô phải được điền», luật «Mục phải có nội dung», luật trống mục… đều hiểu theo.",
  ],
  vongLam: [
    "Bước trước: mẫu Word đặt chỗ điền bằng dấu chấm hoặc chữ mẫu; người lập tải báo cáo lên ở «Báo cáo».",
    "Mục này: máy đối chiếu từng ô với danh sách chuỗi. Ô còn nguyên đúng chuỗi trong danh sách (hoặc mục nội dung chỉ có các chuỗi đó) được coi là chưa điền.",
    "Bước sau: các luật kiểm tra báo «chưa điền» theo mức đã đặt ở trang Luật kiểm tra (chặn gửi, cảnh báo hay gợi ý).",
  ],
  cacKhoi: [
    ["Khung «Luật kiểm tra có trang riêng» với nút «Mở trang Luật kiểm tra»", "Chuyển tới danh sách luật để bật tắt, đổi mức, thêm luật", "① Dẫn sang trang Luật kiểm tra"],
    ["Ô «Chuỗi coi là “chưa điền”»", "Danh sách chuỗi (mặc định 5 chuỗi); thêm bằng ô nhập và dấu «+» hoặc phím Enter, bỏ bằng dấu ×", "② Chuỗi chưa điền"],
  ],
  nguoi: "Quản trị thêm hoặc bớt chuỗi, bấm «Lưu». Khi cần chỉnh luật thì bấm sang trang Luật kiểm tra.",
  may: "So từng ô, từng cột trong báo cáo với danh sách chuỗi; đếm số ký tự thật của mục nội dung sau khi bỏ các chuỗi này; báo theo luật.",
  aiLam: "— Mục này không dùng AI. (Các luật AI ở trang Luật kiểm tra thì có, nhưng danh sách chuỗi này do máy đọc.)",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Dẫn sang trang Luật kiểm tra",
      khoi: [
        { doan: ["Khung viền nhấn ở đầu mục chỉ là cửa sang trang quản lý luật. Nó giải thích ba loại: «Code giữ cửa» (chạy chắc chắn, được chặn gửi), «AI góp ý» (đọc hiểu nội dung, mặc định cảnh báo), và luật hệ thống (chỉ tắt, đổi mức hoặc mẫu áp dụng, không xóa)."] },
        { bam: ["Bấm «Mở trang Luật kiểm tra». Màn chuyển về Cài đặt, mục «Luật kiểm tra» (cùng tab «🧩 Riêng của agent»)."] },
        {
          viDu: [
            "Quản trị muốn tắt luật «Ngày trống: việc luôn mở» cho tuần này: không làm ở mục này mà bấm «Mở trang Luật kiểm tra», tìm luật đó, bấm công tắc. Thay đổi cũng tự ghi ngược về mục này nên hai nơi luôn khớp.",
          ],
        },
        { luuY: ["Mục này không có ô bật tắt từng luật. Nếu bạn tìm công tắc luật gốc ở đây mà không thấy là đúng: nó nằm ở trang Luật kiểm tra."] },
      ],
    },
    {
      ten: "② Chuỗi chưa điền",
      khoi: [
        { doan: ["Ô «Chuỗi coi là “chưa điền”» là một dãy thẻ chữ. Ô bắt buộc mà nội dung đúng bằng một thẻ trong dãy này thì máy coi như bỏ trống. Mục nội dung dài thì máy bỏ các chuỗi này đi rồi đếm ký tự còn lại."] },
        {
          bang: [
            ["Mặc định (5 chuỗi)", "Nghĩa"],
            ["......", "Sáu dấu chấm thường dùng làm chỗ trống"],
            ["…", "Một dấu chấm lửng"],
            ["...", "Ba dấu chấm"],
            ["…………", "Dãy dấu chấm lửng dài"],
            ["[điền]", "Chữ nhắc điền"],
          ],
        },
        { bam: ["Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Luật hệ thống».", "Gõ chuỗi mới vào ô «Thêm chuỗi…» rồi nhấn Enter hoặc bấm dấu «+».", "Muốn bỏ một chuỗi, bấm dấu × trên thẻ của nó.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Phòng Tài chính Kế toán hay để «(chưa có số liệu)» ở ô số liệu chưa có. Quản trị thêm đúng chuỗi đó. Từ báo cáo tải lên kế tiếp, ô còn ghi y như vậy bị luật «Ô phải được điền» báo là chưa điền, thay vì lọt qua.",
            "Quản trị lỡ thêm chuỗi «Có» và sau đó mọi ô ghi đúng chữ «Có» bị báo chưa điền oan. Bấm × xóa chuỗi «Có» rồi lưu để về như cũ.",
          ],
        },
        {
          luuY: [
            "Ngoài danh sách này, máy LUÔN coi ô chỉ gồm dấu chấm, dấu chấm lửng, gạch ngang, gạch dưới hoặc khoảng trắng là chưa điền; không cần khai những kiểu đó.",
            "Chuỗi phải khớp NGUYÊN ô (không tính khoảng trắng đầu cuối). Chuỗi chỉ xuất hiện giữa câu không làm cả ô thành «chưa điền». Riêng luật mục nội dung thì có đoạn bỏ chuỗi đi khi đếm ký tự.",
            "Thêm chuỗi quá thông dụng (như một chữ cái) làm nhiều ô bị coi là chưa điền oan. Chỉ thêm chuỗi mà người lập thật sự dùng để giữ chỗ.",
            "Đổi danh sách chỉ ảnh hưởng báo cáo tải lên sau khi lưu; báo cáo đã kiểm rồi giữ kết quả cũ.",
          ],
        },
      ],
    },
  ],
  viDuLuu: ["Thêm chuỗi «(chưa có số liệu)» và bấm «Lưu» → nhật ký ghi «Chuỗi coi là “chưa điền”» thêm chuỗi vừa nhập (phiên bản mới, có hiệu lực ngay)."],
  vuong: [
    ["Tìm công tắc bật tắt từng luật mà không thấy", "Nằm ở trang Luật kiểm tra, bấm «Mở trang Luật kiểm tra» ở đầu mục."],
    ["Thêm chuỗi rồi mà báo cáo cũ vẫn như cũ", "Chỉ báo cáo tải lên sau khi lưu mới kiểm theo danh sách mới. Tải lại bản sửa để kiểm lại."],
    ["Nhiều ô hợp lệ bỗng bị báo «chưa điền»", "Vừa thêm một chuỗi quá thông dụng. Bấm × bỏ chuỗi đó và lưu."],
    ["Thẻ chuỗi không thêm được", "Chuỗi trùng với một thẻ có sẵn (máy bỏ qua thẻ trùng) hoặc để trống."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «luat_kiem_tra» trong cài đặt (danh sách chuỗi chưa điền); cách máy dùng danh sách này ở phần kiểm tra báo cáo và các dạng luật Code.",
});
