// Hướng dẫn bản 2 (tab) — khung phải «Đầu việc WBS» + khối giao việc «⭕ CHƯA AI ĐƯỢC GIAO» (và thẻ Issue găng dưới dòng đầu việc). Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/PhaiCayViec.tsx (KhungNut, KhoiGiao) · CayGiaiDoan.tsx (KhoiChuaGiao, KhoiChuaGiaoCu) · issue/KhoiViecIssue.tsx (khối dưới thẻ)
// · app/api/cay-viec/soan-giao/route.ts:119 (AI chọn người nhận) · lib/cay-viec/hoi-trung.ts:55 (AI phán trùng). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Một đầu việc WBS và giao việc",
  ai: "Xem đầu việc: mọi người xem được màn. Khối giao («🤖 Xem việc AI soạn sẵn», «Giao việc», «Sửa», «Bỏ qua», «Việc này không cần giao trong agent Công việc») cần quyền «Giao việc»; người không có quyền chỉ thấy dòng chữ «CHƯA AI ĐƯỢC GIAO», không thấy nút.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: [
            "Khi bấm một dòng đầu việc trên cây, cột phải hiện «Đầu việc WBS»: ngày theo tiến độ, % hoàn thành, có nằm trên đường găng không, nhà thầu, bao nhiêu việc đang treo. Nếu đây là đầu việc găng đã tới lúc giao mà chưa có việc nào treo, ngay dưới có khối giao việc «⭕ CHƯA AI ĐƯỢC GIAO».",
            "Đây là chỗ biến một lỗ hổng («đầu việc găng chưa ai nhận») thành một việc có người nhận: AI soạn sẵn, bạn kiểm, bạn bấm giao.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Đầu việc găng chưa ai nhận là nơi dự án dễ trễ nhất; giao sớm bằng một cú bấm thay vì họp bàn ai làm.",
            "AI đã xem lịch sử loại việc này thường do ai làm nên gợi ý có căn cứ; máy hỏi các agent khác để khỏi giao trùng việc người khác đã soạn.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của khung này"],
            ["Trước", "Cây việc báo đầu việc găng chưa ai nhận (thẻ «Việc găng CHƯA GIAO», dòng «CHƯA AI ĐƯỢC GIAO»)", "Chỉ ra đầu việc cần giao"],
            ["Khung này", "Soạn sẵn → kiểm → giao", "Màn bạn đang xem"],
            ["Sau", "Người nhận thấy việc ở «Việc của tôi» và chuông; việc hiện ở Sơ đồ tổ chức; đầu việc hết đỏ", "Theo dõi ở Sơ đồ và Cây việc"],
          ],
        },
        {
          tieuDe: "④ Khung có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Bảng «Đầu việc WBS»: Baseline · Hoàn thành · Đường găng · Nhà thầu · Việc chưa xong gán vào nút này · Đầu việc con", "Biết đầu việc đang thế nào", "① Đọc đầu việc"],
            ["«Việc treo vào nút» với «▸ N việc đã xong»", "Xem các việc đang gắn vào đầu việc", "① Đọc đầu việc"],
            ["Khối «⭕ CHƯA AI ĐƯỢC GIAO»", "Soạn và giao việc", "② Soạn sẵn · ③ Kiểm và giao"],
            ["Thẻ Issue ngay dưới dòng đầu việc trên cây", "Cách giao thứ hai, cùng kết quả", "④ Giao từ dòng trên cây"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm «🤖 Xem việc AI soạn sẵn» · đổi người nhận · «Sửa» · bấm «Giao việc» · «Bỏ qua» · «Việc này không cần giao trong agent Công việc»", "Người quyết giao hay không và giao cho ai"],
            ["MÁY", "Điền tên việc, hạn (ngày xong theo tiến độ của đầu việc), kết quả cần có mặc định · lọc danh sách người nhận theo quyền của bạn · chặn giao khi hạn đã qua · tạo việc trong sổ cái và treo vào mã WBS · gửi chuông cho người nhận", "Cùng đầu vào thì cùng nội dung soạn sẵn"],
            ["🤖 AI", "🤖 Chọn người hoặc đơn vị nhận, kèm câu căn cứ, bằng cách rà lịch sử loại việc này thường ai làm và chức năng từng đơn vị", "🤖 Chỉ được chọn người hoặc đơn vị có trong danh sách máy đưa; chọn ngoài danh sách thì bị bỏ"],
            ["🤖 AI", "🤖 Xét xem việc sắp giao có TRÙNG việc các agent khác đã soạn không", "🤖 Chỉ báo; bạn vẫn quyết"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người bấm dòng đầu việc găng trống trên cây. Cột phải hiện đầu việc và khối «⭕ CHƯA AI ĐƯỢC GIAO».",
            "Người bấm «🤖 Xem việc AI soạn sẵn». Máy hỏi các agent khác có trùng việc không.",
            "🤖 AI chọn người nhận và viết câu căn cứ. Máy điền tên việc, hạn, kết quả cần có.",
            "Người đọc khung «🤖 AI soạn sẵn — chưa gửi đi đâu cả», đổi người nhận ở ô chọn hoặc bấm «Sửa» để chỉnh mọi ô.",
            "Người bấm «Giao việc». Chỉ lúc này máy mới tạo việc thật. AI không bao giờ tự ghi.",
          ],
          ai: [
            "🤖 AI chạy khi bạn bấm «🤖 Xem việc AI soạn sẵn», mất vài giây đến vài chục giây; màn ghi «🤖 Đang rà lịch sử xem loại việc này thường ai làm…».",
            "Mất kết nối AI: khối báo lý do; bạn bấm «Sửa» hoặc chọn người ở ô chọn rồi giao tay.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc đầu việc",
      khoi: [
        {
          tieuDe: "Bảng «Đầu việc WBS»",
          bang: [
            ["Dòng", "Nghĩa"],
            ["Baseline", "Khoảng ngày theo tiến độ gốc của đầu việc, kèm số ngày (ví dụ khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy»)"],
            ["Hoàn thành", "% hoàn thành của đầu việc (con số về khối lượng, không dùng để nói nhanh hay chậm)"],
            ["Đường găng", "«trên đường găng» (chữ đỏ) hoặc «không»"],
            ["Nhà thầu", "Nhà thầu phụ trách theo tiến độ"],
            ["Việc chưa xong gán vào nút này", "Số việc trong sổ cái đã treo vào đầu việc, chưa xong"],
            ["Đầu việc con", "Chỉ hiện khi đầu việc có con"],
          ],
          luuY: ["Nguồn các số này là agent Tiến độ (ghi ở dòng nhỏ dưới bảng). Muốn số mới nhất, bấm «Hỏi lại» ở đầu màn."],
        },
        {
          tieuDe: "«Việc treo vào nút»",
          doan: ["Danh sách các việc chưa xong đang gắn vào đầu việc; chữ xanh «▸ N việc đã xong» đóng sẵn, bấm mới mở. Bấm một dòng việc để xem chi tiết (xem hướng dẫn «Chi tiết một việc và mã WBS»)."],
          viDu: ["Tình huống minh hoạ: đầu việc «7.2.3 Thi công san nền» ghi «Đường găng: trên đường găng», «Việc chưa xong gán vào nút này: 0» và hiện khối ⭕. Nghĩa là găng mà chưa ai nhận."],
        },
      ],
    },
    {
      ten: "② Soạn sẵn",
      khoi: [
        {
          bam: [
            "Trong khối «⭕ CHƯA AI ĐƯỢC GIAO» bấm «🤖 Xem việc AI soạn sẵn». (Hoặc từ dòng trên cây bấm cùng nút — cột phải tự soạn.)",
            "Chờ dòng «🤖 Đang rà lịch sử xem loại việc này thường ai làm…».",
            "Khung «🤖 AI soạn sẵn — chưa gửi đi đâu cả» hiện: Tên việc · Giao cho (kèm câu căn cứ nghiêng) · Thuộc dự án · Hạn (ngày xong theo tiến độ) · Kết quả cần có.",
          ],
          ketQua: [
            "Chưa có gì được ghi vào sổ cái. Khung chỉ là bản nháp.",
            "Nếu có việc gần giống đã được agent khác soạn, hiện dòng «🤖 …» báo trùng kèm nút «Vẫn soạn việc riêng». Bấm nút đó nếu bạn chắc việc của mình khác.",
          ],
          ai: [
            "🤖 AI nhận tên đầu việc, hạn, dự án, danh sách người và đơn vị bạn được phép giao, lịch sử loại việc tương tự.",
            "🤖 AI trả MỘT người hoặc đơn vị nhận và câu căn cứ; có thể kèm đơn vị phối hợp và lãnh đạo phụ trách ghi trong phần căn cứ. Các mục này chỉ là chữ gợi ý, không tự thành việc.",
            "Người kiểm: đọc câu căn cứ, xem người đó có đúng chức năng không.",
          ],
          luuY: ["Đầu việc găng chưa tới lúc giao (xa hơn cửa sổ giao, mặc định 7 ngày) thì ẩn hẳn khối này: việc chưa cần làm thì không hiện."],
          viDu: ["Tình huống minh hoạ: bạn bấm «🤖 Xem việc AI soạn sẵn» ở đầu việc «7.2.3 Thi công san nền». Khung hiện Tên việc «[tên dự án] Xử lý 7.2.3 — Thi công san nền», Giao cho một đơn vị kèm câu căn cứ, Hạn là ngày xong theo tiến độ của đầu việc. Chưa có gì được ghi vào sổ cho tới khi bạn bấm «Giao việc»."],
        },
      ],
    },
    {
      ten: "③ Kiểm và giao",
      khoi: [
        {
          tieuDe: "Hàng nút dưới khung soạn sẵn",
          bang: [
            ["Nút / ô", "Làm gì"],
            ["Ô chọn người nhận (đã chọn sẵn người AI gợi ý)", "Bấm chọn người khác hoặc đơn vị khác; chọn là áp dụng và đóng ngay. Cách dùng ô này xem hướng dẫn «Ô giao việc khi bấm Sửa»"],
            ["«Giao việc»", "Tạo việc thật trong sổ cái, treo vào mã WBS của đầu việc. Mờ khi hạn đã qua"],
            ["«Sửa»", "Mở ô giao việc ngay tại cột phải, mọi ô điền sẵn để chỉnh tên việc, kết quả cần có, hạn, đính kèm"],
            ["«Bỏ qua»", "Đóng khung soạn sẵn, không làm gì"],
          ],
          ketQua: [
            "Máy tạo việc với người giao là bạn, gửi chuông cho người nhận, và hiện «✓ Đã tạo việc CV-… trong sổ cái — cây bên trái đã đọc lại». Bấm mã việc để xem chi tiết.",
            "Đầu việc không còn đỏ «CHƯA AI ĐƯỢC GIAO» sau lần đọc lại.",
          ],
          luuY: [
            "Hạn là ngày xong theo tiến độ của đầu việc. Nếu ngày đó đã qua, máy chặn nút «Giao việc» và ghi «Hạn dd/mm/yyyy đã qua — bấm Sửa chọn hạn mới rồi mới giao được».",
            "Nếu máy báo trùng: đọc kỹ rồi mới bấm «Vẫn giao việc riêng». Giao thêm khi việc đã có người làm là tạo việc thừa.",
          ],
          viDu: ["Tình huống minh hoạ: AI gợi ý giao cho đơn vị X vì hai việc cùng loại trước đây do đơn vị X làm. Bạn biết lần này đơn vị Y có nhân lực hơn, bạn mở ô chọn người nhận, chọn đơn vị Y rồi bấm «Giao việc». Dòng căn cứ vẫn ghi người chọn tay."],
        },
        {
          tieuDe: "Khi đầu việc không cần giao trong agent Công việc",
          bam: ["Bấm «Việc này không cần giao trong agent Công việc» (có ở khối ⭕ khi chưa soạn)."],
          ketQua: ["Máy nhớ đầu việc đó; nó thôi tính vào thẻ «Việc găng CHƯA GIAO» và vào Issue. Có dòng «Bỏ đánh dấu» nếu bấm nhầm."],
        },
      ],
    },
    {
      ten: "④ Giao từ dòng trên cây",
      khoi: [
        {
          tieuDe: "Thẻ Issue găng ngay dưới dòng",
          doan: [
            "Dưới dòng đầu việc có «CHƯA AI ĐƯỢC GIAO», cây hiện luôn thẻ Issue của đầu việc đó và khối giao việc soạn sẵn y như ở màn Cảnh báo (Giao việc · Sửa · Bỏ qua). Cùng kết quả với giao ở cột phải, chỉ là gọn hơn khi giao nhiều đầu việc liên tiếp.",
            "Ở khối này 🤖 AI chọn sẵn người nhận cho từng thẻ, lần lượt từng thẻ một; máy nhớ kết quả nên lần mở sau không gọi AI lại. Chưa soạn xong thì khối ghi «Đang soạn sẵn việc giao…».",
          ],
          luuY: ["Bấm «Sửa» ở khối này thì ô giao việc mở ở cột phải (hướng dẫn «Ô giao việc khi bấm Sửa»). Nếu chưa đọc được thẻ Issue thì dòng hiện lại hai nút cũ «🤖 Xem việc AI soạn sẵn» và «Việc này không cần giao trong agent Công việc»."],
          viDu: ["Tình huống minh hoạ: dưới ba dòng đầu việc găng liên tiếp đều có thẻ Issue và khối soạn sẵn. Bạn đọc từng khối, giữ người AI chọn ở hai khối, đổi người ở khối thứ ba bằng ô chọn rồi bấm «Giao việc» ba lần, không cần mở cột phải."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Chỉ thấy chữ «CHƯA AI ĐƯỢC GIAO», không có nút", "Bạn thiếu quyền «Giao việc»; nút ẩn với người không có quyền."],
            ["Không có khối giao dù đầu việc găng", "Đầu việc đã có việc treo, hoặc đã đánh dấu không cần giao, hoặc chưa tới lúc giao (xa hơn cửa sổ giao), hoặc là đầu việc tổng có con."],
            ["Nút «Giao việc» mờ", "Hạn đã qua: bấm «Sửa» chọn hạn mới."],
            ["Người AI gợi ý không đúng", "Đổi ở ô chọn người nhận, hoặc bấm «Sửa»."],
            ["Máy báo việc đã được agent khác soạn", "Luật hỏi trùng. Mở việc kia xem; nếu thật sự khác thì bấm «Vẫn soạn việc riêng» hoặc «Vẫn giao việc riêng»."],
            ["Giao rồi mà đầu việc vẫn đỏ", "Bấm «Hỏi lại». Việc phải được duyệt mã mới tính là đã giao; giao từ khối này thì tự gắn mã nên thường hết đỏ ngay."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 04–06/10/2026 (khuôn giao việc: ô trình bày một khối chữ, ngoài ô chọn người nhận · Giao việc · Sửa · Bỏ qua; thẻ Issue găng ngay dưới dòng đầu việc) · luật 32 (việc chưa tới lúc giao thì ẩn) · luật 33 (hỏi trùng) · luật 31 (khoảng ngày kèm số ngày).",
};
