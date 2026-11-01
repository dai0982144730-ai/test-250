// Hướng dẫn bản 2 (tab) — Cài đặt › Thống kê dùng AI. Viết 20/10/2026. Nhãn chép từ components/ai/ThongKeAI.tsx. Số do máy tính ở máy chủ, màn chỉ vẽ.
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Thống kê dùng AI",
  tab: "🔌 Kết nối",
  ai: "Chỉ người có quyền «cau_hinh.sua» (hoặc quản trị) thấy mục này; người không có quyền thì mục ẩn hẳn. Mục chỉ để xem, không có gì để sửa.",
  laGi: [
    "Mục này cho biết AI của công ty đã được dùng bao nhiêu: hôm nay, tuần này hay tháng này; ai dùng nhiều nhất; tính năng nào dùng nhiều nhất; AI chạy mấy giờ và ngừng mấy giờ vì hết hạn mức.",
    "Một «lượt» là một lần máy hỏi AI (một câu chat, một lần viết báo cáo tuần, một lần gắn mã WBS…).",
  ],
  vaoSao: [
    "Biết sớm tài khoản nào sắp hết hạn mức, khung giờ nào AI bị nghẽn, tính năng nào dùng nhiều bất thường thì quản trị chủ động đổi cấu hình (bật tài khoản thứ hai, chọn bản AI nhẹ hơn) trước khi người dùng than phiền.",
  ],
  vongLam: [
    "Bước trước: mục «AI» đã nối xong; người dùng dùng trợ lý chat, báo cáo tuần, kiểm tra nội dung… Mỗi lượt được ghi vào sổ dùng AI.",
    "Mục này: đọc sổ đó và vẽ biểu đồ, bảng.",
    "Bước sau: quản trị chỉnh mục «AI» (tài khoản, bản AI) nếu thấy nghẽn hay hết hạn mức.",
  ],
  cacKhoi: [
    ["Nút «Ngày» · «Tuần» · «Tháng»", "Chọn kỳ xem; mũi tên trái / phải đổi kỳ trước / sau.", "Chọn kỳ"],
    ["Ô «Chọn ngày» và «Hôm nay»", "Nhảy tới ngày bất kỳ.", "Chọn kỳ"],
    ["Dòng tổng kỳ", "Số lượt, «Token vào», «Token ra», thời gian AI chạy, thời gian ngừng, số lần hết hạn mức, số lỗi.", "Đọc biểu đồ"],
    ["«① Token (vào + ra) theo tài khoản»", "Đường cong theo từng tài khoản: Tài khoản 1, Tài khoản 2, cá nhân, khoá API.", "Đọc biểu đồ"],
    ["② Thời gian", "Một vệt dài: xanh AI chạy, vàng ngừng vì hết hạn mức, xám rảnh.", "Đọc biểu đồ"],
    ["Bảng số chi tiết", "Mặc định đóng; bấm để mở từng giờ hoặc từng ngày.", "Bảng và xếp hạng"],
    ["«Ai dùng nhiều nhất» · «Tính năng tốn token nhất»", "Năm người và năm tính năng đứng đầu, có thanh tỉ lệ.", "Bảng và xếp hạng"],
  ],
  nguoi: "Quản trị chọn kỳ, đọc biểu đồ và bảng, quyết định chỉnh cấu hình AI.",
  may: "Cộng sổ dùng AI theo kỳ, tính thời gian chạy và ngừng, xếp hạng người và tính năng. Số do máy tính, không do AI viết.",
  aiLam: "— Mục này không dùng AI; nó chỉ báo cáo việc dùng AI của các mục khác.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Chọn kỳ",
      khoi: [
        { doan: ["Ba nút cho ba cỡ nhìn: «Ngày» (chia theo giờ), «Tuần» (chia theo ngày), «Tháng» (chia theo ngày)."] },
        { bam: ["Mở Cài đặt → tab «🔌 Kết nối» → mục «Thống kê dùng AI».", "Bấm «Ngày», «Tuần» hoặc «Tháng».", "Bấm mũi tên trái để lùi một kỳ, mũi tên phải để tới một kỳ; hoặc bấm vào ô ngày, chọn ngày trong lịch (lịch tự đóng).", "Đã đi xa thì bấm «Hôm nay» để về kỳ hiện tại; bấm biểu tượng làm mới để tải lại số."] },
        { viDu: ["Bạn bấm «Tuần» rồi bấm vào một ngày trên biểu đồ → màn tự chuyển sang «Ngày» của đúng ngày đó, chia theo giờ, để biết nghẽn vào giờ nào."] },
        { luuY: ["Không xem được kỳ trong tương lai: ô ngày chặn tối đa là hôm nay; các mốc chưa tới được tô mờ."] },
      ],
    },
    {
      ten: "② Đọc biểu đồ",
      khoi: [
        { doan: ["Dưới hàng nút có một dòng tổng của kỳ, rồi hai biểu đồ."] },
        {
          tieuDe: "Dòng tổng",
          doan: ["Gồm: số lượt · «Token vào» · «Token ra» (hai con số đo lượng chữ AI đọc và viết) · thời gian AI chạy · thời gian ngừng vì hết hạn mức (chữ vàng nếu khác 0) · số lần hết hạn mức · số lỗi · số lượt bị từ chối vì đầy hàng chờ (nếu có)."],
        },
        {
          bang: [
            ["Biểu đồ", "Cách đọc"],
            ["«① Token (vào + ra) theo tài khoản»", "Mỗi tài khoản một đường cong mềm nối đỉnh từng mốc: Tài khoản 1 màu cam, Tài khoản 2 xanh dương, cá nhân xanh lá, khoá API xám. Trục dọc có đường kẻ; chế độ Ngày mỗi đường kẻ 100 nghìn, Tuần và Tháng 1 triệu."],
            ["② Thời gian", "Một vệt suốt kỳ: xanh = AI đang chạy, vàng = ngừng vì hết hạn mức, xám = rảnh (không ai hỏi). Phần chưa tới được che mờ."],
          ],
        },
        { bam: ["Rê chuột vào một mốc để xem số của mốc đó.", "Ở «Tuần» hoặc «Tháng», bấm vào một mốc để mở đúng ngày đó."] },
        { viDu: ["Vệt «② Thời gian» của ngày hôm qua có một đoạn vàng dài 90 phút lúc buổi chiều và dòng tổng ghi «ngừng vì hết hạn mức 1 giờ 30 phút · 1 lần hết hạn mức». Đó là lúc Tài khoản 1 hết hạn mức; nếu đã bật «Dùng 2 tài khoản Claude» thì đoạn đó lẽ ra ngắn hơn — kiểm tra thẻ Tài khoản 2."] },
       
      ],
    },
    {
      ten: "③ Bảng và xếp hạng",
      khoi: [
        { doan: ["Bảng số chi tiết theo giờ hoặc ngày mặc định đóng; hai bảng xếp hạng nằm dưới."] },
        {
          bang: [
            ["Phần", "Nội dung"],
            ["«Bảng số chi tiết theo giờ/ngày (N dòng)»", "Cột Lượt · «Token vào» · «Token ra» · «TK1 / TK2 / cá nhân» · «AI chạy» · «Ngừng» · «Hết hạn mức / lỗi»; hàng cuối «Tổng cả kỳ». Ngày và Tháng chia trang 15 dòng."],
            ["«Ai dùng nhiều nhất»", "Cột Người · Lượt · «Token» · «Tỉ lệ» (thanh phần trăm)."],
            ["«Tính năng tốn token nhất»", "Cột Tính năng (ví dụ trợ lý chat, báo cáo tuần, gắn mã WBS) · Lượt · «Token» · «Tỉ lệ»."],
          ],
        },
        { bam: ["Bấm tiêu đề «Bảng số chi tiết…» để mở hoặc đóng bảng.", "Đọc hai bảng xếp hạng để biết ai và tính năng nào chiếm nhiều."] },
        { viDu: ["Tháng này «Báo cáo tuần» đứng đầu «Tính năng tốn token nhất» với 38% — hợp lý vì tuần nào cũng viết cho nhiều đơn vị. Nếu «Trợ lý chat» của một người chiếm 60% thì nên hỏi người đó đang dùng vào việc gì."] },
        { luuY: ["Lượt cũ chưa ghi người hoặc tính năng được dồn thành ghi chú xám «chưa ghi người» / «chưa ghi tính năng», không đưa vào xếp hạng."] },
      ],
    },
  ],
  viDuLuu: [],
  chiXem: true,
  vuong: [
    ["Không thấy mục «Thống kê dùng AI»", "Chỉ người có quyền «cau_hinh.sua» thấy; mục ẩn với người khác."],
    ["Biểu đồ trống", "Kỳ đó chưa ai dùng AI, hoặc chọn ngày xa; bấm «Hôm nay»."],
    ["Số không khớp trang của hãng AI", "Máy chỉ đếm lượt đi qua ứng dụng này; lượt dùng tài khoản ngoài ứng dụng không có trong sổ."],
    ["Thấy toàn đoạn vàng", "Tài khoản hết hạn mức; vào mục «AI» bật tài khoản thứ hai."],
  ],
  canCu: "Sổ dùng AI và phần thống kê dùng AI của máy chủ; mục «AI» ở cùng tab.",
});
