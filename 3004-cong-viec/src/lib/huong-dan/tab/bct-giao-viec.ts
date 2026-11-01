// Hướng dẫn bản 2 (tab) — Báo cáo tuần, khung «Giao việc cho …» mở ở cột phải (từ nút «Giao việc» ở dòng kiến nghị chưa có việc). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/phong/SoDoPhong.tsx (hàm GiaoViec: ô Giao cho, Người nhận trong Ban lãnh đạo, Nhân viên làm chủ trì, Thuộc dự án, Nội dung việc, Kết quả cần có, Hạn, thông báo thiếu)
// · components/phong/BaoCaoTuanPhong.tsx (Phai kieu giao / giao_kn, coTheGiao, tenMacDinh) · app/api/bao-cao-tuan/thao-tac và can-quyet (ghi việc đã giao từ dòng nào).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Giao việc từ Báo cáo tuần — khung «Giao việc cho …»",
  ai: "Chỉ người có quyền giao việc tới đơn vị của dòng kiến nghị mới thấy nút «Giao việc». Người không có quyền sẽ không thấy nút (chỉ thấy chữ «chưa có việc»). Trong form, danh sách «Giao cho» chỉ liệt kê nơi bạn được giao.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: ["Form giao một việc mới ngay từ Báo cáo tuần, không phải sang Sơ đồ tổ chức. Nội dung việc được điền sẵn đúng câu kiến nghị của dòng bạn vừa bấm; bạn sửa lại cho rõ việc trước khi giao. (Khối «Điểm nóng» không có nút giao vì việc ở đó đã tồn tại.)"],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Đọc báo cáo xong là giao luôn, việc vào sổ cái ngay, người nhận có chuông và thấy ở «Việc của tôi».",
            "Việc giao từ dòng kiến nghị được gắn với dòng đó, nên lần sau mở tab dòng này đã hiện việc, không ai giao trùng.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của khung này"],
            ["Trước", "Đọc báo cáo, thấy kiến nghị chưa có người làm", "Phát hiện"],
            ["Khung này", "Chọn bên nhận, ghi nội dung, hạn, bấm «Giao việc»", "Tạo việc"],
            ["Sau", "Việc hiện ở cột phải, ở Sơ đồ tổ chức, Việc của tôi của người nhận; có chuông", "Người nhận làm việc"],
          ],
        },
        {
          tieuDe: "④ Khung có những ô nào?",
          bang: [
            ["Ô", "Để làm gì", "Xem tab"],
            ["«Giao cho» (kèm «· theo gợi ý» hoặc «· đã đổi khỏi gợi ý»)", "Chọn bên nhận: nhóm «Lãnh đạo» và nhóm «Đơn vị»", "① Giao việc"],
            ["«Người nhận trong Ban lãnh đạo» (chỉ hiện khi bên nhận là Ban lãnh đạo) hoặc «Nhân viên làm chủ trì · bắt buộc chọn một người» (khi giao trong phòng mình)", "Chọn đích danh người nhận", "① Giao việc"],
            ["«Thuộc dự án · không bắt buộc»", "Gắn việc vào một dự án", "① Giao việc"],
            ["«Nội dung việc» (có nút 📎), «Kết quả cần có», «Hạn»", "Ghi việc gì, ra sản phẩm gì, bao giờ xong", "① Giao việc"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn bên nhận, viết nội dung, ghi hạn, kẹp tệp, bấm «Giao việc»", "Người quyết"],
            ["MÁY", "Gợi ý bên nhận theo đơn vị nộp dòng kiến nghị; kiểm thiếu thông tin và quyền; tạo việc; ghi việc đã giao từ dòng nào; gửi chuông", "Luật cố định"],
            ["🤖 AI", "Khung này không dùng AI", "—"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Khung này không dùng AI. Người điền, máy kiểm và tạo việc. Nội dung việc là chữ của bạn, không do AI viết."],
        },
      ],
    },
    {
      ten: "① Giao việc",
      khoi: [
        {
          tieuDe: "Các bước",
          bam: [
            "Đọc tên khung «Giao việc cho <tên>» và ô «Giao cho». Máy đã chọn sẵn bên gợi ý theo đơn vị nộp dòng kiến nghị. Muốn giao nơi khác, đổi ngay trong ô này; chữ nhỏ cạnh nhãn đổi thành «đã đổi khỏi gợi ý».",
            "Nếu bên nhận là Ban lãnh đạo: bấm tên một lãnh đạo ở «Người nhận trong Ban lãnh đạo». Nếu bạn là trưởng phòng giao cho chính phòng mình: bắt buộc bấm chọn MỘT nhân viên ở «Nhân viên làm chủ trì».",
            "Có thể chọn «Thuộc dự án» (không bắt buộc) để việc gắn vào dự án.",
            "Sửa «Nội dung việc» cho rõ việc cần làm; có thể kẹp tệp bằng nút 📎. Ghi «Kết quả cần có» (ví dụ: tờ trình gửi Tổng giám đốc) và chọn «Hạn» bằng ô ngày.",
            "Bấm «Giao việc». Nút mờ thì bên cạnh có một câu nói còn thiếu gì.",
          ],
          ketQua: [
            "Máy tạo việc với ngày bắt đầu là hôm nay, gắn với dòng kiến nghị bạn vừa bấm, gửi chuông cho bên nhận.",
            "Màn báo «Đã giao việc <mã> từ kiến nghị», rồi cột phải mở ngay việc mới.",
            "Dòng kiến nghị chuyển sang nhóm «đang chạy» và hiện việc vừa tạo thay cho nút «Giao việc».",
          ],
          viDu: [
            "Phòng Tài chính kế toán kiến nghị xin Ban lãnh đạo quyết phương án cấp vốn, sổ cái chưa có việc nào (tình huống minh hoạ). Bạn bấm «Giao việc» ở dòng đó; nội dung điền sẵn là câu kiến nghị, bạn sửa thành «Trình phương án cấp vốn cho Ban lãnh đạo quyết», ghi «Kết quả cần có»: tờ trình đủ ký, chọn hạn là ngày họp tới rồi bấm «Giao việc».",
            "Hạn chọn là ngày bất kỳ từ hôm nay trở đi. Dòng chữ nhỏ dưới ô hạn tự ghi số ngày và khoảng ngày, bạn không phải đếm nhẩm.",
          ],
          luuY: [
            "Hạn trước hôm nay thì nút mờ với câu «Hạn trước hôm nay». Hạn có thể để trống nhưng việc không hạn sẽ không bao giờ báo quá hạn; nên ghi hạn.",
            "«ngoài phạm vi giao việc của bạn»: bên nhận bạn chọn nằm ngoài quyền giao. Chọn nơi khác hoặc nhờ người có quyền.",
          ],
        },
        {
          tieuDe: "Các câu nút mờ có thể gặp",
          bang: [
            ["Câu cạnh nút", "Việc cần làm"],
            ["Chưa có nội dung việc", "Điền ô «Nội dung việc»"],
            ["Chưa chọn người nhận", "Bấm một tên lãnh đạo"],
            ["Chưa chọn nhân viên làm chủ trì", "Bấm một nhân viên của phòng"],
            ["<tên> ngoài phạm vi giao việc của bạn", "Đổi «Giao cho» sang nơi bạn được giao"],
            ["Hạn trước hôm nay", "Chọn lại ngày hạn"],
            ["«Đang tải file…»", "Chờ tệp đính kèm tải xong"],
          ],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «Giao việc» ở một dòng", "Đơn vị của dòng đó ngoài phạm vi quyền giao việc của bạn; chỗ nút chỉ còn chữ «chưa có việc»"],
            ["Ô «Giao cho» không có đơn vị mình cần", "Danh sách chỉ liệt kê nơi bạn được giao (và nơi gợi ý). Nhờ người có quyền rộng hơn"],
            ["Giao xong nhưng muốn đổi người nhận", "Mở việc mới ở cột phải, sửa bằng cây bút ✎ nếu bạn có quyền «Sửa việc»"],
            ["Bấm «Giao việc» hai lần", "Lần đầu đã tạo việc, dòng kiến nghị chuyển sang nhóm đang chạy; mở việc vừa tạo thay vì giao lại"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 09/10/2026: ô «Giao cho» trong form ở Báo cáo tuần, đổi nơi nhận ngay trong form · Mr. Đại chốt 30/09/2026: giao trong phòng mình thì chọn một nhân viên · riêng 3004 nút không có quyền thì ẩn (ngoại lệ luật 17).",
};
