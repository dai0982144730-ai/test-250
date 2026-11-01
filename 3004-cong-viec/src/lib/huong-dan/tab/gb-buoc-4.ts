// Hướng dẫn bản 2 (tab) — Gửi báo cáo, BƯỚC 4 «Duyệt vào kế hoạch». Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/gui/nop/BangDuyetViec.tsx (bảng 6 cột, hai nhóm việc, ô «Vào sổ cái», nút Duyệt/Bỏ, chọn lãnh đạo đích danh, tên gợi ý của AI) · gui/nop/chon-vao-so.ts (mặc định và lựa chọn ô Vào sổ cái)
// · components/gui/KhungSoanGui.tsx (nút «Duyệt tất cả việc trong bảng (N)», «Bỏ tất cả việc AI tìm (N)», «AI đọc lại», raSoatAi, khoaDuyet) · lib/so-cai/ai-doc-bao-cao.ts (AI đọc báo cáo, app/api/gui/route.ts tự chạy khi gửi nếu chưa có).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gửi báo cáo — Bước 4 · Duyệt vào kế hoạch",
  ai: "Người nộp báo cáo. Mọi việc chỉ vào sổ cái khi bạn bấm «Duyệt». Việc 🤖 AI tìm thêm cũng phải Duyệt hoặc Bỏ từng việc.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Bước này là gì?",
          doan: ["Một bảng gom mọi việc sắp vào sổ cái công việc từ báo cáo của bạn. Có hai nhóm: việc MÁY lấy từ bảng «Kết quả và kế hoạch việc» (đọc đúng từng cột tên, phụ trách, ngày) và việc 🤖 AI tìm thêm ở các mục khác của báo cáo (viết trong chữ tự do, không có cột). Bạn quyết từng việc: «Duyệt» (vào sổ cái) hay «Bỏ» (không vào)."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Việc trong báo cáo thành việc thật có người làm, có hạn, có nhắc quá hạn. Đó là chỗ quan trọng nhất của quy trình nên bạn phải xác nhận.",
            "Báo cáo viết tay hay sinh việc trùng với việc đã có. Cột «Vào sổ cái» cho bạn chọn: việc mới, hay đúng là việc cũ để cập nhật, không tạo trùng.",
            "Báo cáo hay ghi chung chung «Ban lãnh đạo». Bước này buộc chọn lãnh đạo đích danh để việc có người chịu trách nhiệm.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Bước 4"],
            ["Trước", "Bước 3: soát nội dung xong", "Bảng chỉ mở khi bước 3 xong (khối mờ trước đó)"],
            ["Bước 4", "Quyết từng việc: Duyệt hoặc Bỏ; chọn việc mới hay việc cũ; chọn lãnh đạo đích danh", "Quyết việc nào vào sổ cái"],
            ["Sau", "Bước 5: chọn nơi nhận rồi Gửi; các việc đã duyệt mới vào sổ cái", "Việc hiện ở Sơ đồ tổ chức và Việc của tôi"],
          ],
        },
        {
          tieuDe: "④ Bước có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Ba nút ở đầu khối: «Duyệt tất cả việc trong bảng (N)» · «Bỏ tất cả việc AI tìm (N)» · «AI đọc lại»", "Duyệt nhanh; cho AI đọc lại", "③ Nút gom và AI đọc lại"],
            ["Nhóm «Việc máy lấy từ bảng …»", "Việc đã có cột rõ ràng", "① Việc lấy từ bảng"],
            ["Nhóm «Việc AI tìm thêm ở các mục khác của báo cáo»", "Việc viết ngoài bảng", "② Việc AI tìm thêm"],
            ["Cột «Vào sổ cái»", "Việc mới, cập nhật, hay đúng là việc cũ", "① Việc lấy từ bảng"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn «Duyệt» hoặc «Bỏ» từng việc; chọn việc mới hay đúng là việc cũ; chọn lãnh đạo đích danh; sửa tên, người làm, hạn của việc AI tìm", "Người quyết cuối"],
            ["MÁY", "Tách việc trong bảng đúng từng cột; đối chiếu việc đã có trong sổ cái (tên giống) và gợi ý trùng; xác định việc đã xong; tính mặc định ô «Vào sổ cái»; khoá nút khi còn thiếu thông tin", "Luật cố định"],
            ["🤖 AI", "🤖 Đọc cả báo cáo tìm việc viết NGOÀI bảng; gợi ý tên việc gọn hơn; nhận ra việc trùng theo nghĩa; đọc ô tình trạng để biết việc đã xong chưa", "🤖 Chỉ gợi ý; việc AI tìm chỉ vào sổ cái khi bạn bấm «Duyệt»"],
          ],
          ai: [
            "🤖 AI đọc cả báo cáo sau khi Bước 3 xong. Dòng xám dưới tên việc ghi «🤖 AI tìm ở mục …: “trích nguyên văn”» để bạn đối chiếu. Chữ do AI gợi ý (tên, hạn, lý do trùng) có 🤖 đứng trước; số và bảng do máy tính thì không.",
            "🤖 AI không đưa gì vào sổ cái, không tự đóng hay mở lại việc cũ.",
            "Người kiểm: bấm tên báo cáo gốc ở dòng «lọc ra từ hệ thống báo cáo …» để thấy dòng khoanh cam. AI lỗi thì bảng chỉ có việc máy tách, ghi «AI chưa đọc được báo cáo: … (không ảnh hưởng việc gửi)» và vẫn gửi được.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "MÁY", "Tách việc trong bảng, gợi ý trùng, xác định việc xong"],
            ["2", "🤖 AI", "🤖 Đọc cả báo cáo, tìm việc ngoài bảng, gợi ý tên và việc trùng theo nghĩa"],
            ["3", "NGƯỜI", "Chọn ô «Vào sổ cái» cho dòng đòi chọn; «Duyệt» hoặc «Bỏ» từng dòng"],
            ["4", "MÁY", "Khi bạn bấm Gửi ở Bước 5: ghi các việc đã duyệt vào sổ cái (mới, cập nhật, đóng) và báo kết quả"],
          ],
        },
      ],
    },
    {
      ten: "① Việc lấy từ bảng",
      khoi: [
        {
          tieuDe: "Sáu cột",
          bang: [
            ["Cột", "Nghĩa"],
            ["«Công việc trong báo cáo»", "Tên đậm, «Kết quả cần có:», dòng xám «lọc ra từ hệ thống báo cáo <tuần · đơn vị>» (bấm mở báo cáo gốc khoanh cam đúng dòng). Nếu AI có tên gọn hơn: «🤖 Tên gợi ý: …» kèm liên kết «dùng tên này» hoặc «giữ tên cũ»"],
            ["«Phụ trách»", "Người hoặc đơn vị làm. Ghi «Ban lãnh đạo» chung chung thì có ô chọn «Lãnh đạo nào?» (viền vàng cho tới khi chọn)"],
            ["«Bắt đầu» · «Kết thúc»", "Ngày. «= ngày nộp» khi báo cáo không ghi ngày bắt đầu. Thiếu hạn: «thiếu hạn» và dòng đỏ «Thiếu ngày kết thúc — sửa rồi gửi lại»; việc chờ mốc ghi «hạn chờ mốc»"],
            ["«Vào sổ cái»", "Máy cho biết việc sẽ ra sao (xem bảng bên dưới)"],
            ["«Duyệt»", "Nút «Duyệt» · «Bỏ». Dòng không cần quyết ghi «không cần». Sau khi gửi hiện «Đã duyệt» hoặc «Đã bỏ»"],
          ],
        },
        {
          tieuDe: "Cột «Vào sổ cái» ghi gì",
          bang: [
            ["Chữ trên màn", "Nghĩa · việc cần làm"],
            ["«Việc mới»", "Sẽ tạo việc mới"],
            ["«Cập nhật CV-…»", "Đè lên việc đã có, bản cũ vào lịch sử"],
            ["«Không dùng · CV-…»", "Bản này không được dùng"],
            ["«Đóng CV-…»", "Báo cáo cho biết việc cũ đã xong, sẽ đóng"],
            ["«Không vào sổ — việc đã xong»", "Dòng báo đã xong nên không giao lại"],
            ["«Vào sổ — đã xong ngày …» (lần nạp đầu)", "Lần nạp đầu của đơn vị: ghi vào sổ ở trạng thái đã xong để có trong «Việc làm xong»"],
            ["«Chờ TGĐ quyết định»", "Dòng thuộc bảng quyết định, Tổng giám đốc sẽ quyết"],
            ["Ô chọn «— Có vẻ trùng, chọn —»", "BẮT BUỘC chọn: «Việc mới» hay «Đúng là CV-… · <tên>» (kèm «mở lại» hoặc «đóng việc này» tuỳ việc cũ đã xong chưa)"],
          ],
          luuY: ["Nếu 🤖 AI cho rằng một ứng viên trùng của máy thực ra khác việc, dòng ghi «🤖 CV-… khác việc: <lý do>»; ứng viên đó vẫn hiện để bạn quyết nhưng không bắt chọn."],
        },
        {
          tieuDe: "Làm từng bước",
          bam: [
            "Dòng nào ô «Vào sổ cái» đang đòi chọn (viền vàng): chọn «Việc mới» hay «Đúng là CV-…». Đọc dòng xám dưới ô để biết vì sao máy hoặc AI cho là trùng.",
            "Dòng «Phụ trách» có ô «Lãnh đạo nào?»: chọn một lãnh đạo cụ thể.",
            "Thiếu hạn: đây là lỗi chặn từ Bước 2; quay lên sửa hạn trong tệp rồi tải lại.",
            "Bấm «Duyệt» hoặc «Bỏ» từng dòng. Bấm lại đúng nút đã chọn để bỏ chọn.",
          ],
          viDu: ["Báo cáo có việc «Thi công móng trụ T5–T8» với ô «Vào sổ cái» ghi «— Có vẻ trùng, chọn —» vì sổ cái đã có một việc tên rất giống. Bạn mở lại việc cũ, thấy đúng là cùng một việc: chọn «Đúng là CV-… · Thi công móng trụ…» để cập nhật việc đó thay vì tạo việc mới (tên và mã minh hoạ)."],
        },
      ],
    },
    {
      ten: "② Việc AI tìm thêm",
      khoi: [
        {
          doan: ["Nhóm này nằm dưới việc từ bảng, có tiêu đề «Việc AI tìm thêm ở các mục khác của báo cáo». Đây là việc 🤖 AI nhặt ở phần chữ tự do mà quy tắc cố định không lấy được, ví dụ trong mục «Kiến nghị» hay chương văn xuôi. Vì không nằm trong bảng việc nên không có cột phụ trách và ngày, thay vào đó là ô nhập."],
          bam: [
            "Đọc dòng xám dưới tên: «🤖 AI tìm ở mục …: “<trích nguyên văn>”» hoặc «🤖 AI nhặt ở chương văn xuôi “…”». Đây là câu gốc AI dựa vào.",
            "Sửa tên việc (ô chữ đậm), ghi người làm (ô «đơn vị lập» để trống thì lấy đơn vị lập báo cáo), chọn «Kết thúc» (bắt buộc, nếu thiếu: «Ghi hạn (cột Kết thúc) trước»).",
            "Nếu AI thấy trùng việc cũ: ô «Vào sổ cái» là danh sách «Việc mới» hoặc «Đúng là CV-… · <tên>».",
            "Bấm «Duyệt» để đưa vào sổ cái, hoặc «Bỏ» nếu đã xem và không phải việc.",
          ],
          viDu: ["Mục «Kiến nghị» có câu «Đề nghị hoàn thiện thủ tục xin chấp thuận chủ trương trước cuối tháng» mà bảng việc không có. AI đưa nó vào nhóm này. Bạn sửa tên thành «Hoàn thiện thủ tục xin chấp thuận chủ trương», chọn hạn là ngày cuối tháng, rồi «Duyệt» (tình huống minh hoạ)."],
          luuY: ["Nếu máy đã gộp hai dòng của bảng thành một mà AI cho là hai việc khác, dòng xám ghi «Máy đã gộp dòng này với “…” — AI cho là việc khác: <lý do>». Cân nhắc tách lại trong tệp."],
        },
      ],
    },
    {
      ten: "③ Nút gom và AI đọc lại",
      khoi: [
        {
          bang: [
            ["Nút", "Làm gì", "Điều kiện"],
            ["«Duyệt tất cả việc trong bảng (N)»", "Duyệt mọi việc từ bảng chưa quyết", "Dòng có vẻ trùng hoặc ghi Ban lãnh đạo chung chung phải chọn trước mới được tính vào N"],
            ["«Bỏ tất cả việc AI tìm (N)»", "Bỏ mọi việc AI tìm chưa quyết", "Chỉ hiện khi còn việc AI tìm chưa quyết"],
            ["«AI đọc lại»", "Cho AI đọc lại cả báo cáo: việc ngoài bảng, tên việc, việc trùng theo nghĩa", "Mờ khi AI đang đọc hoặc Bước 3 chưa xong"],
          ],
          ketQua: [
            "Khi mọi dòng đã quyết, khối «4 · Duyệt vào kế hoạch» có dấu ✓ và dòng phụ ghi «đã quyết a/a»; Bước 5 phát sáng.",
            "Nút «Duyệt» mờ có lý do khi rê chuột: «Duyệt ở bước 4 — sửa xong lỗi ở bước 2 trước», «… quyết xong bước 3 (soát nội dung) trước», «🤖 đang đọc việc trong báo cáo — chờ gợi ý rồi duyệt».",
          ],
          viDu: ["Báo cáo có 7 việc từ bảng, trong đó 1 việc có vẻ trùng. Bấm «Duyệt tất cả việc trong bảng (6)» cho 6 việc rõ ràng, rồi xử lý riêng việc thứ 7 (chọn «Đúng là CV-…») và bấm «Duyệt» (số liệu minh hoạ)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Khối «4» còn mờ", "Chưa xong Bước 3 (hoặc Bước 2). Làm xong các bước trước"],
            ["Nút «Duyệt» mờ", "Rê chuột đọc lý do. Thường là chưa chọn ô «Vào sổ cái», chưa chọn lãnh đạo ở «Lãnh đạo nào?», hoặc việc AI tìm chưa có tên hay hạn"],
            ["«AI đang đọc cả báo cáo…» lâu", "AI chậm. Chờ; bạn vẫn có thể duyệt việc từ bảng sau khi AI đọc xong. AI lỗi thì bảng chỉ có việc máy tách"],
            ["«Chưa đọc được bảng việc: hệ thống chưa nhận ra file theo mẫu nào.»", "Tệp không đúng mẫu. Tải mẫu mới ở «Tải mẫu báo cáo»"],
            ["«Không có công việc nào trong chương “Kết quả và kế hoạch việc” của file.»", "Báo cáo không có bảng việc; chỉ có thể có việc AI tìm"],
            ["Việc báo «Có vẻ trùng»", "Mở ô chọn: nếu là việc cũ chọn «Đúng là CV-…» để cập nhật, không thì «Việc mới»"],
            ["Bỏ nhầm một việc", "Bấm lại đúng nút «Bỏ» để bỏ chọn rồi bấm «Duyệt». Sau khi đã gửi thì không đổi được ở đây; giao lại việc từ Sơ đồ tổ chức"],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 29/09/2026: một bảng duyệt chung, việc AI tìm nằm chung bảng; chuyện «có vẻ trùng» chỉ ở cột «Vào sổ cái» · Mr. Đại chốt 02/10/2026 (lỗi việc đã xong không thành việc mới) và 18/10/2026 (lần nạp đầu vào sổ ở trạng thái đã xong) · luật 19.",
};
