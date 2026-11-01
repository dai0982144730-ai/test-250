// Hướng dẫn bản 2 (tab) — khung phải «Nguồn số liệu» của 4 thẻ ở màn Cây việc & đường găng. Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/PhaiCayViec.tsx (KhungNguon: 4 bảng nguồn và công thức) · CayViecView.tsx (TheDem: bấm tên thẻ mở nguồn).
// Khung này do MÁY tính, không dùng AI (số «AI đề xuất» là số đếm kết quả AI đã làm trước đó, không phải AI chạy ở đây).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Nguồn của bốn thẻ — con số lấy từ đâu, tính thế nào",
  ai: "Mọi người xem được màn đều mở được. Khung chỉ đọc, không có nút ghi.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: [
            "Bốn thẻ ở đầu màn Cây việc & đường găng là bốn con số. Bấm TÊN một thẻ (chữ gạch chấm) thì cột phải mở khung «Nguồn số liệu»: nói rõ số đó đếm từ đâu, công thức, và bảng chia nhỏ ra các thành phần.",
            "Hình dung: thẻ là kết quả bài toán, khung này là lời giải từng bước để bạn kiểm tra máy tính có đúng ý bạn không.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Chỉ cần con số lệch với Gantt bên Tiến độ hay với sổ việc là người dùng nghi ngờ cả màn. Khung này cho thấy số đó đến từ đâu để tự kiểm.",
            "Các thẻ do hai nơi dữ liệu ghép lại (agent Tiến độ và sổ cái); khung nói rõ phần nào của bên nào, lấy lúc mấy giờ.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò"],
            ["Trước", "Bạn thấy một con số lạ hoặc muốn hiểu vì sao đầu việc găng chưa giao là N", "Bắt đầu từ thẻ"],
            ["Khung này", "Đọc công thức và bảng thành phần", "Màn bạn đang xem"],
            ["Sau", "Bấm bộ lọc ở cây để xem từng đầu việc cấu thành con số", "Cây việc"],
          ],
        },
        {
          tieuDe: "④ Khung có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Dòng nhỏ «Nguồn số liệu» và tên thẻ", "Đang xem thẻ nào"],
            ["Đoạn công thức", "Cách đếm bằng lời"],
            ["Bảng số", "Các thành phần cộng trừ nên con số"],
            ["Dòng «nguồn: …»", "Dữ liệu lấy từ agent nào, lúc mấy giờ"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm tên thẻ · đọc · đối chiếu", "—"],
            ["MÁY", "Đếm và trừ theo công thức cố định; ghi giờ lấy dữ liệu", "Cùng dữ liệu thì cùng số"],
            ["🤖 AI", "Khung KHÔNG dùng AI. Ở thẻ ba có dòng đếm số việc 🤖 AI đã đề xuất mã, nhưng đó là kết quả đếm, không phải AI chạy ở đây", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Khung không có bước nào của AI. Người bấm thẻ, máy hiện công thức và bảng; người đọc và tự kiểm."],
        },
      ],
    },
    {
      ten: "① Thẻ 1 và 2",
      khoi: [
        {
          tieuDe: "Hai thẻ lấy từ agent Tiến độ",
          bang: [
            ["Thẻ", "Công thức", "Bảng trong khung"],
            ["ĐẦU VIỆC WBS", "Đếm MỌI đầu việc baseline của cây WBS (mọi cấp). Giai đoạn là đầu việc cấp 1", "Tổng đầu việc · Giai đoạn cấp 1 · COD dự báo"],
            ["TRÊN ĐƯỜNG GĂNG", "Đếm đầu việc được bộ tính đường găng đánh dấu găng, trên TOÀN cây (không chỉ chuỗi găng chốt COD). Chia nhóm theo mã cấp 1", "Đầu việc găng · từng nhóm"],
          ],
          luuY: ["Cả hai đều lấy lúc bạn mở màn hoặc bấm «Hỏi lại»; giờ lấy ghi ở dòng «nguồn». Đường găng đổi liên tục nên số có thể khác Gantt vừa xem một lúc trước."],
          viDu: ["Cách đọc: thẻ «TRÊN ĐƯỜNG GĂNG» ghi một số, dòng phụ liệt kê «nhóm: số». Khung nguồn hiển thị đúng danh sách nhóm đó thành từng dòng để bạn cộng lại."],
        },
      ],
    },
    {
      ten: "② Thẻ 3",
      khoi: [
        {
          tieuDe: "VIỆC CỦA DỰ ÁN",
          doan: [
            "Việc thuộc dự án là việc có ô Dự án trùng tên (hoặc tên gọi khác trong Cài đặt), hoặc việc giao Ban điều hành dự án, hoặc có tên dự án trong tên việc.",
            "«Việc liên quan WBS» là việc thuộc dự án trừ những việc AI hoặc người đã kết luận «không thuộc đầu việc nào» (khung ghi lần đọc này bỏ bao nhiêu việc). «Gắn được mã WBS» chỉ tính mã ĐÃ DUYỆT; đề xuất 🤖 còn chờ duyệt không tính.",
          ],
          bang: [
            ["Dòng trong khung", "Nghĩa"],
            ["Việc liên quan WBS", "Tổng việc cần xét gắn mã"],
            ["Đã xét (có dòng gắn mã)", "Việc đã có kết luận (của AI hoặc của người)"],
            ["Gắn được mã WBS", "Việc có mã đã duyệt"],
            ["🤖 AI đề xuất — chờ duyệt", "Số việc AI đã đề xuất, chưa ai duyệt"],
            ["🤖 AI đề xuất — đã duyệt / tự duyệt", "Số việc mã AI đã được duyệt"],
            ["Người gắn", "Số việc người gắn tay"],
          ],
          luuY: ["Muốn giảm số chờ duyệt: xem hướng dẫn «Gán mã WBS bằng AI»."],
          viDu: ["Cách đọc: dòng «Việc liên quan WBS» lớn hơn «Gắn được mã WBS» thì phần chênh là việc chưa có mã đã duyệt. Cộng ba dòng «AI đề xuất — chờ duyệt», «AI đề xuất — đã duyệt / tự duyệt» và «Người gắn» sẽ ra số việc đã được xét có kết luận gắn mã."],
        },
      ],
    },
    {
      ten: "③ Thẻ 4",
      khoi: [
        {
          tieuDe: "VIỆC GĂNG CHƯA GIAO",
          doan: ["Ghép hai nguồn trên, do máy tính, không có AI. Chỉ đếm VIỆC LÁ trên đường găng (đầu việc tổng không đếm), bắt đầu trong cửa sổ giao đang khai ở Cài đặt (mặc định 7 ngày tới) hoặc đã qua."],
          bang: [
            ["Dòng trong khung", "Nghĩa"],
            ["Đầu việc găng (mọi cấp)", "Tất cả đầu việc găng"],
            ["Trong đó việc lá", "Chỉ đầu việc cuối cùng của nhánh"],
            ["− đã có việc treo", "Trừ đầu việc đã có ít nhất một việc đã duyệt treo vào (kể cả việc đã xong)"],
            ["− đánh dấu không cần giao", "Trừ đầu việc bạn đã chọn «Việc này không cần giao trong agent Công việc»"],
            ["− đã xong theo tiến độ (100%)", "Trừ đầu việc đã 100%"],
            ["− chưa tới lúc giao", "Trừ đầu việc bắt đầu sau ngày cuối của cửa sổ giao (khung ghi ngày đó)"],
            ["= Chưa ai giao", "Kết quả, chính là số trên thẻ, đỏ khi lớn hơn 0"],
          ],
          luuY: ["Đọc từ trên xuống: lấy dòng việc lá rồi trừ lần lượt. Con số cuối bằng số trên thẻ; muốn xem từng đầu việc thì bấm bộ lọc «⭕ Việc găng chưa giao»."],
          viDu: ["Cách dùng: thẻ ghi số đỏ nhưng bạn thấy nhiều đầu việc găng chưa có người nhận mà không đỏ. Mở khung này, dòng «− chưa tới lúc giao» cho biết có bao nhiêu đầu việc bị ẩn vì còn xa. Khi tới trong cửa sổ giao, chúng tự đỏ."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Số găng khác Gantt bên Tiến độ", "Bấm «Hỏi lại». Đường găng đổi liên tục; giờ lấy ghi ở dòng nguồn."],
            ["Bảng thẻ 3 toàn số 0", "Dự án chưa có việc nào được xét gắn mã. Xem hướng dẫn «Gán mã WBS bằng AI»."],
            ["Muốn đổi cửa sổ giao 7 ngày", "Sửa ở Cài đặt, Gắn việc vào WBS, ô cửa sổ giao."],
            ["Bấm tên thẻ mà không thấy khung", "Chờ màn tải xong (thẻ chỉ hiện khi đã lấy được cây WBS)."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 10/09/2026 (công thức bốn thẻ), 04/10/2026 (chỉ đếm việc lá, cửa sổ giao theo ngày), 05/10/2026 (việc ngoài cây không đếm) · luật 32 (việc chưa tới lúc giao thì ẩn).",
};
