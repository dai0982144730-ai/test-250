// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Công ty của nhà máy / Ban điều hành. Viết 20/10/2026 (nhóm B3). Nhãn chép từ components/cai-dat/nhom.tsx (NhomCongTyDonVi).
// Đối chiếu code 20/10: bảng này chỉ được đọc ở lib/tro-ly/lam-bao-cao.ts:882 → dienCongTy (dòng 63): MÁY điền, viết hoa, vào đoạn «CÔNG TY ......» của báo cáo trợ lý «Làm báo cáo» tạo ra.
// Nhãn mục đã sửa 20/10: «máy điền» (việc điền dòng CÔNG TY là của máy, không phải lượt AI nào).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Công ty của nhà máy / Ban điều hành",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Ai đăng nhập cũng xem được.",
  laGi: [
    "Báo cáo của nhà máy (mẫu Form 8) và của Ban điều hành tổng thầu (mẫu Form 10) có dòng đầu ghi «CÔNG TY ......» để trống. Mục này là bảng ghi tên công ty đứng sau từng nhà máy hoặc từng Ban điều hành: nhà máy thì ghi công ty đang vận hành nhà máy, Ban điều hành thì ghi công ty tổng thầu.",
    "Mỗi dòng của bảng gồm tên đơn vị bên trái và một ô để gõ tên công ty bên phải. Hiện chưa có dòng nào được điền (mặc định để trống).",
  ],
  vaoSao: [
    "Một công ty có nhiều nhà máy, mỗi nơi do một công ty vận hành khác nhau. Nếu người lập báo cáo phải gõ lại dòng này mỗi tuần thì dễ sai tên và tốn công.",
    "Khai một lần ở đây, mỗi lần trợ lý «Làm báo cáo» soạn báo cáo của đơn vị đó thì dòng công ty tự có sẵn.",
  ],
  vongLam: [
    "Bước trước: đơn vị là nhà máy hoặc Ban điều hành đã có trong cây đơn vị (tên bắt đầu bằng «Nhà máy» hoặc «Ban điều hành»).",
    "Mục này: gõ tên công ty cho từng đơn vị.",
    "Bước sau: khi người dùng nhờ trợ lý «Làm báo cáo» soạn báo cáo cho đơn vị đó, máy điền tên công ty (viết hoa) vào dòng «CÔNG TY ......» của tệp Word rồi mới đưa người dùng kiểm tra và nộp.",
  ],
  cacKhoi: [
    ["Mỗi dòng: tên nhà máy hoặc Ban điều hành + ô gõ tên công ty", "Chỉ liệt kê đơn vị đang hoạt động, từ cấp 3 trở xuống, có tên bắt đầu bằng «Nhà máy» hoặc «Ban điều hành»", "① Khai tên công ty"],
  ],
  nguoi: "Quản trị gõ tên công ty cho từng đơn vị, bấm «Lưu». Người lập báo cáo kiểm tra lại dòng công ty trên bản trợ lý soạn.",
  may: "Lấy tên công ty của đúng đơn vị đang soạn, viết hoa toàn bộ và ghi đè vào đoạn chỉ gồm chữ «CÔNG TY» kèm dấu chấm hoặc dấu chấm lửng trong tệp Word. Đoạn nào có chữ khác thì không đụng.",
  aiLam: "— Việc điền tên công ty do máy làm, không phải AI. (Trợ lý «Làm báo cáo» có phần AI viết nội dung khác của báo cáo, nhưng dòng công ty thì không.)",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Khai tên công ty",
      khoi: [
        { doan: ["Gõ tên công ty đầy đủ vào ô bên phải tên đơn vị, theo cách bạn muốn nó hiện trên báo cáo (máy sẽ viết hoa hết). Ô gợi ý mẫu: «vd: Công ty Cổ phần Thủy điện Nậm Xe»."] },
        {
          bam: [
            "Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Công ty của nhà máy / Ban điều hành».",
            "Tìm dòng nhà máy hoặc Ban điều hành cần khai.",
            "Gõ tên công ty vào ô nhập.",
            "Bấm «Lưu».",
          ],
        },
        {
          viDu: [
            "Ô của «Nhà máy thủy điện Nậm Xe» gõ «Công ty Cổ phần Thủy điện Nậm Xe». Khi trợ lý soạn báo cáo Form 8 của nhà máy này, dòng đầu trở thành «CÔNG TY CỔ PHẦN THỦY ĐIỆN NẬM XE».",
            "Ô của một Ban điều hành tổng thầu: gõ tên công ty tổng thầu thi công của dự án đó (do quản trị biết, không có sẵn trong ứng dụng).",
            "Muốn để người lập tự ghi: xóa trắng ô. Dòng «CÔNG TY ......» giữ nguyên dấu chấm.",
          ],
        },
        {
          luuY: [
            "Chỉ báo cáo do trợ lý «Làm báo cáo» soạn mới được điền tự động. Báo cáo người lập tự tải lên thì không bị động chạm.",
            "Dòng chỉ được thay khi cả đoạn chỉ gồm chữ «CÔNG TY» và dấu chấm hoặc dấu chấm lửng. Mẫu nào đã có chữ khác trên dòng đó thì máy giữ nguyên.",
            "Tên có ký tự lỗi phông (hiện thành dấu �) bị từ chối khi lưu; hãy gõ lại tên bằng bàn phím tiếng Việt.",
            "Đổi tên ở đây không sửa báo cáo cũ đã soạn.",
          ],
        },
      ],
    },
  ],
  viDuLuu: ["Gõ «Công ty Cổ phần Thủy điện Nậm Xe» vào ô của Nhà máy thủy điện Nậm Xe và bấm «Lưu» → nhật ký ghi nhóm «Công ty của nhà máy / Ban điều hành» đổi, kèm người sửa và giờ."],
  vuong: [
    ["Trợ lý soạn báo cáo mà dòng công ty vẫn là dấu chấm", "Đơn vị đó chưa có tên công ty ở đây, hoặc mẫu Word có chữ khác ở dòng đó."],
    ["Không thấy dòng của một nhà máy", "Tên đơn vị phải bắt đầu bằng «Nhà máy» hoặc «Ban điều hành», đang hoạt động và có cấp từ 3 trở xuống."],
    ["Lưu báo «Tên công ty có ký tự lỗi phông»", "Gõ lại bằng bàn phím tiếng Việt, đừng dán từ nguồn lỗi mã."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «cong_ty_don_vi» trong cài đặt; cách điền dòng «CÔNG TY ......» ở phần xuất tệp Word của trợ lý «Làm báo cáo».",
});
