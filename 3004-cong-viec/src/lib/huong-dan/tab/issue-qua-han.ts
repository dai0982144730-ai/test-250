// Hướng dẫn bản 2 (tab) — màn Cảnh báo, tab «⏰ Quá hạn ≥ N ngày». Viết 20/10/2026 (nhóm A3).
// Căn cứ code: lib/cay-viec/issue/sinh.ts (luật 1: gom theo người, mức đỏ khi có việc găng) · nhãn tab và nguồn máy ở lib/cay-viec/issue · components/cay-viec/issue/KhoiViecIssue.tsx (KhoiNhacViecCu) · IssueView.tsx (nguongDangDung).
// Tab này KHÔNG dùng AI. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo tab «Quá hạn» — người tồn việc trễ",
  ai: "Mọi người có quyền xem sổ cái đều đọc được. «Bỏ qua» và các nút trên thẻ cần quyền xem; sửa ngưỡng N cần quyền «Duyệt gắn WBS» (người khác xem được ngưỡng và vết sửa nhưng không sửa). Nút không có quyền thì ẨN.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: [
            "Tab «⏰ Quá hạn ≥ N ngày» (mặc định N = 7) gom những NGƯỜI đang tồn việc trễ hạn lâu. Máy xét từng việc trong sổ cái: việc đang mở, đã gắn mã WBS ĐÃ DUYỆT của dự án, quá hạn từ N ngày trở lên. Rồi GOM THEO NGƯỜI chủ trì: mỗi người một thẻ, kể hết các việc trễ của người đó.",
            "Việc nào không ai chủ trì thì gom vào một thẻ riêng ghi «… việc quá hạn ≥ N ngày CHƯA GIAO CHO AI».",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Việc trễ nằm rải rác khó thấy; gom theo người cho biết nhắc ai, nhắc một lần cho cả loạt việc.",
            "Thẻ đỏ khi trong đó có việc trên đường găng: trễ chuỗi này là lùi ngày hoàn thành mục tiêu của dự án.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của tab"],
            ["Trước", "Việc được giao, được gắn mã WBS đã duyệt, đến hạn mà chưa xong", "Cho ra dữ liệu"],
            ["Tab này", "Máy báo người nào đang tồn việc; bạn mở việc cũ để nhắc", "Màn bạn đang xem"],
            ["Sau", "Người đó làm hoặc báo xong; hết trễ thì thẻ tự hạ rồi đóng", "Thẻ về «Đã đóng»"],
          ],
        },
        {
          tieuDe: "④ Tab có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Mỗi thẻ", "Một người (hoặc nhóm chưa giao ai) với danh sách việc quá hạn: mã việc, tên, số ngày trễ, hạn, mã WBS, «(găng)», số ngày nằm im"],
            ["Màu thẻ", "Đỏ nếu có việc găng; vàng nếu không. Vàng mà mở 3 tuần chưa ai động thì tự lên đỏ"],
            ["Khối dưới thẻ", "«Issue nhắc — việc đã có trong sổ cái, không giao thêm», nút «Mở việc cũ CV-…» và «Bỏ qua»"],
            ["Dòng ngưỡng", "«Ngưỡng đang áp: quá hạn ≥ N ngày và có mã WBS ĐÃ DUYỆT…» và «Sửa ngưỡng của tab này →»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc thẻ · mở việc cũ để nhắc · bỏ qua nếu đã xử lý bên ngoài · sửa ngưỡng N", "Người quyết nhắc ai và nhắc thế nào"],
            ["MÁY", "Đếm ngày quá hạn · gom theo người · tính ảnh hưởng COD · quyết mức đỏ vàng · tự hạ và đóng khi hết trễ · chỉ MÁY đóng được thẻ này", "Cùng sổ thì cùng thẻ"],
            ["🤖 AI", "Tab này KHÔNG dùng AI", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Không có bước AI. Máy sinh thẻ mỗi lần mở màn; người đọc và nhắc người giữ việc. Việc xong thì máy tự đóng thẻ."],
        },
      ],
    },
    {
      ten: "① Đọc thẻ",
      khoi: [
        {
          tieuDe: "Một thẻ quá hạn",
          bang: [
            ["Phần", "Ví dụ cấu trúc"],
            ["Tiêu đề", "«<Người> tồn K việc quá hạn ≥ N ngày — lâu nhất D ngày · G việc trên găng»"],
            ["Phân tích", "Mỗi việc một dòng: «• CV-… tên việc — quá hạn D ngày · hạn dd/mm/yyyy · mã <WBS và tên> (găng) · nằm im X ngày»"],
            ["Ảnh hưởng COD", "Lớn nhất trong các việc găng của người đó; việc không găng thì «(không trên đường găng)»"],
            ["Dòng «🤖 Đề xuất:»", "Câu mẫu cố định của máy (không phải AI viết): hỏi người đó một lượt cho cả loạt việc, bắt đầu từ việc lâu nhất"],
          ],
          luuY: ["Thẻ chỉ liệt kê tối đa một số việc đầu; còn lại ghi «… và N việc nữa (xem Cây việc, lọc theo người)»."],
          viDu: ["Tình huống minh hoạ: thẻ đỏ «Anh B tồn 3 việc quá hạn ≥ 7 ngày — lâu nhất 12 ngày · 1 việc trên găng». Bạn đọc dòng việc găng trước vì chính nó kéo lùi ngày hoàn thành mục tiêu."],
        },
      ],
    },
    {
      ten: "② Nhắc người giữ việc",
      khoi: [
        {
          bam: [
            "Dưới thẻ bấm «Mở việc cũ CV-…» (mỗi việc một nút). Việc mở ở thẻ trình duyệt mới.",
            "Trong thẻ việc, gõ ý kiến có @ trước tên người giữ việc để họ nhận chuông.",
            "Việc nào xong thật thì nhờ người đó bấm «Xong việc»; việc còn dở thì hỏi chỗ tắc và ghi vào bình luận.",
          ],
          ketQua: ["Người được nhắc thấy tin ở chuông và ở «Việc của tôi». Khi hết việc trễ, thẻ ở tab chuyển «Hết vi phạm», chờ ổn định 2 tuần rồi tự đóng."],
          luuY: ["Thẻ nhắc không giao việc mới (máy từ chối) vì việc đã có người giữ. Việc không có chủ trì thì mở việc, bấm cây bút ✎ chọn người chủ trì."],
          viDu: ["Tình huống minh hoạ: bạn mở việc cũ của Anh B và gõ «@Anh B việc này còn chờ hồ sơ của bên nào, anh ghi rõ giúp để em theo dõi». Anh B nhận chuông, trả lời ngay trong việc."],
        },
        {
          tieuDe: "Khi không cần xử lý",
          bam: ["Bấm «Bỏ qua» nếu bạn đã trao đổi ngoài hệ thống và chấp nhận trễ."],
          ketQua: ["Thẻ rời danh sách, không tính vào số đang mở, nhớ trong 30 ngày. Xem lại bằng «Hiện lại bỏ qua (N)»."],
        },
      ],
    },
    {
      ten: "③ Ngưỡng N",
      khoi: [
        {
          doan: ["N là số ngày quá hạn tối thiểu để lên thẻ, mặc định 7, dùng chung mọi dự án. Dòng chữ nhỏ trên màn luôn nói máy đang chạy bằng N nào. Người có quyền «Duyệt gắn WBS» sửa ở «Sửa ngưỡng của tab này →»; người khác bấm «Xem ngưỡng và vết sửa →» chỉ đọc. Xem hướng dẫn «Ngưỡng của bộ sinh issue»."],
          viDu: ["Tình huống minh hoạ: dự án muốn bắt sớm hơn, quản trị đổi N từ 7 xuống 3. Máy chạy lại ngay; tên tab đổi thành «⏰ Quá hạn ≥ 3 ngày» và có thêm thẻ cho những người trễ 3–6 ngày."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Việc trễ nhưng không có thẻ", "Chỉ xét việc đã có mã WBS ĐÃ DUYỆT. Duyệt mã trước (hướng dẫn «Gán mã WBS bằng AI»), hoặc việc chưa tới N ngày trễ."],
            ["Không có nút «Giao việc»", "Thẻ này là thẻ nhắc: việc đã có người giữ nên không giao thêm. Dùng «Mở việc cũ»."],
            ["Thẻ vẫn còn dù việc đã xong", "Máy chờ ổn định 2 tuần mới đóng. Điều kiện ghi «Hết vi phạm» hoặc «Chờ ổn định 2 tuần»."],
            ["Muốn đóng thẻ ngay", "Màn không có nút Đóng với thẻ máy sinh. Dùng «Bỏ qua» nếu không muốn thấy nữa."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (chép màn Cảnh báo của agent Base: luật 1 quá hạn ≥ N ngày) và 04–07/10/2026 (thẻ gom theo người, khuôn Issue hai loại) · luật 35 (trễ tính bằng ngày, không bằng %) · luật 28 (chữ thuần không khoanh).",
};
