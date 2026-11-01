// Hướng dẫn bản 2 (tab) — Ngăn kéo «Luật hệ thống» (xem / bật tắt / đổi mức một luật gốc). Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/luat/TrinhSuaLuat.tsx (nhánh heThong: bước «Luật gốc của hệ thống» + «Bật / tắt, mức và mẫu áp dụng» + chạy thử)
// · lib/cau-hinh/mac-dinh.ts (9 luật hệ thống: mã, tên, mức, mẫu) · lib/luat/kho-luat.ts (ghiSangCauHinh, dongBoTuCauHinh: hai nơi luôn khớp) · lib/kiem-tra/kiem-tra.ts (mỗi luật hệ thống do code kiểm riêng).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Luật hệ thống: bật tắt và mức",
  ai: "Quản trị viên, người có quyền «cau_hinh.sua», hoặc người được mục «Phân quyền cài đặt» cho phép nhóm luật kiểm tra. Người khác chỉ xem: ngăn kéo hiện nhãn «chỉ xem», không có nút «Lưu thay đổi», công tắc và thẻ mức bị khóa.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Ngăn kéo này là gì",
          doan: [
            "Luật hệ thống là 9 luật gốc đi kèm phần mềm, ví dụ «Đúng mẫu: nhận ra Form, đủ mục, không mất ô nhập». Cách kiểm của chúng nằm sẵn trong chương trình nên bạn không viết lại, không đổi câu luật, không xóa. Ngăn kéo này chỉ cho bạn ba việc: xem luật, bật hoặc tắt, đổi mức và đổi mẫu áp dụng.",
            "Khác với luật riêng (5 bước viết, chọn, chạy thử), ngăn kéo của luật hệ thống chỉ có 3 phần: «Luật gốc của hệ thống» (đọc), «Bật / tắt, mức và mẫu áp dụng» (chỉnh), «Chạy thử trên báo cáo đã có».",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Có đơn vị báo cáo đặc thù, một luật gốc có thể không hợp. Cho tắt hoặc hạ mức thay vì xóa để giữ nguyên bộ luật gốc và quay lại được.",
            "Mỗi lần đổi đều thành phiên bản mới; quay lại bản cũ không mất gì.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Ở danh sách Luật kiểm tra, bấm tên luật có huy hiệu «hệ thống» (hoặc «⋯» › «Bật/tắt, đổi mức»)"],
            ["Ngăn kéo này", "Đọc luật, chỉnh công tắc, mức, mẫu áp dụng, lưu"],
            ["Sau", "Từ báo cáo tải lên kế tiếp, máy kiểm theo cài đặt mới; thay đổi cũng được ghi sang mục «Luật hệ thống» của Cài đặt"],
          ],
        },
        {
          tieuDe: "④ Các khối",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["1 · «Luật gốc của hệ thống»", "Đọc tên, câu luật, mẫu áp dụng, nhóm, mã luật", "① Đọc luật"],
            ["2 · «Bật / tắt, mức và mẫu áp dụng»", "Công tắc «Đang bật / Đang tắt», ba thẻ mức, chip mẫu", "② Chỉnh"],
            ["3 · «Chạy thử trên báo cáo đã có»", "Có nút chạy thử nhưng với luật gốc chưa cho kết quả đáng tin", "③ Chạy thử và lưu"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Chỉnh công tắc, mức, mẫu áp dụng; bấm lưu."],
            ["Máy", "Kiểm từng luật hệ thống bằng chương trình cố định; lưu phiên bản; ghi sang Cài đặt."],
            ["🤖 AI", "— Ngăn kéo này không gọi AI. (Phần «AI góp ý nội dung» của hệ thống do mục Cài đặt › AI điều khiển, xem tab «Hay vướng».)"],
          ],
        },
        { tieuDe: "⑥ Quy trình người ↔ AI", doan: ["Ngăn kéo này không dùng AI: người chỉnh, máy áp dụng đúng như đã chỉnh."] },
        {
          tieuDe: "Chín luật hệ thống ghi sẵn (mức mặc định)",
          bang: [
            ["Luật", "Mức mặc định"],
            ["Đúng mẫu: nhận ra Form, đủ mục, không mất ô nhập", "Chặn gửi"],
            ["Kỳ báo cáo đã chọn tuần/tháng, có ngày", "Chặn gửi"],
            ["Người lập, người kiểm soát đã điền", "Chặn gửi"],
            ["Có nơi nhận", "Chặn gửi"],
            ["Công việc có tên; phụ trách trống thì gán đơn vị lập", "Cảnh báo"],
            ["Ngày bắt đầu không sau ngày kết thúc", "Chặn gửi"],
            ["Ngày trống: việc luôn mở", "Gợi ý"],
            ["Việc trùng việc trong sổ cái: áp quy tắc đè", "Cảnh báo"],
            ["Nội dung: mục trống, số liệu mâu thuẫn (AI góp ý)", "Gợi ý"],
          ],
        },
      ],
    },
    {
      ten: "① Đọc luật",
      khoi: [
        { doan: ["Bước 1 đã tích xanh, chỉ để đọc. Nó cho biết: tên luật và huy hiệu cách kiểm, câu luật trong dấu ngoặc kép, mô tả thêm (nếu có), và dòng nhỏ «Áp dụng: … · Nhóm … · mã …». Đọc để hiểu luật làm gì trước khi tắt hay đổi mức."] },
        {
          viDu: [
            "Mở luật «Ngày bắt đầu không sau ngày kết thúc»: đọc câu luật, thấy nó kiểm từng dòng việc trong báo cáo. Mặc định mức «Chặn gửi», nghĩa là dòng việc nào có ngày bắt đầu sau ngày kết thúc thì báo cáo không gửi được.",
          ],
        },
        { luuY: ["Câu luật và cách kiểm của luật hệ thống không sửa được ở đây. Muốn một điều kiện khác hẳn, hãy thêm luật riêng."] },
      ],
    },
    {
      ten: "② Chỉnh",
      khoi: [
        { doan: ["Ba thứ chỉnh được, mỗi thứ tác động khác nhau:"] },
        {
          bang: [
            ["Cái chỉnh", "Tác động"],
            ["Công tắc «Đang bật / Đang tắt»", "Tắt thì luật không được kiểm khi tải báo cáo lên"],
            ["Ba thẻ mức «Chặn gửi» · «Cảnh báo» · «Gợi ý»", "Không đạt thì khóa nút Gửi, báo nhưng vẫn gửi được, hay chỉ nhắc nhẹ"],
            ["Chip «Mọi mẫu» hoặc từng «Form N» (mục «Áp dụng cho mẫu»)", "Luật chỉ kiểm báo cáo của các mẫu được chọn; phải chọn ít nhất một mẫu"],
          ],
        },
        { bam: ["Bấm công tắc hoặc thẻ mức hoặc chip mẫu.", "Bấm «Lưu thay đổi» ở chân ngăn kéo (nút xám khi chưa đổi gì). Phím tắt Ctrl + Enter."] },
        {
          viDu: [
            "Giả sử Phòng Cơ điện (Form 9) nộp báo cáo kiểu riêng nên luật «Việc trùng việc trong sổ cái: áp quy tắc đè» hay báo nhầm. Quản trị mở luật, bấm chip «Mọi mẫu» để bỏ chọn, rồi bấm từng chip Form 0 đến Form 10 trừ Form 9, lưu: luật vẫn chạy cho các Form khác, riêng Form 9 không bị kiểm.",
            "Quản trị muốn nghiêm hơn: đổi luật «Công việc có tên; phụ trách trống thì gán đơn vị lập» từ «Cảnh báo» sang «Chặn gửi».",
          ],
        },
        {
          luuY: [
            "Đang ở «Mọi mẫu» mà bấm một chip Form thì luật chỉ còn áp cho đúng Form đó (không phải loại Form đó ra). Muốn loại một Form, bỏ chọn «Mọi mẫu» rồi chọn các Form còn lại; chọn đủ tất cả thì máy tự đổi lại thành «Mọi mẫu».",
            "Tắt luật gốc quan trọng như «Đúng mẫu…» nghĩa là báo cáo sai khuôn vẫn lọt tới tay cấp trên. Chỉ tắt khi đã có lý do rõ.",
            "Thay đổi lưu ở đây tự ghi sang mục «Luật hệ thống» của Cài đặt; ngược lại đổi bên Cài đặt cũng được đồng bộ về đây.",
          ],
        },
      ],
    },
    {
      ten: "③ Chạy thử và lưu",
      khoi: [
        { doan: ["Bước 3 có nút chạy thử giống ở luật riêng (cách đọc kết quả xem hướng dẫn «Chạy thử luật»). NHƯNG với luật hệ thống, nút này chưa có tác dụng thật: cách kiểm của luật gốc nằm trong chương trình, không phải là một dạng luật để chạy thử, nên kết quả thường là «Mọi báo cáo đều đạt luật này» dù báo cáo có lỗi. Đừng dựa vào kết quả đó để quyết định tắt luật."] },
        { bam: ["Muốn biết luật gốc bắt gì: đọc câu luật ở bước 1, hoặc nhìn lỗi thật hiện ra khi người nộp tải báo cáo lên ở «Báo cáo».", "Chỉnh xong bấm «Lưu thay đổi»; không thì «Hủy» (có thay đổi dở thì hỏi «Đóng và bỏ các thay đổi?»)."] },
        { viDu: ["Quản trị định tắt luật «Có nơi nhận» vì nghi nó báo nhầm. Thay vì chạy thử ở đây, quản trị hỏi một đơn vị đã gặp lỗi đó gửi ảnh chụp thông báo lỗi, rồi mới quyết tắt hay hạ xuống «Cảnh báo»."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «Xóa luật»", "Luật hệ thống không xóa được, chỉ tắt hoặc đổi mức."],
            ["Muốn đổi câu luật", "Không đổi được ở luật hệ thống. Thêm luật riêng bằng nút «Thêm luật» và tắt luật gốc nếu cần."],
            ["Tắt «Nội dung: mục trống, số liệu mâu thuẫn (AI góp ý)» rồi mà vẫn thấy AI góp ý", "Phần AI góp ý còn một công tắc riêng ở Cài đặt › AI («AI góp ý nội dung khi kiểm tra trước khi gửi»). Xem hướng dẫn mục AI."],
            ["Bỏ hết chip mẫu mà không lưu được", "Phải chọn ít nhất một mẫu, hoặc chọn «Mọi mẫu»."],
            ["Đổi mà báo cáo cũ không đổi kết quả", "Chỉ báo cáo tải lên sau khi lưu mới kiểm theo cài đặt mới."],
            ["Chạy thử luật hệ thống ra toàn «đạt»", "Cách kiểm luật gốc không chạy qua nút chạy thử (xem tab ③). Kết quả này không phản ánh lỗi thật."],
          ],
        },
      ],
    },
  ],
  canCu: "Mục «Luật hệ thống» của Cài đặt (9 luật gốc, mức mặc định) và bảng luật kiểm tra; cách kiểm từng luật gốc nằm trong phần kiểm tra báo cáo trước khi gửi.",
};
