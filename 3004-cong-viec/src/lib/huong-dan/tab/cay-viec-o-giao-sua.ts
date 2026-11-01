// Hướng dẫn bản 2 (tab) — ô giao việc khi bấm «Sửa» (dùng chung ở Cây việc & đường găng và ở Issue) + ô chọn «Giao cho». Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/OGiaoSua.tsx (các ô, nút «Giao việc», «Huỷ sửa») · OChonNoiNhan.tsx (ô chọn nơi nhận: bấm / gõ / gõ @) · PhaiCayViec.tsx (KhoiGiao, giaoSua) · issue/KhoiViecIssue.tsx (KhungSuaGiao)
// · components/dinh-kem/DinhKem.tsx (nút kẹp tệp). AI điền sẵn người nhận: app/api/cay-viec/soan-giao/route.ts:119. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Ô giao việc khi bấm Sửa",
  ai: "Chỉ người có quyền «Giao việc» mới có nút «Sửa» (người khác không thấy). Danh sách người và đơn vị trong ô «Giao cho» đã được lọc theo quyền của bạn: bạn chỉ chọn được nơi mình giao được.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Ô này là gì?",
          doan: [
            "Khi máy hoặc AI soạn sẵn một việc (từ đầu việc găng chưa giao, hoặc từ một thẻ Issue), bạn có thể giao ngay bằng «Giao việc», hoặc bấm «Sửa» để chỉnh. «Sửa» mở ô giao việc ở cột phải, cùng kiểu với ô dấu «＋» ở Sơ đồ tổ chức, các ô đã điền sẵn.",
            "Cùng một ô được dùng ở hai màn: Cây việc & đường găng và Issue. Với Issue, bản nháp ở khối dưới thẻ và bản nháp trong ô này là MỘT bản: sửa bên phải thì khối bên trái thấy ngay.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Nội dung soạn sẵn là dạng chung; nhiều khi bạn cần ghi rõ hơn, đổi hạn, hoặc đính kèm hồ sơ trước khi giao.",
            "Giao việc đúng một lần, đủ thông tin, đỡ phải nhắn lại sau.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của ô này"],
            ["Trước", "Máy/AI soạn sẵn việc (khối «🤖 AI soạn sẵn» hoặc «✎ Soạn sẵn từ issue»)", "Cho ra bản nháp"],
            ["Ô này", "Chỉnh bản nháp rồi giao", "Màn bạn đang xem"],
            ["Sau", "Việc tạo trong sổ cái; người nhận có chuông; việc hiện ở Sơ đồ tổ chức", "Sơ đồ tổ chức"],
          ],
        },
        {
          tieuDe: "④ Ô có những phần nào?",
          bang: [
            ["Ô", "Để làm gì", "Xem tab"],
            ["Dòng tiêu đề nhỏ: «🤖 AI đã điền sẵn — sửa rồi bấm Giao việc» (đầu việc găng) hoặc «Đã điền sẵn từ issue — sửa rồi bấm Giao việc» (Issue khác)", "Cho biết nguồn bản nháp", "① Điền ô"],
            ["«Giao cho»", "Chọn Ban lãnh đạo, đơn vị hoặc một người", "② Chọn nơi nhận"],
            ["«Thuộc dự án»", "Cố định, không đổi được", "① Điền ô"],
            ["«Nội dung việc» và nút 📎", "Việc cần làm và tệp đính kèm", "① Điền ô"],
            ["«Kết quả cần có»", "Việc xong thì nộp gì", "① Điền ô"],
            ["«Hạn»", "Ngày phải xong", "① Điền ô"],
            ["«Giao việc» và «Huỷ sửa»", "Tạo việc hoặc thôi", "③ Giao hoặc huỷ"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn nơi nhận · sửa nội dung, kết quả, hạn · kẹp tệp · bấm «Giao việc» hoặc «Huỷ sửa»", "Người quyết"],
            ["MÁY", "Điền sẵn tên việc, kết quả cần có, hạn · lọc danh sách nơi nhận theo quyền · chặn giao khi thiếu ô hoặc hạn đã qua · hiện khoảng ngày kèm số ngày · tạo việc khi người bấm", "Cùng bản nháp thì cùng kết quả"],
            ["🤖 AI", "🤖 Chỉ ở đầu việc găng (và thẻ găng): AI đã chọn sẵn người hoặc đơn vị nhận ở ô «Giao cho» và ghi câu căn cứ", "🤖 Có thể sai; bạn đổi ở ô «Giao cho» thì dòng căn cứ ghi «người chọn tay»"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "🤖 AI (với đầu việc găng) đã chọn sẵn người nhận khi bạn bấm «🤖 Xem việc AI soạn sẵn». Với Issue thường, ô «Giao cho» để trống cho bạn chọn.",
            "Người bấm «Sửa»: ô mở ra với mọi ô đã điền sẵn.",
            "Người chỉnh các ô, kiểm lại người nhận.",
            "Người bấm «Giao việc»: máy tạo việc thật. AI không giao thay người.",
          ],
          ai: ["Mở ô này không gọi AI. AI chỉ chạy trước đó, khi soạn sẵn."],
        },
      ],
    },
    {
      ten: "① Điền ô",
      khoi: [
        {
          bang: [
            ["Ô", "Cách điền", "Ghi chú"],
            ["«Thuộc dự án»", "Không điền", "Mờ, đúng dự án của màn đang mở"],
            ["«Nội dung việc»", "Gõ việc cần làm, viết đủ để người nhận hiểu mà không phải hỏi lại", "Gợi ý trong ô «Việc cần làm…». Nút 📎 bên cạnh để kẹp tệp: chọn là tải lên ngay, hiện tên và nút bỏ; số tệp và dung lượng tối đa theo Cài đặt"],
            ["«Kết quả cần có»", "Ghi thứ phải nộp khi xong", "Gợi ý «Ví dụ: tờ trình gửi TGĐ»"],
            ["«Hạn»", "Chọn ngày dạng dd/mm/yyyy", "Dưới ô hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy» tính từ hôm nay đến hạn"],
          ],
          viDu: ["Tình huống minh hoạ: nội dung soạn sẵn «Xử lý 7.2.3 — Thi công san nền». Bạn sửa thành «Chốt biện pháp thi công san nền khu A và gửi phương án», kết quả cần có «Tờ trình phương án gửi Giám đốc dự án», hạn bạn dời sang đầu tuần sau, kẹp thêm bản vẽ hiện trạng bằng nút 📎."],
          luuY: ["Hạn không được trước hôm nay. Ở Cây việc, nếu ngày xong theo tiến độ đã qua thì ô Hạn để trống và bạn phải chọn hạn mới; ở Issue, hạn soạn sẵn là hạn xử lý của thẻ, nếu đã qua thì máy lấy hôm nay cộng 7 ngày."],
        },
      ],
    },
    {
      ten: "② Chọn nơi nhận",
      khoi: [
        {
          tieuDe: "Ô «Giao cho»",
          bang: [
            ["Cách dùng", "Ra gì"],
            ["Bấm vào ô", "Danh sách xổ ra: nhóm «Ban lãnh đạo» (trừ trợ lý) rồi nhóm «Đơn vị» theo sơ đồ, thụt lề theo cấp"],
            ["Gõ chữ", "Lọc ngay trong danh sách đó, không cần gõ dấu"],
            ["Gõ @ rồi tên", "Danh sách chuyển sang TÊN NGƯỜI, gõ tiếp thì lọc (ví dụ @lan huong). Gõ @ mà chưa giao đích danh được ai thì ghi «Bạn chưa giao đích danh được cho ai.»"],
            ["Bấm một dòng hoặc nhấn Enter", "Chọn dòng đó và đóng danh sách ngay, không có nút xác nhận"],
            ["Nhấn Esc hoặc bấm ra ngoài", "Đóng danh sách"],
          ],
          luuY: [
            "Trong ô chỉ có nơi bạn giao được: lãnh đạo và quản trị thấy cả công ty; trưởng đơn vị thấy đơn vị mình, cấp dưới và người trong đơn vị mình.",
            "Người hoặc đơn vị AI đã chọn luôn hiện trong ô, kể cả khi không nằm trong danh sách gõ lọc.",
            "Giao cho đơn vị thì trưởng đơn vị sẽ giao tiếp cho một nhân viên; giao đích danh một người thì người đó là chủ trì.",
          ],
          viDu: ["Tình huống minh hoạ: ô đang ghi tên đơn vị AI gợi ý. Bạn gõ @ và vài chữ đầu tên một kỹ sư rồi bấm tên anh ấy: ô đổi sang đích danh người đó; dòng căn cứ của AI không còn áp dụng, việc ghi «người chọn tay»."],
        },
      ],
    },
    {
      ten: "③ Giao hoặc huỷ",
      khoi: [
        {
          bam: [
            "Xem lại cả bốn ô và người nhận.",
            "Bấm «Giao việc». Nút ghi «Đang giao…» trong lúc gửi.",
            "Muốn thôi: bấm «Huỷ sửa»; bản nháp vẫn giữ nguyên ở khối soạn sẵn.",
          ],
          ketQua: [
            "Máy tạo việc trong sổ cái với người giao là bạn, báo chuông cho người nhận, rồi khung trở về màn trước. Ở Cây việc dòng chuyển sang «✓ Đã tạo việc CV-…»; ở Issue thẻ chuyển sang «Xử lý: Đã giao việc».",
            "Nếu có việc gần giống đã soạn ở agent khác, hiện dòng 🤖 báo trùng kèm nút «Vẫn giao việc riêng». Nút «Giao việc» mờ kèm câu bên cạnh khi còn thiếu: «Chưa có nội dung việc», «Chưa chọn người nhận», «Chưa có hạn», hoặc «Hạn đã qua …». Khi đang tải tệp ghi «Đang tải file…».",
          ],
          luuY: ["Bấm «Giao việc» là tạo việc thật. Chốt an toàn: AI không tự ghi; chỉ cú bấm của người mới tạo việc."],
          viDu: ["Tình huống minh hoạ: ô «Giao việc» đang mờ và dòng nhỏ bên cạnh ghi «Chưa chọn người nhận». Bạn mở ô «Giao cho», chọn đơn vị, dòng nhỏ biến mất, nút sáng lên. Bạn bấm «Giao việc»; ở Cây việc hiện «✓ Đã tạo việc CV-… trong sổ cái»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «Sửa»", "Bạn thiếu quyền «Giao việc» — nút ẩn."],
            ["Ô «Giao cho» chỉ có ít người", "Danh sách đã lọc theo quyền giao của bạn. Cần giao rộng hơn thì nhờ quản trị mở quyền."],
            ["Nút «Giao việc» mờ", "Đọc câu nhỏ bên cạnh: thiếu nội dung, người nhận hay hạn."],
            ["Đang tải tệp mà không giao được", "Chờ tệp tải xong. Tệp quá lớn thì báo vượt dung lượng; bỏ bớt rồi kẹp lại."],
            ["Sửa xong nhưng khối soạn sẵn vẫn cũ", "Ở Issue, khối bên trái dùng chung bản nháp nên đổi theo. Nếu chưa đổi, tải lại màn rồi sửa lại."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 04/10/2026 (ô giao việc khi bấm Sửa giống ô dấu + ở Sơ đồ tổ chức; ô «Giao cho» gọn: bấm = Ban lãnh đạo và đơn vị, gõ @ = người) · luật 31 (khoảng ngày kèm số ngày) · luật 33 (hỏi trùng) · luật 17 riêng 3004 (nút không quyền thì ẨN).",
};
