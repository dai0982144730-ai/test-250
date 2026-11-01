// Hướng dẫn bản 2 (tab) — màn Cài đặt (tổng). Viết 20/10/2026. Khai ở TrangCaiDat.tsx (ưu tiên 0); từng mục có hướng dẫn riêng mã cd-<khóa mục>.
// Đối chiếu code 20/10: 4 tab ngang, mục hiện theo mucCan (quản trị / quyền), nút Xuất · Nhập chỉ hiện với người sửa được ít nhất một nhóm.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt (tổng quan)",
  ai: "Ai đăng nhập cũng mở và XEM được Cài đặt. SỬA thì theo từng nhóm: người có quyền «cau_hinh.sua» và quản trị sửa mọi nhóm; người khác sửa nhóm nào do mục «Phân quyền cài đặt» cho đơn vị và vai trò của họ. Nút không có quyền bấm thì ẨN.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn Cài đặt là gì",
          doan: [
            "Cài đặt là nơi chứa MỌI con số, công tắc và danh sách mà ứng dụng dùng để quyết định cách làm việc: hạn nhắc việc, hạn nộp báo cáo, ai gửi cho ai, luật kiểm tra báo cáo, người dùng và quyền, kết nối AI…",
            "Điểm chính: cái gì đổi được thì nằm ở đây, không viết cứng trong phần mềm. Quản trị đổi xong có hiệu lực ngay, không phải chờ người lập trình.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: ["Mỗi công ty, mỗi giai đoạn dự án có nhịp làm việc khác nhau. Gom vào một màn thì có một nơi để hỏi «ai đã đổi cái gì, lúc nào» (nhật ký phiên bản) và có thể quay lại bản cũ khi lỡ tay."],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          doan: [
            "Mở bằng menu tên người (góc trên bên phải) → «Cài đặt».",
            "Trước: bạn thấy một con số lạ ở màn khác (ví dụ việc báo quá hạn sớm, đơn vị nộp báo cáo bị hiện «!»). Màn Cài đặt: tìm đúng mục và chỉnh. Sau: màn kia đổi ngay lần mở kế tiếp.",
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì"],
            ["Tiêu đề «Cài đặt» + nút «Xuất cấu hình» · «Nhập cấu hình»", "Lưu cả bộ cài đặt ra một tệp để sao lưu hoặc đem sang máy khác; nạp lại từ tệp."],
            ["Bốn tab ngang", "🔔 Cảnh báo & ngưỡng · 🔌 Kết nối · 👥 Người dùng & phân quyền · 🧩 Riêng của agent."],
            ["Cột trái: danh sách mục của tab", "Mỗi mục một dòng, có ổ khoá nếu bạn chỉ xem và nhãn v1, v2… là số phiên bản đã lưu."],
            ["Cột phải: nội dung mục", "Ô nhập, nút «Lưu», và bên phải là «Nhật ký phiên bản»."],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["Người", "Chọn mục, đổi ô, bấm «Lưu»; có thể xuất hoặc nhập cấu hình, quay lại bản cũ."],
            ["Máy", "Kiểm tra giá trị trước khi lưu, tăng số phiên bản, ghi nhật ký, áp dụng ngay cho cả hệ thống."],
            ["🤖 AI", "— Màn Cài đặt chung không dùng AI. Riêng vài mục có AI (xem hướng dẫn từng mục): «AI», «Luật kiểm tra», «Gắn việc vào WBS», «Báo cáo tuần (AI)»."],
          ],
        },
        { tieuDe: "⑥ Quy trình người ↔ AI", doan: ["Màn này không dùng AI. Mục nào có AI thì hướng dẫn riêng của mục đó nói rõ ai làm trước, ai duyệt."] },
      ],
    },
    {
      ten: "① Bốn tab và các mục",
      khoi: [
        { doan: ["Bốn tab ngang chia mục theo mục đích. Bấm tên tab thì cột trái đổi sang các mục của tab đó; địa chỉ trang đổi theo, nên có thể gửi đường dẫn cho đồng nghiệp."] },
        {
          bang: [
            ["Tab", "Các mục", "Ai thấy mục"],
            ["🔔 Cảnh báo & ngưỡng", "Hạn việc, quá hạn, nhắc việc · Kỳ báo cáo, hạn nộp · Quy tắc đè, việc thiếu hạn", "Mọi người xem"],
            ["🔌 Kết nối", "AI · Thống kê dùng AI · Email, thông báo · Khóa cho agent · Giao diện, sao lưu", "«Thống kê dùng AI»: người có quyền xem thống kê AI. «Khóa cho agent»: người có quyền cấp khoá hoặc quản trị. Còn lại mọi người xem"],
            ["👥 Người dùng & phân quyền", "Tổ chức & người dùng · Vai trò và quyền · Nhập từ Excel · Tài khoản người dùng · Người ngoài, chưa gán đơn vị · Phân quyền cài đặt", "«Tổ chức & người dùng», «Vai trò và quyền»: người có quyền quản trị. «Nhập từ Excel»: quản trị toàn bộ. Còn lại mọi người xem"],
            ["🧩 Riêng của agent", "Luật kiểm tra · Luật hệ thống · Luồng báo cáo · Tên gọi khác của đơn vị · Công ty của nhà máy / Ban điều hành · Sơ đồ tổ chức dự án · Gắn việc vào WBS · Thư mục · Tệp đính kèm việc · Báo cáo tuần (AI) · Lịch sử · Rà soát sổ cái", "«Rà soát sổ cái»: người sửa được mọi nhóm cài đặt. Còn lại mọi người xem"],
          ],
        },
        { bam: ["Bấm tên tab (ví dụ «🔌 Kết nối»).", "Ở cột trái bấm mục muốn xem; dòng đang chọn đậm chữ.", "Cột phải hiện nội dung mục. Nút «?  Hướng dẫn» cam sẽ mở hướng dẫn riêng của mục."] },
        { viDu: ["Bạn muốn báo việc sắp đến hạn sớm hơn: bấm tab «🔔 Cảnh báo & ngưỡng» → mục «Hạn việc, quá hạn, nhắc việc» → sửa ô số ngày → «Lưu»."] },
        { luuY: ["Mục có ổ khoá nghĩa là bạn chỉ xem; không thấy nút «Lưu». Mục không hiện ở cột trái là mục bạn không có quyền mở."] },
      ],
    },
    {
      ten: "② Xuất và nhập cấu hình",
      khoi: [
        { doan: ["Hai nút ở góc phải tiêu đề chỉ hiện với người sửa được ít nhất một nhóm cài đặt. «Xuất cấu hình» tải về toàn bộ cài đặt hiện hành; «Nhập cấu hình» nạp lại từ một tệp đã xuất."] },
        {
          bam: [
            "Bấm «Xuất cấu hình» → trình duyệt tải về một tệp .json.",
            "Muốn nạp: bấm «Nhập cấu hình», chọn tệp .json.",
            "Hộp hỏi xác nhận: các nhóm có trong tệp sẽ bị ghi đè, mỗi nhóm tăng một phiên bản, quay lại được. Bấm đồng ý.",
            "Có nhóm sai: hộp «Không nhập được cấu hình» liệt kê từng lỗi; KHÔNG nhóm nào bị ghi. Sửa tệp rồi nhập lại.",
          ],
        },
        { viDu: ["Trước khi đổi hàng loạt ngưỡng, bạn bấm «Xuất cấu hình» lưu lại làm bản sao lưu. Đổi sai nhiều chỗ → «Nhập cấu hình» tệp cũ → toàn bộ trở về như lúc xuất (mỗi nhóm thành một phiên bản mới)."] },
        { luuY: ["Tệp không phải JSON hợp lệ sẽ báo lỗi «không phải JSON hợp lệ» và không làm gì.", "Nhập cấu hình ghi đè nhiều nhóm một lúc — chỉ người đã hiểu rõ mới nên dùng."] },
      ],
    },
    {
      ten: "③ Lưu và nhật ký phiên bản",
      khoi: [
        { doan: ["Mọi mục dạng nhóm (có ô nhập) lưu theo cùng một cách."] },
        { bam: ["Sửa ô.", "Bấm «Lưu» (chỉ sáng khi có thay đổi). Máy kiểm tra, rồi báo «Đã lưu … → phiên bản N. Có hiệu lực ngay.»", "Cột «Nhật ký phiên bản» thêm một dòng: ai, lúc nào, ô nào từ gì sang gì.", "Lỡ sai: bấm «Quay lại bản này» ở dòng muốn về, hoặc «Quay về mặc định» ở cuối cột."] },
        { viDu: ["Phiên bản 3 do bạn đặt ngưỡng sắp đến hạn là 5 ngày. Sáng hôm sau thấy nhắc nhiều quá → mở nhật ký, bấm «Quay lại bản này» ở dòng phiên bản 2 → máy tạo phiên bản 4 mang giá trị cũ (3 ngày)."] },
        { luuY: ["Máy không bao giờ xoá phiên bản; quay lại là tạo phiên bản mới.", "Chi tiết từng ô xem hướng dẫn riêng của mục (nút «?  Hướng dẫn» đổi theo mục đang mở)."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy mục mình cần", "Mục ẩn với người không có quyền. Hỏi quản trị cấp quyền hoặc xem mục «Phân quyền cài đặt»."],
            ["Không có nút «Lưu»", "Bạn chỉ có quyền xem mục đó (có ổ khoá cạnh tên mục)."],
            ["Lưu báo lỗi đỏ", "Ô nhập sai kiểu hoặc ngoài giới hạn; đọc từng dòng lỗi, sửa rồi lưu lại."],
            ["Đổi xong màn khác chưa đổi", "Tải lại trang. Một số cài đặt chỉ áp cho báo cáo gửi từ nay (xem hướng dẫn mục)."],
            ["Muốn biết ai đã đổi", "Xem «Nhật ký phiên bản» bên phải hoặc mục «Lịch sử» ở tab «🧩 Riêng của agent»."],
          ],
        },
      ],
    },
  ],
  canCu: "Màn Cài đặt: bốn tab và các mục, quyền sửa theo nhóm, nhật ký phiên bản, xuất và nhập cấu hình.",
};
