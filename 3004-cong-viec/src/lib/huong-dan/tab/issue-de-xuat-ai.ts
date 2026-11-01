// Hướng dẫn bản 2 (tab) — màn Cảnh báo, tab «🤖 Đề xuất chờ duyệt» và nút «🤖 Chạy AI đề xuất». Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/issue/IssueView.tsx (chayAi, dòng gợi ý của tab «ai») · PhaiIssue.tsx (kết quả «🤖 Chạy AI đề xuất») · lib/cay-viec/issue/nhom5.ts:126 (AI đọc báo cáo, SO_NGAY_DOC = 28)
// · nhom5-thuan.ts (BANG_NHOM5, xayTheNhom5: trích nguyên văn do máy gắn, ảnh hưởng COD do máy tính) · KhoiViecIssue.tsx (Giao việc · Sửa · Bỏ qua). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo tab «Đề xuất chờ duyệt» — AI đọc báo cáo, đề xuất vấn đề",
  ai: "Mọi người có quyền xem sổ cái đều đọc được thẻ. Nút «🤖 Chạy AI đề xuất» cần quyền «Duyệt gắn WBS» (người khác sẽ không thấy nút). «Giao việc» và «Sửa» cần quyền «Giao việc».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: [
            "Báo cáo tuần và báo cáo tháng của các đơn vị có hai bảng ghi sự cố và cảnh báo bằng chữ: «Thiết bị & bảo trì — sự cố» và «Cảnh báo đầu tư – tư vấn – thi công». Máy không hiểu được chữ tự do, nhưng AI thì đọc được. Tab «🤖 Đề xuất chờ duyệt» là chỗ AI đọc hai bảng đó rồi đề xuất thành thẻ issue.",
            "AI chỉ ĐỀ XUẤT. Thẻ ghi «Chờ duyệt — chưa vào sổ» cho tới khi người xử lý: đáng làm thì «Giao việc», không đáng thì «Bỏ qua».",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Có vấn đề người ta đã viết trong báo cáo nhưng không ai đọc kỹ; AI đọc hết và nhắc cho bạn.",
            "Mỗi thẻ AI đưa ra đều kèm câu NGUYÊN VĂN trong báo cáo để bạn đối chiếu, không phải tin AI mù quáng.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của tab"],
            ["Trước", "Các đơn vị nộp báo cáo tuần, tháng (màn Báo cáo)", "Cho ra chữ để AI đọc"],
            ["Tab này", "🤖 AI đề xuất → người xét", "Màn bạn đang xem"],
            ["Sau", "Thẻ đáng làm được giao việc; việc xong thì thẻ hạ và đóng", "Việc ở Sơ đồ tổ chức"],
          ],
        },
        {
          tieuDe: "④ Tab có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Nút «🤖 Chạy AI đề xuất»", "Gọi AI đọc báo cáo. Khi chạy ghi «🤖 AI đang đọc…»"],
            ["Dòng giới thiệu", "«AI đọc bảng Sự cố · Cảnh báo của báo cáo tuần/tháng đã nộp · bắt buộc trích nguyên văn câu chữ nguồn · thẻ đủ 9 phần. Đáng làm thì Giao việc, không thì Bỏ qua»"],
            ["Thẻ đề xuất", "Có 🤖 trước tiêu đề và phân tích, dòng «Chờ duyệt — chưa vào sổ», câu trích nguyên văn nghiêng, đề xuất, ảnh hưởng COD"],
            ["Khối dưới thẻ", "«Giao việc» · «Sửa» · «Bỏ qua»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm «🤖 Chạy AI đề xuất» · đọc thẻ, đối chiếu câu nguyên văn · giao việc hoặc bỏ qua", "Người quyết"],
            ["MÁY", "Gom các dòng của hai bảng trong báo cáo đã nộp trong 28 ngày gần nhất · gắn câu NGUYÊN VĂN vào thẻ · bỏ dòng AI trả mà thiếu căn cứ hoặc thiếu đề xuất · tính ảnh hưởng COD từ đường găng · tránh trùng thẻ đang mở", "Câu trích và phép tính ảnh hưởng COD do máy làm, không do AI"],
            ["🤖 AI", "🤖 Đọc từng câu nguồn, phân loại vấn đề, chọn mức đỏ hoặc vàng, viết tiêu đề, phân tích và đề xuất, gắn vào đầu việc WBS gần nhất", "🤖 Có thể sai hoặc hiểu nhầm; người đối chiếu câu nguyên văn"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người sang tab «🤖 Đề xuất chờ duyệt» và bấm «🤖 Chạy AI đề xuất» (mỗi lượt 1–3 phút).",
            "Máy gom câu nguồn từ hai bảng của các báo cáo đã nộp; 🤖 AI đọc và đề xuất.",
            "Máy kiểm: bỏ dòng thiếu căn cứ hoặc thiếu đề xuất, gắn câu nguyên văn, tính ảnh hưởng COD.",
            "Cột phải báo kết quả: số câu nguồn, số đề xuất mới, số dòng bị loại. Thẻ mới hiện trong tab.",
            "Người đọc từng thẻ và quyết giao việc hoặc bỏ qua.",
          ],
          ai: [
            "🤖 AI chỉ chạy khi NGƯỜI bấm nút, vì mỗi lượt mất vài phút. Mở màn không gọi AI.",
            "🤖 AI không tự chép câu nguồn (máy gắn câu thật vào thẻ), không tự tính ảnh hưởng COD, không tự giao việc.",
            "Mất kết nối AI: cột phải ghi «🤖 Chưa gọi được AI: …»; các tab khác không ảnh hưởng.",
          ],
        },
      ],
    },
    {
      ten: "① Chạy AI đề xuất",
      khoi: [
        {
          bam: [
            "Mở tab «🤖 Đề xuất chờ duyệt».",
            "Bấm «🤖 Chạy AI đề xuất» (góc phải hàng tab; chỉ hiện với người có quyền «Duyệt gắn WBS»).",
            "Chờ: nút ghi «🤖 AI đang đọc…», cột phải ghi «🤖 AI đang đọc bảng Sự cố / Cảnh báo của các báo cáo đã nộp… (có thể mất 1–3 phút)».",
          ],
          ketQua: [
            "Cột phải ghi: «🤖 AI đọc N báo cáo đã nộp trong 28 ngày (M của đơn vị quản lý / Ban điều hành dự án): K câu nguồn → L đề xuất mới», có thể kèm «(X dòng bị loại vì thiếu căn cứ / đề xuất)».",
            "Nếu hai bảng không có dòng nào của dự án, màn ghi không có dòng Sự cố / Cảnh báo nào; không gọi AI.",
            "Chưa kết nối AI thì ghi «Chưa kết nối AI — vào Cài đặt › Kết nối › AI rồi thử lại.»",
          ],
          luuY: ["Chạy nhiều lần không sinh thẻ trùng: máy bỏ đề xuất trùng nội dung với thẻ AI đang mở."],
          viDu: ["Tình huống minh hoạ: sau khi các đơn vị nộp báo cáo tuần, bạn bấm «🤖 Chạy AI đề xuất». Sau vài phút cột phải ghi có đề xuất mới. Bạn mở tab và thấy hai thẻ 🤖: một về sự cố máy biến áp, một về hồ sơ xin phép chậm."],
        },
      ],
    },
    {
      ten: "② Đọc và xét thẻ",
      khoi: [
        {
          bang: [
            ["Phần của thẻ", "Ai viết", "Cách kiểm"],
            ["🤖 Tiêu đề và phân tích", "🤖 AI", "Đọc có khớp với câu nguyên văn không"],
            ["Câu trích nguyên văn (chữ nghiêng, trong ngoặc kép)", "Máy trích từ báo cáo", "Đây là sự thật gốc; đối chiếu bản báo cáo qua dòng «Nguồn» (tên báo cáo, kỳ, bảng, dòng)"],
            ["Ảnh hưởng COD", "Máy tính", "Có «+N ngày» nếu đầu việc nằm trên đường găng; không thì «(không trên đường găng)» hoặc ghi thiếu dữ liệu ⚠"],
            ["Dòng «🤖 Đề xuất:»", "🤖 AI", "Có hợp lý và làm được không"],
            ["Mức (Nghiêm trọng / Cần xem)", "🤖 AI chọn", "Người xét lại khi đọc thẻ"],
          ],
          luuY: ["Thẻ ghi «Chờ duyệt — chưa vào sổ». Màn hiện chỉ còn «Giao việc», «Sửa», «Bỏ qua»; không có nút Duyệt hay Bác bỏ riêng."],
          viDu: ["Tình huống minh hoạ: thẻ 🤖 «Máy biến áp phát tiếng ồn bất thường». Câu nguyên văn trong báo cáo: «Thiết bị: máy biến áp T1 — mô tả: có tiếng ồn khi tải cao». Ảnh hưởng COD «(không trên đường găng)». Bạn xét thấy cần theo dõi nên bấm «Giao việc» cho đơn vị vận hành."],
        },
      ],
    },
    {
      ten: "③ Giao hoặc bỏ qua",
      khoi: [
        {
          bam: [
            "Đáng làm: ở khối dưới thẻ chọn người nhận, bấm «Giao việc» (hoặc «Sửa» để chỉnh, xem hướng dẫn «Ô giao việc khi bấm Sửa»).",
            "Không đáng: bấm «Bỏ qua» (nhớ 30 ngày, xem lại bằng «Hiện lại bỏ qua»).",
          ],
          ketQua: ["Giao: việc thật được tạo trong sổ cái, thẻ chuyển «Đã giao việc». Bỏ qua: thẻ rời danh sách và không tính vào số đang mở."],
          luuY: ["Máy hỏi các agent khác trước khi giao; nếu đã có việc giống thì hiện dòng 🤖 báo trùng và nút «Vẫn giao việc riêng»."],
          viDu: ["Tình huống minh hoạ: thẻ 🤖 về hồ sơ xin phép chậm. Bạn chọn Phòng Pháp lý ở ô chọn người nhận và bấm «Giao việc». Máy báo «đã có việc giống do agent Pháp lý soạn». Bạn mở xem, thấy cùng một hồ sơ nên thôi, bấm «Bỏ qua» thẻ này."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «🤖 Chạy AI đề xuất»", "Nút chỉ có ở tab này và với người có quyền «Duyệt gắn WBS»."],
            ["Chạy xong mà không có thẻ mới", "Không có dòng sự cố, cảnh báo mới của dự án trong 28 ngày, hoặc đã có thẻ trùng đang mở, hoặc AI bị loại hết vì thiếu căn cứ."],
            ["Thẻ thiếu đầu việc WBS", "AI không gắn được vào cây; ảnh hưởng COD ghi 0 kèm cảnh báo ⚠."],
            ["Cột phải ghi «Chưa gọi được AI»", "Mất kết nối AI. Thử lại sau; các tab khác vẫn dùng."],
            ["Câu nguyên văn lệch với báo cáo", "Không nên xảy ra vì máy gắn câu từ báo cáo; nếu thấy, báo qua nút «Góp ý»."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (nhóm 5: AI đề xuất, ba luật cứng: trích nguyên văn, đủ 9 phần, chỉ là đề xuất), 07/10/2026 (AI chỉ đọc bảng Cảnh báo và Sự cố; bỏ Duyệt/Bác bỏ, dùng Giao việc · Bỏ qua) · phân vai AI của dự án: AI chỉ đề xuất, người quyết · luật 19 (🤖 đứng trước nội dung AI viết).",
};
