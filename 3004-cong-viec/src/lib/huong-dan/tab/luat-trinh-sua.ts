// Hướng dẫn bản 2 (tab) — Ngăn kéo «Thêm luật kiểm tra» / «Sửa luật» (luật riêng). Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/luat/TrinhSuaLuat.tsx (5 bước, nhãn nút, phím tắt, hộp hỏi bỏ thay đổi) · lib/luat/ai/dich.ts (🤖 AI dịch câu luật, chờ tối đa 60 giây)
// · app/api/luat/dich/route.ts (câu tối đa 1000 ký tự; chỉ người sửa được luật) · lib/luat/kho-luat.ts (lưu, phiên bản, kiểm hợp lệ) · lib/luat/ai/kiem.ts (hướng dẫn cho AI cắt ở 800 ký tự).
// Tham số theo dạng luật: hướng dẫn luat-tham-so. Chạy thử: luat-chay-thu. Luật hệ thống: luat-he-thong.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Thêm hoặc sửa một luật kiểm tra",
  ai: "Quản trị viên, người có quyền «cau_hinh.sua», hoặc người được mục «Phân quyền cài đặt» cho phép nhóm luật kiểm tra. Người khác mở ngăn kéo chỉ để xem: có nhãn «chỉ xem», nút «Hủy» đổi thành «Đóng», không thấy nút «Lưu luật» hay «Lưu thay đổi», các ô bị khóa.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Ngăn kéo này là gì",
          doan: [
            "Đây là tờ phiếu để tạo một luật mới hoặc chỉnh một luật riêng đã có. Nó trượt ra từ mép phải màn hình. Bạn không cần biết lập trình: chỉ cần viết điều kiện bằng một câu tiếng Việt như dặn một người kiểm tra báo cáo, rồi 🤖 AI giúp đổi câu đó thành cách chạy cụ thể.",
            "Ngăn kéo có 5 bước xếp dọc, đánh số 1 đến 5: viết câu luật, chọn cách chạy, điền tham số (hoặc hướng dẫn cho AI), chọn mức, chạy thử. Bước nào chưa mở được thì mờ đi; làm xong bước nào thì số chuyển thành dấu tích xanh.",
          ],
        },
        {
          tieuDe: "② Vì sao làm kiểu này",
          ds: [
            "Người hiểu báo cáo nhất là người quản trị, không phải người lập trình. Viết bằng câu thường thì không phải nhờ ai sửa phần mềm mỗi lần có một yêu cầu mới.",
            "AI đề xuất rồi người duyệt: máy không tự tạo luật; chỉ khi bạn bấm «Lưu luật» thì luật mới có hiệu lực.",
            "Chạy thử trước khi lưu để biết luật có bắt nhầm những báo cáo đang có hay không.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì"],
            ["Trước", "Ở danh sách Luật kiểm tra, bấm «Thêm luật» (hoặc tên một luật riêng để sửa)"],
            ["Ngăn kéo này", "Viết câu luật → AI đề xuất → chỉnh → chạy thử → «Lưu luật»"],
            ["Sau", "Luật xuất hiện trong danh sách, kiểm mọi báo cáo tải lên từ nay; mỗi lần sửa thêm một phiên bản, quay lại bản cũ được"],
          ],
        },
        {
          tieuDe: "④ Các khối trên ngăn kéo",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["1 · «Viết luật bằng một câu tiếng Việt»", "Câu luật, mẫu áp dụng, nút nhờ AI", "① Viết câu luật"],
            ["2 · «Cách chạy»", "Code, AI hay cả hai; tên, nhóm, dạng luật", "② Cách chạy"],
            ["3 · «Tham số» hoặc «Hướng dẫn cho AI»", "Chỉ rõ ô, bảng, cột và điều kiện", "③ Tham số"],
            ["4 · «Mức khi không đạt»", "Chặn gửi, cảnh báo hay gợi ý", "④ Mức và lưu"],
            ["5 · «Chạy thử trên báo cáo đã có»", "Xem luật bắt lỗi gì", "⑤ Chạy thử và lưu"],
            ["Chân ngăn kéo", "«Hủy», «Lưu luật» hoặc «Lưu thay đổi»", "④ Mức và lưu"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở ngăn kéo"],
            ["Người", "Viết câu luật, chọn mẫu, duyệt hoặc sửa đề xuất, chọn mức, bấm chạy thử, bấm lưu."],
            ["Máy", "Kiểm tham số có khớp mẫu không; dựng lại luật thành một câu «Code sẽ kiểm: …» để bạn đọc; chạy thử trên báo cáo thật; lưu phiên bản; từ chối lưu nếu luật chưa hợp lệ."],
            ["🤖 AI", "🤖 Đọc câu luật và đề xuất cách chạy (bước 1) · 🤖 kiểm báo cáo với luật AI khi chạy thử (bước 5)."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người viết câu luật và chọn mẫu áp dụng.",
            "Người bấm «AI đề xuất cách chạy» (hoặc nhấn Enter trong ô câu luật).",
            "🤖 AI trả lời trong tối đa 60 giây: nên dùng Code hay AI, dạng luật nào, tham số gì, tên và nhóm gợi ý, mức gợi ý, kèm một đoạn giải thích. AI ưu tiên luật Code vì chắc chắn hơn; chỉ chọn AI khi điều kiện cần hiểu nghĩa.",
            "Máy kiểm đề xuất có khớp ô, bảng, cột của mẫu hay không; chỗ nào lệch thì hiện ghi chú vàng.",
            "Người xem, sửa nếu cần, chạy thử, rồi bấm «Lưu luật». Từ lúc này luật mới có hiệu lực.",
            "AI lỗi, tắt hoặc quá giờ: ngăn kéo báo «AI chưa đề xuất được …» và bạn vẫn bấm «Tự chọn dạng luật» làm tay được, không bị kẹt.",
          ],
        },
      ],
    },
    {
      ten: "① Viết câu luật",
      khoi: [
        { doan: ["Bước đầu chỉ cần hai việc: viết điều kiện và chọn nó áp cho mẫu báo cáo nào. Chưa cần biết chạy bằng Code hay AI."] },
        {
          bam: [
            "Gõ câu luật vào ô «Câu luật». Viết như dặn người kiểm tra, ví dụ «Cột Kết thúc của bảng Công việc phải có ngày». Tối đa 1.000 ký tự.",
            "Chưa biết viết gì? Dưới ô có dòng «Thử một câu» với 9 câu gợi ý (như «Nếu Đã xong thì phải có ngày Kết thúc»). Bấm một câu thì nó điền vào ô.",
            "Ở «Áp dụng cho mẫu» chọn «Mọi mẫu» hoặc bấm từng chip «Form N». Chọn đủ mọi chip thì máy tự đổi thành «Mọi mẫu»; đang ở «Mọi mẫu» mà bấm một chip Form thì chỉ còn đúng Form đó. Phải chọn ít nhất một mẫu.",
            "Bấm «AI đề xuất cách chạy» (Enter trong ô câu cũng được; Shift + Enter để xuống dòng). Muốn tự làm: bấm «Tự chọn dạng luật».",
          ],
        },
        {
          viDu: [
            "Chị Hà, quản trị, muốn bắt lỗi khi một dòng việc đã tích «Đã xong» mà để trống ngày kết thúc. Chị bấm câu gợi ý «Nếu Đã xong thì phải có ngày Kết thúc», chọn chip «Form 7», rồi bấm «AI đề xuất cách chạy».",
            "Nếu muốn kiểm cả hai mẫu cấp phòng, chị bấm thêm chip của từng Form. Mỗi chip có chú thích tên mẫu khi rê chuột.",
          ],
        },
        {
          ai: [
            "AI nhận: câu luật của bạn, danh sách mẫu áp dụng, và định nghĩa ô, bảng, cột của các mẫu đó (để biết gọi đúng tên).",
            "AI làm: chọn cách chạy, dạng luật và tham số; viết lại câu thành hướng dẫn rõ ràng cho AI kiểm; gợi ý tên (không quá 60 ký tự), nhóm và mức.",
            "AI KHÔNG làm: không lưu gì, không bật luật, không đụng báo cáo.",
            "Thời gian: tối đa 60 giây, nút hiện «AI đang đọc câu luật…». Người kiểm: toàn bộ đề xuất hiện ở bước 2 để bạn đọc, sửa.",
            "Mất kết nối hoặc AI tắt: hiện ghi chú đỏ; bấm «Tự chọn dạng luật» để làm tay.",
          ],
        },
        {
          luuY: [
            "Quên viết câu luật mà bấm «AI đề xuất cách chạy» thì ngăn kéo nhắc «Viết câu luật trước đã» và đưa con trỏ về ô câu.",
            "Câu quá 1.000 ký tự máy từ chối. Hãy tách thành hai luật.",
            "Sửa luật có sẵn: ô câu luật vẫn sửa được (luật riêng). Luật hệ thống khóa ô này.",
          ],
        },
      ],
    },
    {
      ten: "② Cách chạy",
      khoi: [
        { doan: ["Bước 2 hiện sau khi bạn bấm một trong hai nút ở bước 1. Nếu AI đã đề xuất, đầu bước có khung viền màu nhấn «AI đề xuất» kèm huy hiệu cách kiểm, huy hiệu mức và đoạn giải thích vì sao chọn vậy; có thể kèm ghi chú vàng cảnh báo. Mọi chữ trong khung đó là 🤖 chữ của AI, không phải của máy."] },
        {
          tieuDe: "Ba cách chạy khác nhau thế nào",
          bang: [
            ["Cách", "Ai kiểm", "Ưu điểm", "Chọn khi"],
            ["Code", "Máy, theo công thức cố định", "Chắc chắn, tức thì, được chặn gửi", "Điều kiện nói rõ được bằng ô, cột, số, ngày"],
            ["AI", "🤖 AI đọc hiểu nội dung", "Hiểu nghĩa, linh hoạt", "Cần đọc hiểu: ghi chú có nêu lý do, hai mục có mâu thuẫn. Có thể sai nên nên để «Cảnh báo»"],
            ["Code + AI", "Máy kiểm phần chắc chắn, 🤖 AI xem thêm", "Pha trộn", "Hiếm dùng"],
          ],
        },
        {
          bam: [
            "Chọn một trong ba thẻ Code, AI, Code + AI (AI đã chọn sẵn một thẻ thì bạn đổi được).",
            "Điền «Tên luật» (bắt buộc, tối đa 80 ký tự) và «Nhóm» (tùy chọn; gõ nhóm sẵn có sẽ được gợi ý, hoặc gõ nhóm mới).",
            "Nếu cách chạy có phần Code: chọn ô «Dạng luật code» (có 13 dạng, xếp theo nhóm: Ô nhập · Ngày và số · Tính toán số liệu · Bảng · Giá trị và điều kiện · Mục nội dung). Chọn xong hiện thẻ mô tả và ví dụ của dạng đó.",
          ],
        },
        {
          viDu: [
            "Câu «Cột Lệch = TH − KH» → AI chọn Code, dạng «Phép tính giữa các số». Câu «Ghi chú sự cố phải nêu nguyên nhân» → AI chọn AI vì máy không hiểu «nêu nguyên nhân» nghĩa là gì.",
            "Chị Hà thấy AI đề xuất mức «Chặn gửi» cho một luật AI. Chị đổi cách chạy thành Code + AI và hạ mức xuống «Cảnh báo» ở bước 4 vì AI có thể kết luận sai.",
          ],
        },
        {
          luuY: [
            "Đổi sang dạng luật khác thì tham số bị đặt lại về mặc định. Chọn dạng cho đúng trước khi điền tham số.",
            "Khi AI nói «Chỉ áp dụng cho mẫu có chỗ này: …» có nút «Dùng gợi ý» để thu hẹp mẫu áp dụng cho khớp. Không bấm thì giữ mẫu bạn đã chọn.",
            "Bấm «Đề xuất lại» (nút đổi tên sau lần đầu) nếu đề xuất chưa ưng; AI trả lời lại và thay cách chạy, dạng luật, tham số, mức bằng đề xuất mới (tên chỉ đổi nếu bạn chưa tự sửa tên). Những gì bạn đã chỉnh tay ở các ô đó sẽ bị thay.",
          ],
        },
      ],
    },
    {
      ten: "③ Tham số",
      khoi: [
        { doan: ["Bước này nói rõ luật kiểm ô nào, bảng nào, cột nào, điều kiện gì. Chọn theo nhãn đúng như trên mẫu Word, bạn không cần biết mã bên trong. Tiêu đề bước đổi theo cách chạy: «Tham số» (Code) · «Hướng dẫn cho AI» (AI) · «Tham số và hướng dẫn AI» (Code + AI). Bước mờ cho tới khi bạn chọn dạng luật."] },
        {
          tieuDe: "Với luật Code",
          doan: ["Các ô hiện ra khác nhau tùy dạng luật bạn chọn ở bước 2. Chi tiết từng dạng xem hướng dẫn «Dạng luật code và ô tham số». Chọn xong, dưới các ô có dòng «Code sẽ kiểm: …» do máy dịch ngược tham số của bạn thành một câu thường. Hãy đọc câu này: nếu nó không giống ý bạn thì sửa tham số."],
        },
        {
          tieuDe: "Với luật AI",
          bam: [
            "Viết vào ô «Hướng dẫn cho AI»: AI đọc chỗ nào, thế nào là đạt, thế nào là không đạt. Ô này bắt buộc.",
            "Chỉ đúng tên mục hoặc bảng sẽ giúp AI chính xác hơn. Hướng dẫn quá dài sẽ bị cắt: AI chỉ nhận khoảng 800 ký tự đầu của mỗi luật.",
          ],
        },
        {
          viDu: [
            "Luật Code «Mức độ chỉ là Cao, TB hoặc Thấp»: chọn dạng «Chọn trong danh sách», chọn cột «Mức độ» của bảng Kiến nghị, gõ ba giá trị Cao, TB, Thấp. Dòng «Code sẽ kiểm» đọc lại đúng ý đó.",
            "Luật AI «Người kiểm soát phải là người khác người lập»: hướng dẫn cho AI viết «So ô Người lập và Người kiểm soát; cùng một người thì không đạt.»",
          ],
        },
        {
          ai: [
            "AI nhận: nội dung chữ của báo cáo và hướng dẫn của mọi luật AI áp dụng cho mẫu, gom trong MỘT lượt.",
            "AI làm: với từng luật trả lời đạt, không đạt hoặc chưa đủ dữ kiện, kèm một câu nêu đúng dòng vi phạm và chỉ chỗ lỗi.",
            "AI KHÔNG làm: không bịa số liệu, tên, ngày không có trong báo cáo; không sửa báo cáo của bạn.",
            "Người kiểm: bước chạy thử cho xem AI kết luận gì trên báo cáo thật.",
          ],
        },
        {
          luuY: [
            "Ô thiếu bắt buộc sẽ viền đỏ sau khi bạn bấm lưu lần đầu; lỗi riêng của từng tham số hiện ngay cạnh ô đó.",
            "Luật áp cho đúng MỘT mẫu mà bạn chọn ô hay cột mẫu đó không có thì máy từ chối lưu. Luật áp cho nhiều mẫu thì máy bỏ qua mẫu thiếu chỗ đó.",
          ],
        },
      ],
    },
    {
      ten: "④ Mức và lưu",
      khoi: [
        { doan: ["Bước 4 hỏi: báo cáo không đạt luật này thì chuyện gì xảy ra. Ba thẻ để chọn, giống huy hiệu mức ở danh sách."] },
        {
          bang: [
            ["Mức", "Khi không đạt"],
            ["Chặn gửi", "Khóa nút Gửi"],
            ["Cảnh báo", "Báo cho người nộp, vẫn gửi được"],
            ["Gợi ý", "Chỉ nhắc nhẹ"],
          ],
        },
        {
          tieuDe: "Luật có phần AI mà để «Chặn gửi»",
          doan: ["Hiện thêm ghi chú: người gửi phải chờ AI kiểm xong (vài giây) và AI có thể kết luận sai. Đồng thời có ô chọn «Khi AI lỗi hoặc quá thời gian chờ»: «Vẫn cho gửi» (khuyên dùng, AI trục trặc không làm kẹt việc gửi) hoặc «Chặn gửi» (AI trục trặc thì không ai gửi được mẫu này cho tới khi AI chạy lại)."],
        },
        {
          bam: [
            "Chọn mức.",
            "Công tắc cuối bước: «Bật ngay khi lưu» hoặc «Lưu ở trạng thái tắt» (để lưu nháp, chạy thử kỹ rồi bật sau).",
            "Bấm «Lưu luật» (luật mới) hoặc «Lưu thay đổi» (đang sửa; nút xám khi chưa đổi gì). Phím tắt: Ctrl + Enter lưu, Esc đóng.",
          ],
        },
        {
          ketQua: [
            "Máy kiểm luật có hợp lệ rồi mới lưu. Lưu được thì ngăn kéo đóng, danh sách báo «Đã lưu luật “tên” — phiên bản N», dòng luật nháy một vạch bên trái.",
            "Chưa lưu được thì khung đỏ «Chưa lưu được: …» liệt kê từng lỗi; ngăn kéo vẫn mở để sửa.",
            "Còn thiếu ô thì khung đỏ «Còn thiếu thông tin — điền các ô viền đỏ:» và chân ngăn kéo hiện «Còn thiếu: …».",
          ],
        },
        {
          viDu: [
            "Luật mới «Doanh thu tổng khớp từng nhà máy» (Code, dạng «Dòng tổng bằng tổng các dòng»): chị Hà chọn «Cảnh báo» và «Lưu ở trạng thái tắt», chạy thử vài lần, thấy ổn rồi bật công tắc ở danh sách.",
            "Đóng ngăn kéo khi đã gõ dở: hiện «Có thay đổi chưa lưu. Đóng và bỏ các thay đổi?» với hai nút «Ở lại sửa tiếp» và «Bỏ thay đổi».",
          ],
        },
      ],
    },
    {
      ten: "⑤ Chạy thử và lưu",
      khoi: [
        { doan: ["Bước 5 chạy luật (kể cả chưa lưu) trên các báo cáo đã có trong hệ thống để bạn thấy luật bắt được gì. Cách dùng chi tiết xem hướng dẫn «Chạy thử luật»: tab này chỉ nhắc ngắn."] },
        { bam: ["Điền đủ các ô bắt buộc (nút chạy thử mờ nếu còn thiếu, rê chuột để xem thiếu gì).", "Bấm «Chạy thử trên báo cáo đã có».", "Đọc kết quả, bấm tên báo cáo để mở báo cáo và thấy chỗ bị lỗi được khoanh.", "Ưng ý thì bấm «Lưu luật» ở chân ngăn kéo."] },
        {
          viDu: [
            "Chạy thử luật «Báo cáo phải có ít nhất 1 việc trong bảng Công việc» thấy vài báo cáo không đạt. Quản trị mở từng báo cáo đó, thấy đúng là bảng Công việc để trống: luật đúng ý, lưu.",
          ],
        },
        {
          luuY: [
            "Dòng nhỏ cuối ngăn kéo «Sẽ lưu: …» tóm tắt cách kiểm, mức, mẫu và nhóm sắp lưu; liếc qua trước khi bấm lưu.",
            "Luật có AI chỉ chạy thử trên vài báo cáo mẫu, xem tab «Hay vướng».",
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
            ["Bước 2 và 3 mờ, bấm không được", "Chưa bấm «AI đề xuất cách chạy» hoặc «Tự chọn dạng luật» ở bước 1, hoặc chưa chọn dạng luật ở bước 2."],
            ["«AI chưa đề xuất được …»", "AI tắt, quá 60 giây hoặc trả lời hỏng. Bấm «Đề xuất lại» hoặc «Tự chọn dạng luật». Kiểm tra Cài đặt › Kết nối › AI."],
            ["Lưu báo lỗi về ô, cột, bảng không có trong mẫu", "Tham số trỏ vào chỗ mẫu không có. Chọn lại ô, cột từ danh sách hiện sẵn, hoặc thu hẹp «Áp dụng cho mẫu» về đúng mẫu có chỗ đó."],
            ["Đổi dạng luật xong mất hết tham số", "Đúng thiết kế: mỗi dạng có tham số khác, nên đặt lại về mặc định. Chọn dạng trước rồi điền."],
            ["Muốn sửa luật hệ thống ở đây", "Luật hệ thống chỉ cho tắt, đổi mức, đổi mẫu áp dụng. Xem hướng dẫn «Luật hệ thống: bật tắt và mức»."],
            ["Đóng ngăn kéo bị hỏi «Có thay đổi chưa lưu»", "Bạn đã sửa mà chưa lưu. Chọn «Ở lại sửa tiếp» hoặc «Bỏ thay đổi»."],
            ["Không thấy nút «Lưu luật»", "Bạn không có quyền sửa luật. Nhờ quản trị cấp quyền."],
          ],
        },
      ],
    },
  ],
  canCu: "Luật kiểm tra trong Cài đặt: phần dịch câu luật bằng AI, phần kiểm hợp lệ và lưu phiên bản luật, phần kiểm luật AI nền khi tải báo cáo lên.",
};
