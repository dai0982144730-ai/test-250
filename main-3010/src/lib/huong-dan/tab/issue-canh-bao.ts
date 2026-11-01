// Hướng dẫn bản 2 (tab) — màn Cảnh báo Main, khuôn «Việc của tôi» (Mr. Đại duyệt demo bản 3 ngày 01/11/2026).
// Thay ba hướng dẫn cũ issue-nhom · issue-can-xem · issue-phan-loai (11 tab đã bỏ). Nội dung khối «📐 Nguyên tắc»
// và các câu chú thích từng in trên mọi thẻ chuyển về đây.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cảnh báo — lọc theo chủ đề, agent, mức độ quan trọng",
  ai: "Mọi tài khoản xem được. Nút «Xếp lại ngay», «Chọn lại ngay», «🙈 Ẩn», «🗑 Xoá», «Duyệt — vào sổ», «Bác bỏ» cần quyền ghi (PM, Admin, Người dùng); bốn nút sau chỉ có trên issue do chính Main giữ sổ. Issue của agent khác: «Giao việc», «✎ AI soạn việc giao», «Bỏ qua» chạy từ Main nhưng do agent chủ làm thay người bấm.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này để làm gì?",
          doan: [
            "Issue là một VẤN ĐỀ đang cản dự án: hồ sơ pháp lý quá hạn, việc găng chậm, phiếu giá chưa ký… Mỗi agent (Tiến độ, Hợp đồng, Pháp lý, Công việc, Nghiệm thu) tự phát hiện issue trong phần việc của mình. Main gom tất cả về đây để lãnh đạo lọc ra việc cần xử.",
            "Bảng điều hành trả lời «đang thế nào»; màn Cảnh báo trả lời «phải xử gì».",
          ],
        },
        {
          tieuDe: "Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng chip chủ đề (ngoài cùng)", "Chọn chủ đề: Hồ sơ pháp lý, Hợp đồng, Mặt bằng…", "① Lọc"],
            ["Ô «Mọi agent» và ô «Mức độ quan trọng»", "Lọc theo agent sinh ra issue; lọc và xếp theo độ quan trọng", "① Lọc"],
            ["Dòng số", "Biết đang xem bao nhiêu issue, bao nhiêu nghiêm trọng, bao nhiêu trên đường găng", "① Lọc"],
            ["Thẻ issue", "Đọc một vấn đề, mở chi tiết, sang agent chủ để xử", "② Đọc một thẻ"],
            ["Chân màn", "Lúc AI xếp chủ đề và chọn «cần anh xem»; xem issue đã đóng; xem theo WBS", "③ AI làm gì"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn chủ đề, agent, mức độ; đọc; sang agent chủ xử; ẩn / xoá issue sai; duyệt hay bác đề xuất", "Gom issue từ năm agent; đếm số trên chip và ô xổ; giữ lại issue thiếu nguồn hoặc thiếu điều kiện đóng; xếp «nặng nhất trước»", "🤖 Xếp issue vào chủ đề — tự chạy mỗi đêm 02:30; 🤖 chọn việc «cần anh xem» kèm một câu lý do — cùng lượt đêm"],
          ],
        },
      ],
    },
    {
      ten: "① Lọc",
      khoi: [
        {
          bam: [
            "Bấm một chip chủ đề. Chip chỉ đếm issue có chủ đề CHÍNH là nó, nên các chip cộng lại đúng bằng «Tất cả». Chip 0 issue thì mờ.",
            "Chọn ô «Mọi agent» để chỉ xem issue của một agent. Số trong ngoặc đếm theo chủ đề và mức độ đang chọn.",
            "Chọn ô «Mức độ quan trọng»: «Tất cả — nặng nhất trước» · «Chỉ nghiêm trọng» · «Trên đường găng» · «Có quá hạn — lâu nhất trước» · «AI chọn: cần anh xem». Chọn là áp luôn, không có nút xác nhận.",
          ],
        },
        {
          ketQua: ["«Nặng nhất trước» xếp: nghiêm trọng → trên đường găng → số ngày kéo lùi COD → số ngày quá hạn. «Có quá hạn» xếp số ngày quá hạn giảm dần."],
        },
        {
          luuY: [
            "Số ngày quá hạn hiện máy đọc từ chữ trong tên issue (các agent chưa trả trường riêng) — tên issue không ghi «quá hạn N ngày» thì không vào lựa chọn «Có quá hạn».",
            "Thẻ đang ẩn không mất khỏi số đếm của sổ; bấm «hiện N thẻ đang ẩn» ở dòng số để xem.",
          ],
        },
      ],
    },
    {
      ten: "② Đọc một thẻ",
      khoi: [
        {
          bam: [
            "Dòng nhãn: mức độ (chữ đỏ «Nghiêm trọng» hoặc «Cần lưu ý») · chủ đề · agent sinh ra issue.",
            "Dòng số: số ngày kéo lùi COD (ghi rõ so với Baseline) · trên đường găng · WBS · người thêm hay 🤖 AI phát hiện.",
            "Issue đã có nháp giao việc: khối nháp hiện ngay dưới thẻ — chọn người nhận (hạn đã qua thì chọn hạn mới) rồi bấm «Giao việc», hoặc «Sửa» / «Bỏ qua».",
            "Chưa có nháp: «✎ AI soạn việc giao» nhờ AI ở agent chủ soạn nháp (hiện ngay dưới thẻ); «Bỏ qua» thì issue không hiện, không đếm nữa ở mọi nơi, xem lại được 30 ngày ở agent chủ. Hiện chạy với Tiến độ và Hợp đồng; agent khác nút mờ, ghi lý do dưới nút.",
            "Đã giao: thẻ ghi «✓ Đã giao việc …» kèm mã việc.",
            "Bấm «Mở ở … →» để sang màn Cảnh báo của agent chủ.",
            "Bấm «Chi tiết ▾» để bung mô tả, nguồn (bấm được), số ngày và tiền ảnh hưởng, điều kiện đóng ngay tại chỗ.",
          ],
        },
        {
          doan: [
            "Ô ghi «—» là CHƯA CÓ SỐ: agent chủ chưa trả về con số kèm nguồn. Main không ước số, không bao giờ hiện 0 thay cho thiếu số.",
            "Số ngày ảnh hưởng lấy cái NẶNG NHẤT, không cộng dồn: hai issue trên cùng một chuỗi mà cộng là đếm hai lần cùng một sự chậm; các chuỗi song song thì chuỗi dài nhất mới quyết định ngày phát điện.",
            "Màn này không có nút đóng issue: issue chỉ đóng khi điều kiện đóng hết vi phạm, và việc đóng thuộc agent chủ.",
            "Thẻ mã «DX-…» là đề xuất do AI sinh, bung sẵn để bấm «Duyệt — vào sổ» hoặc «Bác bỏ» (bắt buộc ghi lý do).",
          ],
        },
      ],
    },
    {
      ten: "③ AI làm gì",
      khoi: [
        {
          ai: [
            "🤖 Mỗi đêm 02:30 AI xếp chủ đề cho issue mới hoặc chưa có chủ đề; issue đã xếp giữ nguyên. Không có issue mới thì không gọi AI.",
            "🤖 Cùng lượt đó AI chọn lại việc «cần anh xem», mỗi việc một câu lý do. Cố ý KHÔNG chấm điểm, không xếp hạng bằng số.",
            "Người kiểm: đọc câu lý do trên thẻ, thấy sai thì báo agent chủ. Cần gấp thì bấm «Xếp lại ngay» / «Chọn lại ngay» ở chân màn.",
          ],
        },
        {
          luuY: ["Issue chưa được xếp chủ đề tạm nằm ở chip «Khác» — không bị bỏ, vẫn đếm."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp gì", "Làm gì"],
            ["Thiếu issue của một agent", "Đọc ô vàng «Danh sách thiếu phần của…»: agent đó chưa trả lời hoặc chưa bật trong Danh bạ agent."],
            ["«N issue bị giữ lại, không hiện»", "Issue thiếu nguồn hoặc thiếu điều kiện đóng — rê chuột để xem mã và lý do; báo agent chủ sửa."],
            ["Chủ đề có vẻ sai", "AI xếp có thể sai. Bấm «Xếp lại ngay» hoặc báo người quản trị."],
            ["Muốn xem issue đã đóng / theo WBS", "Chân màn: «Xem issue đã đóng» · «Xem theo WBS»."],
          ],
        },
      ],
    },
  ],
};
