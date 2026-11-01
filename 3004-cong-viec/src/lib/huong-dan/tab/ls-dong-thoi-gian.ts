// Hướng dẫn bản 2 (tab) — khung «Dòng thời gian» mở từ màn Lịch sử (bấm tên một đối tượng ở cột «Đối tượng»). Viết 20/10/2026.
// Nhãn chép từ components/lich-su/TraCuuLichSu.tsx, components/thu-muc/DongThoiGian.tsx, XemTruocTaiLieu.tsx. Màn này không dùng AI.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Dòng thời gian của một đối tượng (khung mở từ Lịch sử)",
  ai: "Người xem được Lịch sử thì mở được khung này cho các đối tượng trong phạm vi của mình. Nút «Tải bản Word» chỉ hiện với tài liệu, nút «Mở việc trên Sơ đồ» chỉ hiện với công việc.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì",
          doan: [
            "Khi bạn bấm tên một tài liệu, một việc, một thư mục… ở cột «Đối tượng» của bảng Lịch sử, một khung mở ra kể TOÀN BỘ câu chuyện của đối tượng đó theo thứ tự thời gian, từ lúc tạo đến nay: ai làm gì, lúc nào, kèm chi tiết.",
            "Với tài liệu, khung chia đôi: bên trái là dòng thời gian, bên phải là bản xem trước của tài liệu, chọn được từng phiên bản (kể cả bản cũ đã bị đè hoặc đã đưa vào thùng rác).",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Bảng Lịch sử trả lời «có thao tác nào», còn khung này trả lời «chuyện gì đã xảy ra với riêng tài liệu / việc này».",
            "Mở lại đúng bản cũ để đối chiếu, tải về làm bằng chứng, mà không phải đi lục thư mục.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Ở màn Lịch sử, lọc và tìm ra dòng liên quan (hướng dẫn «Cài đặt — Lịch sử»)"],
            ["Khung này", "Bấm tên đối tượng, đọc dòng thời gian, mở bản cũ"],
            ["Sau", "Tải bản Word cần dùng, hoặc nhảy sang Sơ đồ tổ chức để làm việc với việc đó"],
          ],
        },
        {
          tieuDe: "④ Các khối trong khung",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Tiêu đề khung «<Loại>: <tên>»", "Cho biết đang xem đối tượng nào", "① Đọc dòng thời gian"],
            ["Nút «Tải bản Word» (tài liệu) hoặc «Mở việc trên Sơ đồ» (công việc), góc phải tiêu đề", "Đi tiếp sang việc khác", "③ Mở bản và đi tiếp"],
            ["Cột trái: «Dòng thời gian của …», nút kiểm tra nhỏ, nút tải lại", "Danh sách sự kiện", "① Đọc dòng thời gian"],
            ["Cột phải (chỉ tài liệu): bản xem trước và hàng nút chọn phiên bản", "Xem nội dung từng bản", "② Xem từng phiên bản"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Đọc, bấm mã băm để xem đủ chi tiết, chọn phiên bản, tải về."],
            ["Máy", "Gom mọi dòng sổ nhắc tới đối tượng, xếp từ cũ đến mới, dựng bản xem trước từng phiên bản."],
            ["🤖 AI", "— Khung này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Khung này không dùng AI: người đọc, máy dựng lại từ sổ."],
        },
      ],
    },
    {
      ten: "① Đọc dòng thời gian",
      khoi: [
        {
          doan: ["Mỗi sự kiện là một hàng: cột ngày giờ bên trái, chấm màu ở giữa, nội dung bên phải. Chấm màu cho biết tính chất sự kiện."],
        },
        {
          bang: [
            ["Màu chấm", "Thường là sự kiện"],
            ["Đỏ", "Xoá (vào thùng rác), quá hạn"],
            ["Vàng", "Trả lại, chờ sửa, bị đè, bản không được dùng"],
            ["Xanh lá", "Khôi phục, hoàn thành, xong việc"],
            ["Xanh dương", "Tải lên"],
            ["Màu nhấn", "Gửi, gửi lại, gửi mới, vào sổ cái"],
            ["Xám", "Các sự kiện còn lại"],
          ],
        },
        {
          bam: [
            "Đọc từ trên xuống: sự kiện cũ nhất ở trên, mới nhất ở dưới (ngược với bảng Lịch sử).",
            "Mỗi hàng có tên người, đơn vị, tên hành động; nếu văn thư nhập hộ thì ghi «nhập thay cho …».",
            "Hàng nhắc tới đối tượng khác (ví dụ việc sinh ra từ tài liệu này) có ô nhỏ ghi tên đối tượng đó.",
            "Bấm mã dạng #số · mười hai ký tự để mở khung chữ nhỏ liệt kê đủ mọi trường của dòng, kể cả mã băm và dòng trước. Bấm lần nữa để đóng.",
            "Bấm biểu tượng tải lại ở tiêu đề nếu muốn đọc lại sổ.",
          ],
        },
        {
          viDu: [
            "Tình huống: một báo cáo tuần bị trả lại. Dòng thời gian của nó có thể đọc như sau: «Tải lên» (xanh dương) → «Kiểm tra» → «Gửi» → «Trả lại» (vàng, kèm lý do) → «Gửi lại bản mới». Nhìn là biết bị trả lại vì sao và gửi lại mấy lần.",
          ],
        },
        {
          luuY: ["Nút kiểm tra nhỏ cạnh tiêu đề cũng là «Kiểm tra toàn vẹn» của cả sổ, không riêng đối tượng này."],
        },
      ],
    },
    {
      ten: "② Xem từng phiên bản",
      khoi: [
        {
          doan: ["Chỉ có với tài liệu. Một tài liệu có thể được tải lên nhiều lần; mỗi lần là một phiên bản. Sổ giữ mọi phiên bản, kể cả khi tài liệu đã bị xoá khỏi thư mục."],
        },
        {
          bam: [
            "Nhìn cột phải: khi tài liệu có từ hai phiên bản trở lên, phía trên bản xem trước có một hàng nút, mỗi nút một phiên bản (mới nhất đứng đầu).",
            "Bấm nút phiên bản muốn xem. Rê chuột để thấy tên tệp, người tải lên và giờ tải.",
            "Ở dòng «Tải lên» hoặc dòng có ghi số bản trong dòng thời gian, bấm «Mở bản N» để xem đúng bản đó trong một khung riêng.",
          ],
        },
        {
          viDu: [
            "Tình huống: bên A nói «bản gửi hôm trước khác bản này». Bạn mở dòng thời gian của tài liệu, bấm nút phiên bản cũ ở cột phải để xem, so với bản mới, và bấm «Tải về» ở dòng tương ứng để lấy đúng bản cũ làm bằng chứng.",
          ],
        },
        {
          luuY: ["Dòng chỉ ghi việc mở xem hoặc tải về thì không có nút mở bản. Bản xem trước chưa dựng được thì khung báo lỗi đỏ; vẫn tải về được."],
        },
      ],
    },
    {
      ten: "③ Mở bản và đi tiếp",
      khoi: [
        {
          bang: [
            ["Nút", "Có ở", "Làm gì"],
            ["«Mở bản N» (hoặc «Mở tài liệu»)", "Dòng có tài liệu kèm", "Mở bản xem trước của đúng phiên bản đó"],
            ["«Tải về»", "Cùng dòng trên", "Tải đúng phiên bản đó về máy"],
            ["«Tải bản Word»", "Tiêu đề khung, đối tượng là tài liệu", "Tải tệp tài liệu"],
            ["«Mở việc trên Sơ đồ»", "Tiêu đề khung, đối tượng là công việc", "Chuyển sang Sơ đồ tổ chức, mở đúng việc"],
          ],
        },
        {
          viDu: [
            "Tình huống: đọc dòng thời gian của một việc, thấy việc đã được «Gia hạn» hai lần. Bạn bấm «Mở việc trên Sơ đồ» để xem việc hiện tại, bình luận và người đang giữ.",
          ],
        },
        {
          luuY: [
            "Việc tải về cũng được ghi vào sổ («Tải về»); đây là cách sổ biết ai đã lấy tài liệu.",
            "Đóng khung bằng nút đóng của khung để về bảng Lịch sử; bộ lọc giữ nguyên.",
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
            ["Khung báo «Chưa có dòng lịch sử nào»", "Đối tượng chưa có sự kiện nào trong phạm vi bạn xem được."],
            ["Không có hàng nút chọn phiên bản", "Tài liệu mới có một phiên bản."],
            ["Bản xem trước báo lỗi", "Định dạng tệp chưa xem trực tiếp được; bấm «Tải về» để mở bằng phần mềm trên máy."],
            ["Không thấy nút «Tải bản Word» hay «Mở việc trên Sơ đồ»", "Hai nút chỉ hiện đúng với tài liệu hoặc công việc; thư mục, cài đặt, người dùng không có."],
          ],
        },
      ],
    },
  ],
  canCu: "Dòng thời gian gom mọi dòng sổ lịch sử nhắc tới đối tượng; phiên bản tài liệu lưu vĩnh viễn nên mở lại được bản cũ.",
};
