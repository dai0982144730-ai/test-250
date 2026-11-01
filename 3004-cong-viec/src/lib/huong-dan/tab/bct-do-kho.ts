// Hướng dẫn bản 2 (tab) — Báo cáo tuần, khung «🤖 Độ khó từng việc do AI chấm» ở cột phải (chỉ Ban lãnh đạo). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/phong/BaoCaoTuanPhong.tsx (MUC, t4/bieuDoKho, xemKho, dongViec kho-dong, PUT /api/bao-cao-tuan/do-kho) · lib/bao-cao-tuan/do-kho.ts (AI chấm nền: 2 phút một lượt, tối đa 25 việc, AI lỗi nghỉ 30 phút; người sửa thắng)
// · app/api/bao-cao-tuan/route.ts (la_bld: chỉ Ban lãnh đạo nhận điểm độ khó).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tuần — độ khó từng việc do AI chấm (Ban lãnh đạo xem và sửa)",
  ai: "Chỉ Ban lãnh đạo thấy nút mở khung này và sửa được điểm. Quản trị và mọi người khác không thấy điểm độ khó của từng việc: dòng «🤖 Độ khó từng việc do AI chấm» chỉ là chữ, không bấm được.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: [
            "Nơi Ban lãnh đạo xem AI đã chấm độ khó cho các việc đang mở như thế nào, và sửa lại nếu thấy lệch. Độ khó là nền của mọi chỉ số trong tab «🤖 AI đánh giá»: Điểm công việc, % trễ, Năng suất và Vùng.",
            "Có hai nơi: biểu đồ (hai khối «🤖 Độ khó việc đang mở theo đơn vị» và «Phân bố mức khó toàn công ty») và danh sách việc theo từng mức, mở khi bấm vào một khúc màu. Ở danh sách, mỗi việc có ô chọn mức để sửa.",
          ],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Đếm số việc không công bằng. Việc khó như xin chấp thuận đất phải được tính nặng hơn việc lập biên bản nội bộ.",
            "AI chấm nhanh cho mọi việc mới nhưng có thể chấm lệch. Chỉ Ban lãnh đạo mới biết việc nào thật sự khó, nên có quyền sửa; việc đã sửa thì AI không chấm lại.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của khung này"],
            ["Trước", "Việc vào sổ cái; AI chấm độ khó chạy nền", "Có điểm lần đầu"],
            ["Khung này", "Ban lãnh đạo soát phân bố, sửa việc chấm lệch", "Chỉnh điểm"],
            ["Sau", "Tab «🤖 AI đánh giá» dùng điểm đã sửa cho lần viết lại tới", "Chỉ số chính xác hơn"],
          ],
        },
        {
          tieuDe: "④ Khung có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["«🤖 Độ khó việc đang mở theo đơn vị»: thanh chồng năm màu theo mức, chữ cuối dòng «N điểm · M việc»", "So cơ cấu độ khó giữa các đơn vị", "① Xem biểu đồ"],
            ["«Phân bố mức khó toàn công ty»: số việc đang mở ở mỗi mức", "Biết AI chấm nghiêng về mức nào", "① Xem biểu đồ"],
            ["Danh sách việc theo mức (mở khi bấm khúc màu hoặc tên): mỗi việc có ô chọn «🤖 Vừa · 4» và dòng lý do", "Sửa điểm từng việc", "② Sửa điểm một việc"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Ban lãnh đạo mở biểu đồ, bấm khúc màu, đổi mức ở ô chọn", "Người quyết cuối"],
            ["MÁY", "Cộng điểm theo đơn vị, vẽ thanh, lưu điểm do người sửa", "Cùng dữ liệu cùng hình"],
            ["🤖 AI", "🤖 Chấm mỗi việc một mức (1, 2, 4, 8, 13 điểm) kèm lý do", "🤖 Có thể lệch; người sửa thì lựa chọn của người thắng"],
          ],
          ai: [
            "🤖 AI chỉ nhận tên việc, «Kết quả cần có», dự án và bên phụ trách. AI chấm theo ba tiêu chí và lấy tiêu chí nặng nhất: phạm vi ảnh hưởng (một phòng, nhiều đơn vị, cả dự án, cả công ty), bên ngoài tham gia (không, nhà thầu, cơ quan nhà nước, Bộ hay nước ngoài), giá trị tiền và rủi ro.",
            "🤖 AI chạy nền, mỗi 2 phút một lượt, tối đa 25 việc chưa có điểm (việc đang mở và việc vừa xong trong 60 ngày). AI lỗi thì nghỉ 30 phút rồi thử lại. Việc chưa chấm được tạm tính 2 điểm và có ghi chú dưới bảng chỉ số.",
            "🤖 AI KHÔNG chấm lại việc mà Ban lãnh đạo đã sửa. Người kiểm: đọc dòng lý do của AI dưới ô chọn rồi quyết đổi hay giữ.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "🤖 AI", "🤖 Chấm độ khó việc mới, lưu điểm và lý do"],
            ["2", "MÁY", "Dùng điểm tính Điểm công việc và Vùng của từng đơn vị"],
            ["3", "NGƯỜI", "Ban lãnh đạo xem biểu đồ, mở mức nghi ngờ, đổi mức ở ô chọn"],
            ["4", "MÁY", "Lưu điểm người sửa (ghi nguồn «Ban lãnh đạo đã sửa»), tính lại bảng chỉ số lần tải tới"],
          ],
        },
      ],
    },
    {
      ten: "① Xem biểu đồ",
      khoi: [
        {
          tieuDe: "Mở và đọc",
          bam: [
            "Ở tab «🤖 AI đánh giá», chân bảng «Chỉ số đơn vị», bấm «🤖 Độ khó từng việc do AI chấm ›». Cột phải mở khung này.",
            "Khối «🤖 Độ khó việc đang mở theo đơn vị»: mỗi đơn vị một thanh chồng, năm màu từ đậm (Rất khó · 13) tới nhạt (Rất dễ · 1); độ rộng khúc theo điểm; chữ cuối dòng ghi tổng điểm và số việc.",
            "Khối «Phân bố mức khó toàn công ty»: mỗi mức một thanh, chữ cuối là số việc đang mở ở mức đó.",
          ],
          viDu: ["Thanh của một phòng có khúc đậm rất dài: phòng đó đang giữ nhiều việc khó. Bấm khúc đậm, cột phải liệt kê đúng các việc «Khó · 8 điểm» của phòng để soát xem AI chấm có hợp lý không."],
          luuY: ["Biểu đồ chỉ tính việc đang mở. Việc đã xong không có trong hai khối này."],
        },
      ],
    },
    {
      ten: "② Sửa điểm một việc",
      khoi: [
        {
          bam: [
            "Bấm một khúc màu, một tên đơn vị hoặc một thanh trong «Phân bố mức khó toàn công ty»: cột phải đổi thành danh sách việc chia theo mức («🤖 Rất khó · 13 điểm», «🤖 Khó · 8 điểm», …).",
            "Mỗi việc có hàng ô chọn «🤖 Vừa · 4» và dòng lý do của AI («🤖 …»; việc chưa chấm ghi «🤖 chưa chấm»).",
            "Chọn mức đúng trong ô chọn. Chọn xong là lưu ngay, không có nút xác nhận; dòng bên cạnh đổi thành «Ban lãnh đạo đã sửa».",
          ],
          ketQua: ["Màn báo «Đã sửa độ khó <việc> (người sửa thắng AI)». Điểm mới dùng cho chỉ số ở lần viết lại báo cáo kế tiếp (bấm «Viết lại» nếu muốn thấy ngay)."],
          viDu: ["AI chấm «Dễ · 2» cho việc xin chấp thuận chủ trương đầu tư vì nhìn tên việc ngắn. Bạn biết đây là việc phải làm việc với nhiều sở ngành và nhiều tháng. Bạn đổi ô chọn sang «Rất khó · 13». Từ nay AI không chấm lại việc này."],
          luuY: ["Đổi điểm một việc làm Điểm công việc của đơn vị đó đổi, có thể đổi vùng của đơn vị (ví dụ từ «Cân bằng» sang «Quá tải»). Sửa theo thực tế, không sửa để làm đẹp số."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «🤖 Độ khó từng việc do AI chấm ›»", "Chỉ Ban lãnh đạo thấy; Quản trị và người khác chỉ thấy dòng chữ"],
            ["Việc ghi «🤖 chưa chấm»", "AI chưa tới lượt. Mỗi 2 phút chấm tối đa 25 việc; tạm tính 2 điểm trong lúc chờ"],
            ["Sửa xong mà bảng chỉ số chưa đổi", "Bảng tính theo bản báo cáo đã lưu. Bấm «Viết lại» để lấy điểm mới"],
            ["Muốn AI chấm lại việc đã sửa", "Không có. Việc người đã sửa thì lựa chọn của người thắng"],
            ["Khung trống khi mở", "Không có việc đang mở trong tuần này, nên không có gì để vẽ"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 30/09/2026: độ khó 1 · 2 · 4 · 8 · 13, bỏ tab thứ tư, mở biểu đồ từ chân bảng chỉ số, người sửa thắng AI · luật 19.",
};
