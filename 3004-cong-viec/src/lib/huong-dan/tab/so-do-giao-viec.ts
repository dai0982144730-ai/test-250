// Hướng dẫn bản 2 (tab) — khung «Giao việc cho …» mở bằng dấu «＋» trên ô ở Sơ đồ tổ chức. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (GiaoViec, coTheGiaoToi, nút «＋» ở ô) · components/cay-viec/OChonNoiNhan.tsx (ô «Giao cho» ở menu Dự án, không dùng ở khung này)
// · lib/so-cai/lanh-dao-phoi-hop.ts (AI gắn lãnh đạo phối hợp sau khi việc vào sổ). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Giao việc cho một ô trên Sơ đồ tổ chức — khung «Giao việc cho …»",
  ai: "Chỉ người có quyền «Giao việc» mới thấy dấu «＋», và chỉ ở ô nằm trong phạm vi giao việc của mình (lãnh đạo, Quản trị: mọi ô; trưởng đơn vị: đơn vị mình và cấp dưới). Ô ngoài phạm vi không có nút «＋» (ẩn hẳn). Ô Ban lãnh đạo có «＋» khi bạn giao được cho ít nhất một lãnh đạo.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì?",
          doan: [
            "Dấu «＋» nằm bên phải mỗi ô đơn vị trên sơ đồ. Bấm vào thì cột bên phải đổi thành khung «Giao việc cho <tên ô>»: bạn gõ việc cần làm, kết quả cần có, hạn, rồi bấm «Giao việc». Việc vào sổ cái, người nhận có chuông.",
            "Việc giao ở đây là việc CHỦ TRÌ giao tới ô đó. Muốn mời thêm bên hỗ trợ thì dùng «＋ Phối hợp» trong thẻ việc sau khi giao.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Giao ngay tại ô mà bạn đang nhìn, khỏi mở menu khác hay nhớ tên đơn vị.",
            "Luật giao việc được máy kiểm tại chỗ: ngoài phạm vi, thiếu người nhận, hạn đã qua đều bị chặn và nói rõ lý do.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Bạn thấy ô cần giao (đơn vị trễ việc, dự án mới)", "Sân sơ đồ"],
            ["Bước này", "Soạn và giao việc", "Khung «Giao việc cho …»"],
            ["Sau", "Việc hiện nổi ở cột phải, người nhận có chuông, việc vào «Việc tôi giao» của bạn", "Cột việc, Việc của tôi"],
          ],
        },
        {
          tieuDe: "Khung có những phần nào (từ trên xuống)?",
          bang: [
            ["Phần", "Khi nào hiện", "Xem tab"],
            ["«Người nhận trong Ban lãnh đạo» (các nút tên lãnh đạo)", "Khi giao cho ô Ban lãnh đạo", "① Chọn người nhận"],
            ["«Nhân viên làm chủ trì · bắt buộc chọn một người»", "Khi bạn là trưởng đơn vị và giao ngay trong đơn vị mình", "① Chọn người nhận"],
            ["«Giao cho cá nhân» (danh sách xếp theo đơn vị)", "Khi bạn có người để giao đích danh", "① Chọn người nhận"],
            ["«Thuộc dự án · không bắt buộc»", "Khi hệ thống có dự án", "② Nội dung việc"],
            ["«Nội dung việc» kèm nút 📎, «Kết quả cần có», «Hạn»", "Luôn", "② Nội dung việc"],
            ["Nút «Giao việc» và câu báo còn thiếu gì", "Luôn", "③ Giao"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn người nhận, gõ việc, chọn hạn, kẹp tệp, bấm «Giao việc»", "Người quyết hoàn toàn"],
            ["MÁY", "Kiểm phạm vi giao việc, bắt buộc chọn một nhân viên khi giao trong phòng mình, kiểm hạn không trước hôm nay, tính khoảng ngày, tạo việc (ngày bắt đầu là hôm nay), gửi chuông", "Cùng dữ liệu thì cùng kết quả"],
            ["🤖 AI", "🤖 SAU khi việc vào sổ, AI chạy nền sẽ đọc tên việc và gắn thêm một «lãnh đạo phối hợp» nếu việc chưa có (và đã xếp giai đoạn nếu việc thuộc dự án)", "🤖 Chỉ là đề xuất; người có quyền «Sửa việc» đổi được ở cây bút ✎"],
          ],
          ai: [
            "🤖 AI KHÔNG tham gia lúc bạn soạn và bấm «Giao việc». Khung này không hỏi AI.",
            "🤖 Vài phút sau, việc có thể được gắn thêm lãnh đạo phối hợp; việc không gửi chuông «được thêm phối hợp» nếu là gắn lùi cho việc cũ.",
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: bấm «＋», chọn người nhận, soạn việc, bấm «Giao việc».",
            "MÁY: kiểm quyền và dữ liệu, tạo việc, báo «Đã giao việc …», đưa việc mới lên nổi bật ở cột phải.",
            "🤖 AI (nền, sau đó): gắn lãnh đạo phối hợp, xếp giai đoạn nếu việc thuộc dự án.",
            "NGƯỜI: bạn đổi những gì AI gắn nếu thấy chưa đúng.",
          ],
        },
      ],
    },
    {
      ten: "① Chọn người nhận",
      khoi: [
        {
          tieuDe: "Ba trường hợp",
          bang: [
            ["Bạn giao cho", "Phải chọn gì", "Lưu ý"],
            ["Ô Ban lãnh đạo", "Bấm tên MỘT lãnh đạo trong «Người nhận trong Ban lãnh đạo»", "Chỉ hiện lãnh đạo bạn giao được theo quyền «Giao việc»"],
            ["Đơn vị của chính bạn (bạn là trưởng đơn vị, không phải lãnh đạo toàn công ty)", "Bấm tên MỘT nhân viên trong «Nhân viên làm chủ trì · bắt buộc chọn một người»", "Rê chuột vào tên để xem chức vụ. Đơn vị chưa có tài khoản nhân viên thì ghi «Đơn vị chưa có tài khoản nhân viên nào» và chưa giao được"],
            ["Đơn vị khác trong phạm vi", "Không chọn thêm: ô đang chọn là người nhận", "Việc giao cho CẢ đơn vị; trưởng đơn vị đó sẽ giao tiếp cho nhân viên"],
            ["Một cá nhân cụ thể", "Mở «Giao cho cá nhân», bấm tên người (xếp theo đơn vị)", "Giao thẳng người đó, không cần giao chuyển tiếp. Danh sách chỉ có người bạn được giao đích danh; Ban lãnh đạo giao lẫn nhau được. Không chọn ai thì việc giao cho đơn vị như trước"],
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A là Phó tổng giám đốc. Chị bấm «＋» trên ô Ban lãnh đạo, thấy các nút tên lãnh đạo mình giao được; chị bấm tên anh B, gõ việc rồi giao. Anh B nhận ở «Việc tôi nhận».",
            "Anh C là trưởng phòng Kỹ thuật. Anh bấm «＋» trên ô phòng mình: khung bắt chọn một nhân viên làm chủ trì. Anh chọn chị D, vì giao thẳng cả phòng sẽ không ai đứng tên chịu trách nhiệm.",
          ],
        },
      ],
    },
    {
      ten: "② Nội dung việc",
      khoi: [
        {
          bang: [
            ["Ô", "Cách dùng"],
            ["«Thuộc dự án · không bắt buộc»", "Chọn dự án nếu việc thuộc dự án («— Không thuộc dự án nào —» nếu không). Danh sách ghi cả «SCI đầu tư» hay «loại khác»"],
            ["«Nội dung việc»", "Gõ việc cần làm (ô gợi ý «Việc cần làm…»). Bắt buộc. Nút 📎 bên phải kẹp tệp"],
            ["«Kết quả cần có»", "Việc xong thì phải có cái gì, ví dụ «tờ trình gửi TGĐ». Không bắt buộc"],
            ["«Hạn»", "Ô ngày dd/mm/yyyy, không chọn được trước hôm nay. Chọn xong, dưới ô hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy». Để trống là việc không có hạn"],
          ],
          luuY: ["Số tệp tối đa, dung lượng và thời gian lưu do Quản trị đặt ở Cài đặt, Tệp đính kèm việc. Tắt thì nút 📎 không hiện."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Nội dung: «Lập kế hoạch thử nghiệm máy biến áp»; Kết quả cần có: «Bản kế hoạch được duyệt»; Hạn: chọn ngày cuối tháng. Dưới ô hạn hiện số ngày tính cả hôm nay và ngày cuối, chị A khỏi đếm."],
        },
      ],
    },
    {
      ten: "③ Giao",
      khoi: [
        {
          bam: [
            "Soát lại người nhận, nội dung, hạn.",
            "Bấm «Giao việc». Nút mờ khi còn thiếu hoặc tệp còn đang tải.",
          ],
          ketQua: [
            "Việc mới hiện NỔI ở cột phải, dòng báo «Đã giao việc …», và việc được mở sẵn để bạn thấy.",
            "Câu mờ bên cạnh nút nói rõ còn thiếu gì: «Chưa có nội dung việc», «Chưa chọn người nhận», «Chưa chọn nhân viên làm chủ trì», «… ngoài phạm vi giao việc của bạn», «Hạn trước hôm nay». Nếu máy chủ từ chối, một dòng lỗi hiện ngay trên nút.",
          ],
          luuY: ["Giao là việc thật, người nhận có chuông. Đừng bấm thử."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Ô cần giao không có dấu «＋»", "Ô đó ngoài phạm vi quyền «Giao việc» của bạn. Nhờ Quản trị mở rộng ở Cài đặt, Vai trò và quyền."],
            ["Ô Ban lãnh đạo không có nút tên lãnh đạo", "Không có lãnh đạo nào nằm trong phạm vi giao của bạn."],
            ["«Giao việc» mờ", "Đọc câu mờ cạnh nút."],
            ["Giao nhầm", "Mở việc ở cột phải: nếu có quyền thì dùng cây bút ✎ sửa hoặc «Hủy việc» ghi lý do."],
            ["Không thấy tên một người trong «Giao cho cá nhân»", "Người đó ngoài quyền giao đích danh của bạn (đơn vị khác, hoặc thuộc công ty độc lập như SCI E&C). Giao cho cả đơn vị rồi trưởng đơn vị giao tiếp."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Giao việc» khai ở Cài đặt, Vai trò và quyền (nơi chủ trì phải nằm trong phạm vi) · chốt 28/09/2026 (trưởng phòng không giao được việc cho Tổng giám đốc) · chốt 29/09/2026 (nút không có quyền thì ẨN, riêng 3004) · chốt 30/09/2026 (giao trong phòng mình phải chọn một nhân viên) · luật 31 (khoảng ngày kèm số ngày).",
};
