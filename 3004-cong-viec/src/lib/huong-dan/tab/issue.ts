// Hướng dẫn bản 2 (tab) — màn Cảnh báo của agent Công việc (/cay-viec/issue). Viết lại 20/10/2026 (nhóm A3) theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/cay-viec/issue/IssueView.tsx (4 tab CAC_TAB_MAN_ISSUE, câu tổng, hàng đếm, Phạm vi, TheIssue) · PhaiIssue.tsx (cột phải) · KhoiViecIssue.tsx (khối dưới thẻ)
// · lib/cay-viec/issue (nhãn tab, trạng thái, quyền) · sinh.ts (luật 1 và 4: thẻ gom theo người = thẻ NHẮC) · nhom5.ts:126 (AI đề xuất, chỉ chạy khi người bấm).
// Hướng dẫn con: issue-qua-han · issue-xong-giay · issue-nguoi-them · issue-de-xuat-ai · issue-them · issue-nguong · cay-viec-o-giao-sua.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo — vấn đề máy phát hiện, người xử lý",
  ai: "Vào được khi có quyền xem sổ cái. «Giao việc» và «Sửa» cần quyền «Giao việc»; «+ Thêm issue» cần quyền «Sửa việc»; «🤖 Chạy AI đề xuất» và sửa ngưỡng cần quyền «Duyệt gắn WBS». Quản trị luôn được hết. Người không có quyền sẽ không thấy các nút đó (riêng agent Công việc: nút không có quyền thì ẨN).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Issue là gì?",
          doan: [
            "ISSUE là một VẤN ĐỀ cần xử lý của dự án: người tồn nhiều việc quá hạn, việc báo xong nhưng tiến độ không động, hoặc điều gì đó người ta tự ghi vào. Mỗi vấn đề là một THẺ có mức nghiêm trọng, phân tích, ảnh hưởng đến ngày hoàn thành mục tiêu của dự án (COD) và đề xuất cách xử lý.",
            "Hình dung màn Cảnh báo như bảng đèn cảnh báo của dự án: máy soi sổ việc, chỗ nào vượt ngưỡng thì bật đèn thành thẻ. Hết vi phạm thì máy tự hạ đèn, rồi đóng.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Không ai soát từng việc mỗi ngày được; issue gom lại những chỗ cần mắt người.",
            "Thẻ cho biết vấn đề đó đang đẩy lùi ngày phát điện bao nhiêu ngày (số không cộng dồn giữa các thẻ) để biết nên xử lý cái nào trước.",
            "Từ thẻ có thể giao việc xử lý ngay (với thẻ chưa là việc) hoặc mở việc cũ để nhắc người đang giữ (với thẻ đã là việc).",
          ],
        },
        {
          tieuDe: "Cách vào",
          doan: ["Từ menu «Dự án», bấm biểu tượng «!» trong vòng tròn bên phải ô dự án. Màn mở theo đúng dự án đó; trên thanh trên có ô chọn dự án để đổi. Dự án chưa có cây WBS bên agent Tiến độ thì không có biểu tượng, và màn báo «chưa có cây WBS — bộ sinh không chạy»."],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của màn Cảnh báo"],
            ["Trước", "Người nhận làm việc, báo xong; báo cáo tuần được nộp", "Cung cấp dữ liệu: việc nào quá hạn, việc nào xong, sự cố nào được báo"],
            ["Phát hiện", "Máy soi sổ việc mỗi khi mở màn", "Sinh thẻ"],
            ["Màn này", "Giao việc, mở việc cũ, bỏ qua", "Xử lý thẻ"],
            ["Sau", "Việc xong thì máy tự hạ rồi đóng thẻ", "Xem lại ở «Đã đóng — xem lại»"],
          ],
        },
        {
          tieuDe: "④ Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem hướng dẫn"],
            ["Hàng 4 tab: «⏰ Quá hạn ≥ N ngày» · «📄 Xong trên giấy» · «👤 Issue do người thêm» · «🤖 Đề xuất chờ duyệt»", "Mỗi tab một nguồn sinh thẻ", "① Bốn tab và các hướng dẫn riêng từng tab"],
            ["Câu tổng: «N issue đang mở, M nghiêm trọng…»", "Biết quy mô", "② Đọc thẻ"],
            ["Hàng đếm: «N issue đang mở · M 🔴», «cần giao · việc đã có (nhắc)», «Hiện lại bỏ qua (N)», «Phạm vi»", "Tách loại và xem lại thẻ đã bỏ qua", "③ · ⑤"],
            ["Từng thẻ + khối xử lý ngay dưới thẻ", "Đọc và xử lý", "② · ③"],
            ["Cột phải: chi tiết thẻ, ô sửa việc, form thêm issue, ngưỡng", "Làm việc sâu", "④ Cột phải"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc · giao việc · sửa việc soạn sẵn · mở việc cũ để nhắc · bỏ qua · thêm issue tay · sửa ngưỡng · bấm «🤖 Chạy AI đề xuất»", "Người quyết xử lý hay bỏ"],
            ["MÁY", "Soi sổ việc, đối chiếu cây WBS bên agent Tiến độ, tính ngày quá hạn, ảnh hưởng COD, mức đỏ vàng · tự hạ qua các bậc «Hết vi phạm → Chờ ổn định 2 tuần → Đã đóng» · gom thẻ theo người · soạn sẵn nội dung việc giao · kiểm quyền", "Cùng sổ thì cùng thẻ. Issue máy sinh thì CHỈ MÁY đóng"],
            ["🤖 AI", "🤖 Tab «Đề xuất chờ duyệt»: đọc bảng sự cố và cảnh báo của báo cáo đã nộp trong 28 ngày, đề xuất issue kèm câu nguyên văn nguồn", "🤖 Bắt buộc trích nguyên văn (máy gắn trích dẫn, AI chỉ trỏ số câu); người quyết giao hay bỏ"],
            ["🤖 AI", "🤖 Với thẻ đầu việc găng (hiện ở Cây việc, không ở màn này): gợi ý người nhận việc giao", "🤖 Có thể sai; người đổi được"],
            ["🤖 AI", "🤖 Xét xem việc sắp giao có TRÙNG việc các agent khác đã soạn không", "🤖 Chỉ báo, bạn vẫn quyết"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Máy soi sổ việc mỗi lần mở màn và sinh thẻ cho ba tab đầu (không cần AI).",
            "Muốn thêm gợi ý từ báo cáo: người sang tab «🤖 Đề xuất chờ duyệt» và bấm «🤖 Chạy AI đề xuất». AI đọc bảng sự cố, cảnh báo rồi đề xuất thẻ (mỗi lượt mất 1–3 phút).",
            "Người đọc từng thẻ. Thẻ đáng làm thì bấm «Giao việc» (hoặc «Sửa» rồi giao); không đáng thì «Bỏ qua».",
            "Máy hỏi các agent khác xem có trùng không; trùng thì báo, người quyết «Vẫn giao việc riêng» hay thôi.",
            "Chỉ cú bấm «Giao việc» của người mới tạo việc trong sổ cái. AI không tự giao.",
          ],
          ai: [
            "🤖 Mở màn KHÔNG gọi AI. AI chỉ chạy khi người bấm «🤖 Chạy AI đề xuất».",
            "🤖 Thẻ do AI viết có 🤖 trước tiêu đề và phần phân tích. Câu trích nguyên văn do máy lấy, không gắn 🤖.",
            "Mất kết nối AI: tab 🤖 báo lỗi ở cột phải; các tab khác và việc giao tay vẫn dùng bình thường.",
          ],
        },
      ],
    },
    {
      ten: "① Bốn tab",
      khoi: [
        {
          tieuDe: "Bốn tab, bốn nguồn",
          bang: [
            ["Tab", "Thẻ sinh khi nào", "Ai đóng", "Khối dưới thẻ"],
            ["⏰ Quá hạn ≥ N ngày", "Một người có việc quá hạn từ N ngày trở lên và việc đã có mã WBS ĐÃ DUYỆT của dự án (mặc định N = 7). Gom theo người: một thẻ cho mỗi người", "Máy", "Mở việc cũ · Bỏ qua"],
            ["📄 Xong trên giấy", "Việc báo HOÀN THÀNH có mã WBS đã duyệt, mà tiến độ bên agent Tiến độ vẫn 0% và không có báo cáo ngày trong ±K ngày quanh ngày xong (mặc định K = 7). Gom theo người", "Máy", "Mở việc cũ · Bỏ qua"],
            ["👤 Issue do người thêm", "Người bấm «+ Thêm issue». Vào sổ ngay, hiệu lực ngay", "Máy tự đóng khi việc đã giao xong", "Giao việc · Sửa · Bỏ qua"],
            ["🤖 Đề xuất chờ duyệt", "Khi người bấm «🤖 Chạy AI đề xuất». Thẻ ghi «Chờ duyệt — chưa vào sổ»", "Người", "Giao việc · Sửa · Bỏ qua"],
          ],
          luuY: [
            "Số trong ngoặc cạnh tên tab là số issue đang mở của tab đó. Tên tab ghi đúng ngưỡng đang áp (sửa ngưỡng thì tên đổi theo).",
            "Dòng nhỏ dưới hàng đếm luôn nói máy đang chạy bằng ngưỡng nào, để không phải đoán.",
            "Thẻ «đầu việc găng chưa ai nhận» KHÔNG hiện ở màn này mà ở «Cây việc & đường găng» (dòng CHƯA AI ĐƯỢC GIAO). Tab đề xuất tắc cũng đã bỏ vì agent Công việc không có nguồn này.",
            "Khi bạn chuyển tab, nút «? Hướng dẫn» đổi sang hướng dẫn của tab đó; hướng dẫn chung này vẫn mở được bằng hàng chọn đầu khung.",
          ],
          viDu: ["Tình huống minh hoạ: tab «⏰ Quá hạn ≥ 7 ngày (2)» có hai thẻ. Một thẻ ghi «Chị A tồn 3 việc quá hạn ≥ 7 ngày — lâu nhất 12 ngày»; thẻ kia ghi «2 việc quá hạn ≥ 7 ngày CHƯA GIAO CHO AI». Hai thẻ cho hai cách xử lý khác nhau: nhắc Chị A, và tìm người chủ trì cho hai việc mồ côi."],
        },
      ],
    },
    {
      ten: "② Đọc thẻ",
      khoi: [
        {
          tieuDe: "Câu tổng",
          doan: ["Câu đầu màn có cấu trúc: «N issue đang mở, M nghiêm trọng. Nặng nhất đẩy ngày phát điện K ngày: <tên thẻ>. Còn X issue chưa ai nhận xử lý. Y issue đã mở quá 3 tuần». Chữ đỏ là mức nghiêm trọng. Không còn thẻ nào mở thì ghi «Không còn issue nào đang mở»."],
          luuY: ["Số ngày ảnh hưởng KHÔNG cộng dồn giữa các issue: thẻ nằm trong chuỗi lan truyền của thẻ khác không tính lại; các chuỗi độc lập chạy song song nên chuỗi dài nhất mới quyết định ngày phát điện."],
        },
        {
          tieuDe: "Một thẻ gồm gì (đủ 9 phần)",
          bang: [
            ["Phần", "Nghĩa"],
            ["Mức · mã · tiêu đề", "Mức nghiêm trọng (Nghiêm trọng đỏ, Cần xem vàng, Bình thường xanh), mã thẻ; 🤖 đứng trước nếu do AI viết"],
            ["Phân tích", "Vì sao thành vấn đề; thẻ gom theo người thì mỗi việc một dòng"],
            ["Trích nguyên văn", "Câu gốc trong báo cáo (máy trích)"],
            ["Ảnh hưởng COD", "«+N ngày» đẩy lùi ngày hoàn thành mục tiêu của dự án, hoặc «chưa lấy được», hoặc «(không trên đường găng)»"],
            ["Nguồn", "Dữ liệu lấy từ đâu"],
            ["Dòng «🤖 Đề xuất:»", "Cách xử lý nên làm. Ở thẻ do máy sinh (tab ⏰ và 📄) đây là câu mẫu cố định của máy, không phải AI viết; ở thẻ do AI đề xuất (tab 🤖) là chữ AI viết. Thẻ thiếu đề xuất hoặc thiếu ảnh hưởng COD thì không được hiện"],
            ["Thiếu dữ liệu", "Chỗ máy chưa biết thì nói thẳng, có dấu ⚠"],
            ["Điều kiện và Xử lý", "Hai trục trạng thái, xem bảng dưới"],
          ],
          luuY: [
            "Màu đỏ ở mọi nơi trên màn này chỉ dành cho Issue.",
            "Thẻ vàng mở 3 tuần mà chưa ai động thì tự lên đỏ. Không mở trùng thẻ cho cùng một đối tượng.",
          ],
        },
        {
          tieuDe: "Hai trục trạng thái",
          bang: [
            ["Trục", "Các giá trị", "Ai đổi"],
            ["Điều kiện", "«Đang vi phạm» · «Hết vi phạm» · «Chờ ổn định 2 tuần» · «Đã đóng»", "Thẻ máy sinh: máy giữ. Thẻ người thêm: người giữ"],
            ["Xử lý", "«Chưa ai động» · «Đã tiếp nhận» · «Đã giao việc» · «Đang xử lý»", "Luôn do người ghi (giao việc thì tự chuyển «Đã giao việc»)"],
          ],
          viDu: ["Tình huống minh hoạ: thẻ ghi «Điều kiện: Hết vi phạm (máy giữ)». Nghĩa là Chị A đã làm xong các việc quá hạn. Máy chờ ổn định 2 tuần; nếu không tái phạm, thẻ tự đóng. Bạn không cần làm gì."],
        },
      ],
    },
    {
      ten: "③ Hai loại thẻ",
      khoi: [
        {
          tieuDe: "Mỗi thẻ thuộc một trong hai loại",
          bang: [
            ["Loại", "Là gì", "Khối dưới thẻ có gì", "Thường gặp ở tab"],
            ["Chưa là việc", "Vấn đề mới, chưa ai được giao xử lý", "Việc soạn sẵn: «Tên việc», «Giao cho», «Thuộc dự án», «Hạn», «Kết quả cần có». Nút «Giao việc» · «Sửa» · «Bỏ qua»", "👤 và 🤖"],
            ["Đã là việc", "Đã giao việc, hoặc issue NHẮC việc cũ đã có trong sổ (gom theo người)", "Ghi «Issue nhắc — việc đã có trong sổ cái, không giao thêm». Nút «Mở việc cũ CV-…» (mở thẻ việc ở thẻ trình duyệt mới) và «Bỏ qua». Nhắc người giữ việc bằng ý kiến có @ ngay trong việc", "⏰ và 📄"],
          ],
          luuY: ["Máy từ chối giao việc mới cho thẻ nhắc: việc đã có người giữ nên giao thêm là trùng."],
        },
        {
          tieuDe: "Giao việc từ thẻ chưa là việc",
          bam: [
            "Đọc việc soạn sẵn: «Tên việc», «Hạn», «Kết quả cần có». Dòng «Giao cho» ban đầu thường để trống («chưa chọn — chọn ở ô bên dưới») vì thẻ này chưa có ai giữ.",
            "Chọn người hoặc đơn vị ở ô chọn cạnh nút «Giao việc» (cách dùng ô này xem hướng dẫn «Ô giao việc khi bấm Sửa»).",
            "Kiểm «Hạn». Hạn đã qua thì không giao được; bấm «Sửa» chọn hạn mới.",
            "Bấm «Giao việc». Nếu có việc gần giống đang mở, thẻ hiện dòng 🤖 báo trùng kèm nút «Vẫn giao việc riêng».",
          ],
          ketQua: [
            "Việc thật được tạo trong sổ cái với người giao là bạn; thẻ chuyển «Xử lý: Đã giao việc» và hiện «✓ Đã giao việc CV-…» (bấm mở việc ở Sơ đồ tổ chức). Việc xong thì máy tự đóng issue.",
            "«Sửa» mở ô giao việc ở cột phải, cùng bản nháp với khối dưới thẻ; sửa xong bấm «Giao việc» hoặc «Huỷ sửa».",
          ],
          ai: [
            "🤖 Việc AI làm ở đây: AI của các agent khác xét trùng. Với thẻ đầu việc găng ở Cây việc, AI còn chọn sẵn người nhận.",
            "Người kiểm: chọn đúng người nhận; đọc dòng báo trùng trước khi bấm «Vẫn giao việc riêng».",
          ],
          viDu: ["Tình huống minh hoạ: ở tab «👤 Issue do người thêm» có thẻ «Thiếu hồ sơ nghiệm thu móng». Bạn chọn «Phòng Kỹ thuật» ở ô chọn người nhận, giữ hạn soạn sẵn, bấm «Giao việc». Thẻ hiện «✓ Đã giao việc CV-…», tab giảm một thẻ cần giao."],
        },
      ],
    },
    {
      ten: "④ Cột phải",
      khoi: [
        {
          tieuDe: "Bấm gì thì cột phải hiện gì",
          bang: [
            ["Bấm", "Cột phải hiện", "Xem hướng dẫn"],
            ["Chưa chọn gì", "Tổng quan: số đang mở theo tab, số đo lượt sinh gần nhất (các dòng ⭕ ⏰ 📄 ↩), hướng dẫn «Bấm vào đâu» và «Nguyên tắc màn Cảnh báo»", "—"],
            ["Một thẻ (bấm cả thẻ)", "Chi tiết: mức, điều kiện, xử lý, ảnh hưởng COD, mở từ, người mở, mã WBS, phân tích, 🤖 đề xuất, lịch sử ghi nhận", "—"],
            ["«Sửa» ở khối dưới thẻ", "Ô giao việc điền sẵn", "«Ô giao việc khi bấm Sửa»"],
            ["«+ Thêm issue»", "Form thêm issue", "«Thêm issue do người nhập»"],
            ["«Sửa ngưỡng của tab này →» / «Xem ngưỡng và vết sửa →»", "Khung ngưỡng N · M · K và vết sửa", "«Ngưỡng của bộ sinh issue»"],
            ["«🤖 Chạy AI đề xuất»", "Kết quả lượt chạy AI", "Issue tab «Đề xuất chờ duyệt»"],
          ],
          viDu: ["Tình huống minh hoạ: bạn bấm một thẻ ở tab ⏰. Cột phải hiện chi tiết: mức Nghiêm trọng, Điều kiện «Đang vi phạm (máy giữ)», Ảnh hưởng COD, Mở từ ngày nào, và Phân tích đầy đủ từng việc trễ. Muốn nhắc, bạn quay sang khối dưới thẻ bấm «Mở việc cũ CV-…»."],
        },
      ],
    },
    {
      ten: "⑤ Bỏ qua và Đã đóng",
      khoi: [
        {
          tieuDe: "Bỏ qua",
          doan: [
            "«Bỏ qua» nghĩa là «issue này không cần giao việc, không cần xử lý». Thẻ rời danh sách và KHÔNG tính vào số đang mở. Lệnh chỉ nhớ 30 ngày: quá 30 ngày mà vấn đề còn thì thẻ hiện lại như thường.",
            "Muốn xem lại: bấm «Hiện lại bỏ qua (N)» ở hàng đếm; danh sách đổi thành các thẻ đã bỏ qua trong 30 ngày (mọi tab), bấm «Hiện lại» dưới thẻ để đưa về chỗ cũ. Bấm «Về danh sách issue» để thoát.",
          ],
          luuY: ["Màn này không có chữ «Xoá». Thẻ do máy sinh tự đóng khi hết vi phạm."],
          viDu: ["Tình huống minh hoạ: thẻ nhắc Chị A tồn việc quá hạn nhưng bạn đã nhắn riêng và chị cam kết nộp trong tuần. Bạn bấm «Bỏ qua». Thẻ biến mất khỏi số đang mở. 30 ngày sau, nếu chị vẫn còn việc quá hạn, thẻ tự hiện lại."],
        },
        {
          tieuDe: "Phạm vi",
          bang: [
            ["Nút", "Cho xem"],
            ["«Chỉ issue của Agent Công việc»", "Mặc định. Issue các agent khác sinh ra xem ở màn Cảnh báo của Main"],
            ["«Đã đóng — xem lại»", "Issue đã đóng, chỉ đọc"],
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
            ["Màn báo «chưa có cây WBS»", "Dự án chưa khai «Mã bên Tiến độ» ở Cài đặt hoặc bên agent Tiến độ chưa có cây. Bộ sinh không chạy."],
            ["Thẻ «Quá hạn ≥ N ngày» không hiện dù có việc trễ", "Chỉ sinh khi việc đã gắn mã WBS ĐÃ DUYỆT. Việc do AI gắn mà chưa ai duyệt không tính. Xem hướng dẫn «Gán mã WBS bằng AI»."],
            ["Câu «Bộ sinh đang chạy — hỏi agent Tiến độ…»", "Máy đang lấy cây WBS và tiến độ. Chờ vài giây tới vài chục giây."],
            ["Muốn nhắc người giữ việc", "Bấm «Mở việc cũ CV-…», trong thẻ việc gõ ý kiến có @ để người đó nhận chuông."],
            ["Không có nút «Giao việc»", "Bạn thiếu quyền «Giao việc» (nút ẩn), hoặc đây là thẻ nhắc (không giao việc mới)."],
            ["Không thấy nút «🤖 Chạy AI đề xuất»", "Chỉ hiện ở tab «🤖 Đề xuất chờ duyệt» và với người có quyền «Duyệt gắn WBS»."],
            ["Muốn xem issue của cả công ty", "Màn Cảnh báo của Main tổng hợp cả 5 agent."],
            ["Đường /issue hoặc /qua-han cũ", "Đã bỏ: tự chuyển về Sơ đồ tổ chức. Việc quá hạn xem bằng nút «Quá hạn» ở Sơ đồ."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (chép màn Cảnh báo của agent Base), 06–07/10/2026 (khuôn Issue hai loại: chỉ hai loại, Bỏ qua 30 ngày, bỏ nút Ghi nhận/Đóng/Ẩn/Xoá/Duyệt) · luật 18 (đỏ dành riêng cho Issue) · luật 28 (chữ thuần không khoanh) · luật 33 (hỏi trùng trước khi soạn việc) · luật 17 riêng 3004 (nút không quyền thì ẨN).",
};
