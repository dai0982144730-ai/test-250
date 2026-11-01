// Hướng dẫn bản 2 (tab) — Cài đặt › Người dùng & phân quyền › Phân quyền cài đặt. Viết 20/10/2026. Trình sửa riêng: components/cai-dat/nhom.tsx (NhomPhanQuyen).
// Đối chiếu code 20/10: quyền thật tính ở lib/cau-hinh/quyen.ts (duocSuaNhom) và kiểm ở lib/cau-hinh/ghi.ts khi lưu; kiểm hợp lệ ở lib/cau-hinh/kiem-tra.ts.
// ⏸ Bảng liệt kê cả nhóm «Bảo mật báo cáo tài chính» nhưng code chỉ cho quản trị viên sửa nhóm đó — dòng khai cho nhóm này không có tác dụng.
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Phân quyền cài đặt",
  tab: "👥 Người dùng & phân quyền",
  ai: "Chỉ người có quyền «Sửa cài đặt hệ thống» hoặc quản trị viên sửa được mục này; không giao riêng cho ai khác. Người khác mở ra chỉ xem, thấy nhãn «chỉ xem» và không thấy nút «Lưu».",
  laGi: [
    "Cài đặt gồm nhiều nhóm (Quy tắc đè, Kỳ báo cáo, Thông báo…). Người có quyền «Sửa cài đặt hệ thống» (và quản trị viên) sửa được mọi nhóm. Mục này cho phép giao riêng quyền sửa MỘT nhóm cho người khác mà không phải trao quyền sửa tất cả.",
    "Bảng có 19 dòng, mỗi dòng một nhóm cài đặt, hai cột: «Đơn vị» và «Vai trò». Ai thuộc đơn vị ghi ở cột «Đơn vị» và có vai trò ghi ở cột «Vai trò» thì sửa được nhóm đó.",
  ],
  vaoSao: [
    "Không phải việc gì cũng nên nằm ở quản trị. Trưởng phòng Đầu tư và Pháp chế am hiểu luật kiểm tra báo cáo hơn quản trị hệ thống; giao riêng nhóm «Luật kiểm tra» cho người đó thì quản trị đỡ việc mà không bị lộ các nhóm nhạy cảm như thông báo, AI, bảo mật.",
    "Mỗi lần giao quyền đều có nhật ký phiên bản, nên biết ai được giao từ lúc nào.",
  ],
  vongLam: [
    "Bước trước: quản trị đã khai đơn vị và vai trò ở mục «Tổ chức & người dùng» và «Vai trò và quyền» (bảng chỉ cho chọn đơn vị và vai trò đang có).",
    "Mục này: ghi nhóm cài đặt nào do đơn vị nào, vai trò nào sửa.",
    "Bước sau: người được giao mở Cài đặt, mục của nhóm đó không còn nhãn «chỉ xem», có nút «Lưu». Mỗi lần họ lưu, máy kiểm lại quyền này lần nữa ở phía máy chủ.",
  ],
  cacKhoi: [
    ["Cột «Nhóm cài đặt»", "Tên 19 nhóm cài đặt (không có chính nhóm này).", "① Quy tắc"],
    ["Cột «Đơn vị»", "Chọn đơn vị được phép: bấm «+ đơn vị». Để trống = đơn vị nào cũng được.", "① Quy tắc"],
    ["Cột «Vai trò»", "Chọn vai trò được phép: bấm «+ vai trò». Để trống = vai trò nào cũng được.", "① Quy tắc"],
  ],
  nguoi: "Quản trị (hoặc người có quyền sửa cài đặt hệ thống) chọn đơn vị và vai trò cho từng nhóm, bấm «Lưu». Người được giao tự vào sửa nhóm của mình.",
  may: "Kiểm tra người bấm «Lưu» có khớp quy tắc không; ghi từ chối nếu không («Bạn không có quyền sửa nhóm cài đặt …»); kiểm đơn vị và vai trò ghi trong bảng còn tồn tại.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Quy tắc",
      khoi: [
        { doan: ["Mỗi dòng của bảng là một nhóm cài đặt. Máy xét ba trường hợp theo cách điền hai cột:"] },
        {
          bang: [
            ["Cột «Đơn vị»", "Cột «Vai trò»", "Ai sửa được nhóm đó (ngoài người có quyền sửa mọi nhóm)"],
            ["Trống", "Trống", "Không ai (dòng bị xóa khỏi bảng khi lưu)"],
            ["Có đơn vị", "Trống", "Mọi người thuộc một trong các đơn vị đó (kể cả kiêm nhiệm)"],
            ["Trống", "Có vai trò", "Mọi người có một trong các vai trò đó, ở đơn vị nào cũng được"],
            ["Có đơn vị", "Có vai trò", "Người phải thỏa CẢ HAI: thuộc một trong các đơn vị VÀ có một trong các vai trò"],
          ],
        },
        {
          tieuDe: "Hai chỗ dễ hiểu nhầm",
          ds: [
            "Trong cùng một cột, chọn nhiều giá trị là «hoặc» (chỉ cần khớp một). Giữa hai cột là «và».",
            "Nếu người đó khớp quy tắc chỉ nhờ vai trò «Trưởng phòng / GĐ đơn vị» thì máy chỉ xét nơi họ thật sự làm trưởng (xem mục «Tổ chức & người dùng», phần «Làm trưởng ở»), không xét mọi đơn vị họ kiêm nhiệm.",
          ],
        },
        { bam: ["Mở Cài đặt → tab «👥 Người dùng & phân quyền» → mục «Phân quyền cài đặt».", "Ở dòng của nhóm cần giao, bấm «+ đơn vị» rồi chọn đơn vị trong danh sách (bấm là thêm ngay); bấm «+ vai trò» và chọn vai trò.", "Muốn gỡ, bấm dấu bỏ cạnh giá trị đã chọn.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Mặc định máy đã khai một dòng: nhóm «Luật kiểm tra» — đơn vị «Phòng Đầu tư và Pháp chế», vai trò «Trưởng phòng / GĐ đơn vị». Nghĩa là trưởng phòng Đầu tư và Pháp chế sửa được luật kiểm tra báo cáo; nhân viên cùng phòng thì không.",
            "Muốn giao thêm nhóm «Luồng báo cáo» cho Phòng Hành chính Tổng hợp: ở dòng «Luồng báo cáo» chọn «+ đơn vị» → Phòng Hành chính Tổng hợp, để trống cột vai trò. Từ đó mọi người trong phòng đó, kể cả nhân viên, sửa được luồng báo cáo — nên cân nhắc, thường nên kèm vai trò «Trưởng phòng / GĐ đơn vị».",
          ],
        },
        { luuY: ["Hai nhóm không giao được: «Phân quyền cài đặt» (chính mục này, bảng không có dòng này) và «Bảo mật báo cáo tài chính» (chỉ quản trị viên). Dòng «Bảo mật báo cáo tài chính» vẫn hiện trong bảng nhưng khai gì cũng không có tác dụng."] },
      ],
    },
    {
      ten: "② Xem kết quả",
      khoi: [
        { doan: ["Sau khi lưu, người được giao thấy thay đổi ngay ở màn Cài đặt của họ."] },
        {
          bang: [
            ["Dấu hiệu", "Nghĩa"],
            ["Cạnh tên mục ở menu trái có hình ổ khóa nhỏ", "Bạn chỉ XEM nhóm này, không sửa được"],
            ["Trong mục có nhãn «chỉ xem», không có nút «Lưu», «Bỏ thay đổi», «Điền mặc định»", "Cùng ý trên; nút không có quyền thì ẩn hẳn"],
            ["Ở đầu trang Cài đặt có nút «Xuất cấu hình» và «Nhập cấu hình»", "Chỉ hiện nếu bạn sửa được ít nhất một nhóm"],
          ],
        },
        {
          viDu: [
            "Trưởng phòng Đầu tư và Pháp chế mở Cài đặt → tab «🧩 Riêng của agent» → «Luật hệ thống»: mục không có ổ khóa, có nút «Lưu». Mở tab «🔔 Cảnh báo & ngưỡng» → «Quy tắc đè, việc thiếu hạn»: có ổ khóa và nhãn «chỉ xem».",
            "Quản trị gỡ dòng «Luật kiểm tra» trong bảng rồi «Lưu»: từ giây đó trưởng phòng này mở «Luật hệ thống» chỉ còn xem.",
          ],
        },
        { luuY: ["Quyền được kiểm lại ở máy chủ mỗi lần lưu, nên một người cố sửa bằng cách khác (không qua màn này) vẫn bị từ chối với câu «Bạn không có quyền sửa nhóm cài đặt …»."] },
      ],
    },
  ],
  viDuLuu: [
    "Bạn thêm vai trò «Trưởng phòng / GĐ đơn vị» vào dòng «Luồng báo cáo» (để trống cột đơn vị) rồi bấm «Lưu». Máy báo «Đã lưu … → phiên bản N. Có hiệu lực ngay.»",
    "Cột «Nhật ký phiên bản» ghi: tên bạn, giờ, ô «Phân quyền từng nhóm» đã đổi. Từ giây đó mọi trưởng phòng, giám đốc đơn vị sửa được luồng báo cáo.",
  ],
  vuong: [
    ["Người được giao vẫn thấy «chỉ xem»", "Họ không khớp CẢ HAI cột (đơn vị và vai trò), hoặc khớp chỉ nhờ vai trò Trưởng nhưng không giữ quyền trưởng ở đơn vị ghi trong bảng. Kiểm tra hồ sơ họ ở mục «Tổ chức & người dùng»."],
    ["Báo «Phân quyền: không có nhóm cài đặt …» hoặc «đơn vị … không tồn tại» / «vai trò … không tồn tại»", "Bảng đang giữ một đơn vị hoặc vai trò đã xóa. Gỡ giá trị đó rồi lưu lại."],
    ["Giao nhóm «Bảo mật báo cáo tài chính» mà không ai sửa được", "Nhóm này chỉ quản trị viên sửa, dòng khai ở đây không có tác dụng."],
    ["Muốn giao quyền sửa chính mục «Phân quyền cài đặt»", "Không giao được. Muốn ai sửa được mọi nhóm kể cả mục này, cấp cho vai trò của họ quyền «Sửa cài đặt hệ thống» ở mục «Vai trò và quyền»."],
    ["Không thấy nút «Lưu»", "Bạn không có quyền «Sửa cài đặt hệ thống» (nhãn «chỉ xem»)."],
  ],
  canCu: "Quy tắc: quản trị viên hoặc quyền «Sửa cài đặt hệ thống» sửa mọi nhóm; ngoài ra theo bảng này (đơn vị VÀ vai trò) · nhóm «Bảo mật báo cáo tài chính» chỉ quản trị viên (chốt 07/10/2026) · trưởng chính / trưởng phụ (chốt 03/10 và 08/10/2026).",
});
