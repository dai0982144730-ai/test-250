// Hướng dẫn bản 2 (tab) — Gửi báo cáo, BƯỚC 3 «Soát nội dung». Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/gui/nop/Buoc3SoatNoiDung.tsx (luật AI + góp ý gộp một danh sách, tình trạng, nút «Đồng ý cả N đề xuất», «Bỏ qua tất cả góp ý (N)», «Sửa N mục đã đồng ý vào file», hỏi lại 2,5 giây một lần tối đa 60 lần)
// · components/gui/nop/DongVanDe.tsx · components/gui/KhungSoanGui.tsx (noiDungBuoc3, ghiBuoc3) · lib/luat/ai/luot.ts, kiem.ts, dich.ts (AI kiểm luật) · lib/kiem-tra/gop-y-ai.ts (AI góp ý).
// Luật nội dung của đơn vị khai ở màn Luật kiểm tra; ở đây chỉ nhắc bằng lời.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gửi báo cáo — Bước 3 · Soát nội dung",
  ai: "Người nộp báo cáo. Luật mức «Chặn gửi» không bỏ qua được; luật khác và góp ý thì «Bỏ qua» được. Đồng ý chỉ được khi vấn đề chỉ vào MỘT ô cụ thể.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Bước này là gì?",
          doan: ["Sau khi tệp hết lỗi, 🤖 AI đọc nội dung báo cáo theo hai nguồn gộp một danh sách cùng kiểu dòng với Bước 2: (1) LUẬT nội dung của đơn vị (người quản trị khai ở màn Luật kiểm tra, ví dụ «mục kết quả không được để trống») và (2) GÓP Ý nội dung (mục trống, số liệu mâu thuẫn, sai chính tả tên người hoặc đơn vị)."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Máy chỉ kiểm được thứ đo bằng quy tắc cố định (ô trống, ngày sai). Chuyện như số liệu mâu thuẫn giữa hai mục hay tên người viết sai cần đọc hiểu.",
            "Bắt lỗi ở người nộp thì rẻ hơn để cấp trên phát hiện rồi trả về.",
            "Luật mức «Chặn gửi» bảo đảm những điều bắt buộc của đơn vị không bị bỏ sót.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Bước 3"],
            ["Trước", "Bước 2: sửa hết lỗi chặn và cảnh báo", "Bước 3 chỉ chạy trên bản đã sạch lỗi"],
            ["Bước 3", "AI soát luật và góp ý, bạn duyệt", "Làm sạch nội dung"],
            ["Sau", "Bước 4: duyệt việc vào sổ cái", "Tiếp tục"],
          ],
        },
        {
          tieuDe: "④ Bước có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Dòng tình trạng đầu bước: «AI đang soát…», «Luật của đơn vị: N luật — a đạt · b không đạt», «Góp ý: N»", "Biết AI soát tới đâu, kết quả sơ bộ", "① Đọc kết quả"],
            ["Bảng «Vấn đề» · «Đề xuất» · «Duyệt» (cùng kiểu Bước 2)", "Duyệt từng dòng", "② Duyệt từng dòng"],
            ["Nút cuối bảng: «Đồng ý cả N đề xuất» · «Bỏ qua tất cả góp ý (N)» · «Sửa N mục đã đồng ý vào file»", "Duyệt nhanh, ghi vào tệp", "③ Ghi vào tệp"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc, sửa chữ mới, bấm «Đồng ý» hoặc «Bỏ qua», bấm nút ghi", "Người quyết"],
            ["MÁY", "Chọn luật áp dụng cho mẫu, hỏi lại kết quả AI theo nhịp, giữ quyết định của bạn qua các bản sửa, ghi chữ đã đồng ý vào đúng ô thành bản mới, chặn nút Gửi khi luật «Chặn gửi» chưa đạt", "Cùng tệp cùng luật cùng kết quả khung"],
            ["🤖 AI", "🤖 Kiểm từng luật AI trên chữ báo cáo và nói đạt hay không đạt, kèm lý do và chữ sửa đề xuất", "🤖 Có thể hiểu sai; kết luận «chưa kết luận được» không bắt duyệt"],
            ["🤖 AI", "🤖 Viết góp ý: mục trống, số liệu mâu thuẫn, tên người hoặc đơn vị viết sai", "🤖 Góp ý luôn mức «Gợi ý», KHÔNG BAO GIỜ chặn gửi"],
          ],
          ai: [
            "🤖 AI nhận chữ của báo cáo (đã cắt độ dài), tên mẫu, danh bạ người và đơn vị rồi trả danh sách luật không đạt và góp ý. Thường 15 đến 30 giây; màn hỏi lại 2,5 giây một lần, tối đa 60 lần (khoảng 2,5 phút).",
            "🤖 AI không viết thẳng vào tệp. Đồng ý chỉ được khi vấn đề chỉ vào MỘT ô cụ thể.",
            "Người kiểm: đọc kỹ chữ đề xuất và vị trí, bấm liên kết mở báo cáo gốc nếu cần, vì AI có thể hiểu sai ý.",
            "Mất kết nối AI: dòng tình trạng ghi «Luật AI chưa kiểm được (…)» hoặc «Góp ý AI chưa chạy được (…)», kèm nút «Soát lại». Luật để mức «Chặn gửi» mà AI lỗi thì nút Gửi vẫn bị khoá tới khi có kết luận; luật mức khác không chặn.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "MÁY", "Chọn các luật AI áp dụng cho mẫu; gọi AI sau khi Bước 2 sạch lỗi"],
            ["2", "🤖 AI", "🤖 Kiểm luật và viết góp ý trên chữ báo cáo"],
            ["3", "NGƯỜI", "Với mỗi dòng: sửa chữ mới nếu cần, bấm «Đồng ý» hoặc «Bỏ qua»"],
            ["4", "NGƯỜI", "Bấm «Sửa N mục đã đồng ý vào file»"],
            ["5", "MÁY", "Ghi một lần vào tệp thành bản mới, chép kết quả soát sang bản mới (AI không soát lại), mở Bước 4"],
          ],
        },
      ],
    },
    {
      ten: "① Đọc kết quả",
      khoi: [
        {
          tieuDe: "Dòng tình trạng và nhãn dòng",
          bang: [
            ["Chữ trên màn", "Nghĩa"],
            ["«Chờ bước 2 hết lỗi: AI chỉ soát trên bản đã sạch lỗi.»", "Chưa tới lượt, quay lại Bước 2"],
            ["«AI đang soát nội dung (luật của đơn vị + góp ý)… thường 15–30 giây»", "Đang chạy, chờ"],
            ["«Luật của đơn vị: N luật — a đạt · b không đạt · c chưa kết luận»", "Kết quả luật"],
            ["«Góp ý: N»", "Số góp ý còn phải quyết"],
            ["«Không có góp ý AI: <lý do>»", "Góp ý AI đang tắt"],
            ["«Đã ghi N đề xuất vào file ở bản trước»", "Các đề xuất đã ghi ở lần trước, không hỏi lại"],
            ["«Chưa kết luận (không bắt duyệt): …»", "AI không kết luận được luật nào đó, không bắt duyệt"],
            ["«Không có gì cần sửa.»", "Sạch"],
            ["«Mẫu này không có luật AI / góp ý — bước này tự qua.»", "Mẫu không có gì để soát, bước tự xong"],
          ],
        },
        {
          tieuDe: "Dòng vấn đề",
          ds: [
            "Dòng xám dưới nội dung ghi mức: «Chặn gửi», «Cảnh báo» hoặc «Gợi ý», rồi nguồn: «Luật: <tên luật>» hoặc «Góp ý: mục trống», «Góp ý: số liệu mâu thuẫn», «Góp ý: tên người / đơn vị», «Góp ý».",
            "Có thêm vị trí (ô nào, bảng nào) hoặc «Chỗ: <đoạn chữ>» khi không chỉ vào ô cụ thể.",
          ],
          viDu: ["Dòng: «Mục “Khó khăn, vướng mắc” để trống nhưng bảng việc có việc quá hạn» — nguồn «Góp ý: mục trống» (tình huống minh hoạ). Bạn đọc, thấy đúng là quên điền, nên điền thêm vào chữ mới rồi «Đồng ý»."],
        },
      ],
    },
    {
      ten: "② Duyệt từng dòng",
      khoi: [
        {
          bam: [
            "Đọc vấn đề. Nếu chỉ vào một ô, bên cột «Đề xuất» có «Đang ghi: <chữ cũ>», «🤖 Nên sửa thành:» và ô chữ sửa được. Sửa cho đúng ý bạn.",
            "Bấm «Đồng ý» để đánh dấu sửa theo chữ ở ô (nút mờ nếu ô chữ trống: «Gõ chữ mới trước»). Bấm «Bỏ qua» nếu thấy không cần sửa.",
            "Dòng không chỉ vào một ô cụ thể ghi «Không chỉ vào một ô cụ thể — cần thì sửa trong tệp rồi tải lên bản đã sửa.»; dòng này chỉ «Bỏ qua» được.",
            "Luật mức «Chặn gửi» không có nút «Bỏ qua»: phải «Đồng ý» và ghi, hoặc sửa trong tệp rồi tải lại.",
            "Đã quyết rồi mà muốn đổi: bấm liên kết «đổi» cạnh chữ «Đã đồng ý» hoặc «Đã bỏ qua».",
          ],
          viDu: ["Luật đơn vị: «Phải ghi người phụ trách cho mọi việc». AI thấy một việc để người phụ trách là «P. Kỹ thuật» chung chung, đề xuất «Nguyễn Văn A, P. Kỹ thuật». Bạn kiểm lại người thật phụ trách là ai, sửa chữ cho đúng rồi mới «Đồng ý» (tình huống minh hoạ)."],
          luuY: ["Quyết định của bạn được giữ khi tệp qua các bản sửa, không phải quyết lại từ đầu."],
        },
      ],
    },
    {
      ten: "③ Ghi vào tệp",
      khoi: [
        {
          bam: [
            "Muốn nhanh: «Đồng ý cả N đề xuất» (đánh dấu mọi đề xuất chưa quyết có chỉ vào một ô và có chữ) và «Bỏ qua tất cả góp ý (N)» (chỉ hiện khi từ 2 dòng bỏ qua được trở lên).",
            "Khi mọi dòng đã quyết, bấm «Sửa N mục đã đồng ý vào file». Nút mờ nếu còn dòng chưa quyết; rê chuột đọc «Còn N dòng chưa quyết — quyết hết trước».",
          ],
          ketQua: [
            "Máy ghi MỘT lần thành bản mới; kết quả soát chép sang bản mới nên AI không soát lại.",
            "Khối «3 · Soát nội dung» có dấu ✓ khi AI xong, mọi dòng đã quyết, không còn dòng chờ ghi và không còn luật «Chặn gửi» chưa đạt. Khi đó Bước 4 phát sáng.",
          ],
          viDu: ["Soát ra 4 dòng: 1 luật «Chặn gửi» chưa đạt, 3 góp ý. Bạn «Đồng ý» dòng luật, «Bỏ qua tất cả góp ý (3)», rồi bấm «Sửa 1 mục đã đồng ý vào file». Bản mới được lưu và Bước 4 mở ra (tình huống minh hoạ)."],
          luuY: ["Không bấm ghi thì mọi đồng ý vẫn chỉ là đánh dấu. Nếu mọi dòng đều «Bỏ qua» thì không có nút ghi, bước tự xong."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Đứng ở «AI đang soát…» rất lâu", "AI có thể chậm khi nhiều người nộp cùng lúc. Chờ thêm; hết hạn chờ thì có nút «Hỏi lại», hoặc tải lại trang, kết quả đã soát được nhớ lại"],
            ["«Luật AI chưa kiểm được (…)»", "AI lỗi. Bấm «Soát lại». Luật mức «Chặn gửi» thì nút Gửi sẽ khoá tới khi có kết luận"],
            ["Không có nút «Đồng ý» ở một góp ý", "Góp ý không chỉ vào một ô cụ thể. Chỉ «Bỏ qua» được; cần sửa thì sửa trong tệp rồi «Tải lên bản đã sửa» ở Bước 2"],
            ["Không có nút «Bỏ qua» ở một luật", "Luật mức «Chặn gửi». Phải sửa"],
            ["Thanh tiến trình ghi «luật chặn gửi chưa đạt»", "Còn ít nhất một luật «Chặn gửi» chưa đạt hoặc chưa có kết luận"],
            ["Bước 3 tự qua", "Mẫu không có luật AI hay góp ý, không phải lỗi"],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 29/09/2026: gộp «Luật AI» và «AI góp ý» thành một danh sách cùng kiểu dòng với Bước 2; ghi vào tệp một lần; góp ý không bao giờ chặn gửi · luật 19 (🤖 đứng trước chữ do AI viết).",
};
