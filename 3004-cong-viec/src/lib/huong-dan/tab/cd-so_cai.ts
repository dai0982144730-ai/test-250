// Hướng dẫn bản 2 (tab) — Cài đặt › Hạn việc, quá hạn, nhắc việc. Viết 20/10/2026. Nhãn ô chép từ lib/cau-hinh/bieu-mau.ts (nhóm so_cai).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Hạn việc, quá hạn, nhắc việc",
  tab: "🔔 Cảnh báo & ngưỡng",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên sửa được mọi mục; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép đơn vị và vai trò của họ. Ai đăng nhập cũng xem được.",
  laGi: [
    "Đây là nơi bạn chỉ cho máy biết thế nào là «việc sắp đến hạn», thế nào là «quá hạn», và máy nhắc ai, lúc mấy giờ, bằng đường nào.",
    "Sổ cái là cuốn sổ ghi mọi việc của công ty (giao việc, báo xong, báo cáo đã gửi). Mục này chỉnh các con số và công tắc mà máy dùng khi đọc cuốn sổ đó mỗi ngày.",
  ],
  vaoSao: [
    "Mỗi công ty có nhịp làm việc riêng: có nơi báo trước 3 ngày là đủ, có nơi cần báo trước 7 ngày. Nếu ngưỡng viết cứng trong phần mềm thì mỗi lần đổi phải nhờ người lập trình sửa. Đặt ở Cài đặt thì quản trị đổi xong có hiệu lực ngay.",
    "Màu và dấu «!» trên Sơ đồ tổ chức, danh sách Việc của tôi và chuông thông báo đều đọc từ các con số này, nên cả công ty cùng hiểu một nghĩa.",
  ],
  vongLam: [
    "Bước trước: người giao việc đặt hạn kết thúc cho từng phần việc (giao việc, hoặc việc máy rút ra từ báo cáo đã gửi).",
    "Mục này: mỗi ngày đúng giờ nhắc, máy quét sổ cái và tìm phần việc còn «đang làm» có hạn kết thúc trong khoảng đã đặt.",
    "Bước sau: người phụ trách và người giao việc nhận tin ở chuông 🔔 (tin đỏ cho việc quá hạn); việc quá hạn còn hiện thành issue ở màn Cảnh báo.",
  ],
  cacKhoi: [
    ["Còn bao nhiêu ngày thì là «sắp đến hạn»", "Số ngày báo trước hạn kết thúc.", "Ngưỡng ngày"],
    ["Quá hạn đến bao nhiêu ngày thì tô vàng", "Quá hạn từ 1 đến N ngày: vàng; hơn N ngày: đỏ.", "Ngưỡng ngày"],
    ["Nguyên tắc sinh mã việc · Dạng mã việc (khi tự đặt)", "Cách đặt mã CV-… cho việc mới vào sổ.", "Mã việc"],
    ["Nhắc khi quá hạn · Giờ gửi nhắc mỗi ngày · Kênh nhắc", "Có nhắc không, lúc mấy giờ, trong ứng dụng hay email.", "Nhắc việc"],
    ["Tự bổ sung việc thiếu vào sổ cái", "Máy tự ghi việc còn thiếu từ báo cáo đã gửi.", "Nhắc việc"],
  ],
  nguoi: "Quản trị chỉnh ngưỡng và công tắc, bấm «Lưu». Người phụ trách việc đọc tin nhắc và xử lý.",
  may: "Mỗi ngày đến giờ nhắc thì quét sổ cái, so hạn kết thúc với ngày hôm nay, gửi tin nhắc đúng một lần cho mỗi mốc hạn. Tự sinh mã việc theo nguyên tắc đã chọn.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Ngưỡng ngày",
      khoi: [
        { doan: ["Hai ô số này quyết định việc nào bị coi là «sắp đến hạn» và việc quá hạn nào bị tô vàng hay đỏ. Việc luôn mở (không có ngày) và việc đã xong không bị tính."] },
        {
          tieuDe: "Hai ô",
          bang: [
            ["Ô", "Mặc định", "Nghĩa"],
            ["Còn bao nhiêu ngày thì là «sắp đến hạn»", "3", "Hạn kết thúc nằm trong 3 ngày tới (kể cả hôm nay) là sắp đến hạn; máy nhắc người phụ trách."],
            ["Quá hạn đến bao nhiêu ngày thì tô vàng", "3", "Quá hạn từ 1 đến 3 ngày: vàng. Quá hơn 3 ngày: đỏ."],
          ],
        },
        { bam: ["Mở Cài đặt → tab «🔔 Cảnh báo & ngưỡng» → mục «Hạn việc, quá hạn, nhắc việc».", "Gõ số ngày mới vào hai ô (số nguyên, không âm).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Công ty muốn báo sớm hơn: đổi «Còn bao nhiêu ngày thì là «sắp đến hạn»» từ 3 thành 5. Việc có hạn kết thúc 25/10 sẽ được nhắc từ ngày 20/10 (5 ngày trước) thay vì 22/10.",
            "Với ngưỡng vàng mặc định 3: việc quá hạn 2 ngày hiện vàng, việc quá hạn 4 ngày hiện đỏ.",
          ],
        },
        { ketQua: ["Từ lần quét kế tiếp, tin nhắc, màu việc quá hạn và dấu «!» đều tính theo con số mới. Việc đã nhắc đúng mốc hạn đó rồi thì không nhắc lặp."] },
        { luuY: ["Số phải là số nguyên không âm; nhập chữ hoặc số âm thì «Lưu» báo lỗi và không ghi gì."] },
      ],
    },
    {
      ten: "② Mã việc",
      khoi: [
        { doan: ["Mỗi việc khi vào sổ cái lần đầu được cấp một mã, ví dụ CV-2026-0412. Việc đã có mã giữ nguyên mã cũ, đổi cài đặt không đổi mã đã cấp."] },
        {
          tieuDe: "Sáu nguyên tắc có sẵn trong ô «Nguyên tắc sinh mã việc»",
          bang: [
            ["Lựa chọn", "Ví dụ mã"],
            ["Theo năm", "CV-2026-0412"],
            ["Theo tháng", "CV-202609-012"],
            ["Theo đơn vị lập", "BQLDA-QT-2026-0012"],
            ["Theo dự án", "DGHV-0012 (Điện gió Hướng Việt)"],
            ["Theo dự án + đơn vị", "DGHV-BQLDA-QT-012"],
            ["Tự đặt theo ô «Dạng mã việc»", "Do bạn viết, dùng {nam} {thang} {don_vi} {du_an} {so:4}"],
          ],
        },
        { bam: ["Chọn một nguyên tắc ở ô «Nguyên tắc sinh mã việc».", "Chỉ khi chọn «Tự đặt…» mới gõ ô «Dạng mã việc (khi tự đặt)».", "Bấm «Lưu»."] },
        { viDu: ["Chọn «Theo dự án»: việc đầu tiên của Điện gió Hướng Việt mang mã DGHV-0001, việc thứ hai DGHV-0002. Mỗi tiền tố (năm, tháng, đơn vị, dự án) đánh số riêng."] },
        { luuY: ["Mã dài hay ngắn tuỳ ô; {so:4} nghĩa là số thứ tự 4 chữ số (0012). Đừng đổi qua lại thường xuyên vì người đọc sẽ thấy nhiều kiểu mã trong cùng một danh sách."] },
      ],
    },
    {
      ten: "③ Nhắc việc",
      khoi: [
        { doan: ["Ba ô này quyết định máy có nhắc không, nhắc lúc nào và nhắc qua đâu. Máy nhắc cả người phụ trách phần việc lẫn người giao việc."] },
        {
          tieuDe: "Các ô",
          bang: [
            ["Ô", "Mặc định", "Nghĩa"],
            ["Nhắc khi quá hạn", "Bật", "Tắt thì máy vẫn tô màu việc quá hạn nhưng không gửi tin nhắc."],
            ["Giờ gửi nhắc mỗi ngày", "08:00", "Giờ Việt Nam; mỗi ngày quét một lần."],
            ["Kênh nhắc", "Trong ứng dụng", "Có thể chọn thêm «Email» (cần đã khai hộp thư ở mục «Email, thông báo»)."],
            ["Tự bổ sung việc thiếu vào sổ cái", "Bật", "Báo cáo đã gửi mà còn việc chưa vào sổ cái thì máy tự ghi vào ngay, rồi báo quản trị. Tắt: chỉ báo, quản trị bấm «Bổ sung» ở mục «Rà soát sổ cái»."],
          ],
        },
        {
          viDu: [
            "Muốn mọi người nhận nhắc qua email lẫn chuông: ở «Kênh nhắc» chọn cả «Trong ứng dụng» và «Email», đặt «Giờ gửi nhắc mỗi ngày» là 07:30, bấm «Lưu».",
            "Hôm sau 07:30 người phụ trách việc có hạn 25/10 nhận một tin «Việc … sắp đến hạn …» ở chuông và một thư.",
          ],
        },
        { luuY: ["Mỗi mốc hạn chỉ nhắc một lần (máy ghi lại đã nhắc), nên đổi giờ nhắc không làm tin cũ gửi lại."] },
      ],
    },
  ],
  viDuLuu: ["Đổi «Còn bao nhiêu ngày thì là «sắp đến hạn»» từ 3 sang 5 → bấm «Lưu» → toast «Đã lưu «Sổ cái, nhắc việc» → phiên bản 1. Có hiệu lực ngay.» và nhật ký ghi «… 3 → 5»."],
  vuong: [
    ["Bấm «Lưu» báo lỗi đỏ", "Ô số phải là số nguyên không âm, giờ phải dạng HH:MM (08:00). Sửa theo dòng lỗi rồi lưu lại."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem mục này. Nhờ quản trị cấp quyền ở mục «Phân quyền cài đặt»."],
    ["Đổi ngưỡng rồi mà việc cũ vẫn tô màu cũ", "Màu tính lại mỗi lần mở màn; tải lại trang. Tin nhắc đã gửi trước đó thì không gửi lại."],
    ["Chọn kênh «Email» mà không ai nhận thư", "Chưa khai hộp thư gửi: vào «Email, thông báo» điền hộp thư và máy chủ gửi thư."],
  ],
  canCu: "Nhóm «so_cai» trong cài đặt (giá trị mặc định ở danh mục cấu hình), quét hạn mỗi ngày của sổ cái.",
});
