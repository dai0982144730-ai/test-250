// Hướng dẫn bản 2 (tab) — khung khai báo mẫu «Thêm mẫu mới» / «Cập nhật» trên trang Mẫu báo cáo. Viết 20/10/2026.
// Nhãn chép từ components/mau-word/KhaiBaoMau.tsx (năm bước: «Chọn file Word», «Đọc file», «Duyệt nghĩa», «Kiểm tra», «Lưu bản mới»). Quyền «mau.quan_ly» kiểm ở máy chủ cả ba bước.
// Chỗ AI thật: lib/kiem-tra/khai-bao-mau.ts dòng 29 (đề xuất cấu trúc, mất khoảng 15–20 giây). Bảng duyệt tính lại ngay trên màn, không gọi lại AI.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Thêm hoặc cập nhật mẫu bằng tệp Word (AI đọc, người duyệt)",
  ai: "Chỉ người có quyền «Quản lý mẫu Word» thấy nút «Thêm mẫu mới», «Cập nhật» nên chỉ họ mở được khung này; máy chủ cũng từ chối người không có quyền.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì",
          doan: [
            "Đây là cách khai một khuôn báo cáo mới (hoặc đổi khuôn cũ) mà không phải nhờ ai sửa phần mềm. Bạn đưa tệp Word; AI đọc và đoán mỗi chương, bảng, cột có ý nghĩa gì; bạn duyệt lại những chỗ AI đoán sai; máy kiểm; cuối cùng lưu thành một phiên bản mới của mẫu.",
            "Khung có thanh năm bước ở đầu: «Chọn file Word», «🤖 Đọc file», «Duyệt nghĩa», «Kiểm tra», «Lưu bản mới». Bước đã xong có dấu ✓ xanh, bước đang làm đậm.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Máy chỉ tách được việc vào sổ cái khi biết bảng nào là «bảng việc», cột nào là tên việc, cột nào là hạn. AI giúp đoán nhanh từ tệp Word người ta đã soạn quen tay, khỏi phải gắn nhãn thủ công.",
            "AI có thể đoán sai nên mọi nghĩa đều qua mắt người, và máy còn kiểm lại bằng đúng bộ đọc báo cáo thật trước khi cho lưu.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Công ty quyết định thêm mẫu hay đổi khuôn; người quản lý mẫu soạn tệp Word"],
            ["Khung này", "Đưa tệp lên, duyệt nghĩa, kiểm tra, lưu"],
            ["Sau", "Người dùng bấm «Tải mẫu» ở trang Mẫu báo cáo (tệp Excel dựng từ file Word này), điền tờ «Mẫu trắng», nộp; máy đọc theo đúng định nghĩa vừa lưu"],
          ],
        },
        {
          tieuDe: "④ Các khối trong khung",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Thanh năm bước", "Cho biết đang ở bước nào", "—"],
            ["Ô «Mã mẫu», «Tên mẫu» (chỉ khi thêm mới) và nút chọn tệp", "Đặt tên và đưa tệp", "① Chọn tệp"],
            ["Dòng «🤖 Đang đọc file… N giây»", "Chờ AI đọc", "② AI đọc"],
            ["Bảng duyệt: «Trong file», «🤖 AI hiểu là», «Nghĩa (chọn lại được)», «Ai nhặt việc», «So với bản trước» (chỉ khi cập nhật), «Bắt buộc»", "Duyệt và sửa nghĩa", "③ Duyệt nghĩa"],
            ["Nút «Kiểm tra», «Lưu phiên bản mới», «Thôi»", "Kiểm, lưu, bỏ", "④ Kiểm tra · ⑤ Lưu"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Chọn tệp, điền mã và tên mẫu, duyệt và chọn lại nghĩa, tích chương bắt buộc, bấm «Kiểm tra», bấm «Lưu phiên bản mới»."],
            ["Máy", "Rút khung tệp (các chương, bảng, cột), kiểm lưới luật trên đề xuất của AI, đặt mã nhãn cố định, gắn nhãn vào tệp, đọc lại bằng bộ đọc thật, báo luật kiểm tra nào sẽ tắt, lưu phiên bản và ghi lịch sử."],
            ["🤖 AI", "🤖 Đọc khung tệp và đề xuất nghĩa của từng chương, bảng, cột, kèm lý do ngắn và mức chắc chắn."],
          ],
          ai: [
            "🤖 AI nhận: bản rút gọn của tệp (tên chương, tiêu đề cột, một dòng mẫu), không nhận cả tệp.",
            "🤖 AI làm: chọn nghĩa cho từng chương, bảng, cột trong một danh sách nghĩa cố định; ghi lý do tối đa 20 chữ và đánh dấu chỗ không chắc.",
            "🤖 AI KHÔNG được: bịa chương, bảng, cột không có trong tệp; tự đặt mã nhãn; tự lưu.",
            "🤖 Mất khoảng 15–20 giây. Người kiểm bằng bảng duyệt. AI lỗi hoặc đọc không được thì khung báo đỏ và không có gì bị lưu; thử lại hoặc làm lại tệp.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: chọn tệp Word.",
            "🤖 AI: đọc, đề xuất nghĩa.",
            "MÁY: sửa các đề xuất trái luật và dựng bảng duyệt; lời sửa của máy ghi dưới bảng.",
            "NGƯỜI: duyệt, chọn lại nghĩa sai (lựa chọn của người luôn thắng AI).",
            "MÁY: gắn nhãn và đọc lại để kiểm; đạt mới cho lưu.",
            "NGƯỜI: bấm «Lưu phiên bản mới».",
          ],
        },
      ],
    },
    {
      ten: "① Chọn tệp",
      khoi: [
        {
          doan: [
            "Thêm mẫu mới: điền «Mã mẫu» (máy gợi ý sẵn dạng form-số, có thể đổi; chữ thường, không dấu, số, gạch ngang) và «Tên mẫu» (ví dụ tên đơn vị lập), rồi chọn tệp. Cập nhật: mã và tên đã có, chỉ cần chọn tệp.",
          ],
        },
        {
          bam: [
            "Điền «Mã mẫu» và «Tên mẫu» (chỉ khi thêm mới).",
            "Bấm «Chọn file Word (.docx)» rồi chọn tệp; chỉ nhận đuôi .docx.",
            "Chọn xong là AI bắt đầu đọc ngay, không cần bấm thêm.",
            "Chọn nhầm: bấm «Chọn file khác» (nút đổi tên sau khi đã chọn), mọi thứ làm lại từ đầu.",
          ],
        },
        {
          viDu: [
            "Soạn mẫu cho một ban mới: đặt «Mã mẫu» là form-9 (máy gợi ý sẵn một mã dạng form-số), «Tên mẫu» là «Báo cáo Văn phòng Hội đồng quản trị», chọn tệp Word đã soạn với chương đánh số I., II., tiêu đề chương in đậm, bảng việc có hàng tiêu đề cột.",
          ],
        },
        {
          luuY: [
            "Cập nhật: nên bấm đường «tải mẫu hiện hành về» ngay dưới nút, sửa trên tệp đó rồi chọn lại. Máy giữ được nhãn các bảng số liệu mà luật kiểm tra đang dùng. Tệp gõ lại từ đầu sẽ mất nhãn và máy không cho lưu.",
            "Soạn bằng Word như mọi ngày, không cần gắn nhãn gì.",
          ],
        },
      ],
    },
    {
      ten: "② AI đọc",
      khoi: [
        {
          doan: ["🤖 Ngay sau khi chọn tệp, dòng «🤖 Đang đọc file… N giây (thường 15–20 giây)» hiện và đồng hồ đếm. Trong lúc này các nút khác bị khoá."],
        },
        {
          ketQua: [
            "🤖 Xong thì bảng duyệt hiện ra bên dưới và thanh bước chuyển sang «Duyệt nghĩa».",
            "Nếu AI không đọc được, khung đỏ ghi lý do (ví dụ AI đang hết hạn mức hoặc tệp không đúng dạng). Chưa có gì được lưu.",
          ],
        },
        {
          viDu: ["Tình huống: bạn chọn tệp xong, đồng hồ chạy 18 giây rồi bảng duyệt hiện. Nếu chờ quá lâu mà vẫn báo lỗi, vào Cài đặt → AI bấm «Thử trợ lý AI» để biết AI có đang chạy không."],
        },
        {
          luuY: ["Đừng đóng khung khi đang đọc; nếu lỡ, chọn lại tệp."],
        },
      ],
    },
    {
      ten: "③ Duyệt nghĩa",
      khoi: [
        {
          doan: ["Bảng duyệt liệt kê chương, bảng, cột của tệp từ trên xuống. Chương đứng sát lề, bảng thụt vào một cấp, cột thụt hai cấp. Dòng mờ là chỗ AI không chắc mà bạn chưa chọn lại."],
        },
        {
          bang: [
            ["Cột", "Cho biết gì"],
            ["«Trong file»", "Tên chương, bảng, cột đúng như trong tệp (dòng gạch ngang là phần bản trước có mà tệp mới bỏ)"],
            ["«🤖 AI hiểu là»", "🤖 Nghĩa AI đề xuất, kèm lý do nhỏ bên dưới"],
            ["«Nghĩa (chọn lại được)»", "Ô chọn một giá trị: bấm chọn là áp dụng ngay, dòng ghi «người duyệt chọn»"],
            ["«Ai nhặt việc»", "Việc trong chương này do máy tách hay không tách"],
            ["«So với bản trước»", "Chỉ khi cập nhật: Mới · Giữ nguyên · Đổi tên · Đổi nghĩa · Bỏ"],
            ["«Bắt buộc»", "Ô tích ở dòng chương: chương bắt buộc phải có khi nộp báo cáo"],
          ],
        },
        {
          tieuDe: "Các nghĩa có thể chọn",
          bang: [
            ["Cấp", "Nghĩa", "Hiểu là"],
            ["Chương", "Chương sinh việc — bảng", "Có bảng kế hoạch, mỗi dòng là một việc"],
            ["Chương", "Chương số liệu", "Chủ yếu bảng số liệu, không sinh việc"],
            ["Chương", "Chương thông tin", "Chữ tự do: tóm tắt, cảnh báo, kiến nghị — không sinh việc"],
            ["Bảng", "Bảng sinh việc · Bảng quyết định của lãnh đạo · Bảng số liệu", "Bảng quyết định chỉ dành cho bảng việc Tổng giám đốc giao tay"],
            ["Cột", "Tên việc · Ngày kết thúc / hạn · Tình trạng / đã xong · Dự án · Người / đơn vị phụ trách · Ngày bắt đầu · Kết quả cần có · Mã việc · Hạn quyết định · Thông tin thêm · Không lấy", "Bảng sinh việc bắt buộc có ba cột: Tên việc, Ngày kết thúc / hạn, Tình trạng / đã xong"],
          ],
        },
        {
          bam: [
            "Đọc từng dòng, đối chiếu «Trong file» với «🤖 AI hiểu là».",
            "Chỗ sai: bấm ô «Nghĩa (chọn lại được)» và chọn nghĩa đúng — bấm một lần là áp dụng và đóng.",
            "Tích hoặc bỏ tích cột «Bắt buộc» cho các chương cần thiết.",
            "Đọc khối chữ nhỏ «Máy đã sửa đề xuất của 🤖» nếu có: máy tự sửa những chỗ AI trái luật.",
            "Nếu khung đỏ «Chưa kiểm tra được — sửa nghĩa ở bảng trên:» hiện, làm theo từng dòng lỗi cho tới khi hết.",
          ],
        },
        {
          viDu: [
            "Tình huống: tệp có chương «KIẾN NGHỊ LÃNH ĐẠO». AI đề xuất bảng trong đó là «Bảng quyết định của lãnh đạo», nhưng đó là bảng kiến nghị của phòng gửi lên chứ không phải việc lãnh đạo giao. Bạn đổi nghĩa bảng thành «Bảng số liệu» (và chương là «Chương thông tin»); dòng ghi «người duyệt chọn».",
          ],
        },
        {
          luuY: [
            "Mỗi lần đổi nghĩa, kết quả «Kiểm tra» trước đó bị xoá; phải bấm «Kiểm tra» lại.",
            "Dòng bản trước có mà tệp mới bỏ (gạch ngang, «Bỏ») sẽ làm các luật kiểm tra trỏ vào đó bị xử lý; máy báo ở bước Kiểm tra.",
          ],
        },
      ],
    },
    {
      ten: "④ Kiểm tra",
      khoi: [
        {
          doan: ["Bước máy kiểm thật: gắn nhãn vào tệp theo bảng duyệt rồi đọc lại bằng chính bộ đọc báo cáo lúc nộp. Qua được mới tin là mẫu dùng được."],
        },
        {
          bam: [
            "Thêm mẫu mới: điền đủ «Mã mẫu» và «Tên mẫu», nếu không nút bị mờ và có dòng «Điền mã và tên mẫu để kiểm tra».",
            "Bấm «Kiểm tra». Nút quay trong lúc máy làm.",
          ],
        },
        {
          ketQua: [
            "Đạt: khung xanh «✅ Đạt» báo máy đã gắn nhãn và đọc lại được tệp bằng bộ đọc báo cáo thật, kèm danh sách điều máy đọc được. Nếu có luật kiểm tra trỏ vào bảng hay cột đã bỏ, khung ghi luật nào sẽ tắt khi lưu.",
            "Không đạt: khung đỏ «Chưa lưu được:» kèm từng lỗi (ví dụ bảng sinh việc thiếu cột Tên việc). Sửa nghĩa ở bảng duyệt rồi kiểm lại.",
          ],
        },
        {
          viDu: [
            "Tình huống: kiểm tra báo «Bảng sinh việc … thiếu cột Ngày kết thúc / hạn». Bạn nhìn bảng duyệt, thấy cột «Hạn hoàn thành» AI xếp nhầm là «Thông tin thêm»; đổi sang «Ngày kết thúc / hạn», bấm «Kiểm tra» lại và đạt.",
          ],
        },
        {
          luuY: ["«Kiểm tra» không ghi gì; chỉ khi bấm «Lưu phiên bản mới» mới có thay đổi."],
        },
      ],
    },
    {
      ten: "⑤ Lưu bản mới",
      khoi: [
        {
          doan: ["Nút «Lưu phiên bản mới» chỉ hiện sau khi kiểm tra đạt. Máy kiểm lại từ đầu một lần nữa rồi mới lưu, không tin hoàn toàn bước trước."],
        },
        {
          bam: [
            "Bấm «Lưu phiên bản mới».",
            "Chờ thông báo xanh ở đầu trang Mẫu báo cáo.",
            "Muốn bỏ giữa chừng: bấm «Thôi» (bị khoá trong lúc đang lưu).",
          ],
        },
        {
          ketQua: [
            "Mẫu có phiên bản mới (mẫu mới tạo thì là bản 1); tệp đã gắn nhãn thành tệp mẫu để tải.",
            "Luật kiểm tra trỏ vào bảng, cột đã bỏ được tắt hoặc bỏ mẫu này khỏi phần áp dụng; thông báo ghi số luật đã xử lý.",
            "Lịch sử ghi một dòng «Tải lên» cho mẫu, kèm tên tệp, mã băm tệp, các chương.",
            "Từ giờ người tải mẫu nhận tệp mới; báo cáo đang soạn theo bản cũ có thể cần chép sang mẫu mới.",
          ],
        },
        {
          viDu: ["Tình huống: lưu xong, thanh xanh hiện «Đã lưu mẫu … — bản 3.», cột «Phiên bản» của dòng mẫu đổi từ 2 sang 3 và bản 2 vẫn tải được ở «Các phiên bản tệp mẫu»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Đỏ: AI chưa đọc được", "AI đang hết hạn mức hoặc tệp không đọc được. Kiểm Cài đặt → AI, rồi chọn lại tệp."],
            ["Nút «Kiểm tra» mờ", "Còn lỗi cấu trúc ở bảng duyệt, hoặc (mẫu mới) chưa điền mã hoặc tên."],
            ["Kiểm tra báo bảng sinh việc thiếu cột", "AI xếp nhầm cột; chọn lại nghĩa đúng cho cột đó."],
            ["Cập nhật mà máy báo mất nhãn các bảng số liệu", "Bạn dùng tệp gõ lại từ đầu. Tải mẫu hiện hành về, sửa trên đó."],
            ["Mã mẫu bị từ chối", "Mã chỉ gồm chữ thường không dấu, số, gạch ngang (từ 2 đến 41 ký tự) và không được trùng mẫu có sẵn; đặt mã khác."],
            ["Lưu báo lỗi dù vừa kiểm đạt", "Máy kiểm lại lúc lưu; đọc lỗi, sửa bảng duyệt rồi kiểm tra lại."],
            ["Thoát giữa chừng", "Bấm «Thôi»; chưa lưu thì chưa có gì thay đổi."],
          ],
        },
      ],
    },
  ],
  canCu: "Khai báo mẫu báo cáo không cần sửa phần mềm (đợt D, 01/10/2026): AI đề xuất, người duyệt, máy kiểm bằng bộ đọc thật; quyền «Quản lý mẫu Word».",
};
