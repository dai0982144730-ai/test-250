// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Tên gọi khác của đơn vị. Viết 20/10/2026 (nhóm B3). Nhãn chép từ components/cai-dat/nhom.tsx (NhomTenGoiKhacDonVi).
// Đối chiếu code 20/10: danh sách này được đọc ở lib/kiem-tra/phan-giai.ts:57 (khoá tra tên đơn vị cho dòng «Gửi:», ô người phụ trách, đơn vị lập suy từ nội dung báo cáo)
// và lib/tro-ly/lam-bao-cao.ts:248 (trợ lý «Làm báo cáo» nhận ra đơn vị người dùng nhắc; lib/tro-ly/lam-bao-cao.ts:293 là chỗ 🤖 AI chọn đơn vị khi code khớp không ra). Kiểm hợp lệ khi lưu: lib/cau-hinh/kiem-tra.ts:252.
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Tên gọi khác của đơn vị",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Ai đăng nhập cũng xem được.",
  laGi: [
    "Mỗi đơn vị trong công ty có một tên chính thức (ví dụ «Nhà máy điện gió Hướng Linh 7») nhưng người viết báo cáo hay ghi tắt: «HL7», «NMĐG HL7»… Mục này là cuốn sổ ghi các tên ghi tắt đó cho từng đơn vị, để máy biết «HL7» chính là Nhà máy điện gió Hướng Linh 7.",
    "Máy đã tự hiểu những kiểu viết tắt phổ biến, không phân biệt hoa thường hay dấu: «NM» là «Nhà máy», «BQLDA» là «Ban quản lý dự án», «P.» là «Phòng», «&» với «và», «TĐ» thủy điện, «ĐG» điện gió. Bạn chỉ cần khai những tên viết tắt RIÊNG mà máy không tự suy ra được, như mã «HL7».",
  ],
  vaoSao: [
    "Báo cáo thuộc đơn vị nào là do NỘI DUNG báo cáo nói (dòng tên đơn vị ghi dưới tiêu đề «BÁO CÁO …»), không phải do người nào bấm gửi. Máy nhận sai tên thì báo cáo bị xếp nhầm đơn vị hoặc báo «không nhận ra».",
    "Khi người dùng gõ «làm báo cáo tuần của HL7» với trợ lý, máy cũng dùng đúng danh sách này để biết là đơn vị nào.",
  ],
  vongLam: [
    "Bước trước: đơn vị được tạo trong cây đơn vị với tên chính thức và tên ngắn.",
    "Mục này: khai thêm các tên gọi khác cho đơn vị cấp 2 trở xuống (Ban Tổng giám đốc không có dòng ở đây).",
    "Bước sau: khi người nộp tải báo cáo lên ở «Báo cáo», máy đọc tên đơn vị trong nội dung và tra danh bạ gồm tên chính thức, tên ngắn, mã đơn vị VÀ các tên gọi khác ở đây; trợ lý «Làm báo cáo» tra tương tự.",
  ],
  cacKhoi: [
    ["Mỗi dòng một đơn vị: tên đơn vị ở bên trái", "Chỉ liệt kê đơn vị đang hoạt động từ cấp 2 trở xuống", "① Khai tên gọi khác"],
    ["Dãy thẻ tên + ô nhập «+ tên gọi khác» + dấu «+»", "Thêm tên bằng Enter hoặc dấu «+»; bỏ bằng dấu ×", "① Khai tên gọi khác"],
  ],
  nguoi: "Quản trị thêm hoặc bớt tên gọi khác của từng đơn vị khi thấy báo cáo bị nhận sai đơn vị, bấm «Lưu».",
  may: "Chuẩn hóa tên (bỏ dấu, hoa thường, thay «&»/«và», «NM»/«Nhà máy»…), tra danh bạ đơn vị, từ chối lưu nếu một tên bị khai cho hai đơn vị.",
  aiLam: "🤖 Chỉ ở trợ lý «Làm báo cáo»: khi câu người dùng không khớp được đơn vị nào (hoặc khớp nhiều), AI chọn trong danh sách đơn vị thật (mã, tên, tên ngắn, tên gọi khác). Máy kiểm lại mã AI trả, AI không bịa ra đơn vị được.",
  quyTrinhAI: [
    "Người gõ cho trợ lý «Làm báo cáo» một câu nhắc đơn vị.",
    "Máy tra trước bằng tên chính thức, tên ngắn, hai chữ đầu có nghĩa và tên gọi khác khai ở đây.",
    "Chỉ khi máy không ra đơn vị nào mà câu còn chữ lạ, hoặc ra từ hai đơn vị trở lên, 🤖 AI mới được hỏi chọn trong danh sách thật.",
    "Máy kiểm mã AI trả có nằm trong danh sách. Vẫn không chọn được mà khớp nhiều đơn vị thì trợ lý HỎI người, không tự lấy đơn vị của tài khoản.",
  ],
  buoc: [
    {
      ten: "① Khai tên gọi khác",
      khoi: [
        { doan: ["Mỗi dòng có tên đơn vị bên trái và dãy tên gọi khác bên phải. Đơn vị chưa có tên gọi khác thì hiện «(trống)». Hiện ghi sẵn cho hai nhà máy điện gió."] },
        {
          bang: [
            ["Đơn vị", "Tên gọi khác khai sẵn"],
            ["Nhà máy điện gió Hướng Linh 7", "HL7 · NMĐG HL7 · ĐG Hướng Linh 7"],
            ["Nhà máy điện gió Hướng Linh 8", "HL8 · NMĐG HL8 · ĐG Hướng Linh 8"],
          ],
        },
        {
          bam: [
            "Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Tên gọi khác của đơn vị».",
            "Tìm dòng đơn vị cần thêm tên.",
            "Gõ tên vào ô «+ tên gọi khác», nhấn Enter hoặc bấm dấu «+». Tên mới hiện thành một thẻ.",
            "Muốn bỏ một tên, bấm dấu × trên thẻ.",
            "Bấm «Lưu».",
          ],
        },
        {
          viDu: [
            "Phòng Kinh tế và Vận hành thấy báo cáo của Nhà máy thủy điện Ca Nan 1 có dòng đơn vị ghi «TĐ CN1» và máy báo «không nhận ra». Quản trị mở mục này, ở dòng Nhà máy thủy điện Ca Nan 1 gõ «TĐ CN1» và «NM CN1», bấm «Lưu». Báo cáo tải lên tiếp theo ghi tên đó thì máy nhận đúng đơn vị.",
            "Hỏi trợ lý «làm báo cáo tuần của HL8»: máy tra thấy «HL8» thuộc Nhà máy điện gió Hướng Linh 8, không cần hỏi AI.",
          ],
        },
        {
          ai: [
            "AI nhận (chỉ ở trợ lý «Làm báo cáo», khi máy tra không ra): câu người dùng và danh sách đơn vị thật gồm mã, tên, tên ngắn và các tên gọi khác ở mục này.",
            "AI làm: chọn một mã đơn vị trong danh sách, hoặc trả không chắc.",
            "AI KHÔNG làm: không thêm đơn vị mới, không sửa tên gọi khác.",
            "Thời gian: tối đa 60 giây. Người kiểm: xem tên đơn vị trên báo cáo trợ lý làm ra; nhầm thì nói lại tên đầy đủ.",
            "AI lỗi hoặc quá giờ: coi như AI không chọn được; nếu có nhiều đơn vị khớp thì trợ lý hỏi bạn chọn.",
          ],
        },
        {
          luuY: [
            "Mỗi tên chỉ thuộc MỘT đơn vị. Khai «HL7» cho hai đơn vị thì «Lưu» báo lỗi, không ghi gì.",
            "Tên quá chung chung (ví dụ «Nhà máy») sẽ khớp với nhiều đơn vị, khiến máy phải hỏi lại hoặc nhận nhầm. Hãy khai tên đủ riêng như «NMĐG HL7».",
            "Đổi danh sách chỉ ảnh hưởng báo cáo tải lên sau khi lưu.",
          ],
        },
      ],
    },
  ],
  viDuLuu: ["Thêm tên «TĐ CN1» cho Nhà máy thủy điện Ca Nan 1 và bấm «Lưu» → nhật ký ghi tên đó được thêm vào nhóm «Tên gọi khác của đơn vị» (phiên bản mới, có hiệu lực ngay)."],
  vuong: [
    ["Lưu báo «Tên … đang khai cho cả … và …»", "Một tên chỉ được thuộc một đơn vị. Bỏ tên khỏi dòng còn lại."],
    ["Báo cáo vẫn báo «Không nhận ra» đơn vị", "Tên trong báo cáo khác với tên đã khai (kể cả thừa chữ). Thêm đúng cách viết đó vào đơn vị tương ứng."],
    ["Không thấy dòng của Ban Tổng giám đốc", "Mục chỉ liệt kê đơn vị từ cấp 2 trở xuống."],
    ["Đơn vị vừa tạo không có dòng", "Đơn vị phải đang hoạt động và có cấp từ 2 trở xuống; kiểm lại ở cây đơn vị."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «ten_goi_khac_don_vi» trong cài đặt; cách tra tên đơn vị ở phần phân giải tên trong báo cáo và trợ lý «Làm báo cáo».",
});
