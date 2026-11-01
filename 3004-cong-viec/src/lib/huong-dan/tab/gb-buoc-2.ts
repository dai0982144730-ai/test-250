// Hướng dẫn bản 2 (tab) — Gửi báo cáo, BƯỚC 2 «Sửa lỗi». Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/kiem-tra/BuocSuaLoi.tsx (Vấn đề · Đề xuất · Duyệt, ODeXuat, NutDuyet, «Đồng ý cả N đề xuất», «Bỏ qua tất cả cảnh báo (N)», «Sửa N mục đã đồng ý vào file») · components/gui/nop/DongVanDe.tsx
// · components/gui/KhungSoanGui.tsx (noiDungBuoc2, liên kết «Tải bản đánh dấu lỗi» (Excel — mau-excel/danh-dau-excel.ts) / «Tải bản Word đánh dấu lỗi» (Word cũ), «Tải lên bản đã sửa»; sửa vào ô Excel: mau-excel/sua-vao-excel.ts) · lib/kiem-tra/sua-loi-ai.ts (AI giải thích và đề xuất, chờ tối đa 150 giây; ngày hạn để chỗ {HAN}).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gửi báo cáo — Bước 2 · Sửa lỗi",
  ai: "Người nộp báo cáo. Lỗi mức «Chặn gửi» bắt buộc sửa; cảnh báo thì sửa hoặc bấm «Bỏ qua». Khối đề xuất sửa ghi thẳng vào ô của tệp — cả báo cáo Excel lẫn báo cáo Word cũ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Bước này là gì?",
          doan: ["Máy đã kiểm từng ô của tệp; bước này liệt kê mọi lỗi và cảnh báo, mỗi vấn đề một dòng gồm ba cột: «Vấn đề» · «Đề xuất» · «Duyệt». Với mỗi lỗi, 🤖 AI giải thích vì sao sai và đề xuất chữ mới «Cũ → Mới». Bạn xem, sửa chữ mới nếu chưa ưng, bấm «Đồng ý», rồi bấm MỘT nút để máy ghi tất cả vào tệp."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Không phải mở tệp mới biết sai ở đâu: lỗi hiện ngay, chỉ đúng ô.",
            "Thiếu ô bắt buộc, thiếu hạn, ngày sai mà gửi lên thì cấp trên phải trả về. Chặn từ đầu thì đỡ vòng đi vòng lại.",
            "AI chỉ đề xuất; người duyệt mới ghi vào tệp, nên không có sửa tự động ngoài ý bạn.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Bước 2"],
            ["Trước", "Bước 1: tải tệp, máy kiểm", "Cho ra danh sách lỗi"],
            ["Bước 2", "Sửa lỗi chặn, xử lý cảnh báo", "Làm sạch tệp"],
            ["Sau", "Bước 3 · Soát nội dung (chỉ chạy trên bản đã hết lỗi)", "Tiếp tục"],
          ],
        },
        {
          tieuDe: "④ Bước có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Dòng tóm tắt đầu bước: «Đủ điều kiện bắt buộc» (xanh) hoặc «Chưa gửi được · N lỗi chặn · M cảnh báo chưa xử lý» (đỏ)", "Biết còn bao nhiêu vấn đề", "① Đọc danh sách"],
            ["Bảng ba cột «Vấn đề» · «Đề xuất» · «Duyệt»", "Duyệt từng dòng", "② Duyệt từng dòng"],
            ["Ba nút cuối bảng: «Đồng ý cả N đề xuất» · «Bỏ qua tất cả cảnh báo (N)» · «Sửa N mục đã đồng ý vào file»", "Duyệt nhanh và ghi vào tệp", "③ Ghi vào tệp"],
            ["Hai liên kết «Tải bản đánh dấu lỗi» · «Tải lên bản đã sửa»", "Sửa trong tệp rồi tải lại", "④ Sửa trong tệp"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc, sửa chữ mới, chọn ngày hạn, bấm «Đồng ý» hay «Bỏ qua», bấm «Sửa N mục đã đồng ý vào file»", "Người quyết từng chỗ"],
            ["MÁY", "Phát hiện lỗi theo luật cố định (thiếu ô, thiếu hạn, ngày sai…); lấy chữ CŨ thẳng từ tệp; quyết ô nào được phép sửa; ghi chữ mới vào đúng ô; lưu bản mới và kiểm lại", "Cùng tệp cùng kết quả"],
            ["🤖 AI", "🤖 Viết lời giải thích vì sao sai (chữ thường) và chữ mới đề xuất", "🤖 Có thể chưa hay. Chữ cũ do máy lấy nên không bịa; ngày không do AI chọn"],
          ],
          ai: [
            "🤖 AI nhận danh sách lỗi và chữ cũ trong từng ô. Một lượt AI cho cả danh sách lỗi. Chờ thường 30 giây, lâu nhất 2 đến 3 phút; trong lúc chờ khối ghi «🤖 Đang đọc từng lỗi để đề xuất cách sửa…».",
            "🤖 AI KHÔNG tự ghi vào tệp, không bịa ngày (chỗ hạn để bạn chọn ngày), không sửa ô máy không cho phép sửa.",
            "Người kiểm: đọc chữ mới trong ô «🤖 Nên sửa thành», sửa nếu chưa ưng rồi mới Đồng ý. AI tắt hoặc lỗi: vẫn có danh sách lỗi và dòng thông báo kèm nút «Hỏi lại»; bạn tự gõ chữ mới.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "MÁY", "Liệt kê lỗi, lấy chữ cũ, xác định ô được sửa"],
            ["2", "🤖 AI", "🤖 Giải thích và đề xuất chữ mới cho từng lỗi"],
            ["3", "NGƯỜI", "Sửa chữ mới nếu cần, chọn ngày hạn, bấm «Đồng ý» hoặc «Bỏ qua» (cảnh báo)"],
            ["4", "NGƯỜI", "Bấm «Sửa N mục đã đồng ý vào file»"],
            ["5", "MÁY", "Ghi vào đúng ô, lưu thành bản mới, kiểm lại ngay; hết lỗi thì chuyển sang Bước 3"],
          ],
        },
      ],
    },
    {
      ten: "① Đọc danh sách",
      khoi: [
        {
          tieuDe: "Ba loại vấn đề",
          bang: [
            ["Loại (nhãn dưới dòng)", "Ý nghĩa", "Xử lý"],
            ["Chặn gửi", "Lỗi bắt buộc: thiếu ô bắt buộc, thiếu hạn, ngày không hợp lệ…", "BẮT BUỘC sửa. Không bỏ qua được"],
            ["Cảnh báo", "Đáng chú ý nhưng không chặn", "Sửa, hoặc «Bỏ qua» từng dòng, hoặc «Bỏ qua tất cả cảnh báo (N)»"],
            ["Gợi ý (dòng xám của máy)", "Chỉ để đọc", "Không cần duyệt"],
          ],
          luuY: ["Cảnh báo «việc trùng» KHÔNG xử lý ở đây mà quyết ở cột «Vào sổ cái» của Bước 4."],
        },
        {
          tieuDe: "Đọc một dòng",
          ds: [
            "Cột «Vấn đề»: nội dung lỗi, dòng xám bên dưới ghi mức, vị trí (ô nào, bảng nào, dòng nào) và liên kết «xem trong báo cáo <tuần · đơn vị>». Bấm liên kết để mở bản gốc, khung cam là chỗ bị lỗi.",
            "Cột «Đề xuất»: «Đang ghi: <chữ cũ>» rồi «🤖 Nên sửa thành:» và ô chữ để bạn sửa. Dòng nhỏ «🤖 …» dưới ô là lý do của AI.",
            "Cột «Duyệt»: nút «Đồng ý», và «Bỏ qua» nếu là cảnh báo.",
          ],
          viDu: ["Dòng lỗi «Thiếu ngày kết thúc» cho việc «Hoàn thiện hồ sơ thanh toán» (tình huống minh hoạ). Đề xuất của AI: giữ nguyên tên việc và thêm cụm hạn, ô ghi chữ có chỗ {HAN}. Bên dưới ô hiện «Ngày hạn:» để bạn chọn ngày; AI không tự chọn ngày."],
        },
      ],
    },
    {
      ten: "② Duyệt từng dòng",
      khoi: [
        {
          bam: [
            "Đọc dòng tóm tắt: nếu xanh «Đủ điều kiện bắt buộc» thì chỉ còn cảnh báo (nếu có).",
            "Chờ dòng «🤖 Đang đọc từng lỗi để đề xuất cách sửa…» biến mất (thường 30 giây).",
            "Ở mỗi dòng: nếu có ô chọn «Sửa ô: …» (lỗi liên quan nhiều ô) thì chọn ô muốn sửa. Đọc «Đang ghi» và «🤖 Nên sửa thành», sửa chữ mới nếu chưa ưng.",
            "Lỗi thiếu hạn: chọn ngày ở «Ngày hạn». Chưa chọn ngày thì nút «Đồng ý» mờ, rê chuột đọc «Chọn ngày hạn trước».",
            "Bấm «Đồng ý» để đánh dấu. Việc này CHỈ đánh dấu, chưa ghi vào tệp; dòng đổi thành «Đã đồng ý» kèm liên kết «đổi» để bỏ đánh dấu.",
            "Cảnh báo không muốn sửa thì bấm «Bỏ qua».",
          ],
          viDu: ["Bạn có 3 dòng: hai lỗi chặn thiếu hạn, một cảnh báo về cách viết tên người. Bạn chọn ngày cho hai dòng thiếu hạn rồi «Đồng ý» cả hai; cảnh báo thì «Bỏ qua» vì chữ vẫn đúng. Tóm tắt đổi sang màu xanh khi ghi xong (tình huống minh hoạ)."],
          luuY: [
            "«Đồng ý» mờ với câu «Chữ mới đang giống chữ cũ»: bạn chưa sửa gì. Sửa chữ mới cho khác chữ cũ.",
            "Dòng ghi «Không nằm gọn trong một ô — sửa trong tệp rồi bấm “Tải lên bản đã sửa”»: lỗi không sửa được bằng một ô, xem tab ④ Sửa trong tệp.",
          ],
        },
      ],
    },
    {
      ten: "③ Ghi vào tệp",
      khoi: [
        {
          bam: [
            "Muốn duyệt nhanh nhiều dòng: bấm «Đồng ý cả N đề xuất» (đánh dấu mọi đề xuất đang hiện, vẫn chưa ghi). Nút chỉ hiện khi có từ 2 đề xuất chưa duyệt trở lên.",
            "Cảnh báo không cần sửa: bấm «Bỏ qua tất cả cảnh báo (N)».",
            "Khi đã đánh dấu xong, bấm «Sửa N mục đã đồng ý vào file». Nút mờ nếu bạn chưa «Đồng ý» dòng nào.",
          ],
          ketQua: [
            "Máy ghi chữ mới vào đúng ô trong tệp, lưu thành bản mới, kiểm lại ngay. Nếu hai lỗi cùng một ô, máy nối các phần thêm vào sau chữ cũ để đề xuất sau không đè mất đề xuất trước.",
            "Hết lỗi thì khối 2 có dấu ✓ và khối «3 · Soát nội dung» phát sáng.",
          ],
          viDu: ["Bạn đã «Đồng ý» 3 dòng (hai dòng thiếu hạn và một dòng sai ngày). Bấm «Sửa 3 mục đã đồng ý vào file»: sau vài giây khối 2 ghi «đã xử lý hết», khối 3 phát sáng và dòng tóm tắt đổi sang xanh «Đủ điều kiện bắt buộc» (tình huống minh hoạ)."],
          luuY: ["Ghi vào tệp là MỘT lần, theo mọi dòng đã đồng ý. Muốn đổi ý một dòng thì bấm «đổi» trước khi bấm nút ghi."],
        },
      ],
    },
    {
      ten: "④ Sửa trong tệp",
      khoi: [
        {
          doan: ["Khi còn lỗi, góc phải dòng tóm tắt có hai liên kết. Dùng khi lỗi không sửa được bằng một ô (vd thiếu cả một dòng việc). «Tải bản đánh dấu lỗi» trả lại chính tệp Excel của bạn: ô chặn gửi nền ĐỎ, ô cảnh báo nền VÀNG, rê chuột vào ô để đọc ghi chú; tờ «Lỗi cần sửa» ở cuối tệp liệt kê đủ mọi lỗi, kể cả lỗi không gắn vào ô nào. Báo cáo Word cũ: «Tải bản Word đánh dấu lỗi»."],
          bam: [
            "Bấm «Tải bản đánh dấu lỗi», mở bằng Excel; xem tờ «Lỗi cần sửa» để biết đủ các chỗ.",
            "Sửa đúng các ô tô màu ở tờ báo cáo (không cần xoá màu, ghi chú hay tờ «Lỗi cần sửa» — máy không đọc chúng; lần đánh dấu sau máy tự bỏ dấu cũ), lưu.",
            "Bấm «Tải lên bản đã sửa», chọn tệp vừa sửa: hệ thống lưu thành bản mới (bản 2…) và kiểm lại.",
          ],
          viDu: ["Báo cáo thiếu hẳn một dòng việc trong bảng «Kết quả và kế hoạch việc». Đề xuất sửa một ô không giải quyết được. Bạn tải bản đánh dấu lỗi, thêm dòng việc ngay dưới dòng tô màu, lưu rồi tải lên bản đã sửa; máy kiểm lại và dòng việc mới có mặt ở Bước 4."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Dòng chờ «🤖 Đang đọc từng lỗi…» lâu", "AI chậm khi nhiều người nộp cùng lúc. Chờ thêm; nếu có nút «Hỏi lại» thì bấm"],
            ["Không có đề xuất, chỉ có dòng lỗi", "AI tắt hoặc lỗi. Tự gõ chữ mới vào ô «Sửa thành», hoặc sửa trong tệp rồi tải lại"],
            ["Nút «Đồng ý» mờ", "Chưa chọn ngày hạn, hoặc chữ mới còn giống chữ cũ. Rê chuột đọc lý do"],
            ["Nút «Sửa N mục đã đồng ý vào file» mờ", "Chưa «Đồng ý» dòng nào"],
            ["Sửa xong vẫn còn lỗi", "Có lỗi mới lộ ra sau khi sửa, hoặc đề xuất chưa đủ. Đọc lại danh sách và sửa tiếp"],
            ["Không thấy khối sửa, chỉ có hai liên kết", "Bản chưa được lưu (kiểm thử không lưu) hoặc tệp không phải Excel / Word. Tải lên để lưu rồi thử lại"],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 28–29/09/2026: một kiểu dòng Vấn đề · Đề xuất · Duyệt; Đồng ý chỉ đánh dấu, ghi vào tệp MỘT lần bằng nút cuối; lỗi Chặn gửi không bỏ qua được · phân vai chốt 06/09/2026 (máy lấy chữ cũ và quyết ô sửa, AI viết giải thích và chữ mới, người bấm mới ghi) · luật 19.",
};
