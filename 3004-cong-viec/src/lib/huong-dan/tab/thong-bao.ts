// Hướng dẫn bản 2 (tab) — Chuông thông báo 🔔. Viết lại 20/10/2026 (nhóm A3). BẢN GỐC cho các agent khác tham khảo.
// Mr. Đại chốt 20/10: menu DÙNG CHUNG (chuông, Việc của tôi…) thì hướng dẫn GIỐNG NHAU ở mọi agent. Bản 3004 là gốc: các agent khác chép về, chỉ đổi tên agent.
// ───── PHẦN DÙNG CHUNG (giữ nguyên chữ ở mọi agent): tab «Tổng quan» (trừ mục ghi RIÊNG), tab «① Đọc chuông», tab «② Mở tin và dọn tin», tab «Hay vướng» (trừ dòng ghi RIÊNG).
// ───── PHẦN RIÊNG 3004 (agent khác bỏ hoặc thay bằng tin của chính mình): tab «③ Các loại tin của agent Công việc» (giao việc, báo cáo bị trả lại, nhắc nộp, Ban lãnh đạo nhắc việc…)
//        · nút «☐ Không nhận thông báo xong việc của Nhân viên» (tin xong việc lọc từ báo cáo tuần) · chuyện email kèm theo · dòng «Chuông ở agent khác» ở tab «Hay vướng».
// Căn cứ code: components/phong/KhungPhong.tsx (hàm Chuong, gopTin, LOAI_TEN, LOAI_DO; hộp tin; «Xem tin đã đọc (N) ▸»; chuông nhúng nhung) · lib/thong-bao.ts · app/thong-bao/page.tsx (chuyển hướng về Sơ đồ).
// Chuông KHÔNG dùng AI. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Chuông thông báo 🔔 — tin báo gửi riêng cho bạn",
  ai: "Mọi tài khoản đăng nhập đều có chuông riêng, chỉ thấy tin gửi cho chính mình. Riêng 3004: nút «Không nhận thông báo xong việc của Nhân viên» chỉ hiện với người có nhận loại tin «cấp dưới xong việc» (người khác sẽ không thấy nút).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Chuông là gì?",
          doan: [
            "Biểu tượng chuông trên thanh trên (đứng sau các mục menu «Việc của tôi», «Sơ đồ», «Dự án», «Báo cáo tuần») là hộp tin của riêng bạn: ai giao việc cho bạn, ai nhắc bạn, ai nhắc tên bạn trong bình luận, báo cáo nào gửi tới bạn, việc nào quá hạn, nhắc nộp báo cáo… Con số trên chuông là số tin chưa đọc.",
            "Đây là chuông CHUNG của cả hệ: các agent khác nhúng đúng chuông này, nên ở agent nào bạn cũng thấy cùng số, cùng danh sách. Trang «Thông báo» riêng đã bỏ; mở đường /thong-bao cũ sẽ tự về Sơ đồ tổ chức.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Bạn không phải mở từng màn để biết «có gì mới với mình».",
            "Tin quan trọng (nhắc của Ban lãnh đạo, nhắc nộp báo cáo, báo cáo bị trả lại, việc quá hạn) được tô nền đỏ và đứng đầu.",
            "Bấm một tin là mở đúng chỗ liên quan.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của chuông"],
            ["Trước", "Ai đó giao việc, nhắc, bình luận có @, báo xong… hoặc máy phát hiện việc quá hạn, báo cáo chưa nộp", "Sinh ra tin"],
            ["Chuông", "Hiện số chưa đọc ở mọi agent, đếm tin mới", "Bạn thấy ngay"],
            ["Sau", "Bấm tin → mở đúng việc, bình luận, báo cáo → làm việc", "Việc của tôi, Sơ đồ tổ chức, Báo cáo tuần…"],
          ],
        },
        {
          tieuDe: "④ Hộp tin có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Con số trên chuông («8», «8+5», «+5», «99+»)", "Biết có bao nhiêu tin chưa đọc, bao nhiêu mới", "① Đọc chuông"],
            ["Dòng tin (gộp tin giống nhau, dấu «!» đỏ cho tin mới)", "Đọc và bấm mở", "① · ②"],
            ["Nút «Đánh dấu đã đọc hết»", "Dọn một lần", "② Mở tin và dọn tin"],
            ["Dòng «Xem tin đã đọc (N) ▸»", "Xem lại tin đã đọc trong 7 ngày", "② Mở tin và dọn tin"],
            ["Nút «☐ Không nhận thông báo xong việc của Nhân viên» (RIÊNG 3004)", "Tắt tin xong việc lọc từ báo cáo tuần", "③ Các loại tin"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm chuông, đọc, bấm tin để mở chỗ liên quan, bấm «Đánh dấu đã đọc hết»", "Người quyết xử lý tin"],
            ["MÁY", "Tạo tin khi có sự kiện (giao việc, nhắc, bình luận có @, báo xong, quá hạn…) · gộp tin trùng · xếp thứ tự · đếm tin chưa đọc, tin mới (đọc lại mỗi 60 giây khi cửa sổ đang mở) · xoá tin đã đọc quá 7 ngày", "Chính xác theo sự kiện thật"],
            ["🤖 AI", "Chuông KHÔNG dùng AI. Nội dung tin do máy ghép từ sự kiện", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Không dùng AI. Tin do hệ sinh ra khi có sự kiện; người chỉ đọc và bấm. (Có tin nói về việc do Trợ lý AI lọc ra từ báo cáo tuần: đó là tin về việc, không phải AI viết tin.)"],
        },
      ],
    },
    {
      ten: "① Đọc chuông",
      khoi: [
        {
          tieuDe: "Con số trên chuông",
          bang: [
            ["Hiện", "Nghĩa"],
            ["Một số, ví dụ 8", "8 tin chưa đọc, đều đã được bạn nhìn thấy ở lần mở trước"],
            ["Dạng «8+5»", "8 tin chưa đọc cũ và 5 tin MỚI đến sau lần mở trước. Con số phát sáng khi có tin mới"],
            ["Dạng «+5»", "Chỉ có tin mới"],
            ["Số lớn hơn 99", "Hiện «99+»"],
          ],
          luuY: ["Mở chuông xong rồi đóng thì số «mới» về 0 (phần đã nhìn thấy chuyển sang số cũ). Chuông tự đọc lại mỗi 60 giây khi cửa sổ đang mở."],
          viDu: ["Tình huống minh hoạ: sáng bạn thấy chuông «3». Bạn mở hộp xem rồi đóng mà chưa bấm tin nào. Chiều có người giao thêm một việc: chuông hiện «3+1» và phát sáng. Nghĩa là còn 3 tin cũ đã xem, 1 tin mới."],
        },
        {
          tieuDe: "Thứ tự và gộp tin",
          ds: [
            "Tin MỚI (từ lần mở trước) lên đầu, rồi tin chưa đọc; trong cùng nhóm thì tin mới hơn đứng trước.",
            "Tin đỏ (nhắc nộp báo cáo, báo cáo bị trả lại, việc quá hạn) và bình luận đứng trước tin thường.",
            "Tin giống hệt nhau (cùng loại, cùng nội dung, cùng tệp) được gộp còn một dòng, cuối dòng ghi «cùng nội dung N lần → gộp còn 1».",
            "Dấu «!» đỏ trước nội dung là tin mới từ lần mở chuông trước.",
          ],
        },
      ],
    },
    {
      ten: "② Mở tin và dọn tin",
      khoi: [
        {
          bam: [
            "Bấm chuông để mở hộp tin.",
            "Bấm một dòng tin: tin được đánh dấu đã đọc và đưa bạn tới đúng chỗ (thẻ việc ở Sơ đồ tổ chức, bình luận, trang góp ý…). Tin báo cáo gửi đến thì mở thẳng bản xem nhanh của báo cáo trong cửa sổ nổi.",
            "Tin có tệp kèm: bấm «Xem» để xem trong cửa sổ nổi giữa màn, hoặc «Tải về» để lưu về máy.",
            "Bấm «Đánh dấu đã đọc hết» để dọn một lần.",
            "Bấm ra ngoài hộp tin để đóng.",
          ],
          ketQua: [
            "Tin đã đọc rời khỏi chuông ngay.",
            "Cuối hộp có dòng «Xem tin đã đọc (N) ▸» để xem lại tin đã đọc trong 7 ngày; quá 7 ngày máy xoá hẳn. Bấm «◂ Quay lại tin chưa đọc …» để trở về.",
          ],
          luuY: ["Ở agent khác (nhúng chuông này), bấm một dòng tin thì việc mở ở thẻ trình duyệt mới của agent Công việc."],
          viDu: ["Tình huống minh hoạ: chuông có tin «Bạn được giao việc …». Bạn bấm dòng đó: việc mở ở Sơ đồ tổ chức, tin chuyển sang đã đọc và rời khỏi danh sách. Hai ngày sau bạn cần xem lại: mở chuông, bấm «Xem tin đã đọc (N) ▸» và tìm lại."],
        },
      ],
    },
    {
      ten: "③ Các loại tin (RIÊNG 3004)",
      khoi: [
        {
          tieuDe: "Tin có tiêu đề đậm",
          bang: [
            ["Tiêu đề trong chuông", "Khi nào có", "Màu"],
            ["Ban lãnh đạo nhắc việc", "Ban lãnh đạo bấm nút Nhắc ở Báo cáo tuần", "Nền nhắc; chưa đọc thì đứng đầu cả tin quá hạn"],
            ["Nhắc nộp báo cáo", "Đơn vị bạn chưa nộp báo cáo tuần và có người bấm «Nhắc nộp báo cáo» (ở Sơ đồ tổ chức)", "Đỏ"],
            ["Báo cáo bị trả lại", "Người nhận trả lại báo cáo bạn nộp", "Đỏ"],
            ["Việc quá hạn", "Việc của bạn đã quá hạn", "Đỏ"],
            ["Nhắc bấm Xong việc", "Máy nhắc đóng việc khi đầu việc đã 100% bên agent Tiến độ", "Thường"],
          ],
        },
        {
          tieuDe: "Các tin khác",
          bang: [
            ["Tin", "Ghi chú"],
            ["Bạn được giao việc · việc được gia hạn · việc đã đóng · báo xong · bình luận · được nhắc @ · báo cáo gửi đến", "Hiện nội dung tin, có thể kèm nút «Xem» / «Tải về» cho tệp kèm. Một số loại (giao việc, gia hạn, đóng việc, báo cáo gửi đến, báo cáo bị trả lại, sổ cái thiếu việc) còn gửi kèm email theo cấu hình của quản trị"],
          ],
        },
        {
          tieuDe: "Tắt tin xong việc của nhân viên",
          doan: ["Nếu bạn là người nhận tin cấp dưới xong việc, đầu hộp có ô «☐ Không nhận thông báo xong việc của Nhân viên». Bấm một lần là bật (☑), bấm lại là tắt; nhớ theo tài khoản. Chỉ tắt tin xong việc của việc do Trợ lý AI lọc ra từ báo cáo tuần; việc bạn giao tay hoặc phân công vẫn báo đủ. Người không nhận loại tin này sẽ không thấy ô."],
          viDu: ["Tình huống minh hoạ: bạn là trưởng phòng, nhân viên báo xong nhiều việc lọc từ báo cáo nên chuông dồn tin. Bạn bấm ô «☐ Không nhận thông báo xong việc của Nhân viên» (thành ☑). Từ giờ tin xong của loại việc đó không báo nữa; việc bạn tự giao vẫn báo như cũ."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Mở link /thong-bao cũ", "Đã bỏ trang riêng; tự chuyển về Sơ đồ tổ chức. Xem tin ở chuông."],
            ["Tin biến mất khỏi chuông", "Tin đã đọc rời chuông ngay. Bấm «Xem tin đã đọc (N) ▸» trong 7 ngày."],
            ["Con số không khớp", "Chuông đọc lại mỗi 60 giây, hoặc mở chuông để cập nhật ngay."],
            ["Bấm tin mà không mở đâu", "Việc đã xong từ lâu hoặc đã xoá theo hạn lưu. Tìm trong ô tìm của Sơ đồ tổ chức, phạm vi «Việc toàn công ty»."],
            ["Quá nhiều tin xong việc (RIÊNG 3004)", "Dùng ô «Không nhận thông báo xong việc của Nhân viên» (nếu có)."],
            ["Chuông ở agent khác (Main, Tiến độ, Hợp đồng…)", "Là cùng một chuông nhúng vào, cùng số và cùng danh sách. Bấm một dòng thì mở chỗ liên quan ở thẻ mới của agent Công việc."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 29/09/2026 (chuông «8+5», dấu ! tin mới), 02/10/2026 (nhắc việc của Ban lãnh đạo đứng đầu), 07/10/2026 (dùng chung chuông cho các agent), 10/10/2026 (tin đã đọc rời ngay, xem lại 7 ngày), 20/10/2026 (menu dùng chung thì hướng dẫn giống nhau ở mọi agent).",
};
