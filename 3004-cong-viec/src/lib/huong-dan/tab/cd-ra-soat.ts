// Hướng dẫn bản 2 (tab) — Cài đặt › Riêng của agent › Rà soát sổ cái. Viết 20/10/2026. Nhãn chép từ components/cai-dat/ra-soat.tsx.
// Đối chiếu code 20/10: quyền = quản trị hoặc «cau_hinh.sua» (suaDuocMoiNhom, cả màn lẫn đường gọi máy chủ); máy đối chiếu từng dòng việc của mọi báo cáo đã gửi với sổ cái, KHÔNG dùng AI (chốt 29/09);
// «Rà soát ngay» còn tự bổ sung nếu cài đặt «so_cai.tu_bo_sung_thieu» bật (mặc định bật) — màn chỉ ghi «Rà soát ngay», xem tab «Hay vướng». Đây cũng là đích của đường dẫn trong tin «sổ cái còn thiếu». Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Rà soát sổ cái (báo cáo đã gửi đã vào sổ cái đủ việc chưa)",
  ai: "Chỉ quản trị viên hoặc người có quyền sửa cài đặt thấy mục này và bấm được hai nút «Rà soát ngay», «Bổ sung … việc thiếu vào sổ cái». Người khác không thấy mục (và dòng «Rà soát sổ cái» trong menu tên người cũng ẩn); mở thẳng địa chỉ thì thấy câu «Bạn không có quyền mở mục này».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Mỗi báo cáo tuần hay tháng đơn vị gửi lên có một bảng việc. Khi gửi, các dòng việc đó phải được ghi vào sổ cái công việc (nơi sống duy nhất của mọi việc). Màn này kiểm: MỌI báo cáo đã gửi, từng dòng việc, đã nằm trong sổ cái chưa. Dòng nào chưa có thì liệt kê, ghi rõ vì sao thiếu và cho bấm bổ sung.",
            "Chỉ xét báo cáo đã đi qua luồng gửi (gửi, gửi lại, tệp kèm khi chuyển tiếp). Tài liệu tải thẳng lên thư mục không vào sổ nên không tính.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Việc không vào sổ cái thì không hiện ở Sơ đồ tổ chức, Việc của tôi, nhắc hạn — người nộp tưởng đã giao, thực tế không ai thấy.",
            "Quy tắc máy đọc báo cáo được mở rộng theo thời gian (thêm bảng mới được lấy việc). Báo cáo gửi từ trước có thể thiếu những dòng mà nay máy đã đọc được; màn này tìm và vá chúng.",
            "Hệ thống tự rà soát hằng ngày và sau khi đổi cài đặt; màn là chỗ nhìn kết quả và can thiệp tay khi cần.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Rà soát sổ cái"],
            ["Trước", "Đơn vị nộp báo cáo ở menu «Báo cáo»; máy tách việc vào sổ cái", "Là thứ được kiểm"],
            ["Màn này", "Máy đối chiếu, người xem kết quả, bổ sung phần thiếu", "Lưới an toàn cuối cùng"],
            ["Sau", "Việc vào sổ thì hiện ở Sơ đồ tổ chức, Việc của tôi, Cây việc", "Người dùng thấy đủ việc"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Khung giải thích và hai dòng «Lý do thiếu»: «quy tắc mới», «lỗi ghi sổ»", "Nói máy làm gì, vì sao dòng thiếu", "① Đọc kết quả"],
            ["Nút «Rà soát ngay»", "Đọc lại mọi báo cáo đã gửi và đối chiếu", "② Rà soát ngay"],
            ["Nút «Bổ sung N việc thiếu vào sổ cái» (chỉ hiện khi còn thiếu)", "Ghi các dòng thiếu vào sổ cái", "③ Bổ sung việc thiếu"],
            ["Dòng «Lần rà soát gần nhất: … (tự động hằng ngày / bấm tay / sau khi bổ sung)»", "Cho biết kết quả đang xem từ lúc nào", "① Đọc kết quả"],
            ["Khung số: «báo cáo đã gửi», «dòng việc», «còn thiếu trong sổ cái», «lỗi ghi sổ», «dòng Form 0 chờ TGĐ quyết định»", "Tóm tắt kết quả", "① Đọc kết quả"],
            ["Danh sách báo cáo còn thiếu, mỗi báo cáo kèm các dòng thiếu", "Chỉ ra dòng nào, bảng nào, vì sao", "① Đọc kết quả"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở màn này"],
            ["Người", "Mở màn xem kết quả, bấm «Rà soát ngay» khi nghi ngờ, bấm «Bổ sung …» sau khi hiểu lý do, mở báo cáo gốc để đối chiếu."],
            ["Máy", "Tự rà soát hằng ngày và khi có thể phát sinh thiếu; đọc lại từng báo cáo bằng quy tắc lấy việc hiện hành; đối chiếu từng dòng (bảng, số dòng, ý) với sổ cái; bổ sung việc thiếu, gộp việc có vẻ trùng vào việc giống nhất; báo quản trị. Cùng dữ liệu thì luôn ra cùng kết quả."],
            ["🤖 AI", "— Màn này không dùng AI. Đã bỏ phần cho AI đọc chữ tự do từ 29/09: việc ngoài bảng do người nộp quyết ngay ở bước 4 lúc gửi."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI: máy rà soát và bổ sung, người xem và quyết định bấm."],
        },
        {
          luuY: [
            "Mục nằm ở tab «🧩 Riêng của agent» của màn Cài đặt; cũng mở được từ dòng «Rà soát sổ cái» trong menu tên người (kèm số việc thiếu nếu có) và từ tin báo «sổ cái còn thiếu» trên chuông 🔔.",
            "Mục này chỉ xem kết quả và bấm hai nút; không có ô nhập hay nút «Lưu».",
          ],
        },
      ],
    },
    {
      ten: "① Đọc kết quả",
      khoi: [
        {
          doan: ["Mở màn là thấy ngay kết quả lần rà soát gần nhất (không phải đợi). Chưa rà soát lần nào thì màn ghi «Chưa rà soát lần nào — bấm Rà soát ngay.»"],
        },
        {
          bang: [
            ["Con số", "Nghĩa"],
            ["«báo cáo đã gửi»", "Số báo cáo máy đã đọc lại"],
            ["«dòng việc»", "Tổng dòng việc trong các báo cáo đó"],
            ["«còn thiếu trong sổ cái»", "Dòng việc đọc được mà chưa có trong sổ cái (xanh khi 0, vàng khi còn)"],
            ["«lỗi ghi sổ» (chỉ hiện khi khác 0)", "Dòng lúc gửi đã đọc được mà sổ cái không ghi — lỗi hệ thống"],
            ["«dòng Form 0 chờ TGĐ quyết định»", "Dòng bảng quyết định của Tổng giám đốc: chỉ vào sổ khi Tổng giám đốc giao việc, nên không tính là thiếu"],
          ],
        },
        {
          tieuDe: "Hai lý do thiếu",
          bang: [
            ["Lý do (chữ màu)", "Nghĩa", "Làm gì"],
            ["Quy tắc mới (vàng)", "Lúc gửi hệ thống chưa lấy việc ở dòng hay bảng đó; nay đã lấy được", "Bấm «Bổ sung …»"],
            ["Lỗi ghi sổ (đỏ)", "Lúc gửi đã đọc được mà sổ cái không ghi", "Báo người phụ trách hệ thống kiểm tra; bổ sung vẫn thử ghi lại"],
            ["Chưa rõ", "Bản gửi không còn kết quả kiểm tra đã lưu để so", "Bổ sung rồi xem lại"],
          ],
        },
        {
          bam: [
            "Mở Cài đặt → tab «🧩 Riêng của agent» → mục «Rà soát sổ cái».",
            "Đọc dòng «Lần rà soát gần nhất» để biết kết quả có mới không.",
            "Đọc khung số. Nếu «còn thiếu trong sổ cái» bằng 0 và không có «lỗi ghi sổ», màn báo xanh «Sổ cái đã nhận đủ việc của mọi báo cáo đã gửi.»",
            "Nếu còn thiếu, mỗi báo cáo hiện một khối: bấm tên báo cáo để mở bản gốc, các dòng thiếu được khoanh cam trong bản đó.",
            "Dưới mỗi dòng thiếu: [tên bảng, dòng số mấy], tên việc, «chưa có hạn» nếu thiếu ngày, và lý do.",
          ],
        },
        {
          viDu: [
            "Tình huống: tuần trước máy được mở rộng để lấy việc ở bảng «Kiến nghị». Một báo cáo gửi từ tháng trước có hai dòng ở bảng đó chưa vào sổ. Màn hiện báo cáo ấy, hai dòng ghi «Quy tắc mới» kèm câu giải thích, và nút «Bổ sung 2 việc thiếu vào sổ cái».",
          ],
        },
        {
          luuY: ["Tên các bảng hiện bằng tiếng thường: «Kết quả và kế hoạch việc», «Kế hoạch», «Kiến nghị», «Sự cố», «Cảnh báo hồ sơ», «GPMB», «Tiến độ thiết kế», «An toàn — hành động»."],
        },
      ],
    },
    {
      ten: "② Rà soát ngay",
      khoi: [
        {
          doan: ["Nút «Rà soát ngay» bắt máy đọc lại MỌI báo cáo đã gửi ngay bây giờ thay vì chờ lượt hằng ngày. Dùng khi vừa đổi quy tắc, vừa có người báo «tôi nộp rồi mà không thấy việc», hoặc muốn chắc trước một cuộc họp."],
        },
        {
          bam: [
            "Bấm «Rà soát ngay». Nút quay và dòng «Đang đọc lại mọi báo cáo đã gửi…» hiện (vài giây đến vài chục giây tuỳ số báo cáo).",
            "Chờ dòng kết quả đậm hiện cạnh nút: «Đã rà soát xong lúc … (N giây): đọc lại … báo cáo đã gửi, … dòng việc — …».",
            "Xanh «sổ cái đủ, không thiếu việc nào» là ổn; vàng «còn thiếu … việc trong sổ cái» thì đọc danh sách bên dưới.",
          ],
        },
        {
          ketQua: [
            "Kết quả mới được lưu và thành «Lần rà soát gần nhất (bấm tay)».",
            "Nếu cài đặt tự bổ sung đang bật (mặc định bật) và có dòng thiếu, máy bổ sung luôn trong lượt này; dòng «Lần rà soát gần nhất» khi đó ghi «sau khi bổ sung» và khung số hiện «đã bổ sung N việc».",
          ],
        },
        {
          viDu: [
            "Tình huống: trưởng phòng nói «báo cáo của phòng tôi nộp sáng nay mà sơ đồ chưa thấy việc». Bạn bấm «Rà soát ngay». Nếu sổ đã đủ, dòng xanh cho biết đã đọc lại bao nhiêu báo cáo và không thiếu gì; vấn đề nằm ở chỗ khác (ví dụ việc thuộc dự án chưa có trong cây dự án). Nếu thiếu, bạn thấy đúng dòng nào.",
          ],
        },
        {
          luuY: ["Bấm xong luôn có câu trả lời cạnh nút, cả khi mọi thứ ổn để bạn không phải đoán nút có chạy hay không."],
        },
      ],
    },
    {
      ten: "③ Bổ sung việc thiếu",
      khoi: [
        {
          doan: ["Nút «Bổ sung N việc thiếu vào sổ cái» ghi các dòng đang thiếu vào sổ, theo ngày gửi gốc của báo cáo và quy tắc đè hiện hành. Nút chỉ hiện khi còn dòng thiếu."],
        },
        {
          bam: [
            "Đọc danh sách thiếu để biết sẽ ghi gì.",
            "Bấm «Bổ sung N việc thiếu vào sổ cái». Hộp hỏi xác nhận «Bổ sung N việc thiếu vào sổ cái? Việc có vẻ trùng sẽ gộp vào việc giống nhất.» — bấm đồng ý.",
            "Chờ dòng kết quả «Đã bổ sung N việc vào sổ cái». Cạnh mỗi dòng đã ghi hiện mã việc (bấm để mở việc trên Sơ đồ tổ chức) và cách ghi: «việc mới», «cập nhật việc cũ», «ghi vào việc cũ (bản không dùng)», «đóng việc» hoặc «vào sổ ở trạng thái đã xong (lần nạp đầu)».",
          ],
        },
        {
          ketQua: [
            "Việc mới xuất hiện ở Sơ đồ tổ chức, Việc của tôi, Cây việc; việc trùng được gộp vào việc cũ chứ không tạo bản thứ hai.",
            "Máy rà lại ngay sau khi bổ sung; dòng nào vẫn không ghi được thì còn nằm trong danh sách.",
            "Lịch sử ghi lại mỗi lần bổ sung.",
          ],
        },
        {
          viDu: [
            "Tình huống: danh sách thiếu có một dòng «Quy tắc mới» tên «Hoàn thiện hồ sơ thiết kế» và một dòng nữa trùng ý với một việc đã có. Sau khi bổ sung, dòng đầu thành việc mới có mã; dòng sau hiện «→ mã việc cũ (cập nhật việc cũ)». Bấm mã để kiểm tra.",
          ],
        },
        {
          luuY: [
            "Bổ sung ghi dữ liệu thật vào sổ cái: đọc lý do thiếu trước khi bấm. Dòng «Lỗi ghi sổ» nên báo người phụ trách hệ thống để tìm nguyên nhân, đừng chỉ bấm bổ sung rồi bỏ qua.",
            "Không có nút hoàn tác; muốn sửa việc đã bổ sung thì dùng chức năng sửa việc bình thường.",
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
            ["Không thấy mục «Rà soát sổ cái»", "Bạn không phải quản trị viên và chưa có quyền sửa cài đặt; nhờ quản trị cấp quyền."],
            ["Bấm «Rà soát ngay» mà dòng xanh ghi «không thiếu việc nào» trong khi khung số có «đã bổ sung N việc»", "Cài đặt tự bổ sung đang bật nên máy vừa vá xong rồi mới báo; số đã bổ sung nằm ở khung số."],
            ["Không thấy nút «Bổ sung …»", "Không còn dòng thiếu (hoặc vừa được tự bổ sung)."],
            ["Một báo cáo tôi nộp không nằm trong số «báo cáo đã gửi»", "Tài liệu tải thẳng lên thư mục không đi qua luồng gửi nên không tính; hãy nộp ở menu «Báo cáo»."],
            ["Dòng Form 0 không vào sổ", "Đó là bảng quyết định chờ Tổng giám đốc; vào sổ khi Tổng giám đốc giao việc, màn chỉ đếm ở «chờ TGĐ quyết định»."],
            ["«Lỗi ghi sổ» không hết sau khi bổ sung", "Đây là lỗi hệ thống chứ không phải thiếu quy tắc; giữ nguyên và báo người phụ trách hệ thống."],
          ],
        },
      ],
    },
  ],
  canCu: "Đối chiếu bằng quy tắc lấy việc hiện hành, không dùng AI (chốt 29/09/2026); tự chạy hằng ngày và khi đổi cài đặt; tự bổ sung nếu cài đặt «Tự bổ sung việc thiếu vào sổ cái» bật (mục nhắc việc).",
};
