// Hướng dẫn bản 2 (tab) — Báo cáo tuần, nút «Cần BLĐ ra quyết định» (t2). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/phong/BaoCaoTuanPhong.tsx (khối t2: dongCq, hang, nutNhac, oYKien, phanTrang) · lib/bao-cao-tuan/can-quyet.ts (đọc kiến nghị và Form 0, bỏ việc xong, bỏ việc dưới độ khó vừa)
// · lib/bao-cao-tuan/can-quyet-ai.ts (AI đọc dòng máy chưa chắc) · lib/bao-cao-tuan/viet.ts (AI viết câu vì sao nghẽn) · app/api/bao-cao-tuan/thao-tac/route.ts (Nhắc: Ban lãnh đạo hoặc Quản trị).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tuần — nút «Cần BLĐ ra quyết định»: kiến nghị chờ quyết và điểm nóng",
  ai: "Mọi người có quyền xem sổ cái đều đọc được. Nút «Giao việc» ở dòng chưa có việc chỉ hiện nếu bạn có quyền giao việc tới đơn vị của dòng đó; không có quyền thì dòng chỉ ghi «chưa có việc». Nút «Nhắc» chỉ Ban lãnh đạo và Quản trị thấy; người khác sẽ không thấy nút này.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: [
            "Gom những chỗ Ban lãnh đạo cần ra quyết định: các dòng kiến nghị trong báo cáo MỚI NHẤT của từng đơn vị, và các quyết định ghi ở Form 0. Máy đọc báo cáo, đối chiếu với sổ cái xem mỗi dòng đã có việc xử lý chưa, và cho bạn giao việc hoặc nhắc ngay tại dòng đó.",
            "Dưới là mục «Điểm nóng»: các việc nghẽn nhất của tuần.",
          ],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Đơn vị viết kiến nghị trong báo cáo nhưng không ai chắc lãnh đạo đã đọc và đã giao người làm chưa. Tab này nối kiến nghị với việc trong sổ cái: dòng nào chưa có việc thì hiện nút «Giao việc», dòng nào đã có việc thì hiện việc đó.",
            "Tab chỉ để Ban lãnh đạo đọc, nên việc đã xong, việc đã đóng và việc dễ hoặc rất dễ được ẩn đi để không thành rác thông tin.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của tab này"],
            ["Trước", "Đơn vị nộp báo cáo tuần ở «Báo cáo», có dòng kiến nghị", "Nguồn của các dòng ở tab"],
            ["Tab này", "Ban lãnh đạo đọc, giao việc cho kiến nghị chưa có người làm, nhắc việc đang chạy", "Quyết định và theo dõi"],
            ["Sau", "Việc mới vào sổ cái, hiện ở Sơ đồ tổ chức và Việc của tôi của người nhận", "Người nhận làm việc"],
          ],
        },
        {
          tieuDe: "④ Tab có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Đầu khối «Cần BLĐ ra quyết định»: tóm tắt «N dòng: A chưa có việc · B đang chạy · đã ẩn …»", "Biết có bao nhiêu dòng và vì sao một số bị ẩn", "① Dòng kiến nghị"],
            ["Từng dòng kiến nghị (5 dòng một trang, số trang ở chân)", "Giao việc, nhắc, xem báo cáo gốc", "① Dòng kiến nghị · ② Giao và nhắc"],
            ["Khối «Điểm nóng»", "Các việc nghẽn nhất, kèm câu AI giải thích vì sao nghẽn", "③ Điểm nóng"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc, bấm «Giao việc», viết ý kiến rồi «Gửi», bấm «Nhắc»", "Người quyết giao hay nhắc"],
            ["MÁY", "Đọc dòng kiến nghị và Form 0 trong báo cáo; đối chiếu với sổ cái (tên giống từ 0,9 trở lên thì coi là cùng việc); ẩn việc xong và việc dễ; xếp điểm nóng theo «nợ quá hạn»", "Luật cố định, cùng báo cáo cùng kết quả"],
            ["🤖 AI", "🤖 Khi máy chưa chắc một dòng đã có việc chưa: đọc nền và trả lời «có» (kèm mã việc) hoặc «không»", "🤖 Chỉ chọn trong ứng viên máy đưa; ngoài danh sách coi như không khớp"],
            ["🤖 AI", "🤖 Viết câu «vì sao nghẽn» ở mỗi điểm nóng", "🤖 Chỉ dùng số máy đã tính"],
          ],
          ai: [
            "🤖 Dòng có chữ «🤖 đang đọc xem đã có việc chưa…» là AI đang xét nền. Màn tự hỏi lại tối đa 6 lần, mỗi 20 giây; xong thì dòng đổi thành «có thể là CV-…» hoặc hiện việc đã khớp.",
            "🤖 AI KHÔNG tạo việc, không đổi hạn. Bạn vẫn là người bấm «Giao việc».",
            "Người kiểm: bấm tên đơn vị ở dòng để mở báo cáo gốc, dòng kiến nghị được khoanh cam. Mất kết nối AI: dòng giữ nguyên «có thể là …» của máy hoặc «chưa có việc»; bạn tự quyết giao hay không.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "MÁY", "Đọc kiến nghị và Form 0 trong báo cáo các đơn vị, đối chiếu sổ cái"],
            ["2", "🤖 AI", "🤖 Với dòng máy chưa chắc, đọc nền để kết luận đã có việc hay chưa"],
            ["3", "NGƯỜI", "Ban lãnh đạo đọc; bấm «Giao việc» cho dòng chưa có việc; viết ý kiến hoặc bấm «Nhắc» cho việc đang chạy"],
            ["4", "MÁY", "Ghi việc mới vào sổ cái, gắn việc với dòng kiến nghị, gửi chuông cho bên chủ trì"],
          ],
        },
      ],
    },
    {
      ten: "① Dòng kiến nghị",
      khoi: [
        {
          tieuDe: "Mỗi dòng cho biết gì",
          bang: [
            ["Trường hợp", "Màn hiện", "Bên phải dòng"],
            ["Chưa có việc", "Tên dòng kiến nghị (Form 0 thì có chữ «Form 0 ·» đứng đầu), dòng «Kiến nghị: …», tên đơn vị nộp (bấm mở báo cáo gốc), có thể có «mức độ …»", "«Giao việc»; hoặc dòng «chưa có việc» nếu bạn không có quyền giao. Nếu máy ngờ đã có việc: «có thể là CV-…» bấm mở việc"],
            ["Đang chạy", "Ô việc rút gọn như ở Sơ đồ tổ chức, bấm tên mở việc ở cột phải", "Ô ý kiến có gõ @ gọi người, nút 📎, nút «Gửi» và nút «Nhắc»"],
            ["Đã xong hoặc đã đóng", "Không hiện (đã ẩn); chỉ còn trong con số «đã ẩn …» ở tiêu đề", "—"],
          ],
          viDu: ["Phòng Tài chính kế toán nộp báo cáo tuần có dòng kiến nghị xin Ban lãnh đạo quyết phương án cấp vốn (tình huống minh hoạ). Nếu sổ cái chưa có việc nào cùng nội dung, dòng này hiện «Giao việc». Nếu đã có một việc cùng nội dung, dòng hiện việc đó kèm ô ý kiến, và bạn chỉ cần «Nhắc» hay viết ý kiến."],
          luuY: [
            "Mỗi trang 5 dòng; bấm số trang để sang trang khác. «Xem cả N việc bên phải →» đưa tất cả việc đang chạy sang cột phải.",
            "Một việc chỉ hiện ở MỘT nơi: việc đã nằm ở khối trên thì không lặp lại ở «Điểm nóng».",
          ],
        },
      ],
    },
    {
      ten: "② Giao và nhắc",
      khoi: [
        {
          tieuDe: "Giao việc cho dòng chưa có việc",
          bam: [
            "Ở dòng «chưa có việc», bấm «Giao việc»: cột phải mở form giao việc, nội dung điền sẵn bằng tên dòng kiến nghị (xem hướng dẫn «Giao việc từ Báo cáo tuần»).",
            "Chọn bên nhận, ghi hạn, bấm «Giao việc» trong form.",
            "Máy tạo việc, gắn với dòng kiến nghị; dòng đó lập tức chuyển sang nhóm «đang chạy» và hiện việc vừa tạo.",
          ],
          viDu: ["Kiến nghị xin quyết định chọn nhà cung cấp, bạn bấm «Giao việc», chọn giao cho phòng phụ trách mua sắm, hạn là ngày họp tới. Giao xong cột phải mở ngay việc mới; người nhận thấy việc ở Việc của tôi và nhận chuông."],
        },
        {
          tieuDe: "Nhắc việc đang chạy",
          bam: [
            "Ở dòng có việc đang chạy, gõ ý kiến vào ô (gõ @ để gọi người liên quan, @@ để tìm thêm người), có thể kèm tệp bằng nút 📎.",
            "Bấm «Gửi» để lưu ý kiến như bình luận của việc; hoặc bấm «Nhắc» để gửi chuông nhắc bên chủ trì, kèm lời nhắn đang gõ nếu có.",
            "Dòng đã nhắc đổi thành «✓ Đã nhắc» để không nhắc trùng.",
          ],
          luuY: ["Nút «Nhắc» chỉ Ban lãnh đạo và Quản trị thấy. Điểm nóng chỉ có ô ý kiến và «Nhắc», không có «Giao việc» vì việc đã tồn tại."],
        },
      ],
    },
    {
      ten: "③ Điểm nóng",
      khoi: [
        {
          tieuDe: "Khối «Điểm nóng»",
          doan: [
            "MÁY xếp các việc nghẽn nhất theo «nợ quá hạn» = điểm khó nhân hệ số trễ. Hệ số trễ mặc định: trễ đến 7 ngày thì ×1, đến 30 ngày thì ×2, hơn nữa thì ×3 (khai ở Cài đặt, Báo cáo tuần).",
            "Dưới mỗi việc là một câu 🤖 AI giải thích vì sao nghẽn. Việc dễ hoặc rất dễ và việc đã hiện ở khối kiến nghị phía trên được ẩn.",
          ],
          viDu: ["Một việc khó (8 điểm) đã quá hạn 10 ngày: 10 ngày nằm giữa 7 và 30 nên hệ số ×2, nợ quá hạn = 8 × 2 = 16 điểm. Một việc rất khó (13 điểm) quá hạn 3 ngày chỉ có nợ 13 × 1 = 13 điểm, nên xếp sau việc kia. Nghĩa là trễ lâu và việc khó đều làm điểm nóng tăng."],
          ai: [
            "🤖 Câu «vì sao nghẽn» do AI viết từ số máy đã tính (việc, đơn vị chủ trì, số ngày quá hạn), không do máy suy đoán.",
            "Người kiểm: bấm tên việc để đọc diễn biến ở cột phải, rồi quyết nhắc hay không.",
          ],
          luuY: ["Ở khối này, Ban lãnh đạo còn thấy thêm «độ khó N · nợ M điểm» ở dòng nhỏ dưới mỗi việc; người khác không thấy phần này."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Màn ghi «Đang đọc kiến nghị trong các báo cáo…» lâu", "Máy đang đọc báo cáo của các đơn vị. Chờ vài giây; nếu quá lâu, tải lại trang"],
            ["Ghi «Tuần N không có kiến nghị nào cần BLĐ quyết»", "Báo cáo các đơn vị không có dòng kiến nghị hoặc tất cả đã xong, đã bị ẩn"],
            ["Dòng ghi «🤖 đang đọc xem đã có việc chưa…» mãi", "AI đang xét nền; màn hỏi lại tối đa 6 lần. Hết lượt thì giữ kết quả của máy"],
            ["Không thấy dòng kiến nghị mình viết", "Việc đã xong, đã đóng hoặc ở mức dễ, rất dễ nên bị ẩn; xem con số «đã ẩn …» ở tiêu đề"],
            ["Không thấy nút «Giao việc», chỉ có «chưa có việc»", "Đơn vị của dòng đó ngoài phạm vi quyền giao việc của bạn. Nhờ người có quyền giao"],
            ["Giao việc xong mà dòng vẫn «chưa có việc»", "Hiếm, do mạng. Tải lại trang để máy đối chiếu lại"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 02/10/2026: tab dành cho Ban lãnh đạo đọc, bỏ việc đã xong, bỏ việc dễ hoặc rất dễ, mỗi việc chỉ hiện một nơi, nút Nhắc cùng cỡ nút Gửi · hệ số trễ theo Cài đặt (7 và 30 ngày) · luật 19 (🤖 đứng trước nội dung do AI viết).",
};
