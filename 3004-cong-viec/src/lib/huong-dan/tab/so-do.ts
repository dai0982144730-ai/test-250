// Hướng dẫn bản 2 (tab) — màn Sơ đồ (gồm thẻ việc /cong-viec/<mã> chuyển về đây). Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (sân, cột phải, DongViec, GiaoViec, HopNhac) · components/phong/viec.ts (NUT_LOC, PHAM_VI_TIM, nutXong, tình trạng việc)
// · lib/so-cai/lanh-dao-phoi-hop.ts (AI gắn lãnh đạo phối hợp) · lib/gan-wbs/gan-wbs.ts · lib/so-cai/ai-doc-bao-cao.ts. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Sơ đồ tổ chức — ai đang giữ việc gì, việc nào quá hạn, giao việc",
  ai: "Mọi người đăng nhập đều xem. Nút «＋» giao việc chỉ hiện ở ô mà bạn được giao tới (theo quyền «Giao việc»); nút «Xong việc», «Gia hạn», «Hủy việc», «Mở lại», «＋ Phối hợp», cây bút ✎ chỉ hiện khi bạn có quyền tương ứng — không có quyền thì nút ẨN hẳn (riêng 3004).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì?",
          doan: [
            "Sơ đồ tổ chức là bức tranh của cả công ty: mỗi ô là một đơn vị (Ban lãnh đạo, các phòng, ban điều hành dự án…), nối với nhau theo cấp quản lý. Trên mỗi ô ghi số việc đơn vị đó đang giữ và bao nhiêu việc trễ.",
            "Bấm vào một ô thì cột bên phải liệt kê đúng các việc của ô đó và các đơn vị bên dưới. Từ đây bạn xem việc, giao việc mới, báo xong việc, gia hạn, hủy, và đọc báo cáo tuần mà đơn vị đã nộp.",
          ],
        },
        {
          tieuDe: "Vì sao phải có?",
          ds: [
            "Lãnh đạo không phải hỏi từng phòng «anh đang làm gì»: nhìn sơ đồ là biết đơn vị nào đang dồn việc, đơn vị nào đang trễ.",
            "Một việc chỉ có MỘT nơi sống duy nhất (sổ cái công việc). Giao ở đâu, sửa ở đâu thì mọi màn khác (Việc của tôi, Báo cáo tuần, chuông) cùng thấy.",
            "Báo cáo tuần của từng đơn vị và các việc máy lọc ra từ báo cáo nằm cùng một màn, mở ra đối chiếu được ngay.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Sơ đồ tổ chức"],
            ["① Giao việc", "Lãnh đạo, trưởng đơn vị giao việc", "Bấm «＋» trên ô để giao"],
            ["② Làm việc", "Người nhận làm, báo xong, xin gia hạn", "Mở việc ở cột phải để cập nhật"],
            ["③ Báo cáo tuần", "Mỗi đơn vị nộp báo cáo tuần (menu «Báo cáo»)", "Biểu tượng quyển sổ trên ô: xem báo cáo hoặc nhắc nộp"],
            ["④ Lãnh đạo xem", "Họp giao ban, soát tình hình", "Các nút «Quá hạn», «Tuần …», «30 ngày», «Tôi giao / Tôi nhận / Cần phối hợp»"],
          ],
        },
        {
          tieuDe: "Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng chú giải trên đầu: «cấp 1» … «cấp 4 · Ban điều hành», «đã nộp», «quá hạn / đã nhắc nộp»", "Giải thích màu ô và biểu tượng", "① Đọc sơ đồ"],
            ["Hàng nút: «Tuần N: xong … · mới …» · «30 ngày: …» · «Quá hạn · N» · ba nút «Tôi giao» / «Tôi nhận» / «Cần phối hợp»", "Lọc việc theo tình trạng hoặc theo vai của tôi", "② Lọc việc"],
            ["Sân sơ đồ: ô đơn vị, đường nối", "Chọn đơn vị; bấm đường nối để soát báo cáo tuần các đơn vị cấp dưới", "① · ⑥"],
            ["Cột phải: tiêu đề đường đi, ô tìm, danh sách việc theo nhóm", "Xem, tìm, mở việc", "③ Cột việc"],
            ["Trong việc đã mở: nút «Xong việc» · «Gia hạn» · «＋ Phối hợp» · «Hủy việc» · «Mở lại», bình luận", "Làm việc với một việc", "④ Một việc"],
            ["Form «Giao việc cho …» (khi bấm «＋»)", "Giao việc mới", "⑤ Giao việc"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Giao việc · báo xong · gia hạn (có thể không ghi lý do) · hủy việc (bắt buộc lý do) · mở lại việc đã xong (bắt buộc lý do) · mời phối hợp · bình luận · bấm «Nhắc nộp báo cáo»", "Người quyết mọi thay đổi của việc"],
            ["MÁY", "Đếm số việc trên ô, tính «quá hạn N ngày» / «còn N ngày», xếp việc theo hạn, đánh dấu ! đường găng (hỏi agent Tiến độ), kiểm quyền từng nút, tự hiện dấu ! đỏ trên ô khi đơn vị quá hạn nộp báo cáo, gửi chuông", "Cùng dữ liệu thì luôn ra cùng sơ đồ"],
            ["🤖 AI", "🤖 Khi đơn vị nộp báo cáo tuần, AI đọc phần lời văn để tìm thêm việc nằm NGOÀI các bảng việc; người nộp tích chọn thì việc mới vào sổ cái (việc trong bảng do máy tách, không phải AI)", "🤖 AI có thể sót hoặc hiểu sai; việc luôn mang câu «lọc ra từ hệ thống báo cáo tuần N» để mở bản gốc, dòng được khoanh cam, đối chiếu"],
            ["🤖 AI", "🤖 Gắn «lãnh đạo phối hợp» cho việc chưa có: AI đọc tên việc, đơn vị chủ trì, dự án, phân công Ban lãnh đạo rồi chọn MỘT lãnh đạo", "🤖 Máy kiểm mã lãnh đạo có thật; người có quyền «Sửa việc» đổi được ở cây bút ✎"],
            ["🤖 AI", "🤖 Gắn việc vào mã WBS (cây việc của agent Tiến độ; kết quả thấy ở màn «Cây việc & đường găng») và xếp việc vào 6 giai đoạn quản lý dự án (thấy ở menu «Dự án»)", "🤖 Chỉ là đề xuất kèm lý do; người sửa thì kết quả của người thắng, AI không xếp lại"],
          ],
          ai: [
            "🤖 Việc chạy nền, định kỳ vài phút một lượt, không cần ai bấm. Khi AI lỗi, hệ thống nghỉ 30 phút rồi thử lại.",
            "🤖 AI không tự giao việc, không tự xoá, không tự đổi hạn.",
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: đơn vị nộp báo cáo tuần ở menu «Báo cáo». MÁY: tách các việc nằm trong bảng; 🤖 AI: đọc phần lời văn tìm thêm việc ngoài bảng và đề xuất; NGƯỜI nộp tích chọn việc nào vào sổ cái.",
            "NGƯỜI: lãnh đạo, trưởng đơn vị giao việc bằng dấu «＋». MÁY: kiểm phạm vi, tạo việc, gửi chuông.",
            "🤖 AI (nền, vài phút một lượt): với việc đã vào sổ, gắn một «lãnh đạo phối hợp», gắn mã WBS, và nếu việc thuộc dự án thì xếp giai đoạn. Tất cả chỉ là đề xuất kèm lý do.",
            "NGƯỜI: bạn xem ở cột việc. Đúng thì để, sai thì sửa bằng cây bút ✎ hoặc ô giai đoạn; người sửa thì AI không làm lại.",
          ],
          luuY: ["Khi AI lỗi, hệ thống nghỉ 30 phút rồi thử lại; trong lúc đó việc vẫn hiện bình thường, chỉ chưa có phần AI gắn."],
        },
        {
          tieuDe: "Các hướng dẫn riêng cho khung mở từ nút",
          ds: [
            "Giao việc bằng dấu «＋»: «Giao việc cho một ô trên Sơ đồ tổ chức».",
            "Đọc một việc: «Thẻ một việc»; các nút: «Báo xong việc», «Gia hạn, phối hợp, hủy, mở lại, giao lại», «Sửa việc»; trao đổi: «Bình luận trong việc».",
            "Báo cáo tuần: «Xem báo cáo tuần của một đơn vị», «Soát báo cáo các đơn vị gửi lên và nhắc nộp», «Hộp báo cáo gốc».",
            "Hai nút «Tuần N», «30 ngày»: «Xem việc đã xong». Khi khung đang mở, bấm «? Hướng dẫn» sẽ ra hướng dẫn của khung đó; đầu khung có hàng chọn để đổi sang hướng dẫn khác.",
          ],
        },
        {
          tieuDe: "Thứ tự xem gợi ý",
          bam: [
            "Nhìn sân: ô nào có «N trễ» đỏ thì bấm vào.",
            "Đọc cột phải từ trên xuống: việc trễ nằm đầu mỗi nhóm.",
            "Mở một việc, đọc bình luận, nhắn người giữ việc nếu cần.",
            "Thấy ô nào chưa nộp báo cáo tuần thì bấm quyển sổ để nhắc.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc sơ đồ",
      khoi: [
        {
          tieuDe: "Mỗi ô có gì",
          bang: [
            ["Phần", "Nghĩa", "Bấm thì sao"],
            ["Nhãn giữa ô và dòng «N việc · M trễ»", "Tên đơn vị; số việc đơn vị chủ trì (tính cả đơn vị con, việc chỉ phối hợp không tính); số việc quá hạn", "Chọn ô: cột phải hiện việc của ô"],
            ["Biểu tượng quyển sổ (trái ô)", "Báo cáo tuần của đơn vị: viền xanh khi đã nộp", "Đã nộp: mở báo cáo tuần ở cột phải. Chưa nộp: hiện hộp «… chưa nộp báo cáo tuần N»"],
            ["Dấu chấm than đỏ thay quyển sổ", "Đơn vị đã bị nhắc nộp hoặc đã quá hạn nộp (hạn khai ở Cài đặt)", "Như trên"],
            ["Nút «＋» (phải ô)", "Giao việc cho đơn vị đó", "Mở form giao việc ở cột phải. Ô ngoài phạm vi giao việc của bạn: nút ẨN"],
            ["Đường nối giữa hai ô", "Quan hệ cấp trên – cấp dưới", "Rê chuột: sáng lên. Bấm: soát báo cáo tuần của các đơn vị cấp dưới gửi lên cấp trên"],
          ],
        },
        {
          tieuDe: "Màu ô",
          doan: ["Bốn tông cam từ đậm đến nhạt là cấp 1 đến cấp 4 (cấp 4 là Ban điều hành). Màu chỉ cho biết CẤP, không cho biết tốt hay xấu. Số trễ màu đỏ là việc quá hạn. Sơ đồ có thể ẩn đơn vị không có việc (Cài đặt, Giao diện) — khi đó đường nối tới đơn vị đó cũng mất."],
        },
        {
          luuY: ["Khi đang bật một bộ lọc (Quá hạn hay Tôi nhận…), ô nào không còn việc nào thỏa sẽ mờ đi, đường nối tới nó cũng mờ."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A mở sơ đồ và thấy ô một phòng ghi số việc kèm «trễ» màu đỏ, bên trái ô là dấu chấm than đỏ thay quyển sổ. Chị hiểu: phòng này có việc trễ và chưa nộp báo cáo tuần (hoặc đã bị nhắc). Chị bấm vào chữ giữa ô để xem việc, bấm dấu chấm than để xử lý báo cáo.",
            "Chị bật nút «Quá hạn». Các ô không có việc quá hạn mờ đi; ô còn sáng là nơi chị cần bấm vào trước.",
          ],
        },
      ],
    },
    {
      ten: "② Lọc việc",
      khoi: [
        {
          tieuDe: "Các nút lọc trên đầu sân",
          bang: [
            ["Nút", "Cho xem", "Ghi chú"],
            ["«Tuần N: xong … · mới …»", "Việc đã hoàn thành trong tuần đang chọn (và số việc mới phát sinh trong tuần)", "Chỉ xem, không thao tác. Số tính cho ô đang chọn và các ô bên dưới"],
            ["«30 ngày: xong … · mới …»", "Như trên cho 30 ngày gần nhất", "Nút mờ khi chưa có việc nào xong"],
            ["«Quá hạn · N»", "Chỉ việc đã quá hạn (đang mở)", "Việc đã xong không tính là quá hạn"],
            ["«Tôi giao»", "Việc tôi giao tay (nút ＋ hoặc quyết định của Tổng giám đốc); không tính việc máy lọc từ báo cáo", "Để theo dõi người mình đã giao"],
            ["«Tôi nhận»", "Việc tôi chủ trì, giao đích danh tên tôi hoặc chức danh lãnh đạo tôi giữ; không tính việc giao cả đơn vị", "Việc tôi phải làm"],
            ["«Cần phối hợp»", "Phần phối hợp chưa xong giao đích danh cho tôi; trưởng đơn vị thấy cả phần giao cho đơn vị mình", "Việc tôi hỗ trợ"],
          ],
          luuY: ["Bấm lần nữa vào nút đang bật để tắt. Nút mờ nghĩa là chưa có việc nào thỏa; rê chuột để đọc lý do."],
        },
        {
          tieuDe: "Ô tìm và «Lọc tìm kiếm»",
          doan: ["Ô tìm ở đầu cột phải gõ tới đâu lọc tới đó, tìm theo mã việc, tên việc, tên người, dự án (bỏ dấu tiếng Việt cũng ra). Ô nhỏ bên trái ô tìm chọn phạm vi:"],
          bang: [
            ["Phạm vi", "Tìm trong"],
            ["Bỏ trống («Lọc tìm kiếm»)", "Danh sách đang hiện (theo ô đang chọn và các nút lọc)"],
            ["«Việc toàn công ty»", "Mọi việc của công ty, đang làm và đã xong gần đây"],
            ["«Việc thuộc phòng»", "Việc đơn vị của tôi (kể cả kiêm nhiệm) chủ trì hoặc phối hợp"],
            ["«Việc thuộc cá nhân»", "Việc tôi giao, hoặc giao đích danh tôi"],
          ],
          luuY: ["Phạm vi chỉ có tác dụng khi bạn đã gõ chữ vào ô tìm. Việc đã xong lâu hơn 30 ngày chỉ tìm thấy qua phạm vi «Việc toàn công ty»."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A muốn xem mọi việc mình đã giao mà người nhận chưa xong: bật nút «Tôi giao». Số bên cạnh nút («· số việc») cho biết có bao nhiêu việc; danh sách bên phải chỉ còn các việc đó, ô nào không có việc của chị thì mờ.",
            "Chị nhớ một việc tên có chữ «nghiệm thu» nhưng không nhớ phòng nào. Chị gõ «nghiem thu» vào ô tìm (không dấu vẫn khớp), chọn phạm vi «Việc toàn công ty»: danh sách hiện mọi việc có chữ đó, nhóm theo ô đơn vị.",
          ],
        },
      ],
    },
    {
      ten: "③ Cột việc",
      khoi: [
        {
          tieuDe: "Cột phải liệt kê việc thế nào",
          ds: [
            "Dòng đầu là đường đi từ Ban lãnh đạo xuống ô đang chọn (bấm từng cấp để lên cấp đó).",
            "Việc xếp theo nhóm: «Của riêng …» (việc ô đó giữ), tiếp theo từng đơn vị con, cuối cùng nhóm «Phối hợp — chỉ để biết, không tính vào số việc».",
            "Trong mỗi nhóm, việc chia theo NGƯỜI đang chủ trì: tên người viết ĐẬM, xếp A–Z theo tên riêng (Thủy đứng trước Trang…). Việc đang giao cho cả đơn vị, chưa có cá nhân cụ thể, nằm cuối cùng ở mục «Việc chung».",
            "Cuối mỗi nhóm có khối gấp «▸ Việc làm xong: Tuần N−1 và N» để họp giao ban xem lại tuần trước. Bấm để mở. Việc xong xếp dưới ĐÚNG đơn vị làm, không gộp đơn vị con về đơn vị cha — riêng Ban lãnh đạo là đơn vị tổng nên thấy việc xong của cả công ty.",
            "Công ty độc lập như SCI E&C: việc của đơn vị con chỉ tính lên tới công ty đó, không đổ về Phòng Đầu tư và Pháp chế. Muốn xem thì bấm ô công ty (hoặc menu Dự án).",
          ],
        },
        {
          tieuDe: "Đọc một dòng việc",
          bang: [
            ["Phần", "Nghĩa"],
            ["Dấu đỏ «!» trước tên", "Việc chưa xong nằm trên ĐƯỜNG GĂNG: trễ việc này là lùi ngày hoàn thành mục tiêu của dự án. Dữ liệu hỏi agent Tiến độ nên có thể hiện chậm hơn danh sách"],
            ["Tên việc và cây bút ✎", "✎ chỉ hiện nếu bạn có quyền «Sửa việc»"],
            ["Chữ bên phải", "«quá hạn N ngày» · «đến hạn hôm nay» · «còn N ngày» (từ 1 đến 3 ngày là sắp đến hạn) · «việc thường xuyên» (không có hạn) · «Xong ngày dd/mm/yyyy»"],
          ],
          luuY: ["Chỉ mở MỘT việc một lúc. Việc vừa giao xong được đánh dấu nổi để bạn thấy ngay."],
        },
        {
          tieuDe: "Rê chuột vào một việc",
          doan: ["Các ô đơn vị liên quan trên sân sáng lên, giúp bạn thấy việc này thuộc những đơn vị nào."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Cột phải hiện nhóm «Của riêng Phòng Kỹ thuật» và nhóm đơn vị con. Chị A thấy dòng đầu có dấu «!» đỏ và chữ «quá hạn …». Chị rê chuột vào dòng: ô phòng và ô phòng hỗ trợ trên sân sáng lên, chị biết hai phòng cùng dính việc này. Chị bấm dòng để mở thẻ."],
        },
      ],
    },
    {
      ten: "④ Một việc",
      khoi: [
        {
          tieuDe: "Bấm một việc thì thấy gì",
          bang: [
            ["Dòng", "Nghĩa"],
            ["«Việc của … · … phối hợp · lọc ra từ hệ thống báo cáo tuần N · … · được giao bởi …»", "Ai chủ trì, ai phối hợp, việc từ đâu ra. Bấm tên báo cáo để mở bản gốc, dòng máy lọc ra việc được khoanh cam"],
            ["Thanh ngày", "Ngày bắt đầu, số ngày, ngày kết thúc (theo khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy») và đoạn đã trôi qua"],
            ["«Kết quả cần có»", "Việc xong thì phải có cái gì"],
            ["«% hoàn thành (theo báo cáo)», «Ghi chú (theo báo cáo)»", "Chỉ có ở việc từ chương Tiến độ chi tiết thiết kế"],
            ["Bình luận", "Trao đổi theo việc, gõ @ để nhắc người; người được nhắc có chuông"],
          ],
        },
        {
          tieuDe: "Các nút trong việc (chỉ hiện khi có quyền)",
          bang: [
            ["Nút", "Làm gì", "Chi tiết"],
            ["«Xong việc»", "Báo xong phần của mình", "Mở ô «Báo kết quả bằng lời (không bắt buộc)» và nút kẹp tệp 📎. Bộ phận chủ trì bấm thì việc hoàn thành, bên phối hợp tự đóng và được báo. Bên phối hợp bấm thì chỉ xong phần của mình, việc vẫn mở"],
            ["«Gia hạn»", "Đổi hạn", "Chọn ngày mới là áp dụng ngay, không cần lý do"],
            ["«＋ Phối hợp»", "Mời thêm một đơn vị hoặc một người phối hợp", "Chọn trong danh sách là thêm ngay. Chỉ để biết, không có hạn riêng"],
            ["«Hủy việc»", "Việc không làm nữa, rời sổ cái", "BẮT BUỘC ghi lý do. Việc đã hủy rời hẳn sổ cái, nên chỉ hủy khi chắc chắn"],
            ["«Mở lại»", "Việc đã xong nhưng chưa thật sự xong", "Chỉ người giao và lãnh đạo thấy. Bắt buộc lý do; có thể đặt hạn mới (bỏ trống là giữ hạn cũ). Người làm được báo lại"],
            ["Ô «Giao cho…»", "Trưởng đơn vị giao việc của cả đơn vị cho MỘT nhân viên", "Chọn tên là giao ngay, không có nút xác nhận"],
            ["Cây bút ✎", "Sửa tên, kết quả cần có, ngày bắt đầu, hạn, chủ trì, phối hợp, lãnh đạo phối hợp", "Cần quyền «Sửa việc»"],
          ],
          ai: [
            "🤖 Ô «Lãnh đạo phối hợp» trong form sửa có thể do AI gắn sẵn theo phân công Ban lãnh đạo; bạn chọn lãnh đạo khác trong form và bấm «Lưu» là thay.",
            "🤖 Ở menu «Dự án», dòng «🤖 Giai đoạn:» là giai đoạn AI xếp kèm lý do; khi bạn chọn lại thì dòng đổi thành «Giai đoạn (người đã sửa):» và AI không xếp lại nữa.",
          ],
          luuY: ["Mỗi thao tác là thật trên dữ liệu công ty. Đừng bấm thử «Hủy việc» hay «Xong việc» để làm quen."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Anh B được giao một việc, vào Sơ đồ tổ chức bấm tên việc. Anh chỉ thấy nút «Xong việc» (vì anh là người làm, không có quyền sửa). Anh làm xong, bấm «Xong việc», kẹp biên bản bằng 📎. Chị A (người giao) có chuông; chị thấy thêm «Gia hạn», «Hủy việc» vì chị có quyền.",
            "Chủ đầu tư dời buổi kiểm tra một tuần: chị A bấm «Gia hạn», chọn ngày mới. Việc từ «quá hạn …» chuyển lại «còn … ngày».",
            "Cả bốn khung nhỏ (xong, gia hạn/phối hợp/hủy/mở lại, sửa việc, bình luận) đều có hướng dẫn riêng khi bạn mở chúng.",
          ],
        },
      ],
    },
    {
      ten: "⑤ Giao việc",
      khoi: [
        {
          tieuDe: "Giao việc từ nút ＋",
          bam: [
            "Bấm «＋» trên ô đơn vị cần giao (ô ngoài phạm vi giao việc của bạn không có nút này).",
            "Cột phải hiện «Giao việc cho …». Nếu giao cho Ban lãnh đạo thì chọn một người trong «Người nhận trong Ban lãnh đạo».",
            "Nếu bạn là trưởng đơn vị và giao ngay trong đơn vị mình thì bắt buộc chọn MỘT nhân viên làm chủ trì ở mục «Nhân viên làm chủ trì · bắt buộc chọn một người».",
            "Gõ «Nội dung việc». Có thể kẹp tệp bằng nút 📎.",
            "Tuỳ chọn: «Kết quả cần có» (vd tờ trình gửi Tổng giám đốc), «Thuộc dự án · không bắt buộc», «Hạn» (đã có thì máy hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy»).",
            "Bấm «Giao việc». Việc mới hiện nổi ở cột phải kèm dòng «Đã giao việc …».",
          ],
          ketQua: [
            "Máy tạo việc trong sổ cái với người giao là bạn, gửi chuông cho người nhận.",
            "Nút «Giao việc» mờ kèm câu bên cạnh nói còn thiếu gì: «Chưa có nội dung việc», «Chưa chọn người nhận», «Chưa chọn nhân viên làm chủ trì», «… ngoài phạm vi giao việc của bạn», «Hạn trước hôm nay».",
          ],
          luuY: ["Ở menu «Dự án» form có thêm ô «Dự án» và ô «Giao cho» (bấm là Ban lãnh đạo hoặc đơn vị, gõ @ để chọn đích danh một người)."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Anh C là trưởng Phòng Kỹ thuật, bấm «＋» trên ô phòng mình. Khung bắt anh chọn MỘT nhân viên làm chủ trì; anh chọn chị D, gõ «Lập kế hoạch thử nghiệm máy biến áp», chọn hạn cuối tháng (dưới ô hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy»), bấm «Giao việc». Việc nổi lên đầu cột phải, chị D có chuông.",
            "Chi tiết từng ô, từng câu báo thiếu: hướng dẫn «Giao việc cho một ô trên Sơ đồ tổ chức».",
          ],
        },
      ],
    },
    {
      ten: "⑥ Báo cáo tuần của ô",
      khoi: [
        {
          tieuDe: "Xem báo cáo của một đơn vị",
          doan: ["Bấm quyển sổ (đã nộp) trên ô: cột phải hiện bản xem nhanh của báo cáo tuần, kèm dòng tóm tắt: tên tệp, kỳ, ngày nộp, người nộp, kết quả «máy kiểm tra: đạt / chưa đạt», số việc đã vào sổ cái và liên kết «Tải bản Word»."],
        },
        {
          tieuDe: "Nhắc nộp báo cáo",
          bam: [
            "Bấm quyển sổ hoặc dấu ! của đơn vị chưa nộp: hiện hộp «… chưa nộp báo cáo tuần N» kèm khuôn ngày của tuần.",
            "Bấm «Nhắc nộp báo cáo» (hoặc «Để sau» để đóng).",
          ],
          ketQua: [
            "Máy gửi tin đỏ ở chuông cho người của đơn vị. Đơn vị chưa có tài khoản thì gửi người của đơn vị cấp trên; nếu cũng không có thì báo quản trị.",
            "Đã nhắc rồi thì hộp ghi «Đã nhắc lúc hh:mm. Nhắc lần nữa?».",
          ],
          luuY: ["Quá hạn nộp (khai ở Cài đặt, Hạn nộp báo cáo tuần) mà chưa có báo cáo thì dấu ! tự hiện, không cần ai bấm nhắc."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Chị A thấy quyển sổ của một phòng chưa viền xanh. Chị bấm, hộp «… chưa nộp báo cáo tuần N» hiện, chị bấm «Nhắc nộp báo cáo». Lát sau quyển sổ đổi thành dấu chấm than đỏ, ô ghi «Đã nhắc nộp hh:mm». Khi phòng nộp, quyển sổ viền xanh và chị bấm vào đọc báo cáo (xem hướng dẫn «Xem báo cáo tuần của một đơn vị» và «Soát báo cáo các đơn vị gửi lên và nhắc nộp»)."],
        },
        {
          tieuDe: "Soát báo cáo các đơn vị gửi lên",
          doan: [
            "Bấm một đường nối: cột phải liệt kê các đơn vị cấp dưới của ô cha với chấm xanh (đã nộp, kèm tên tệp), chấm đỏ (đã nhắc, chờ nộp) hoặc chấm xám («chưa nộp — bấm để nhắc»). Tiêu đề ghi «N/M đã nộp».",
            "Bấm một dòng để xem báo cáo hoặc nhắc nộp; nút «← Quay lại» đưa về danh sách.",
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
            ["Không có nút «＋» ở một ô", "Ô đó ngoài phạm vi quyền «Giao việc» của bạn. Nhờ Quản trị mở rộng phạm vi ở Cài đặt, Vai trò và quyền."],
            ["Không có nút «Xong việc» hoặc «Gia hạn»", "Bạn không phải người chủ trì/phối hợp việc đó, hoặc chưa có quyền. Nút không có quyền thì ẩn."],
            ["Dấu ! đường găng chưa hiện", "Dữ liệu đường găng lấy từ agent Tiến độ nên có thể hiện chậm hơn danh sách; hoặc dự án chưa có cây WBS."],
            ["Sơ đồ thiếu một đơn vị", "Cài đặt, Giao diện đang tắt «hiện đơn vị không có việc» và đơn vị đó không có việc nào."],
            ["Muốn xem việc đã xong từ lâu", "Gõ mã việc vào ô tìm và chọn phạm vi «Việc toàn công ty»."],
            ["Đánh dấu «Xong» nhầm", "Người giao hoặc lãnh đạo bấm «Mở lại» và ghi lý do."],
            ["Mở link việc cũ dạng cong-viec/…", "Trang đó tự chuyển về Sơ đồ tổ chức và mở sẵn đúng việc."],
            ["Mở link «Quá hạn» cũ", "Màn Quá hạn đã gộp vào Sơ đồ, dùng nút «Quá hạn · N»."],
          ],
        },
      ],
    },
  ],
  canCu: "Luật 17 riêng 3004 (nút không có quyền thì ẨN) · luật 31 (khoảng ngày kèm số ngày) · luật 35, 36 (nhanh/chậm tính bằng ngày và ghi so với hệ nào) · quyền «Giao việc», «Sửa việc» trong Cài đặt, Vai trò và quyền.",
};
