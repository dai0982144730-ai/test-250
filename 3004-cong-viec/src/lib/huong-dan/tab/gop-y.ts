// Hướng dẫn bản 2 (tab) — màn Góp ý, phản ánh (/gop-y). Viết lại 20/10/2026 (nhóm A3) theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: app/gop-y/page.tsx (OGui, DongGopY, NHAN_TT, TOI_DA_ANH = 6, quyền xoá, trả lời + trạng thái) · components/phong/KhungPhong.tsx (nút «Góp ý» ghi kèm màn đang mở; chuông báo người góp ý).
// Màn này KHÔNG dùng AI (không có lời gọi AI trong trang và API /api/gop-y). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Góp ý, phản ánh — nói với người làm phần mềm điều bạn gặp",
  ai: "Mọi người đăng nhập đều gửi được và đọc được MỌI góp ý. Chỉ Quản trị thấy ô trả lời và ô «Trạng thái» (người khác chỉ thấy câu trả lời). Người gửi chỉ xoá được góp ý còn ở trạng thái «Mới» của chính mình; Quản trị xoá được mọi góp ý (nút «Xoá góp ý» chỉ hiện với người được xoá).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì?",
          doan: [
            "Đây là hộp thư góp ý của phần mềm. Gặp chỗ bất tiện, số liệu khó hiểu, lỗi, hay có ý tưởng làm phần mềm tốt hơn, bạn viết vào đây, dán kèm ảnh chụp màn hình. Người quản lý phần mềm đọc, sửa, rồi trả lời ngay tại đây.",
            "Góp ý mở cho mọi người cùng đọc nên không phải gửi lặp một vấn đề nhiều lần: đọc danh sách trước, thấy đã có thì thôi.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Phần mềm đang dùng thật; chỗ nào khó dùng chỉ người dùng mới biết.",
            "Ghi kèm màn bạn đang ở và ảnh chụp, người sửa khỏi phải hỏi lại «bạn đang ở đâu».",
            "Trả lời và trạng thái hiện công khai, bạn biết góp ý của mình đã được tiếp nhận hay chưa.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của màn Góp ý"],
            ["Trước", "Bạn đang làm việc ở một màn nào đó thì gặp chỗ vướng", "Bấm nút «Góp ý» ở thanh trên — màn vừa rời được ghi kèm"],
            ["Màn này", "Viết góp ý, dán ảnh, gửi; quản trị đọc và trả lời", "Màn bạn đang xem"],
            ["Sau", "Bạn nhận chuông khi quản trị đổi trạng thái hoặc trả lời; nút ✕ đưa bạn về màn cũ", "Chuông 🔔"],
          ],
        },
        {
          tieuDe: "④ Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Ô viết: «Tên góp ý», «Mô tả», khung ảnh, «Gửi góp ý», «Bỏ»", "Gửi góp ý mới", "① Gửi góp ý"],
            ["«Các góp ý (N)» với các nút lọc", "Đọc góp ý của mọi người", "② Đọc và theo dõi"],
            ["Trong một góp ý: câu trả lời, «Trạng thái», «Gửi trả lời», «Xoá góp ý»", "Quản trị xử lý", "③ Quản trị xử lý"],
            ["Nút ✕ góc phải khung", "Đóng, quay lại màn bạn vừa rời", "Hay vướng"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Viết góp ý · dán ảnh · lọc, đọc · Quản trị chọn trạng thái và trả lời", "Mọi quyết định do người"],
            ["MÁY", "Lưu góp ý kèm màn gửi từ đâu, người gửi, đơn vị, giờ gửi · đếm theo trạng thái · lọc · gửi chuông cho người góp ý khi Quản trị đổi trạng thái hoặc trả lời", "Chính xác như đã lưu"],
            ["🤖 AI", "Màn này KHÔNG dùng AI. Không có AI đọc, tóm tắt hay trả lời hộ góp ý", "Không áp dụng"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI. Quy trình thuần giữa người với người: người dùng gửi, quản trị đọc và trả lời, máy chỉ lưu và báo chuông."],
        },
      ],
    },
    {
      ten: "① Gửi góp ý",
      khoi: [
        {
          bam: [
            "Bấm nút «Góp ý» trên thanh trên (từ màn nào cũng được; hệ thống ghi nhớ màn bạn vừa ở để gắn vào góp ý).",
            "Gõ «Tên góp ý» ngắn gọn để sau còn tìm lại (tối đa 200 ký tự).",
            "Gõ mô tả: bạn đang làm gì, ở màn nào, thấy gì, mong muốn thế nào.",
            "Dán ảnh: bấm Ctrl+V ở bất kỳ đâu trong khung (hoặc bấm vào ô chọn ảnh, hoặc kéo thả ảnh vào). Tối đa 6 ảnh. Bấm dấu bỏ ở góc ảnh để gỡ ảnh.",
            "Bấm «Gửi góp ý». Nút mờ nếu chưa có tên góp ý.",
          ],
          ketQua: [
            "Màn báo «Đã gửi góp ý GY-… Cảm ơn bạn — người quản trị sẽ trả lời ở đây và báo bạn qua chuông.» và mở sẵn góp ý vừa gửi.",
            "Muốn viết lại từ đầu: bấm «Bỏ» (hiện khi đã gõ chữ hoặc có ảnh) để xoá ô viết.",
          ],
          luuY: ["Chỉ cần tên là gửi được, nhưng góp ý có mô tả và ảnh sẽ được sửa nhanh hơn nhiều."],
          viDu: [
            "Tình huống minh hoạ: ở Sơ đồ tổ chức bạn thấy số việc trên một ô khác với số trong danh sách. Bạn bấm «Góp ý». Tên góp ý: «Số việc trên ô Phòng Kỹ thuật không khớp danh sách». Mô tả: «Ô ghi nhiều hơn danh sách bên phải; em đang xem tuần hiện tại, bấm vào ô thì thấy ít việc hơn». Bạn chụp màn hình, bấm Ctrl+V dán vào, rồi «Gửi góp ý».",
          ],
        },
      ],
    },
    {
      ten: "② Đọc và theo dõi",
      khoi: [
        {
          tieuDe: "Bộ lọc",
          bang: [
            ["Nút", "Cho xem"],
            ["«Tất cả · N»", "Mọi góp ý"],
            ["«Mới · N»", "Chưa ai tiếp nhận"],
            ["«Đã tiếp nhận · N»", "Quản trị đã đọc và ghi nhận, đang chờ sửa"],
            ["«Đã sửa · N»", "Đã sửa xong"],
            ["«Không làm · N»", "Quản trị quyết không làm, thường kèm lý do ở phần trả lời"],
            ["«Của tôi · N»", "Chỉ góp ý bạn gửi"],
          ],
        },
        {
          tieuDe: "Đọc một góp ý",
          doan: ["Mỗi dòng ghi mã (GY-…), tên góp ý, số ảnh, trạng thái ở bên phải, và dòng nhỏ: người gửi, đơn vị, giờ gửi, «từ màn …». Bấm dòng để mở: mô tả, ảnh (bấm ảnh để xem to) và câu trả lời của Quản trị nếu có."],
          luuY: ["Bấm vào thông báo ở chuông thì màn mở sẵn đúng góp ý đó."],
          viDu: ["Tình huống minh hoạ: bạn lọc «Của tôi», thấy góp ý ở trạng thái «Đã sửa» kèm câu trả lời «Đã khớp lại số liệu từ bản cập nhật hôm nay». Bạn mở lại Sơ đồ tổ chức kiểm tra rồi thôi."],
        },
      ],
    },
    {
      ten: "③ Quản trị xử lý",
      khoi: [
        {
          bam: [
            "Mở góp ý, gõ câu trả lời ở ô «Câu trả lời cho người góp ý (không bắt buộc)».",
            "Chọn «Trạng thái» (Mới, Đã tiếp nhận, Đã sửa, Không làm): chọn là LƯU NGAY và người góp ý nhận chuông.",
            "Nếu chỉ sửa câu trả lời mà không đổi trạng thái, bấm «Gửi trả lời» (nút chỉ hiện khi bạn đã sửa chữ; góp ý đang «Mới» sẽ chuyển thành «Đã tiếp nhận»).",
            "«Xoá góp ý» xoá hẳn, chỉ dùng khi góp ý sai hoặc trùng.",
          ],
          luuY: ["Người gửi chỉ tự xoá được góp ý của mình khi còn ở trạng thái «Mới». Người không phải Quản trị không thấy ô trả lời, chỉ thấy dòng «Trả lời của …»."],
          viDu: ["Tình huống minh hoạ: Quản trị đọc góp ý trên, gõ «Em đã khớp lại số, mời anh/chị kiểm tra» rồi chọn «Đã sửa». Người góp ý nhận chuông ngay."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nút «Gửi góp ý» mờ", "Chưa gõ tên góp ý. Điền tên là gửi được."],
            ["Dán ảnh không ăn", "Chỉ nhận ảnh (png, jpg…), tối đa 6 ảnh. Thử bấm vào ô chọn ảnh thay vì dán."],
            ["Muốn xem góp ý người khác đã gửi", "Mọi góp ý đều mở cho cả công ty đọc. Lọc «Tất cả»."],
            ["Góp ý mãi «Mới»", "Quản trị chưa đọc tới. Nếu gấp, nhắc Quản trị trực tiếp."],
            ["Bấm nhầm nút ✕", "Bấm lại nút «Góp ý» trên thanh trên; ô viết chưa gửi sẽ trống."],
            ["Góp ý là lỗi làm sai dữ liệu công việc", "Ghi rõ mã việc (CV-…) và màn để người sửa tìm đúng."],
            ["Không thấy nút «Xoá góp ý»", "Chỉ Quản trị, hoặc người gửi khi góp ý còn «Mới», mới thấy nút."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 01/10/2026 (thay trang Hướng dẫn cũ bằng nút Giải thích và Góp ý), 04/10/2026 (nút ✕ quay về trang vừa rời) · khuôn «Vấn đề phát sinh» của agent Tiến độ.",
};
