// Hướng dẫn bản 2 (tab) — Cài đặt › Kỳ báo cáo, hạn nộp. Viết 20/10/2026. Nhãn ô chép từ lib/cau-hinh/bieu-mau.ts (nhóm ky_bao_cao).
// Đối chiếu code 20/10: máy CHỈ dùng «hạn nộp báo cáo tuần theo cấp» + «ngày nghỉ» (lib/phong/tuan.ts hanNopTheoCap → dấu «!» ở Sơ đồ tổ chức).
// «Loại kỳ», «hạn nộp tháng», «nhắc nộp trước (giờ)» có trong biểu mẫu nhưng chưa có chỗ nào đọc → ghi thẳng trong hướng dẫn (⏸ báo cáo).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Kỳ báo cáo, hạn nộp",
  tab: "🔔 Cảnh báo & ngưỡng",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép. Ai đăng nhập cũng xem được.",
  laGi: [
    "Mục này nói hạn nộp báo cáo tuần của từng cấp đơn vị là thứ mấy, giờ nào, và những ngày nghỉ không tính vào hạn.",
    "Cấp đơn vị (đặt trong cây đơn vị): cấp 1 là Ban Tổng giám đốc, cấp 2 là các phòng, cấp 3 là nhà máy và Ban QLDA, cấp 4 là Ban điều hành tổng thầu. Báo cáo đi từ cấp thấp lên cấp cao, nên cấp càng thấp nộp càng sớm.",
  ],
  vaoSao: [
    "Cấp trên chỉ tổng hợp được khi cấp dưới đã nộp. Hạn nộp chồng bậc (Ban điều hành thứ Năm, nhà máy và phòng thứ Sáu, Ban Tổng giám đốc thứ Hai tuần sau) giữ cho cả dây chuyền không bị dồn việc vào một ngày.",
    "Đơn vị nào quá hạn mà chưa nộp thì ô của đơn vị trên Sơ đồ tổ chức hiện dấu «!». Hạn phải khai ở một nơi duy nhất để cả công ty cùng hiểu một nghĩa.",
  ],
  vongLam: [
    "Bước trước: các đơn vị lập báo cáo theo mẫu Word (menu Báo cáo).",
    "Mục này: đặt hạn từng cấp và ngày nghỉ. Máy so giờ hiện tại với hạn của đơn vị; quá hạn mà chưa có báo cáo của tuần đó thì hiện «!» trên Sơ đồ tổ chức.",
    "Bước sau: Ban lãnh đạo bấm «Nhắc» ở Báo cáo tuần (đơn vị nhận tin đỏ ở chuông); cấp trên tổng hợp (luồng khai ở mục «Luồng báo cáo»); báo cáo tuần do AI viết sau hạn của cấp 1.",
  ],
  cacKhoi: [
    ["Hạn nộp báo cáo tuần — cấp 1…4: tuần · thứ · giờ", "Mỗi cấp một bộ ba — đây là phần máy đang dùng.", "Hạn nộp tuần"],
    ["Ngày nghỉ, ngày lễ", "Ngày nghỉ khiến hạn dời sang ngày làm việc kế tiếp.", "Ngày nghỉ"],
    ["Loại kỳ báo cáo dùng · Hạn nộp báo cáo tháng · Nhắc nộp trước (giờ)", "Đã có ô nhập nhưng máy CHƯA đọc ba ô này.", "Ô chưa dùng"],
  ],
  nguoi: "Quản trị đặt hạn từng cấp, thêm ngày nghỉ, bấm «Lưu». Người lập báo cáo nộp trước hạn. Ban lãnh đạo bấm «Nhắc» khi cần.",
  may: "Tính thời điểm hạn nộp của từng đơn vị theo cấp, dời hạn khi rơi vào ngày nghỉ, so với giờ hiện tại để hiện «!» trên Sơ đồ tổ chức.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Hạn nộp tuần",
      khoi: [
        { doan: ["Mỗi cấp đơn vị có một bộ ba: «tuần» (tuần làm việc cần báo cáo hay tuần sau đó), «thứ» và «giờ». Hạn đặt như vậy áp cho báo cáo TUẦN của mọi đơn vị thuộc cấp đó."] },
        {
          tieuDe: "Mặc định (4 cấp)",
          bang: [
            ["Cấp", "Tuần", "Thứ", "Giờ"],
            ["Cấp 1 (Ban Tổng giám đốc)", "Tuần làm việc sau đó", "Thứ Hai", "10:00"],
            ["Cấp 2 (các phòng)", "Tuần làm việc cần báo cáo", "Thứ Sáu", "10:00"],
            ["Cấp 3 (nhà máy, Ban QLDA)", "Tuần làm việc cần báo cáo", "Thứ Sáu", "08:00"],
            ["Cấp 4 (Ban điều hành)", "Tuần làm việc cần báo cáo", "Thứ Năm", "17:00"],
          ],
        },
        { bam: ["Mở Cài đặt → tab «🔔 Cảnh báo & ngưỡng» → mục «Kỳ báo cáo, hạn nộp».", "Ở dòng của cấp muốn đổi, chọn «tuần», chọn «thứ», gõ «giờ» (HH:MM).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Tuần làm việc 12/10–18/10/2026 (7 ngày): Ban điều hành (cấp 4) nộp trước 17:00 Thứ Năm 15/10/2026; nhà máy (cấp 3) trước 08:00 Thứ Sáu 16/10/2026; phòng (cấp 2) trước 10:00 Thứ Sáu 16/10/2026; Ban Tổng giám đốc (cấp 1) hạn 10:00 Thứ Hai 19/10/2026.",
            "Muốn nhà máy nộp sớm hơn một ngày: đổi dòng cấp 3 từ «Thứ Sáu» sang «Thứ Năm».",
          ],
        },
        { ketQua: ["Dấu «!» trên Sơ đồ tổ chức tính lại theo hạn mới ngay lần mở màn kế tiếp."] },
        { luuY: ["Giờ là giờ Việt Nam. Hạn của cấp dưới nên sớm hơn cấp trên, nếu không cấp trên chưa kịp tổng hợp."] },
      ],
    },
    {
      ten: "② Ngày nghỉ",
      khoi: [
        { doan: ["Nếu hạn nộp trúng một ngày nghỉ hay ngày lễ, máy dời hạn sang ngày làm việc kế tiếp (bỏ qua cả Chủ nhật). Hạn cố ý đặt vào Chủ nhật thì giữ nguyên Chủ nhật."] },
        { bam: ["Ở ô «Ngày nghỉ, ngày lễ» bấm vào ô ngày, chọn một ngày trong lịch (lịch tự đóng), lặp lại cho ngày khác.", "Bấm «Lưu»."] },
        { viDu: ["Dịp Quốc khánh nghỉ 02/09/2026 và 03/09/2026 (2 ngày): thêm hai ngày này. Hạn rơi vào hai ngày đó được dời sang ngày làm việc kế tiếp, đơn vị khỏi bị tính trễ."] },
        { luuY: ["Ngày hiển thị dd/mm/yyyy. Ngày nghỉ chỉ ảnh hưởng hạn nộp báo cáo, không ảnh hưởng hạn của việc đã giao."] },
      ],
    },
    {
      ten: "③ Ô chưa dùng",
      khoi: [
        { doan: ["Ba ô sau có trong biểu mẫu nhưng đến ngày 20/10/2026 máy chưa đọc chúng để tính hay nhắc. Bạn nhập được và lưu được, chỉ là chưa có tác dụng. Ghi ở đây để khỏi chờ một việc không xảy ra."] },
        {
          bang: [
            ["Ô", "Mặc định", "Tình trạng"],
            ["Loại kỳ báo cáo dùng", "Tuần, Tháng", "Chưa dùng để lọc loại kỳ lúc gửi."],
            ["Hạn nộp báo cáo tháng: ngày · giờ", "ngày 3 · 10:00", "Chưa có chỗ tính hạn tháng."],
            ["Nhắc nộp trước (giờ)", "24", "Chưa có tin nhắc tự động trước hạn."],
          ],
        },
        { viDu: ["Đặt «Nhắc nộp trước (giờ)» là 48: máy vẫn không tự gửi tin trước hạn 48 giờ. Muốn nhắc một đơn vị chưa nộp, Ban lãnh đạo bấm «Nhắc» ở màn Báo cáo tuần."] },
      ],
    },
  ],
  viDuLuu: ["Đổi hạn cấp 3 từ «Thứ Sáu» sang «Thứ Năm» → «Lưu» → nhật ký phiên bản ghi «Hạn nộp báo cáo tuần — cấp 3: thứ: Thứ Sáu → Thứ Năm»."],
  vuong: [
    ["Báo lỗi khi lưu giờ hoặc ngày", "Giờ phải dạng HH:MM (08:00); ngày tháng trong ô tháng phải từ 1 đến 28."],
    ["Đơn vị đã nộp mà Sơ đồ vẫn hiện «!»", "Có thể báo cáo nộp ở kỳ khác hoặc chưa được nhận ra đúng đơn vị; xem mục «Tên gọi khác của đơn vị» và «Rà soát sổ cái»."],
    ["Đặt nhắc nộp trước nhưng không có tin", "Ô này chưa được máy dùng — xem tab «③ Ô chưa dùng»."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «ky_bao_cao» trong cài đặt; cách tính hạn theo cấp trong phần tuần báo cáo của Sơ đồ tổ chức; cấp đơn vị ở cây đơn vị.",
});
