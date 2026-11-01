// Hướng dẫn bản 2 (tab) — màn Cảnh báo, tab «📄 Xong trên giấy». Viết 20/10/2026 (nhóm A3).
// Căn cứ code: lib/cay-viec/issue/sinh.ts (luật 4: việc báo xong mà tiến độ 0% và không có báo cáo ngày trong ±K ngày; gom theo người) · IssueView.tsx (nguongDangDung, nhãn tab)
// · KhoiViecIssue.tsx (KhoiNhacViecCu). Tab này KHÔNG dùng AI. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo tab «Xong trên giấy» — báo xong mà tiến độ không động",
  ai: "Mọi người có quyền xem sổ cái đều đọc được. Sửa ngưỡng K cần quyền «Duyệt gắn WBS» (người khác chỉ xem được ngưỡng và vết sửa). Nút không có quyền thì ẨN.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: [
            "«Xong trên giấy» là việc trong sổ cái đã được báo HOÀN THÀNH, nhưng ở bên agent Tiến độ đầu việc WBS tương ứng vẫn 0% và không có báo cáo ngày nào ghi khối lượng trong ±K ngày quanh ngày xong (K mặc định 7). Nói cách khác: trên sổ việc thì xong, ngoài công trường thì không ai báo có làm.",
            "Máy gom theo người đã báo xong: mỗi người một thẻ, liệt kê các việc và các mã WBS còn thiếu báo cáo khối lượng. Báo cáo ngày (BC ngày) là báo cáo hằng ngày ghi khối lượng thi công, do agent Tiến độ giữ.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Việc bấm «Xong» trong sổ mà thực tế chưa làm (hoặc làm rồi chưa ghi khối lượng) làm tiến độ và sổ việc lệch nhau, cuối cùng số liệu báo cáo lãnh đạo sai.",
            "Chiều ngược cũng được nhắc: đầu việc WBS đã 100% mà việc trong sổ còn mở thì máy nhắc bấm «Xong việc» (không có ngưỡng ngày).",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của tab"],
            ["Trước", "Người làm báo xong việc trong sổ; BC ngày được ghi ở agent Tiến độ", "Hai nguồn dữ liệu"],
            ["Tab này", "Máy đối chiếu hai nguồn, báo chỗ lệch; bạn hỏi người báo xong", "Màn bạn đang xem"],
            ["Sau", "Có BC ngày hoặc mở lại việc thì thẻ tự hạ rồi đóng", "Thẻ về «Đã đóng»"],
          ],
        },
        {
          tieuDe: "④ Tab có gì?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Mỗi thẻ", "Tiêu đề «<Người> — K việc báo XONG trong sổ việc nhưng M mã WBS chưa báo khối lượng», kèm số mã trên găng nếu có"],
            ["Phân tích", "Mỗi việc một dòng: mã việc, tên, ngày báo xong, mã WBS (găng), % tiến độ, cửa sổ BC ngày và «không có»"],
            ["Khối dưới thẻ", "«Issue nhắc — việc đã có trong sổ cái, không giao thêm», nút «Mở việc cũ CV-…» và «Bỏ qua»"],
            ["Dòng ngưỡng", "«Ngưỡng đang áp: việc trong sổ báo HOÀN THÀNH có mã WBS đã duyệt mà tiến độ trả % = 0 và không có BC ngày trong ±K ngày quanh ngày xong…»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc thẻ · hỏi người báo xong · nhờ gửi BC ngày hoặc mở lại việc · bỏ qua · sửa ngưỡng K", "Người quyết việc đã xong thật hay chưa"],
            ["MÁY", "Hỏi agent Tiến độ % và BC ngày của từng mã · đối chiếu · gom theo người · tính ảnh hưởng COD · tự hạ và đóng khi có BC ngày hoặc việc được mở lại", "Cùng dữ liệu thì cùng thẻ"],
            ["🤖 AI", "Tab này KHÔNG dùng AI", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Không có bước AI. Máy đối chiếu hai nguồn và sinh thẻ; người hỏi lại người báo xong rồi quyết."],
        },
      ],
    },
    {
      ten: "① Đọc và xử lý thẻ",
      khoi: [
        {
          bam: [
            "Mở thẻ (bấm cả thẻ) để đọc phân tích ở cột phải: danh sách việc, ngày báo xong, mã WBS.",
            "Bấm «Mở việc cũ CV-…» của từng việc cần hỏi; trong việc gõ ý kiến có @ người đã báo xong.",
            "Người đó có hai lối: việc đã xong thật thì gửi BC ngày/khối lượng cho các mã để agent Tiến độ cập nhật %; chưa xong thì mở lại việc trong sổ («Mở lại» ở Sơ đồ tổ chức, bắt buộc ghi lý do).",
          ],
          ketQua: ["Khi tiến độ có % hoặc có BC ngày, hoặc việc được mở lại, thẻ chuyển «Hết vi phạm», chờ ổn định 2 tuần rồi tự đóng."],
          luuY: [
            "Nếu BC ngày ngoài vùng agent Tiến độ có dữ liệu thì máy không biết, không lên thẻ (ghi ở ghi chú bộ sinh). Thẻ chỉ nói đúng điều máy đo được.",
            "Thẻ này là thẻ nhắc nên không có «Giao việc».",
          ],
          viDu: ["Tình huống minh hoạ: Anh C báo xong ba việc đổ bê tông, cả ba cùng mã WBS của hạng mục móng, nhưng agent Tiến độ ghi 0% và không có BC ngày. Thẻ ghi «Anh C — 3 việc báo XONG … nhưng 1 mã WBS chưa báo khối lượng». Bạn mở một việc, gõ «@Anh C gửi giúp BC ngày khối lượng bê tông đợt này để bên Tiến độ cập nhật»."],
        },
      ],
    },
    {
      ten: "② Ngưỡng K",
      khoi: [
        {
          doan: ["K là số ngày trước và sau ngày báo xong mà máy chờ BC ngày, mặc định 7, dùng chung mọi dự án. Sửa ở «Sửa ngưỡng của tab này →» (cần quyền «Duyệt gắn WBS»), có ghi vết ai sửa. Xem hướng dẫn «Ngưỡng của bộ sinh issue»."],
          luuY: ["Tăng K thì khó lên thẻ hơn (chờ rộng hơn), giảm K thì dễ lên thẻ hơn."],
          viDu: ["Tình huống minh hoạ: K đang là 7. Anh C báo xong việc ngày 10 nhưng BC ngày của mã đó chỉ có vào ngày 20. BC ngày ngày 20 nằm ngoài khoảng ±7 ngày quanh ngày 10 nên máy coi là «không có BC ngày» và lên thẻ. Nếu quản trị tăng K lên 14 thì khoảng rộng ra, gồm cả ngày 20, thẻ này không lên nữa."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Việc báo xong rồi mà không có thẻ", "Việc chưa gắn mã WBS đã duyệt, hoặc tiến độ đã có %, hoặc có BC ngày trong ±K ngày, hoặc BC ngày chưa phủ khoảng đó."],
            ["Không có nút «Giao việc»", "Đây là thẻ nhắc: dùng «Mở việc cũ»."],
            ["Thẻ ghi «chưa lấy được» ở Ảnh hưởng COD", "Agent Tiến độ chưa trả dữ liệu lần này. Mở lại màn sau ít phút."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (chép màn Cảnh báo của agent Base: luật 4 xong trên giấy) và 06–07/10/2026 (khuôn Issue hai loại) · luật 28 (chữ thuần không khoanh).",
};
