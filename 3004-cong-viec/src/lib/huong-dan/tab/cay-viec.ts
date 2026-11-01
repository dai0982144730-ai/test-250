// Hướng dẫn bản 2 (tab) — màn Cây việc & đường găng. Viết lại 20/10/2026 (nhóm A3) theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/cay-viec/CayViecView.tsx (4 thẻ, khối «🤖 Gán mã WBS bằng AI», DanhSachGanAi) · CayGiaiDoan.tsx (thanh lọc, dòng nút, DongViec)
// · PhaiCayViec.tsx (cột phải) · lib/cay-viec/dung-man.ts (quyền: gan = wbs.duyet, giao = cong_viec.giao) · lib/gan-wbs/gan-wbs.ts:305 (AI gán mã)
// · app/api/cay-viec/soan-giao/route.ts:119 (AI soạn người nhận) · lib/cay-viec/hoi-trung.ts:55 (AI phán trùng). Không ghi số của dự án thật.
// Hướng dẫn con của màn này: cay-viec-nut · cay-viec-viec · cay-viec-nguon · cay-viec-hang-loat · cay-viec-gan-ma · cay-viec-o-giao-sua.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cây việc & đường găng — việc nào đang tắc, nút nào chưa ai nhận",
  ai: "Xem: mọi người có quyền xem sổ cái. «🤖 Gán mã WBS vào công việc» và «Duyệt …» cần quyền «Duyệt gắn WBS»; «🤖 Soạn việc trên đường găng chưa ai làm», «🤖 Xem việc AI soạn sẵn» và «Giao việc» cần quyền «Giao việc». Người không có quyền sẽ không thấy các nút đó (riêng agent Công việc: nút không có quyền thì ẨN, không làm mờ).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì?",
          doan: [
            "Agent Tiến độ giữ cây WBS của dự án (cây đầu việc: giai đoạn, hạng mục, công việc) và tính ĐƯỜNG GĂNG: chuỗi việc mà trễ một việc là lùi ngày hoàn thành cả dự án. Agent Công việc giữ sổ cái: những việc đã có người nhận làm.",
            "Màn «Cây việc & đường găng» đặt hai thứ cạnh nhau: mỗi đầu việc của cây WBS được treo các việc thật trong sổ cái. Nhìn một đầu việc găng là biết ngay: đã có ai được giao chưa, việc đã giao có đang nằm im ở bàn ai không.",
            "Hình dung: cây WBS là bản đồ đường đi của dự án; đường găng là con đường dài nhất, chậm một bước là về đích chậm. Sổ cái là danh sách người đang cầm từng đoạn đường. Màn này soi xem đoạn nào trên đường găng mà chưa ai cầm.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Việc nằm trên đường găng mà không ai nhận là rủi ro lớn nhất của dự án. Màn gom đúng những đầu việc đó, đánh dấu «CHƯA AI ĐƯỢC GIAO».",
            "Việc trong sổ cái đặt tên theo báo cáo tuần, không theo mã WBS. Màn này gắn từng việc vào đúng đầu việc WBS để theo dõi đúng chỗ.",
            "Từ đầu việc găng còn trống có thể giao việc ngay, người nhận và nội dung đã soạn sẵn, người chỉ việc kiểm rồi bấm.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của màn này"],
            ["Trước", "Agent Tiến độ lập cây WBS và tính đường găng; báo cáo tuần và giao tay tạo việc trong sổ cái", "Cung cấp hai nguồn dữ liệu"],
            ["Màn này", "Gắn việc vào đầu việc WBS · soi đầu việc găng chưa ai nhận · giao việc", "Màn bạn đang xem"],
            ["Sau", "Người nhận làm việc ở Sơ đồ tổ chức, báo xong; hết việc găng trống thì thẻ ④ về 0", "Việc mới giao hiện ở «Việc của tôi» của người nhận và ở Sơ đồ tổ chức"],
          ],
        },
        {
          tieuDe: "Cách vào màn",
          doan: ["Từ menu «Dự án», bấm biểu tượng lịch có thanh bậc thang ở bên trái ô dự án. Dự án chưa có «Mã bên Tiến độ» ở Cài đặt thì không có biểu tượng và màn báo «Chưa có cây WBS cho dự án này». Trên thanh trên có ô chọn dự án (rê chuột ghi «Cây việc & đường găng của dự án nào») để đổi sang dự án khác mà vẫn ở màn này."],
        },
        {
          tieuDe: "④ Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["«Gán việc của dự án vào WBS» với 4 thẻ số và nút «Hỏi lại»", "Biết quy mô và lấy số mới", "① Bốn thẻ"],
            ["«Cây tiến độ dự án — thể hiện dạng công việc» với thanh lọc", "Nhìn từng đầu việc, từng việc treo", "② Lọc và đọc cây · ③ Việc treo"],
            ["«🤖 Gán mã WBS bằng AI» (nút «▸ Mở», «🤖 Gán mã WBS vào công việc», «🤖 Soạn việc trên đường găng chưa ai làm», «Duyệt …»)", "Gắn việc vào đầu việc WBS và soạn việc giao hàng loạt", "④ Gán mã và giao việc — chi tiết ở hướng dẫn «Gán mã WBS bằng AI»"],
            ["Cột phải (luôn hiện): tóm tắt dự án, nguồn của thẻ, đầu việc, một việc, khung soạn hàng loạt", "Làm việc sâu mà không rời màn", "④ · các hướng dẫn con"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Duyệt hoặc đổi mã WBS cho việc · chọn người nhận · bấm «Giao việc» · chọn «Việc này không cần giao trong agent Công việc»", "Người thắng AI ở mọi chỗ"],
            ["MÁY", "Lấy cây WBS và đường găng từ agent Tiến độ (mỗi lần mở hỏi lại) · đếm 4 thẻ · tìm đầu việc găng không có việc nào treo · tính việc nằm im lâu nhất · kiểm quyền · tạo việc trong sổ cái khi người bấm", "Cùng dữ liệu thì cùng kết quả. Đường găng đổi liên tục nên bấm «Hỏi lại» để lấy bản mới"],
            ["🤖 AI", "🤖 Đọc tên việc rồi đề xuất mã WBS kèm lý do và độ chắc; chạy nền mỗi 5 phút hoặc khi bấm «🤖 Gán mã WBS vào công việc»", "🤖 Mã phải có trong cây thật; chắc dưới 70% thì ghi «nghi»; chưa duyệt thì chưa treo lên cây"],
            ["🤖 AI", "🤖 Soạn người nhận và nội dung việc cho đầu việc găng chưa ai giao (đọc lịch sử loại việc này thường ai làm và chức năng từng đơn vị)", "🤖 Chỉ soạn sẵn. Người bấm «Giao việc» mới tạo việc"],
            ["🤖 AI", "🤖 Xét xem việc sắp giao có TRÙNG việc các agent khác đã soạn hay không", "🤖 Chỉ báo; bạn vẫn quyết"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người mở màn. Máy hỏi agent Tiến độ lấy cây và đường găng, đếm ra 4 thẻ.",
            "🤖 AI đọc tên các việc chưa có mã WBS và đề xuất mã (tự chạy nền, hoặc khi người bấm «🤖 Gán mã WBS vào công việc»).",
            "Người duyệt từng đề xuất (hoặc duyệt cả lô chắc từ 70%) hoặc đổi sang mã khác. Duyệt xong việc mới treo lên cây.",
            "Máy tìm đầu việc găng đã tới lúc giao mà chưa có việc nào treo. Người bấm «🤖 Xem việc AI soạn sẵn».",
            "🤖 AI chọn người hoặc đơn vị nhận theo lịch sử, máy hỏi các agent khác xem có trùng việc không.",
            "Người đọc, sửa nếu cần, bấm «Giao việc». Chỉ cú bấm này mới tạo việc thật trong sổ cái; AI không bao giờ tự ghi.",
          ],
          ai: [
            "🤖 AI không tự giao việc, không tự đổi mã đã duyệt, không đè lên mã người đã gắn.",
            "Mất kết nối AI hoặc agent Tiến độ: màn báo «Chưa lấy được cây WBS — Agent tiến độ không phản hồi»; phần việc trong sổ của mình vẫn hiện, bạn vẫn gắn mã tay được.",
          ],
        },
        {
          tieuDe: "Thứ tự xem gợi ý",
          bam: [
            "Nhìn thẻ thứ tư «Việc găng CHƯA GIAO»: số đỏ lớn hơn 0 là có việc cần giao.",
            "Bấm bộ lọc «⭕ Việc găng chưa giao» để chỉ còn đầu việc cần giao, bấm từng cái xem ở cột phải.",
            "Mở khối «🤖 Gán mã WBS bằng AI» xem có đề xuất nào chờ duyệt không.",
          ],
        },
      ],
    },
    {
      ten: "① Bốn thẻ",
      khoi: [
        {
          tieuDe: "Bốn thẻ số ở đầu màn",
          bang: [
            ["Thẻ", "Trả lời câu hỏi", "Cách tính"],
            ["ĐẦU VIỆC WBS", "Cây có bao nhiêu đầu việc? Dòng phụ ghi số giai đoạn cấp 1 và ngày COD dự báo", "Đếm từ cây WBS của agent Tiến độ"],
            ["TRÊN ĐƯỜNG GĂNG", "Bao nhiêu đầu việc nằm trên đường găng?", "Do bộ tính đường găng của agent Tiến độ tính, dòng phụ chia theo nhóm"],
            ["VIỆC CỦA DỰ ÁN", "Bao nhiêu việc trong sổ gắn được vào mã WBS? Ghi «gắn được N · M chờ duyệt · K AI chưa đọc»", "Đếm việc trong sổ cái của dự án đã có mã WBS ĐÃ DUYỆT"],
            ["VIỆC GĂNG CHƯA GIAO", "Bao nhiêu đầu việc găng đã tới lúc giao mà chưa ai nhận? Số đỏ khi lớn hơn 0", "Đầu việc lá găng, chưa xong, ngày bắt đầu nằm trong cửa sổ giao (khai ở Cài đặt, Gắn việc vào WBS; mặc định 7 ngày) mà chưa có việc ĐÃ DUYỆT nào treo vào"],
          ],
          luuY: [
            "Bấm tên thẻ (chữ gạch chấm) để cột phải hiện nguồn của con số và cách tính — xem hướng dẫn «Nguồn của bốn thẻ».",
            "Nút «Hỏi lại» hỏi agent Tiến độ lấy cây và đường găng mới nhất; đường găng đổi liên tục nên đừng tin số cũ.",
            "Đầu việc găng chưa tới lúc giao (xa hơn cửa sổ giao) không đếm đỏ và không hiện nút giao: việc chưa tới lúc làm thì ẩn hẳn.",
            "Nếu thẻ thứ ba bằng 0, màn hiện khối «Vì sao chưa gắn được việc nào vào mã WBS» với số đo ba đường: AI đề xuất chờ duyệt, AI đề xuất đã duyệt, người gắn tay.",
          ],
          viDu: [
            "Tình huống minh hoạ: thẻ thứ tư ghi «Chưa giao trong 7 ngày tới» và số đỏ. Nghĩa là có đầu việc găng sẽ bắt đầu trong vòng 7 ngày tới (hoặc đã bắt đầu) mà trong sổ cái chưa có việc đã duyệt nào treo vào. Người phụ trách dự án nên giao ngay trong tuần.",
          ],
        },
      ],
    },
    {
      ten: "② Lọc và đọc cây",
      khoi: [
        {
          tieuDe: "Thanh lọc phía trên cây",
          bang: [
            ["Phần", "Làm gì"],
            ["Ô chọn «Tất cả N giai đoạn»", "Chỉ xem một giai đoạn của cây (N là số giai đoạn cấp 1 của dự án)"],
            ["Ô tìm «Tìm đầu việc, mã WBS, tên việc…»", "Tìm trong cây; đang tìm thì các nhánh tự mở hết"],
            ["«Bung hết» · «Thu hết»", "Mở hoặc thu mọi giai đoạn"],
            ["«🔴 Việc găng»", "Chỉ đầu việc nằm trên đường găng"],
            ["«👤 Việc găng đã giao»", "Đầu việc găng đã có việc treo vào"],
            ["«⭕ Việc găng chưa giao»", "Đầu việc găng đã tới lúc giao mà chưa ai nhận"],
            ["«🤖 Duyệt gán mã công việc»", "Thay cây bằng danh sách việc có mã do AI đề xuất đang chờ duyệt"],
          ],
          luuY: ["Bốn nút lọc chỉ bật được MỘT nút một lúc: bấm nút này thì nút kia tắt, bấm lại nút đang bật để về xem tất cả. Không giai đoạn nào khớp thì màn báo «Không giai đoạn nào khớp bộ lọc — nới bớt một điều kiện»."],
          viDu: ["Muốn biết đầu việc nào đang tắc: bấm «⭕ Việc găng chưa giao». Chỉ còn các đầu việc găng chưa ai nhận, chữ đỏ đậm. Bấm một dòng để xem chi tiết ở cột phải."],
        },
        {
          tieuDe: "Đọc một dòng đầu việc",
          bang: [
            ["Phần", "Nghĩa"],
            ["Mã và tên", "Mã WBS kèm tên đầu việc. Tên đỏ đậm là đầu việc nằm trên đường găng"],
            ["▸ N việc đã xong", "Việc đã xong của đầu việc, chữ xanh, luôn đóng khi mở trang, bấm mới mở (mỗi dòng có «Xong ngày dd/mm/yyyy»)"],
            ["CHƯA AI ĐƯỢC GIAO", "Đầu việc găng mà sổ cái không có việc nào ĐÃ DUYỆT. Ngay dưới dòng này là thẻ Issue và khối giao việc soạn sẵn"],
            ["Ngày · nhà thầu · %", "Ngày kết thúc theo tiến độ, nhà thầu, % hoàn thành của đầu việc"],
            ["N việc", "Chỉ đếm việc chưa xong"],
            ["⏳ N ngày ở bàn …", "Việc đã giao nhưng chưa động; từ 7 ngày trở lên hiện chữ đỏ kèm tên người đang giữ"],
          ],
          luuY: ["Ngay dưới tiêu đề khung cây có chữ «Xem thêm»: bấm để hiện dòng nguồn (giờ lấy dữ liệu) và chú giải màu."],
        },
      ],
    },
    {
      ten: "③ Việc treo dưới nút",
      khoi: [
        {
          tieuDe: "Mỗi dòng việc",
          doan: ["Dưới mỗi đầu việc là các việc thật trong sổ cái đã gắn vào nó. Mỗi dòng gồm: dấu ✓ nếu xong, tên việc, 🤖 nếu mã WBS do AI gắn (kèm ● khi chưa duyệt, ✎ để đổi mã), độ chắc («nghi · chắc N%» hoặc «chưa đo độ chắc»), nhãn trạng thái, hạn và người đang giữ. Bấm cả dòng để mở chi tiết việc ở cột phải — xem hướng dẫn «Chi tiết một việc và mã WBS»."],
          bang: [
            ["Nhãn trạng thái", "Nghĩa"],
            ["chưa giao ai", "Việc chưa có người chủ trì"],
            ["quá hạn N ngày", "Đã quá hạn N ngày (đếm theo lịch)"],
            ["nằm im N ngày", "Việc chưa có cập nhật N ngày; từ 7 ngày trở lên chữ đỏ"],
            ["không đo được nằm im", "Máy không có dữ liệu để đo"],
          ],
          luuY: ["Mã 🤖 chưa duyệt (có chấm vàng) chưa treo lên cây, chỉ nằm ở danh sách «🤖 Gán mã WBS bằng AI»."],
          viDu: ["Tình huống minh hoạ: dòng việc ghi «🤖● … · nghi · chắc 55% · nằm im 9 ngày» nghĩa là AI mới đoán mã (chắc 55%, dưới 70% nên ghi nghi), việc đã nằm im 9 ngày. Bạn bấm dòng, đọc căn cứ của AI rồi duyệt hoặc đổi mã."],
        },
      ],
    },
    {
      ten: "④ Gán mã và giao việc",
      khoi: [
        {
          tieuDe: "Hai việc lớn của màn",
          bang: [
            ["Việc", "Bấm ở đâu", "Xem hướng dẫn"],
            ["Gắn việc vào đầu việc WBS (🤖 AI đề xuất, người duyệt)", "Khối «🤖 Gán mã WBS bằng AI»: «▸ Mở», «🤖 Gán mã WBS vào công việc», «Duyệt N/M việc chờ duyệt chắc từ 70%»; hoặc bộ lọc «🤖 Duyệt gán mã công việc»", "«Gán mã WBS bằng AI»"],
            ["Giao việc cho một đầu việc găng đang trống", "Bấm dòng đầu việc có «CHƯA AI ĐƯỢC GIAO» → cột phải → «🤖 Xem việc AI soạn sẵn» → «Giao việc»", "«Một đầu việc WBS và giao việc»"],
            ["Giao hàng loạt cho mọi đầu việc găng trống", "Nút «🤖 Soạn việc trên đường găng chưa ai làm» (kèm số đầu việc)", "«Soạn việc hàng loạt»"],
            ["Sửa việc soạn sẵn trước khi giao", "Nút «Sửa»", "«Ô giao việc khi bấm Sửa»"],
          ],
          viDu: [
            "Tình huống minh hoạ: đầu việc «7.2.3 Thi công san nền» nằm trên đường găng, sắp tới ngày bắt đầu mà chưa ai nhận. Bạn bấm dòng, bấm «🤖 Xem việc AI soạn sẵn»; AI gợi ý giao cho đơn vị thường làm loại việc này kèm căn cứ; bạn đọc, đổi người nếu cần rồi bấm «Giao việc». Việc mới hiện ngay dưới đầu việc, dòng CHƯA AI ĐƯỢC GIAO biến mất.",
          ],
          luuY: ["Bấm «Giao việc» là tạo việc thật, người nhận được báo qua chuông. Kiểm tên người nhận trước khi bấm."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Màn ghi «Chưa có cây WBS cho dự án này»", "Dự án chưa khai «Mã bên Tiến độ» ở Cài đặt, hoặc agent Tiến độ chưa có cây. Nhờ quản trị khai mã."],
            ["«Chưa lấy được cây WBS — Agent tiến độ không phản hồi»", "Agent Tiến độ bận hoặc đang khởi động lại. Bấm «Hỏi lại» sau ít phút."],
            ["Thẻ VIỆC CỦA DỰ ÁN bằng 0", "Chưa việc nào được gắn mã. Bấm «🤖 Gán mã WBS vào công việc» hoặc chờ máy tự chạy 5 phút một lần."],
            ["Đầu việc găng đỏ nhưng ngoài đời đã có người làm", "Sổ cái chỉ chứa việc ghi trong báo cáo tuần và việc giao tay. Việc làm ngoài đời mà chưa ghi thì màn chưa thấy. Chọn «Việc này không cần giao trong agent Công việc» nếu không cần giao."],
            ["Không thấy nút «Duyệt N/M …» hay «🤖 Gán mã WBS vào công việc»", "Bạn thiếu quyền «Duyệt gắn WBS» (nút ẩn) hoặc không có việc đủ điều kiện."],
            ["Không thấy nút giao việc", "Bạn thiếu quyền «Giao việc» (nút ẩn), hoặc đầu việc chưa tới lúc giao."],
            ["Số găng khác Gantt bên Tiến độ", "Đường găng đổi liên tục; bấm «Hỏi lại» để lấy bản mới nhất. Dòng nguồn (bấm «Xem thêm») ghi giờ lấy dữ liệu."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03–07/10/2026 (chép màn Cây việc & đường găng từ agent Base; nguồn việc là sổ cái agent Công việc) · luật 32 (việc chưa tới lúc giao thì ẩn, cửa sổ giao khai ở Cài đặt) · luật 33 (hỏi trùng) · luật 28 (chữ thuần không khoanh) · luật 17 riêng 3004 (nút không quyền thì ẨN).",
};
