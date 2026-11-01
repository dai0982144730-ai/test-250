// Hướng dẫn bản 2 (tab) — trang «Khóa cho agent» (/quan-tri/khoa-agent), đăng ký cả mã cd-khoa-agent (mục «Khóa cho agent» trong Cài đặt › Kết nối chỉ là thẻ có nút mở trang này). Viết 20/10/2026.
// Nhãn chép từ app/quan-tri/khoa-agent/KhoaAgentView.tsx. Quyền «agent.cap_khoa» (quản trị có sẵn): người không có quyền thấy câu «Bạn chưa có quyền …» và mọi nút không hiện.
// Công cụ cấp được: socai.* · lichsu.* · socai.danh_sach_viec · socai.chi_tiet_viec · socai.viec_cua_don_vi · lichsu.tra_cuu_viec (lib/mcp/khoa-agent.ts). Khoá nào cũng luôn gọi được nang_luc, suc_khoe, tim_theo_ma.
// Màn không dùng AI: đây là cổng để AI của agent KHÁC đọc sổ cái; khoá gốc không lưu, chỉ lưu mã băm.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Khóa cho agent — cho agent khác đọc sổ cái",
  ai: "Chỉ người có quyền «Cấp khóa cho agent đọc sổ cái» (quản trị viên có sẵn) vào được trang này; người không có quyền thấy câu «Bạn chưa có quyền «Cấp khóa cho agent đọc sổ cái».» và không có nút nào. Menu «Khóa cho agent» ở trang Quản trị và nút «Khóa cho agent đọc sổ cái» ở trang Skill AI cũng chỉ hiện với người có quyền.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Trang này là gì",
          doan: [
            "SCI công việc là nơi giữ sổ cái công việc. Các agent khác của hệ thống (agent Tiến độ, agent Main, agent Hợp đồng…) cần đọc sổ này để làm việc của họ. Để chúng vào được mà không mở cửa cho mọi người, mỗi agent được cấp một KHÓA riêng. Trang này là nơi cấp khóa, xem khóa nào đang dùng bao nhiêu, và thu hồi khi cần.",
            "Khóa chỉ cho ĐỌC, và chỉ gọi đúng những công cụ bạn tick lúc cấp.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Mỗi agent một khóa riêng: lộ hay không cần nữa thì thu hồi riêng một khóa, các agent khác không bị ảnh hưởng.",
            "Quyền chia nhỏ theo công cụ: có agent chỉ cần xem danh sách việc, không cần xem lịch sử.",
            "Mọi lần cấp, thu hồi và lượt đọc đầu tiên mỗi ngày của từng khóa đều ghi vào Lịch sử nên truy được ai cấp, ai thu hồi, agent nào đọc.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của trang"],
            ["Trước", "Quyết định agent nào cần đọc sổ cái và cần công cụ nào", "Người quản trị quyết"],
            ["Trang này", "Cấp khóa, chép khóa gốc, đưa cho agent kia", "Cấp phát"],
            ["Sau", "Agent kia gọi cổng đọc sổ cái bằng khóa; bạn xem số lượt đọc ở bảng «Khóa đã cấp», thu hồi khi không cần", "Giám sát"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Khung vàng «Khóa mới cho … — CHÉP NGAY, khóa này chỉ hiện một lần» (chỉ hiện ngay sau khi cấp)", "Hiện khóa gốc một lần", "② Chép và đưa cho agent"],
            ["Khối «Cấp khóa mới»: ô «Tên agent», danh sách công cụ, nút «Cấp khóa»", "Cấp khóa", "① Cấp khóa mới"],
            ["Khối «Khóa đã cấp»: bảng «Agent», «Công cụ», «Cấp bởi · lúc», «Lượt đọc 7 ngày · lần cuối», nút «Thu hồi»", "Giám sát và thu hồi", "③ Xem lượt dùng · ④ Thu hồi"],
            ["Khối «📐 Agent khác đọc sổ cái thế nào»", "Ghi chú kỹ thuật: địa chỉ cổng, tên trường", "② Chép và đưa cho agent"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Đặt tên agent, tick công cụ, bấm «Cấp khóa», chép khóa đưa cho người cài agent kia, thu hồi khi cần."],
            ["Máy", "Sinh khóa ngẫu nhiên, chỉ lưu mã băm (không lưu khóa gốc), kiểm khóa mỗi lần agent gọi, chặn công cụ không được cấp, đếm lượt, ghi Lịch sử. Khóa bị thu hồi thì bị từ chối ngay."],
            ["🤖 AI", "— Trang này không dùng AI. Khóa dành cho AI của agent KHÁC gọi vào; việc cấp và thu hồi là của người."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Trang này không dùng AI: người cấp và thu hồi, máy kiểm khóa mỗi lần có agent gọi."],
        },
      ],
    },
    {
      ten: "① Cấp khóa mới",
      khoi: [
        {
          doan: ["Mỗi agent một khóa. Đặt tên dễ nhận ra (ví dụ tên agent), rồi chọn các công cụ agent đó được gọi."],
        },
        {
          tieuDe: "Các công cụ chọn được",
          bang: [
            ["Công cụ", "Cho phép"],
            ["socai.*", "Mọi công cụ nhóm sổ cái (kể cả công cụ thêm sau)"],
            ["lichsu.*", "Mọi công cụ nhóm lịch sử (kể cả công cụ thêm sau)"],
            ["socai.danh_sach_viec", "Việc ĐANG MỞ trong sổ cái, lọc theo đơn vị, dự án, người, cảnh báo"],
            ["socai.chi_tiet_viec", "Một việc: phần việc, người, ngày, nguồn hiện hành, các bản bị đè, quá trình"],
            ["socai.viec_cua_don_vi", "Việc đang mở của MỘT đơn vị hoặc MỘT người"],
            ["lichsu.tra_cuu_viec", "Việc ĐÃ XONG (đã rời sổ cái) trong khoảng ngày"],
          ],
        },
        {
          bam: [
            "Vào Cài đặt → tab «🔌 Kết nối» → mục «Khóa cho agent» → «Mở trang Khóa cho agent» (hoặc menu «Khóa cho agent» ở trang Quản trị).",
            "Gõ «Tên agent» (ít nhất 2 chữ).",
            "Tick các công cụ cần cấp (mặc định đã tick «socai.*» và «lichsu.*»; tick ít nhất một).",
            "Bấm «Cấp khóa». Nút mờ nếu tên quá ngắn hoặc chưa tick công cụ nào.",
          ],
        },
        {
          viDu: [
            "Tình huống: agent Tiến độ cần biết phòng nào đang giữ việc trễ để hiện lên bảng của họ. Bạn đặt «Tên agent» là «Agent tiến độ», tick «socai.danh_sach_viec» và «socai.viec_cua_don_vi», bỏ tick hai nhóm sao, rồi bấm «Cấp khóa». Khóa này không xem được lịch sử việc đã xong.",
          ],
        },
        {
          luuY: [
            "Cấp ít quyền nhất đủ dùng: tick từng công cụ thay vì cả nhóm khi có thể.",
            "Công cụ kiểm sức khoẻ, danh sách công cụ và tra theo mã việc luôn mở cho khóa hợp lệ (tra theo mã cần quyền xem chi tiết việc).",
          ],
        },
      ],
    },
    {
      ten: "② Chép và đưa cho agent",
      khoi: [
        {
          doan: ["Cấp xong, một khung viền vàng hiện ở đầu trang với khóa GỐC. Đây là lần DUY NHẤT khóa gốc hiện ra: hệ thống chỉ giữ mã băm nên không có cách xem lại."],
        },
        {
          bam: [
            "Bấm nút chép bên cạnh dòng khóa, hoặc bôi đen và chép tay.",
            "Đưa khóa cho người cài đặt agent kia, qua kênh an toàn.",
            "Agent kia gọi cổng đọc sổ cái theo địa chỉ ghi dưới khóa («POST …/api/mcp/socai», kèm khóa trong phần xác thực Bearer).",
            "Chép xong bấm «Đã chép, ẩn khóa».",
          ],
        },
        {
          viDu: ["Tình huống: bạn chép khóa gửi cho người phụ trách agent Tiến độ. Họ dán khóa vào cấu hình của agent. Từ lần gọi đầu, bảng «Khóa đã cấp» thêm số lượt đọc và giờ lần cuối."],
        },
        {
          luuY: [
            "Mất khóa thì không lấy lại được: thu hồi khóa cũ và cấp khóa mới.",
            "Đừng gửi khóa qua nơi nhiều người đọc được.",
          ],
        },
      ],
    },
    {
      ten: "③ Xem lượt dùng",
      khoi: [
        {
          doan: ["Khối «Khóa đã cấp» ghi trên đầu số khóa đang dùng và số khóa đã thu hồi."],
        },
        {
          bang: [
            ["Cột", "Nghĩa"],
            ["«Agent»", "Tên bạn đặt và mã khóa (chữ nhỏ)"],
            ["«Công cụ»", "Các công cụ khóa được gọi"],
            ["«Cấp bởi · lúc»", "Người cấp và giờ cấp"],
            ["«Lượt đọc 7 ngày · lần cuối»", "Số lượt agent đã đọc trong 7 ngày và giờ lần đọc gần nhất"],
          ],
        },
        {
          viDu: ["Tình huống: dòng «Agent tiến độ» ghi nhiều lượt đọc, lần cuối cách đây vài phút: agent đang chạy bình thường. Dòng của một agent cũ ghi 0 lượt trong 7 ngày: có thể thu hồi cho gọn."],
        },
        {
          luuY: ["Lịch sử ghi lượt đọc đầu tiên mỗi ngày của từng khóa (gộp, không ghi từng lần), nên tra ai đọc ngày nào ở Cài đặt › Lịch sử với hành động «Agent đọc sổ cái»."],
        },
      ],
    },
    {
      ten: "④ Thu hồi",
      khoi: [
        {
          doan: ["Thu hồi là chặn khóa ngay, không xoá dòng (lịch sử còn đủ). Dùng khi agent không còn cần, khi nghi lộ khóa, hoặc khi cần đổi khóa."],
        },
        {
          bam: [
            "Ở dòng khóa cần thu hồi, bấm «Thu hồi».",
            "Dòng đổi thành «Thu hồi thật» và «Hủy». Bấm «Thu hồi thật» để chắc chắn, hoặc «Hủy» để bỏ.",
            "Chờ thông báo «Đã thu hồi khóa — agent dùng khóa này sẽ bị từ chối ngay.»",
          ],
        },
        {
          ketQua: ["Dòng khóa mờ đi với nhãn «đã thu hồi». Agent kia gọi lần sau bị từ chối. Lịch sử ghi người thu hồi."],
        },
        {
          viDu: ["Tình huống: nghi khóa của agent Tiến độ lộ. Bạn thu hồi, rồi cấp khóa mới với cùng tên và cùng công cụ, chép đưa người cài đặt để họ thay vào cấu hình."],
        },
        {
          luuY: ["Khóa đã thu hồi không dùng lại được; muốn cho agent đọc tiếp phải cấp khóa mới."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Thấy câu «Bạn chưa có quyền …»", "Tài khoản chưa có quyền «Cấp khóa cho agent đọc sổ cái»; nhờ quản trị cấp ở «Vai trò và quyền»."],
            ["Nút «Cấp khóa» mờ", "Tên agent chưa đủ 2 chữ hoặc chưa tick công cụ nào."],
            ["Quên chép khóa", "Không xem lại được; thu hồi và cấp khóa mới."],
            ["Agent báo «Khóa agent không đúng»", "Chép thiếu hoặc thừa ký tự; kiểm lại khóa hoặc cấp mới."],
            ["Agent báo khóa đã bị thu hồi", "Khóa đó đã bị thu hồi; cấp khóa mới."],
            ["Agent gọi được nhưng thiếu công cụ", "Khóa chỉ gọi đúng công cụ đã tick; thu hồi và cấp lại với công cụ đầy đủ."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Cấp khóa cho agent đọc sổ cái»; cổng đọc sổ cái chỉ đọc; hệ thống chỉ lưu mã băm của khóa; lịch sử ghi lúc cấp, lúc thu hồi và lượt đọc đầu tiên mỗi ngày.",
};
