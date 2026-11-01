// Hướng dẫn bản 2 (tab) — khung «Giao việc theo dự án» mở bằng nút «＋ Giao việc» ở menu Dự án. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/DuAnPhong.tsx (nút «＋ Giao việc», cheDo giao) · components/phong/SoDoPhong.tsx (GiaoViec với tham số duAn, coTheGiaoToi)
// · components/cay-viec/OChonNoiNhan.tsx (ô «Giao cho») · lib/so-cai/lanh-dao-phoi-hop.ts · lib/phong/giai-doan.ts. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Giao việc theo dự án — khung mở bằng nút «＋ Giao việc»",
  ai: "Người có quyền «Giao việc» thấy nút «＋ Giao việc» (không có quyền thì nút ẨN). Danh sách người / đơn vị nhận chỉ gồm nơi nằm trong phạm vi giao việc của bạn: lãnh đạo, Quản trị thấy cả công ty; trưởng đơn vị thấy đơn vị mình, cấp dưới và người trong đơn vị mình.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì?",
          doan: [
            "Ở menu «Dự án», nút «＋ Giao việc» (hàng nút trên đầu sân) đổi cột bên phải thành khung «Giao việc theo dự án». Khác với dấu «＋» ở Sơ đồ tổ chức (chọn ô trước, giao sau), ở đây bạn chọn DỰ ÁN trước rồi chọn người hoặc đơn vị nhận.",
            "Bấm lại «＋ Giao việc» lần nữa (nút đang sáng) để đóng khung và trở về danh sách việc.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Việc của dự án nhiều phòng cùng làm; giao theo dự án để việc gắn đúng dự án ngay từ đầu, hiện đúng ở cây dự án và nhóm đúng giai đoạn.",
            "Ô «Giao cho» cho phép giao thẳng đích danh một người (gõ «@»), không phải giao cho cả phòng rồi chờ giao tiếp.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Bạn chọn một ô dự án (hoặc không), thấy cần giao thêm việc", "Cây dự án"],
            ["Bước này", "Chọn dự án, người nhận, soạn việc, giao", "Khung «Giao việc theo dự án»"],
            ["Sau", "Việc hiện nổi ở cột phải trong nhóm giai đoạn của dự án; người nhận có chuông", "Cột việc, Việc của tôi"],
          ],
        },
        {
          tieuDe: "Khung có những phần nào (từ trên xuống)?",
          bang: [
            ["Phần", "Để làm gì", "Xem tab"],
            ["«Dự án»", "Chọn dự án (chọn một dự án…)", "① Chọn dự án và người nhận"],
            ["«Giao cho»", "Chọn Ban lãnh đạo, đơn vị hoặc đích danh một người", "① Chọn dự án và người nhận"],
            ["«Giao cho cá nhân»", "Danh sách người xếp theo đơn vị, chỉ gồm người bạn được giao đích danh (Ban lãnh đạo giao lẫn nhau được). Bấm tên một người là giao thẳng người đó, không cần giao chuyển tiếp; để trống thì giao cho đơn vị ở ô «Giao cho»", "Chọn người thì ô «Giao cho» ở trên không còn tác dụng cho lần giao này"],
            ["«Nhân viên làm chủ trì · bắt buộc chọn một người»", "Khi bạn giao cho đơn vị của chính mình", "① Chọn dự án và người nhận"],
            ["«Nội dung việc» kèm 📎, «Kết quả cần có», «Hạn»", "Nội dung giao", "② Nội dung và giao"],
            ["Nút «Giao việc» và câu báo còn thiếu gì", "Chốt", "② Nội dung và giao"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn dự án, người nhận, gõ việc, chọn hạn, bấm «Giao việc»", "Người quyết hoàn toàn"],
            ["MÁY", "Gợi ý sẵn đơn vị đầu tiên của dự án mà bạn giao được, kiểm phạm vi giao, kiểm hạn, tạo việc gắn dự án, gửi chuông", "Cùng dữ liệu thì cùng kết quả"],
            ["🤖 AI", "🤖 SAU khi việc vào sổ, AI chạy nền xếp việc vào một trong 6 giai đoạn của dự án (có thể xếp ngay vài phút sau)", "🤖 Chỉ là đề xuất; bạn chọn lại ở ô giai đoạn trong việc thì người thắng"],
          ],
          ai: [
            "🤖 AI KHÔNG tham gia khi bạn soạn và bấm «Giao việc».",
            "🤖 Sau đó, mỗi 2 phút máy gom tối đa 25 việc đang mở của dự án chưa có giai đoạn cho AI xếp một lượt; AI lỗi thì nghỉ 30 phút. Việc mới giao nằm trong nhóm «🤖 chưa xếp giai đoạn» cho tới khi AI xếp tới.",
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: bấm «＋ Giao việc», chọn dự án, chọn người nhận, soạn việc, bấm «Giao việc».",
            "MÁY: tạo việc, báo «Đã giao việc …», đưa việc nổi ở cột phải.",
            "🤖 AI (nền): xếp việc vào giai đoạn, kèm lý do.",
            "NGƯỜI: đổi giai đoạn nếu AI xếp sai.",
          ],
        },
      ],
    },
    {
      ten: "① Chọn dự án và người nhận",
      khoi: [
        {
          bang: [
            ["Ô", "Cách dùng", "Lưu ý"],
            ["«Dự án»", "Chọn trong danh sách; mỗi dự án ghi «· SCI đầu tư» hoặc «· loại khác»", "Nếu trước đó bạn đã bấm một ô dự án trên cây thì dự án đó chọn sẵn. Chưa chọn thì «Giao việc» mờ, ghi «Chưa chọn dự án»"],
            ["«Giao cho»", "Bấm vào ô: hiện Ban lãnh đạo, rồi các đơn vị theo sơ đồ (thụt lề theo cấp). Gõ chữ để lọc. Gõ «@» để tìm đích danh một người (không dấu cũng khớp). Bấm một dòng là chọn xong và đóng danh sách", "Đổi dự án thì ô này tự đặt lại thành đơn vị đầu tiên của dự án mà bạn giao được. Chọn đơn vị ngoài phạm vi thì «Giao việc» mờ và ghi «… ngoài phạm vi giao việc của bạn»"],
            ["«Nhân viên làm chủ trì · bắt buộc chọn một người»", "Hiện khi bạn giao cho đơn vị của chính mình (bạn là trưởng đơn vị, không phải lãnh đạo toàn công ty). Bấm tên một nhân viên", "Giao cho đích danh một người (gõ «@») thì không hiện ô này vì người đó đã là chủ trì"],
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A chọn ô dự án «Điện gió …» trên cây rồi bấm «＋ Giao việc». Ô «Dự án» đã chọn sẵn đúng dự án đó; ô «Giao cho» chọn sẵn một đơn vị của dự án. Chị bấm ô «Giao cho», gõ «@» rồi vài chữ tên anh B, bấm tên: việc sẽ giao thẳng cho anh B.",
            "Chị đổi sang một dự án khác trong ô «Dự án»: ô «Giao cho» tự đổi theo đơn vị của dự án mới, chị kiểm lại trước khi giao.",
          ],
        },
      ],
    },
    {
      ten: "② Nội dung và giao",
      khoi: [
        {
          bam: [
            "Gõ «Nội dung việc» (bắt buộc), tuỳ chọn kẹp tệp bằng 📎.",
            "Tuỳ chọn gõ «Kết quả cần có».",
            "Chọn «Hạn» nếu có (không trước hôm nay); dưới ô hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy».",
            "Bấm «Giao việc».",
          ],
          ketQua: [
            "Việc gắn vào dự án, hiện NỔI ở cột phải; dòng báo «Đã giao việc …». Khung đóng.",
            "Nút «Giao việc» mờ kèm câu: «Chưa chọn dự án», «Chưa có nội dung việc», «Chưa chọn người nhận», «Chưa chọn nhân viên làm chủ trì», «… ngoài phạm vi giao việc của bạn», «Hạn trước hôm nay».",
          ],
          luuY: ["Giao là việc thật, người nhận có chuông ngay. Đừng bấm thử."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Nội dung: «Chốt phương án đấu nối lưới»; Hạn: cuối tuần sau. Chị A bấm «Giao việc». Cột phải hiện việc mới trong nhóm «🤖 chưa xếp giai đoạn», vài phút sau AI chuyển sang giai đoạn «Thiết kế» kèm câu lý do; nếu chị thấy chưa hợp, mở việc và chọn lại giai đoạn."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «＋ Giao việc»", "Bạn không có quyền «Giao việc». Nút ẩn."],
            ["Ô «Giao cho» thiếu đơn vị cần", "Danh sách chỉ hiện nơi bạn giao được. Nhờ Quản trị mở phạm vi."],
            ["Việc mới nằm ở «🤖 chưa xếp giai đoạn»", "AI chưa xếp tới. Chờ vài phút, hoặc mở việc tự chọn giai đoạn."],
            ["Giao xong không thấy việc ở cột phải", "Có thể bạn đang bật một nút lọc («Quá hạn», «Tôi giao», «Tôi nhận»…) hoặc đang chọn ô dự án khác. Tắt nút lọc và bấm đúng ô dự án đó."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Giao việc» khai ở Cài đặt, Vai trò và quyền · chốt 28/09/2026 (menu Dự án, giao theo dự án) · chốt 04/10/2026 (ô «Giao cho» gộp: bấm là Ban lãnh đạo và đơn vị, gõ «@» là người) · chốt 30/09/2026 (giao trong phòng mình chọn một nhân viên) · 6 giai đoạn: Khởi tạo, Thiết kế, Lập kế hoạch, Thực thi, Giám sát & Kiểm soát, Kết thúc.",
};
