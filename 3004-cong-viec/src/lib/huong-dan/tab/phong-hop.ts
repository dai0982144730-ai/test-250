// Hướng dẫn bản 2 (tab) — màn Phòng họp (Mr. Đại chốt 25/10/2026; đề xuất DE-XUAT-PHONG-HOP-25-10.md, câu chốt A).
// Căn cứ code: components/phong-hop/{PhongHop,DongHop}.tsx · lib/phong-hop/{thuan,dich-vu}.ts · db/89-phong-hop.sql.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Phòng họp — đặt phòng, báo họp, xem lịch các phòng",
  ai: "Mọi người đều đặt phòng được — công ty không có lễ tân, phòng còn trống là nhận ngay. Sửa, huỷ một cuộc họp: chỉ người đặt và quản trị. Ghi chú, đường dẫn họp trực tuyến, khách mời ngoài: chỉ người đặt, người được mời và quản trị xem được (người khác vẫn thấy phòng bận, giờ, nội dung, người dự). Sửa, gửi thông báo họp giao ban: Ban lãnh đạo, trưởng các phòng và quản trị (người khác chỉ xem).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì?",
          doan: [
            "Nơi cả công ty tự đặt 3 phòng họp (Phòng họp 01 · 03 · 09), báo người dự và xem phòng nào đang trống. Bên trái là mặt bằng khu phòng họp, nhìn là biết phòng nào đang họp, phòng nào sắp có họp. Bên phải là nội dung của nút đang bấm.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Không ai phải hỏi miệng «phòng 09 chiều nay có ai dùng không» — thanh giờ cho thấy ngay.",
            "Hai người không đặt trùng một phòng cùng giờ: máy từ chối người đặt sau và nói rõ ai đã đặt.",
            "Người được mời biết ngay: dòng chữ đỏ hiện trên thanh trên, ở mọi màn, ở cả các agent khác dùng chung chuông.",
          ],
        },
        {
          tieuDe: "③ Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì"],
            ["Hai nút trên mặt bằng: «Đăng ký phòng họp» · «Thông báo họp giao ban»", "Chọn nội dung khung bên phải"],
            ["Dải giữa «Lịch họp các phòng»", "Lịch một ngày của cả 3 phòng — luôn hiện, rê chuột xem chủ trì và người dự, bấm để xem chi tiết bên phải"],
            ["Mặt bằng bên trái", "Phòng đang họp: người ngồi + khung đỏ nhấp nháy · có lịch sắp tới hôm nay: khung vàng nhấp nháy · không còn cuộc nào hôm nay: phủ xám như tắt điện. Rê chuột lên phòng để xem chi tiết, bấm phòng để đăng ký"],
            ["Biển trên cửa mỗi phòng", "«Đang họp · đến 15:30» · «Tiếp theo 14:00» · «Trống»"],
            ["Đồng hồ ở sảnh", "Giờ Việt Nam lúc này"],
          ],
        },
        {
          tieuDe: "④ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Chọn phòng, giờ, người dự, ghi nội dung · sửa, huỷ cuộc họp mình đặt · lập và gửi giao ban"],
            ["MÁY", "Tô màu thanh giờ · kiểm trùng phòng · tính người dự từ nhóm và cả phòng · cảnh báo người đang có họp khác, mời quá số ghế · xếp người vào ghế, chọn ghế chủ toạ · báo qua thanh trên và chuông"],
            ["🤖 AI", "Màn này không dùng AI"],
          ],
        },
      ],
    },
    {
      ten: "① Đăng ký phòng họp",
      khoi: [
        {
          tieuDe: "Ba thanh giờ — mỗi phòng một thanh",
          bang: [
            ["Màu ô", "Nghĩa"],
            ["Xanh lá", "Trống — bấm được"],
            ["Vàng", "Đã có người đặt (rê chuột xem ai, nội dung gì)"],
            ["Đỏ", "Đang họp — giờ lúc này nằm trong cuộc họp"],
            ["Xám", "Giờ đã qua"],
          ],
          doan: ["Mỗi ô là 30 phút, chỉ trong giờ làm việc 08:00 – 12:00 và 13:30 – 17:00 (15 ô một phòng). Một cuộc họp nằm trong một buổi, không họp xuyên nghỉ trưa. Đổi ngày bằng ô ngày hoặc nút ‹ › ở đầu khung — đổi ngày thì giờ đã chọn bị xoá."],
        },
        {
          tieuDe: "Các bước",
          bam: [
            "Bấm một ô xanh trên thanh của phòng muốn dùng — máy điền phòng và giờ bắt đầu, giờ kết thúc = 30 phút sau. Muốn họp lâu hơn: kéo chuột qua nhiều ô, hoặc bấm tiếp ô liền sau.",
            "Hoặc chọn phòng ở hàng nút «Phòng» và giờ ở hai ô «Bắt đầu» – «Kết thúc».",
            "Ghi «Nội dung họp».",
            "Ô «Người dự»: gõ tên để tìm. Bấm một dòng là thêm: một người, «Cả P.ĐT&PC» (mọi người của phòng lúc này), «Ban lãnh đạo» hoặc «Trưởng các phòng». Bạn tự là người dự. Danh sách chỉ có người ngồi ở văn phòng công ty — không có các nhà máy đang vận hành và Ban điều hành tổng thầu.",
            "Nếu cần: «Khách mời ngoài», «Họp trực tuyến» (đường dẫn), «Ghi chú dặn».",
            "Bấm «Đăng ký phòng họp».",
          ],
          luuY: ["Ai đăng nhập cũng đặt được, kể cả tài khoản Người xem — không có lễ tân. Ô «Họp trực tuyến» chỉ nhận đường dẫn bắt đầu bằng http:// hoặc https://."],
          ketQua: [
            "Phòng còn trống: máy nhận ngay, ô chuyển vàng, mọi người dự thấy dòng chữ đỏ trên thanh trên.",
            "Phòng vừa có người đặt trùng giờ: máy từ chối, nói rõ ai đặt, giờ nào — chọn giờ hoặc phòng khác, hoặc nhờ người đặt nhường.",
          ],
        },
        {
          tieuDe: "Máy cảnh báo (vẫn cho đặt)",
          ds: [
            "«⚠ N người đang có họp khác cùng giờ» — kèm tên và cuộc họp kia.",
            "«⚠ Mời N người — phòng có M ghế».",
          ],
        },
        {
          tieuDe: "Sửa, huỷ",
          doan: [
            "Chỉ cuộc họp CHƯA diễn ra mới sửa, huỷ được. Bấm ô vàng của cuộc họp mình đặt (hoặc bấm khối cuộc họp ở dải «Lịch họp các phòng») → khung chuyển sang «Sửa cuộc họp»: đổi giờ, phòng, người dự rồi «Lưu thay đổi»; hoặc «Huỷ cuộc họp» (bấm hai lần cho chắc). Đổi giờ, đổi phòng hay huỷ thì người dự nhận chuông báo.",
            "Cuộc họp ĐANG DIỄN RA: bấm ô đỏ chỉ xem chi tiết; người đặt có nút «Kết thúc sớm» — bấm lần 1 hiện giờ kết thúc, bấm lần 2 mới chạy; kết thúc ở mốc 30 phút kế tiếp (không phải ngay lúc bấm), trả phòng phần còn lại, người dự nhận chuông. Cuộc họp đã xong: ô xám, chỉ xem. Cuộc họp của người khác: chỉ xem — kể cả lãnh đạo không giành được phòng đã có người đặt.",
          ],
        },
      ],
    },
    {
      ten: "② Thông báo họp giao ban",
      khoi: [
        {
          doan: [
            "Cấu hình buổi giao ban hằng tuần: ngày trong tuần (mặc định Thứ Hai), giờ (mặc định 15:00 – 17:00), phòng (mặc định Phòng họp 09 — phòng lớn nhất), thành phần (mặc định Ban lãnh đạo + Trưởng các phòng), nội dung.",
          ],
        },
        {
          tieuDe: "Các bước",
          bam: [
            "Sửa các ô nếu tuần này khác (ngày, giờ, phòng, thành phần).",
            "Xem dòng «Buổi kế tiếp»: ngày, giờ, phòng, số người nhận.",
            "Bấm «Gửi thông báo».",
          ],
          ketQua: [
            "Máy lưu cấu hình, ĐẶT LUÔN PHÒNG cho buổi kế tiếp (thanh giờ hiện vàng), rồi mọi người trong thành phần nhận dòng chữ đỏ.",
            "Đã gửi buổi này rồi mà gửi lại: máy cập nhật buổi đó (không tạo buổi thứ hai), mọi người nhận lại dòng báo.",
            "«Chỉ lưu»: lưu cấu hình, chưa đặt phòng, chưa báo ai.",
          ],
          luuY: ["Máy không tự gửi hằng tuần — tuần nào cũng phải bấm «Gửi thông báo». Phòng giờ đó đã có người đặt thì máy báo tên người đặt, không gửi được tới khi chọn phòng khác hoặc người đặt nhường."],
        },
      ],
    },
    {
      ten: "③ Lịch họp các phòng",
      khoi: [
        {
          doan: [
            "Dải giữa màn, luôn hiện. Trục dọc là giờ làm việc 08:00 – 12:00 · 13:30 – 17:00 (vạch kép là nghỉ trưa), mỗi cột một phòng, cao vừa màn không phải cuộn. Cuộc họp kéo dài bao nhiêu ô thì khối gộp bấy nhiêu, trong khối chỉ ghi nội dung họp. Rê chuột lên khối: tên cuộc họp, người chủ trì, người dự. Đường đỏ ngang là giờ lúc này (khi xem hôm nay).",
            "Nút «Chỉ cuộc họp của tôi»: chỉ giữ cuộc họp bạn đặt hoặc được mời. Bấm một khối: chi tiết hiện ở khung bên phải — cuộc của mình chưa diễn ra thì mở luôn để sửa.",
          ],
        },
      ],
    },
    {
      ten: "④ Dòng chữ đỏ trên thanh trên",
      khoi: [
        {
          doan: [
            "Tin mời họp không cộng vào con số chuông mà hiện thành dòng chữ chạy ngay BÊN PHẢI chuông: «15:00 họp … · Phòng họp 09». Chuông vẫn giữ con số và nhấp nháy đỏ của tin công việc như cũ — hai thứ không liên quan nhau.",
            "Có từ hai cuộc trở lên: mỗi cuộc một màu, đỏ – trắng xen kẽ, liếc là biết có nhiều cuộc. Ô chữ chỉ lấy phần trống của thanh trên (rộng nhất bằng khoảng 40 chữ); chữ dài hơn ô thì tự chạy.",
            "Chỉ LỜI MỜI họp là dòng chữ. Khi người đặt đổi giờ, đổi phòng, huỷ hay kết thúc sớm thì người dự nhận thêm một tin ở chuông (có cộng vào con số) — để ai đang đi họp cũng biết cuộc họp đã đổi, không phải thấy dòng chữ biến mất mà không rõ vì sao.",
          ],
        },
        {
          bang: [
            ["Lúc nào", "Dòng chữ"],
            ["Mới được mời, chưa bấm xem", "Nhấp nháy"],
            ["Đã bấm xem", "Chữ đỏ đứng yên"],
            ["Còn 15 phút tới giờ họp", "Nhấp nháy lại"],
            ["Cuộc họp kết thúc", "Tắt"],
          ],
          ketQua: ["Bấm dòng chữ → khung chi tiết từng cuộc: nội dung, giờ, phòng, người tổ chức, người dự, ghi chú, đường dẫn họp trực tuyến."],
        },
      ],
    },
    {
      ten: "⑤ Người ngồi trong phòng",
      khoi: [
        {
          ds: [
            "Phòng đang họp: máy vẽ người dự vào ghế (tối đa bằng số ghế), tên ngắn trên đầu — «Nguyễn Chính Đại» ghi «Chính Đại». Rê chuột lên người để xem đủ tên.",
            "Chủ tịch HĐQT: vòng đỏ nhấp nháy trên đầu, không ghi tên. Phó chủ tịch HĐQT: vòng xanh dương, không ghi tên. Tổng giám đốc: vòng xanh lá, không ghi tên.",
            "Ghế chủ toạ (đầu bàn): người cấp cao nhất trong số người dự; không ai cao hơn người tạo thì là người tạo. Hai lãnh đạo đồng cấp cao nhất (vd hai Phó tổng) mà người tạo không phải một trong hai thì máy để TRỐNG ghế chủ toạ.",
          ],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp", "Vì sao · làm gì"],
            ["Ô xám không bấm được", "Giờ đã qua — chọn giờ sau"],
            ["Bấm «Đăng ký» bị báo trùng", "Có người vừa đặt trước bạn vài giây — chọn giờ hoặc phòng khác"],
            ["Không thấy nút «Gửi thông báo» ở giao ban", "Chỉ Ban lãnh đạo, trưởng các phòng, quản trị mới gửi được"],
            ["Người vào phòng sau khi đặt không nhận được báo", "«Cả phòng X» lấy người của phòng lúc đặt — sửa cuộc họp, thêm người đó"],
            ["Ghế chủ toạ trống", "Có hai lãnh đạo đồng cấp cao nhất, máy không phân được ai chủ toạ"],
          ],
        },
      ],
    },
  ],
  canCu: "components/phong-hop/PhongHop.tsx · DongHop.tsx · lib/phong-hop/thuan.ts · dich-vu.ts · db/89-phong-hop.sql",
};
