// Hướng dẫn bản 2 (tab) — Gửi báo cáo, BƯỚC 1 «Nộp báo cáo» (khung thả tệp, bản nháp, ô nhập máy đọc được). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/gui/KhungSoanGui.tsx (taiLen, khung thả tệp, danh sách bản nháp, noiDungBuoc1, phaiBuoc1, nhận tệp từ Trợ lý ?tu-chat) · gui/ThanhTienTrinhNop.tsx · app/api/kiem-tra (nhận tệp và kiểm).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gửi báo cáo — Bước 1 · Nộp báo cáo (thả tệp Excel vào)",
  ai: "Người có quyền Gửi tài liệu. Người chưa gán đơn vị vẫn thả tệp để kiểm thử được nhưng chưa gửi được. Bước này không dùng AI: máy đọc tệp.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Bước này là gì?",
          doan: ["Bước đầu của cả quy trình nộp: bạn đưa tệp báo cáo Excel (.xlsx, làm trên mẫu tải ở màn «Mẫu báo cáo») vào hệ thống. Máy nhận ra tệp theo mẫu nào, đọc tờ «Mẫu trắng» ra từng ô, từng bảng và kiểm ngay. Từ 22/10/2026 tệp Word không còn nộp được. Mỗi lần tải lên là một «bản»; sửa xong tải lại thì thành bản 2, lịch sử vẫn giữ bản 1."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Có tệp vào hệ thống thì mới kiểm lỗi, soát nội dung, tách việc vào sổ cái được.",
            "Máy nhận cột theo chữ ở hàng tên cột: chèn dòng, chèn cột, đổi thứ tự cột vẫn đọc đúng.",
            "Bản nháp được lưu: làm dở có thể đóng máy, hôm sau mở lại từ danh sách «Bản nháp chưa gửi của tôi».",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Bước 1"],
            ["Trước", "Điền tờ «Mẫu trắng» của mẫu Excel, hoặc nhờ Trợ lý chat làm bằng lệnh /lam-bao-cao", "Có tệp"],
            ["Bước 1", "Thả tệp vào, máy đọc và kiểm", "Đưa tệp vào"],
            ["Sau", "Bước 2 · Sửa lỗi (nếu còn lỗi), rồi Bước 3, 4, 5", "Xử lý kết quả kiểm"],
          ],
        },
        {
          tieuDe: "④ Bước có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Khung «Bấm hoặc kéo thả tệp Excel (.xlsx) vào đây»", "Nạp tệp", "① Thả tệp"],
            ["Dòng «▸ Bản nháp chưa gửi của tôi · N»", "Mở lại bản đang làm dở", "② Bản nháp"],
            ["Sau khi nạp: tên tệp, liên kết «Tài liệu khác», danh sách ô nhập", "Soát máy đọc ra gì", "③ Máy đọc ra gì"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn hoặc kéo thả tệp, mở lại bản nháp, bấm «Tài liệu khác» để bỏ tệp đang làm", "Người quyết nộp tệp nào"],
            ["MÁY", "Nhận ra mẫu, đọc từng ô nhập, kiểm lỗi theo luật cố định, lưu thành bản, ghi vào danh sách nháp", "Cùng tệp cùng kết quả"],
            ["🤖 AI", "Bước này không dùng AI", "—"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Bước này không dùng AI. Người thả tệp; máy đọc, kiểm và lưu. AI chỉ vào từ Bước 2."],
        },
      ],
    },
    {
      ten: "① Thả tệp",
      khoi: [
        {
          bam: [
            "Bấm vào khung «Bấm hoặc kéo thả tệp Excel (.xlsx) vào đây», chọn tệp; hoặc kéo tệp từ thư mục thả vào khung.",
            "Chờ dòng «Đang đọc và kiểm tra…». Xong, khối «1 · Nộp báo cáo» có dấu ✓ và dòng phụ ghi «bản N».",
            "Màn tự mở ra các khối bước tiếp theo; bước 2 cho biết còn lỗi gì.",
          ],
          ketQua: [
            "Máy nhận ra mẫu (dòng «Mã mẫu» đầu tờ; mất dòng này thì đoán theo tên chương) và kiểm ngay. Mỗi lần tải lên sẽ là một bản.",
            "Chưa nhận ra mẫu thì ghi «Chưa nhận ra mẫu nên chưa đọc được ô nhập.» và các mục khác chưa kiểm; tải lại đúng mẫu ở màn «Mẫu báo cáo».",
          ],
          viDu: ["Phòng Hành chính tải mẫu báo cáo tuần ở «Tải mẫu báo cáo», điền tờ «Mẫu trắng», lưu .xlsx, rồi thả vào khung. Khoảng vài giây sau khối 1 có dấu ✓ «bản 1» và bước 2 báo «Đủ điều kiện bắt buộc» nếu mọi ô đã đủ (tình huống minh hoạ)."],
          luuY: [
            "Chỉ nhận tệp .xlsx. Tệp .xls, .csv thì mở bằng Excel, «Lưu thành» Excel Workbook (.xlsx). Tệp Word bị chặn kèm lời chỉ tải mẫu Excel.",
            "Từ Trợ lý chat: sau khi lệnh /lam-bao-cao xong, bấm «Nộp báo cáo này», màn tự nạp tệp Trợ lý vừa làm, như bạn tự chọn tệp. Tệp Trợ lý làm chỉ giữ 7 ngày; quá 7 ngày màn báo đã xoá và bạn gõ «làm lại file» trong phiên chat.",
          ],
        },
      ],
    },
    {
      ten: "② Bản nháp",
      khoi: [
        {
          bam: [
            "Bấm dòng «▸ Bản nháp chưa gửi của tôi · N» để bung danh sách (mặc định thu gọn). Bản đã gửi không nằm ở đây.",
            "Mỗi dòng ghi tên bản, tình trạng và ngày giờ tạo. Tình trạng có ba dạng: «Còn N lỗi chặn — chưa gửi được» (màu đỏ), «Đã hết lỗi, còn N cảnh báo — chưa gửi» hoặc «Đã hết lỗi — chưa gửi», và «Chưa kiểm tra — chưa gửi».",
            "Bấm một dòng để mở lại đúng bản đó và làm tiếp từ bước đang dở.",
            "Danh sách dài thì chia 15 bản một trang, dùng «‹ Trước» và «Sau ›».",
          ],
          viDu: ["Hôm qua bạn thả tệp báo cáo tuần, còn lỗi thiếu hạn, chưa sửa xong thì đóng máy. Sáng nay mở Gửi báo cáo, bung «Bản nháp chưa gửi của tôi», thấy dòng «Còn 2 lỗi chặn — chưa gửi được»; bấm vào để sửa tiếp (tình huống minh hoạ)."],
        },
      ],
    },
    {
      ten: "③ Máy đọc ra gì",
      khoi: [
        {
          doan: ["Mở khối «1 · Nộp báo cáo» (bấm tiêu đề). Bạn thấy tên tệp ở bên phải, kèm liên kết «Tài liệu khác» để bỏ tệp đang xử lý và nộp tệp khác. Phần thân liệt kê các ô nhập máy đọc được từ tệp."],
          bang: [
            ["Hiển thị", "Nghĩa"],
            ["Nhãn ô, giá trị", "Chữ máy đọc được trong ô đó"],
            ["«trống»", "Ô có nhưng chưa ghi gì"],
            ["«mất ô nhập»", "Nhãn ô (chữ đỏ, vd «Kỳ báo cáo:») bị xoá khỏi tờ; chép lại đúng nhãn hoặc tải mẫu mới"],
            ["Dấu * đỏ sau nhãn", "Ô bắt buộc"],
            ["Giá trị tô đỏ", "Ô đang có lỗi chặn gửi"],
          ],
          viDu: ["Bạn thấy ô ghi tên phòng lập báo cáo đã được máy đọc ra đúng tên phòng mình: yên tâm. Nếu ghi «trống» ở một ô có dấu * đỏ thì bước 2 sẽ báo lỗi chặn ở ô đó."],
          luuY: ["Nếu máy đọc ra khác với chữ bạn thấy trong Excel (ví dụ báo «không thấy cột …»), tải mẫu mới ở «Tải mẫu báo cáo» và dán lại nội dung thay vì sửa tay trong tệp cũ."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Tải mãi ở «Đang đọc và kiểm tra…»", "Tệp lớn hoặc mạng chậm. Chờ thêm; nếu có chữ đỏ báo lỗi thì bấm «đóng» và tải lại"],
            ["«Chưa nhận ra mẫu nên chưa đọc được ô nhập»", "Tệp không đúng mẫu công ty. Tải mẫu mới ở «Tải mẫu báo cáo»"],
            ["Mở link từ Trợ lý mà không nạp tệp", "Tệp Trợ lý làm hết hạn 7 ngày. Gõ «làm lại file» trong phiên chat"],
            ["Không thấy bản nháp đã gửi", "Danh sách nháp chỉ có bản CHƯA gửi. Bản đã gửi không còn nằm ở đây"],
            ["«Bạn chưa được gán đơn vị»", "Vẫn kiểm thử được nhưng chưa gửi được; nhờ Quản trị gán đơn vị"],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 22/10/2026 (báo cáo nộp bằng .xlsx; Word đã nộp vẫn đọc lại) · 28/09/2026 (mỗi lần tải là một bản) · 01/10/2026 (bản nháp chưa gửi, 15 bản một trang) · phân vai máy kiểm, người quyết.",
};
