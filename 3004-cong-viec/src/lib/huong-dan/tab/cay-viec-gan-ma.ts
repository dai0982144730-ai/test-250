// Hướng dẫn bản 2 (tab) — khối «🤖 Gán mã WBS bằng AI» ở màn Cây việc & đường găng (danh sách + duyệt). Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/CayViecView.tsx (DanhSachGanAi, chayGan, duyetLo) · CayGiaiDoan.tsx (bộ lọc «🤖 Duyệt gán mã công việc», chuDoChac)
// · PhaiCayViec.tsx (KhungGan, KhungViec) · lib/gan-wbs/gan-wbs.ts:305 (AI gán mã, chạy nền 5 phút/lượt, mỗi lượt đọc tối đa 60 việc chưa gắn).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Gán mã WBS bằng AI — treo việc vào đúng đầu việc",
  ai: "Xem danh sách: mọi người xem được màn. Nút «🤖 Gán mã WBS vào công việc» và mọi nút «Duyệt …» cần quyền «Duyệt gắn WBS»; người không có quyền sẽ không thấy các nút đó. Nút «🤖 Soạn việc trên đường găng chưa ai làm» đứng cạnh nhưng thuộc quyền «Giao việc».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khối này là gì?",
          doan: [
            "Việc trong sổ cái đặt tên theo báo cáo tuần, còn cây WBS của dự án đánh mã theo tiến độ. Hai bên hiếm khi trùng mã, nên máy KHÔNG tự nhận mã ghi trong tên việc. Khối «🤖 Gán mã WBS bằng AI» là chỗ gắn từng việc vào đúng đầu việc của cây.",
            "AI đọc tên việc rồi đề xuất mã kèm lý do và độ chắc; người duyệt thì việc mới treo lên cây. Người gắn tay luôn thắng AI.",
          ],
        },
        {
          tieuDe: "② Vì sao phải làm?",
          ds: [
            "Việc chưa có mã thì không treo vào cây, nên thẻ «Việc của dự án» thấp và đầu việc găng nào cũng trông như «chưa ai nhận».",
            "Gắn đúng mã thì các thẻ, bộ lọc «👤 Việc găng đã giao» và Issue «Quá hạn ≥ N ngày» mới đúng. Issue quá hạn chỉ sinh cho việc đã có mã ĐÃ DUYỆT.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của khối này"],
            ["Trước", "Báo cáo tuần và giao tay đưa việc vào sổ cái", "Cho ra danh sách việc cần gắn"],
            ["Khối này", "AI đề xuất mã → người duyệt hoặc đổi", "Màn bạn đang xem"],
            ["Sau", "Việc treo lên cây, thẻ và bộ lọc đúng; Issue «Quá hạn» bắt đầu theo dõi việc đó", "Cây việc & Issue"],
          ],
        },
        {
          tieuDe: "④ Khối có gì?",
          bang: [
            ["Phần", "Để làm gì"],
            ["Tiêu đề «🤖 Gán mã WBS bằng AI» và nút «▸ Mở» / «▾ Thu gọn»", "Mặc định đóng; bấm «▸ Mở» mới hiện danh sách"],
            ["«🤖 Gán mã WBS vào công việc»", "Gọi AI đọc ngay một lượt, khỏi chờ máy tự chạy"],
            ["«🤖 Soạn việc trên đường găng chưa ai làm» (kèm số)", "Việc giao hàng loạt, xem hướng dẫn «Soạn việc hàng loạt»"],
            ["«Duyệt N/M việc chờ duyệt chắc từ 70%» (70% là mặc định, theo ô ngưỡng ở Cài đặt)", "Duyệt một lượt mọi đề xuất chắc từ 70%"],
            ["Dòng đếm", "«N việc 🤖 chờ duyệt (M nghi — AI chắc dưới 70% · K chưa đo độ chắc) · L việc AI chưa đọc · P đã duyệt / gắn tay»"],
            ["Danh sách 10 việc một trang", "Mỗi dòng: số thứ tự, tên việc, mã và tên đầu việc, nhãn «găng», độ chắc, căn cứ, «✎ gán mã»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm «🤖 Gán mã WBS vào công việc» khi muốn lấy đề xuất ngay · mở từng việc · «Duyệt» hoặc «✎ Đổi sang mã khác…» hoặc «Không thuộc đầu việc nào» · bấm «Duyệt N/M …»", "Người quyết mã cuối cùng"],
            ["MÁY", "Chạy nền mỗi 5 phút · chọn tối đa 60 việc chưa gắn đầu tiên mỗi lượt · kiểm mã AI trả có trong cây thật không (mã lạ bị bỏ) · xếp danh sách (găng và nghi lên đầu) · treo lên cây các mã đã duyệt · kiểm quyền", "Cùng dữ liệu thì cùng danh sách"],
            ["🤖 AI", "🤖 Đọc tên việc, kết quả cần có, dự án và danh sách đầu việc của cây; trả mã đề xuất, lý do, độ chắc", "🤖 Có thể sai; dưới 70% thì ghi «nghi»; chưa duyệt thì chưa treo"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Máy gom các việc chưa có mã của dự án (tối đa 60 việc một lượt).",
            "🤖 AI đề xuất mã cho từng việc và ghi độ chắc. Việc nào AI không gắn được vào đầu việc nào thì ghi kết luận «không thuộc đầu việc nào».",
            "Máy bỏ mã không có trong cây, đưa đề xuất vào danh sách «chờ duyệt».",
            "Người mở danh sách, duyệt từng việc (hoặc duyệt cả lô chắc từ 70%), hoặc đổi mã. Mã người chọn có hiệu lực ngay và AI không gắn đè lên nữa.",
            "Việc đã duyệt treo lên cây; thẻ và bộ lọc cập nhật.",
          ],
          ai: [
            "🤖 AI chỉ đề xuất. Việc 🤖 chưa duyệt có chấm vàng ● và chưa treo lên cây.",
            "AI lỗi thì máy nghỉ 30 phút rồi thử lại; bạn vẫn gắn tay được bằng «✎ Đổi sang mã khác…».",
          ],
        },
      ],
    },
    {
      ten: "① Lấy đề xuất",
      khoi: [
        {
          tieuDe: "Hai cách có đề xuất",
          bang: [
            ["Cách", "Khi nào dùng"],
            ["Chờ máy tự chạy nền", "Bình thường: 5 phút một lượt, không cần ai bấm"],
            ["Bấm «🤖 Gán mã WBS vào công việc»", "Vừa có nhiều việc mới, muốn có đề xuất ngay. Nút ghi «Đang gán… (AI đọc theo lô)» trong lúc chạy"],
          ],
          bam: [
            "Bấm «🤖 Gán mã WBS vào công việc» (ở khối «🤖 Gán mã WBS bằng AI»; người không có quyền sẽ không thấy nút).",
            "Cột phải hiện «🤖 Gán mã WBS bằng AI» và dòng kết quả lượt vừa chạy; nếu máy đang bận lượt khác sẽ báo thử lại sau ít phút.",
            "Bấm «▸ Mở» để xem danh sách đề xuất.",
          ],
          ketQua: ["Cột phải ghi lượt chạy gần nhất kèm giờ và thông điệp. Danh sách có thêm việc «🤖 chờ duyệt»."],
          luuY: ["Mỗi lượt máy chỉ đọc tối đa 60 việc chưa gắn đầu tiên. Dòng cuối khối ghi «Máy chỉ đọc 60 việc chưa gắn đầu tiên — còn N việc nữa trong sổ»; bấm lượt nữa để đọc tiếp."],
          viDu: ["Tình huống minh hoạ: sáng thứ Hai có nhiều việc mới từ báo cáo tuần. Bạn bấm «🤖 Gán mã WBS vào công việc», chờ vài phút rồi mở danh sách thấy dòng đếm «… việc 🤖 chờ duyệt (… nghi — AI chắc dưới 70% …)»."],
        },
      ],
    },
    {
      ten: "② Duyệt từng việc",
      khoi: [
        {
          tieuDe: "Đọc rồi quyết",
          bam: [
            "Bấm «▸ Mở», đọc dòng đếm để biết bao nhiêu việc chờ duyệt, bao nhiêu «nghi».",
            "Bấm một dòng (hoặc «✎ gán mã») để mở việc ở cột phải: thấy mã đề xuất, độ chắc và căn cứ của AI.",
            "Chọn một trong ba: nút «Duyệt» (giữ mã AI đề xuất) · ô «✎ Đổi sang mã khác…» chọn đầu việc đúng · chọn «Không thuộc đầu việc nào».",
          ],
          ketQua: ["Chọn xong là áp dụng ngay, không có nút xác nhận. Cột phải ghi «Đã duyệt mã WBS cho …» hoặc «Đã đổi mã WBS cho …»; việc treo lên đúng đầu việc."],
          luuY: [
            "Thứ tự danh sách: đề xuất chờ duyệt (găng và nghi lên đầu, rồi độ chắc thấp) → việc AI chưa đọc → việc đã duyệt hoặc gắn tay (số thứ tự có chữ v, màu xanh).",
            "Dòng đã duyệt ghi «đã duyệt», «người gắn tay» hoặc «theo mã trong tên việc» để bạn biết mã đến từ đâu.",
          ],
          viDu: ["Tình huống minh hoạ: việc «Thi công san nền khu A» được AI đề xuất 7.2.3 Thi công san nền, chắc 82%, căn cứ là tên việc có chữ san nền. Bạn thấy đúng, bấm «Duyệt». Việc treo ngay dưới 7.2.3."],
        },
        {
          tieuDe: "Duyệt cả lô",
          bam: ["Bấm «Duyệt N/M việc chờ duyệt chắc từ 70%» (70% là mặc định, theo ô ngưỡng ở Cài đặt) (N là số đề xuất chắc từ 70% bạn duyệt được, M là tổng số chờ duyệt)."],
          ketQua: ["Cột phải ghi «Đã duyệt N việc có độ chắc từ 70% trở lên». Việc ngoài phạm vi quyền của bạn bị bỏ qua và được ghi số lượng. Việc dưới ngưỡng và việc chưa đo độ chắc vẫn chờ duyệt từng cái. Mốc 70% là mặc định; ngưỡng đổi được ở Cài đặt › Gắn việc vào WBS."],
          luuY: ["Nút chỉ hiện khi có ít nhất một việc đủ điều kiện. Duyệt lô là bạn chịu trách nhiệm cho cả lô: nên mở xem vài dòng trước."],
        },
      ],
    },
    {
      ten: "③ Danh sách chờ duyệt",
      khoi: [
        {
          tieuDe: "Xem riêng việc chờ duyệt",
          bam: [
            "Ở thanh lọc phía trên cây bấm «🤖 Duyệt gán mã công việc».",
            "Cây được thay bằng danh sách các việc 🤖 đề xuất mã còn chờ duyệt; mỗi dòng ghi «🤖 đề xuất <mã> <tên đầu việc>», độ chắc, «đã xong» nếu việc đã xong và mã việc.",
            "Bấm một dòng để mở việc ở cột phải rồi duyệt hoặc đổi mã. Bấm lại nút lọc để quay về cây.",
          ],
          luuY: ["Ô tìm lọc luôn có tác dụng trong danh sách này (tìm theo tên việc hoặc mã). Không có việc nào chờ thì màn ghi «Không có việc nào chờ duyệt mã WBS»."],
          viDu: ["Tình huống minh hoạ: cuối ngày bạn muốn dọn hết đề xuất còn tồn. Bạn bấm «🤖 Duyệt gán mã công việc», gõ chữ «san nền» vào ô tìm để chỉ còn các việc liên quan san nền, duyệt từng dòng, rồi bấm lại nút lọc để quay về cây."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «🤖 Gán mã WBS vào công việc» hay «Duyệt …»", "Bạn thiếu quyền «Duyệt gắn WBS» — nút ẩn. Nhờ quản trị cấp ở Cài đặt, Vai trò và quyền."],
            ["Bấm «🤖 Gán mã WBS vào công việc» báo máy đang bận", "Đang có một lượt khác chạy. Chờ vài phút rồi bấm lại."],
            ["Danh sách không có đề xuất mới", "Mọi việc đã xét xong, hoặc AI đang lỗi (máy nghỉ 30 phút rồi thử lại). Việc chưa xét ghi «🤖 chưa xét — AI đọc ở lượt tới»."],
            ["Mã AI đề xuất sai", "Bấm việc, chọn «✎ Đổi sang mã khác…» hoặc «Không thuộc đầu việc nào». Mã bạn chọn thắng AI, về sau AI không gắn lại."],
            ["Đã duyệt mà đầu việc vẫn đỏ «chưa ai được giao»", "Bấm «Hỏi lại» để đọc lại sổ. Việc đã xong vẫn tính là đã có việc treo. Nếu việc được gắn sang đầu việc khác thì đầu việc này vẫn trống."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03–05/10/2026 (gộp «Soát tay» và «tầng B» thành một danh sách; duyệt lô từ 70%; mặc định đóng) · phân vai AI của dự án: AI chỉ đề xuất, người duyệt mới có hiệu lực · luật 30 (mã luôn kèm tên đầu việc).",
};
