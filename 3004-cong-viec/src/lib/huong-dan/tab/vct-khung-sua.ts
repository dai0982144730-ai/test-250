// Hướng dẫn bản 2 (tab) — khung «Sửa» việc đề xuất ở nửa phải màn Việc của tôi. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/viec-cua-toi/ViecCuaToiView.tsx (KhungSua, thieuCua, giao) · components/cay-viec/OGiaoSua.tsx · components/cay-viec/OChonNoiNhan.tsx
// · components/dinh-kem/DinhKem.tsx (nút 📎). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Khung sửa việc đề xuất — chỉnh nội dung máy soạn rồi giao",
  ai: "Chỉ người có quyền «Giao việc» (hoặc Quản trị) mới có thẻ đề xuất ở nửa trái, nên chỉ họ mở được khung này. Người không có quyền không thấy thẻ và không thấy nút «Sửa».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì?",
          doan: [
            "Khi bạn bấm «Sửa» ở một thẻ đề xuất (nửa trái), nửa phải của màn «Việc của tôi» tạm ẩn danh sách việc và hiện một biểu mẫu giao việc đã được điền sẵn nội dung máy soạn: người nhận, nội dung việc, kết quả cần có, hạn.",
            "Bạn chỉnh cho đúng ý rồi bấm «Giao việc» để tạo việc thật, hoặc «Huỷ sửa» để quay về danh sách mà không giao gì. Biểu mẫu này giống hệt khung giao việc khi bấm dấu «＋» ở Sơ đồ tổ chức.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Thẻ ở nửa trái chỉ đủ chỗ để đọc và bấm nhanh. Muốn đổi tên việc, viết lại kết quả cần có, đổi hạn hay kẹp tệp thì cần chỗ rộng hơn.",
            "Nút «Giao việc» ở thẻ bị mờ khi hạn đã qua hoặc thiếu người nhận. Khung sửa là chỗ để bổ sung đúng thứ còn thiếu.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Máy soạn thẻ đề xuất từ Cây việc & đường găng hoặc từ Issue", "Nửa trái màn «Việc của tôi»"],
            ["Bước này", "Bạn chỉnh nội dung và giao", "Khung sửa (nửa phải)"],
            ["Sau", "Việc vào sổ cái, người nhận có chuông; thẻ rời nửa trái", "«Việc tôi giao» của bạn, «Việc tôi nhận» của người nhận"],
          ],
        },
        {
          tieuDe: "Khung có những phần nào (từ trên xuống)?",
          bang: [
            ["Phần", "Để làm gì", "Xem tab"],
            ["Dòng nhỏ «Issue <mã> · <tiêu đề>» và dòng chữ cam «Đã điền sẵn từ issue — sửa rồi bấm Giao việc»", "Cho biết thẻ này sinh ra từ đâu", "① Điền các ô"],
            ["Ô «Giao cho»", "Chọn người hoặc đơn vị nhận", "① Điền các ô"],
            ["Ô «Thuộc dự án» (mờ, không đổi)", "Cho biết việc gắn dự án nào", "① Điền các ô"],
            ["«Nội dung việc» kèm nút 📎, «Kết quả cần có», «Hạn»", "Nội dung giao", "① Điền các ô"],
            ["Nút «Giao việc», «Huỷ sửa» và câu báo còn thiếu gì", "Chốt hoặc bỏ", "② Giao hoặc huỷ"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Sửa chữ, chọn người nhận, chọn hạn, kẹp tệp, bấm «Giao việc» hoặc «Huỷ sửa»", "Người quyết nội dung cuối cùng"],
            ["MÁY", "Điền sẵn các ô, tính khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy» khi có hạn, kiểm đủ nội dung / người nhận / hạn chưa qua, tạo việc, gửi chuông", "Cùng dữ liệu thì cùng kết quả"],
            ["🤖 AI", "🤖 Gợi ý người nhận đã điền sẵn ở ô «Giao cho» (chỉ với thẻ nút đường găng, do AI chọn lúc soạn ở màn Cây việc)", "🤖 Có thể sai; bạn đổi ở ô «Giao cho» là AI hết ảnh hưởng"],
            ["🤖 AI", "🤖 Khi bấm «Giao việc», AI của các agent khác xét việc này có trùng việc đã có không", "🤖 Chỉ báo, không chặn; bạn bấm «Vẫn giao việc riêng» nếu thấy khác thật"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "🤖 AI đã gợi ý người nhận từ trước (lưu sẵn) cho thẻ nút đường găng; màn chỉ đọc lại, không gọi AI mới.",
            "NGƯỜI: bạn bấm «Sửa», chỉnh các ô.",
            "NGƯỜI: bấm «Giao việc».",
            "🤖 AI (nếu có việc gần giống): báo trùng ngay trong khung, kèm nút «Vẫn giao việc riêng».",
            "MÁY: tạo việc, đóng khung, báo «Đã giao việc …» ở thẻ.",
          ],
        },
      ],
    },
    {
      ten: "① Điền các ô",
      khoi: [
        {
          tieuDe: "Từng ô làm gì",
          bang: [
            ["Ô", "Cách dùng", "Lưu ý"],
            ["«Giao cho»", "Bấm vào ô: hiện Ban lãnh đạo rồi các đơn vị theo sơ đồ, thụt lề theo cấp. Gõ chữ để lọc. Gõ «@» để tìm theo tên người. Bấm một dòng là chọn xong và đóng danh sách, không có nút xác nhận", "Chỉ hiện nơi bạn giao được theo quyền «Giao việc». Người AI gợi ý luôn hiện trong ô, kể cả khi không có trong danh sách"],
            ["«Thuộc dự án»", "Chỉ để xem, ô mờ", "Muốn đổi dự án thì bỏ qua thẻ và giao bằng dấu «＋» ở menu «Dự án»"],
            ["«Nội dung việc»", "Gõ việc cần làm (ô gợi ý «Việc cần làm…»). Nút 📎 bên phải để kẹp tệp, mỗi tệp được tải lên ngay khi chọn", "Số tệp tối đa, dung lượng và thời gian lưu do Quản trị đặt ở Cài đặt, Tệp đính kèm việc. Nếu Quản trị tắt kẹp tệp cho khâu giao việc thì nút 📎 không hiện"],
            ["«Kết quả cần có»", "Việc xong thì phải có cái gì, ví dụ «tờ trình gửi TGĐ»", "Không bắt buộc nhưng giúp nghiệm thu việc"],
            ["«Hạn»", "Gõ hoặc chọn ngày theo dạng dd/mm/yyyy", "Từ hôm nay trở đi dưới ô hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy». Hạn trước hôm nay thì không giao được"],
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Máy soạn thẻ «Xử lý nút găng chưa có người làm», hạn đã qua. Chị A bấm «Sửa». Ở «Giao cho» chị gõ «@» rồi vài chữ tên anh B (gõ không dấu cũng ra), bấm tên anh B. Ở «Nội dung việc» chị thêm một câu nói rõ cần làm gì, kẹp bản vẽ liên quan bằng 📎. Ở «Hạn» chị chọn ngày mới; dưới ô hiện khuôn số ngày để chị khỏi tính nhẩm.",
            "Chị để trống «Kết quả cần có» vì việc chỉ cần anh B báo lại bằng miệng: vẫn giao được.",
          ],
        },
      ],
    },
    {
      ten: "② Giao hoặc huỷ",
      khoi: [
        {
          tieuDe: "Hai nút cuối khung",
          bang: [
            ["Nút", "Làm gì", "Kết quả"],
            ["«Giao việc»", "Tạo việc thật trong sổ cái", "Khung đóng, quay về danh sách bên phải, thẻ rời nửa trái, dòng «Đã giao việc …» hiện ở thẻ"],
            ["«Huỷ sửa»", "Bỏ khung, không giao gì", "Các chỉnh sửa của bạn vẫn được nhớ trên thẻ (bạn mở «Sửa» lại là thấy)"],
          ],
          ketQua: [
            "Nút «Giao việc» mờ khi còn thiếu. Câu bên cạnh nói rõ: «Chưa có nội dung việc», «Chưa chọn người nhận», «Chưa có hạn» hoặc «Hạn đã qua — bấm Sửa chọn hạn mới». Khi đang tải tệp lên thì nút mờ và câu ghi tiến độ tải.",
            "Khi bấm, nút đổi thành «Đang giao…». Nếu máy báo việc gần giống thì khung hiện dòng bắt đầu bằng 🤖 và nút «Vẫn giao việc riêng».",
          ],
          luuY: ["Giao là việc thật, người nhận có chuông ngay. Đừng bấm thử."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A bấm «Giao việc», khung hiện dòng 🤖 nói đã có một việc gần giống đang mở ở dự án đó. Chị mở việc ấy đối chiếu, thấy đó là phần khác, quay lại khung và bấm «Vẫn giao việc riêng». Việc được tạo, khung đóng.",
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
            ["Ô «Giao cho» không có tên người mình cần", "Danh sách chỉ hiện nơi bạn giao được theo quyền «Giao việc». Nhờ Quản trị mở rộng phạm vi ở Cài đặt, Vai trò và quyền."],
            ["Không thấy nút 📎", "Quản trị đã tắt kẹp tệp cho khâu giao việc ở Cài đặt, Tệp đính kèm việc."],
            ["«Giao việc» mờ dù đã điền", "Đọc câu bên cạnh nút. Thường là hạn đã qua hoặc tệp còn đang tải."],
            ["Giao nhầm người", "Mở việc ở «Việc tôi giao» và dùng cây bút ✎ nếu bạn có quyền «Sửa việc»."],
          ],
        },
      ],
    },
  ],
  canCu: "Luật 33 «Hỏi trùng trước khi soạn việc» · luật 17 riêng 3004 (nút không có quyền thì ẨN) · luật 31 (khoảng ngày kèm số ngày) · bản thiết kế «Khuôn giao việc AI 04/10/2026» (Giao việc · Sửa · Bỏ qua dùng chung mọi màn).",
};
