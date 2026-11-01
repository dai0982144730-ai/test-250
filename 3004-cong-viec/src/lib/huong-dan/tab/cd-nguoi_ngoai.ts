// Hướng dẫn bản 2 (tab) — Cài đặt › Người dùng & phân quyền › Người ngoài, chưa gán đơn vị. Viết 20/10/2026. Nhãn chép từ lib/cau-hinh/bieu-mau.ts (BIEU_MAU.nguoi_ngoai).
// Đối chiếu code 20/10: cả 4 ô đều có chỗ đọc — chua_gan_don_vi (api/kiem-tra, api/gui/noi-nhan, api/gui/tep, KhungSoanGui), ca_nhan_duoc_gui_tu_do (lib/kiem-tra/kiem-tra.ts),
// cap_ben_ngoai (lib/gui/dich-vu.ts, lib/so-cai/dich-vu.ts, ap-dung-lai.ts, quy-tac-de.ts), cap_thap_nhat (lib/phien.ts).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Người ngoài, chưa gán đơn vị",
  tab: "👥 Người dùng & phân quyền",
  ai: "Người có quyền «Sửa cài đặt hệ thống» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép. Người không có quyền sửa thấy nhãn «chỉ xem» và không thấy nút «Lưu».",
  laGi: [
    "Có hai nhóm người không nằm gọn trong sơ đồ các đơn vị của công ty: người mới có tài khoản nhưng chưa được gán đơn vị, và những nguồn bên ngoài công ty (cá nhân, đối tác). Mục này quy định hệ thống đối xử với họ ra sao: có cho gửi báo cáo không, tính họ ở cấp nào.",
    "Bốn ô: «Người chưa gán đơn vị», «Cá nhân ngoài 9 đơn vị được gửi tự do», «Cấp của bên ngoài công ty», «Cấp thấp nhất trong công ty».",
  ],
  vaoSao: [
    "Cấp quyết định ai thắng khi hai báo cáo trùng một việc (cấp nhỏ là cấp cao). Nếu không quy định cấp cho người ngoài, báo cáo của họ có thể đè nhầm việc của đơn vị trong công ty.",
    "Người chưa gán đơn vị là tình huống rất hay gặp lúc mới thêm người. Quản trị cần quyết định trong lúc chờ gán đơn vị thì họ bị chặn hay được gửi tạm.",
  ],
  vongLam: [
    "Bước trước: quản trị thêm người hoặc nhập Excel mà chưa chọn đơn vị (hoặc văn thư nhập thay người ngoài công ty).",
    "Mục này: chọn cách đối xử với người chưa gán đơn vị và mức cấp của người ngoài.",
    "Bước sau: khi họ mở màn Báo cáo, khi máy kiểm tra tệp, khi máy so hai bản của cùng một việc để chọn bản thắng — đều đọc các ô này.",
  ],
  cacKhoi: [
    ["Người chưa gán đơn vị", "Chặn gửi hay cho gửi với cấp thấp nhất.", "① Chưa gán đơn vị"],
    ["Cá nhân ngoài 9 đơn vị được gửi tự do", "Gửi tệp không theo mẫu có cần mẫu hay không.", "② Gửi tự do"],
    ["Cấp của bên ngoài công ty", "Số cấp coi là người ngoài (mặc định 9).", "③ Hai ô cấp"],
    ["Cấp thấp nhất trong công ty", "Cấp tính cho người chưa gán đơn vị (mặc định 3).", "③ Hai ô cấp"],
  ],
  nguoi: "Quản trị chọn cách đối xử và nhập hai số cấp, bấm «Lưu». Quản trị gán đơn vị cho người mới để họ thoát nhóm này.",
  may: "Chặn hoặc cho phép gửi theo lựa chọn; tính cấp cho người chưa gán đơn vị; không cho bản của người ngoài đè lên việc trong công ty; nhận ra tệp không theo mẫu từ cá nhân để cho gửi tự do.",
  aiLam: "— Mục này không dùng AI. Mọi quy tắc ở đây do máy áp dụng theo số đã đặt.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Chưa gán đơn vị",
      khoi: [
        { doan: ["Người chưa gán đơn vị đăng nhập được nhưng chỉ có quyền tối thiểu. Ô «Người chưa gán đơn vị» quyết định họ có gửi được báo cáo trong lúc chờ không."] },
        {
          bang: [
            ["Lựa chọn", "Người chưa gán đơn vị thấy gì"],
            ["Chặn gửi đến khi được gán đơn vị (mặc định)", "Họ không gửi được tài liệu. Muốn gửi, phải nhờ quản trị gán đơn vị trước."],
            ["Cho gửi với cấp thấp nhất", "Họ gửi thẳng được một tệp, chọn nơi nhận; tài liệu vào mục Đến của nơi nhận đầu tiên. Cấp của họ tính theo ô «Cấp thấp nhất trong công ty»."],
          ],
        },
        { bam: ["Mở Cài đặt → tab «👥 Người dùng & phân quyền» → mục «Người ngoài, chưa gán đơn vị».", "Ở ô «Người chưa gán đơn vị» bấm lựa chọn mong muốn.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Quản trị nhập Excel 20 nhân viên mới nhưng 3 người chưa rõ phòng nên để trống đơn vị. Với lựa chọn mặc định, ba người đó mở màn Báo cáo sẽ bị chặn; quản trị gán đơn vị cho họ thì gửi được ngay.",
            "Đổi sang «Cho gửi với cấp thấp nhất»: ba người đó gửi được tạm một tệp cho nơi nhận mà họ chọn, và quản trị vẫn nhận tin nhắc phải gán đơn vị.",
          ],
        },
        { luuY: ["Lựa chọn «Cho gửi…» chỉ mở đường gửi tạm; không cấp thêm quyền nào khác. Cách xử lý đúng vẫn là gán đơn vị cho họ ở mục «Tổ chức & người dùng»."] },
      ],
    },
    {
      ten: "② Gửi tự do",
      khoi: [
        { doan: ["Bình thường mọi báo cáo phải làm trên mẫu Word của công ty để máy biết đó là báo cáo gì và tách việc vào sổ cái. Công tắc «Cá nhân ngoài 9 đơn vị được gửi tự do» cho phép một ngoại lệ: tệp không theo mẫu do cá nhân gửi vẫn được nhận, nhưng KHÔNG sinh việc vào sổ cái."] },
        {
          tieuDe: "Áp dụng khi nào",
          ds: [
            "Người gửi thuộc đơn vị loại «Nhóm cá nhân» hoặc «Đơn vị riêng».",
            "Tệp không theo bất kỳ mẫu báo cáo nào của công ty.",
            "Lúc đó máy ghi gợi ý «Tài liệu không theo mẫu: gửi tự do, không sinh việc vào sổ cái. Tự chọn nơi nhận.»",
          ],
        },
        {
          viDu: [
            "Một cố vấn kỹ thuật thuộc nhóm cá nhân gửi bản thuyết minh PDF cho Phòng Kinh tế và Vận hành. Công tắc bật: gửi được, không có việc nào vào sổ cái.",
            "Công tắc tắt: cùng tệp đó bị báo là không theo mẫu, người gửi phải làm lại trên mẫu Word.",
          ],
        },
        { luuY: ["Nhãn ô nói «9 đơn vị» là cách gọi cũ; hiện công ty có nhiều đơn vị hơn. Ô này chỉ xét theo loại đơn vị của người gửi, không theo số lượng."] },
      ],
    },
    {
      ten: "③ Hai ô cấp",
      khoi: [
        { doan: ["Trong hệ thống, cấp là một con số: số nhỏ là cấp cao. Cấp 1 là Ban Tổng giám đốc, cấp 2 là phòng, cấp 3 là đơn vị, cấp 9 là bên ngoài. Cấp dùng để quyết định ai thắng khi hai báo cáo trùng một việc."] },
        {
          bang: [
            ["Ô", "Mặc định", "Máy dùng để làm gì"],
            ["Cấp của bên ngoài công ty", "9", "Tài liệu do người ngoài công ty gửi (văn thư nhập thay) mang cấp này. Bản có cấp từ mức này trở lên KHÔNG BAO GIỜ đè được việc đã có trong công ty."],
            ["Cấp thấp nhất trong công ty", "3", "Cấp tính cho người chưa gán đơn vị và chưa được đặt cấp theo chức vụ."],
          ],
        },
        { bam: ["Nhập số nguyên từ 0 đến 99 vào từng ô.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Giả sử đặt «Cấp của bên ngoài công ty» là 9. Một nguồn bên ngoài cũ còn trong sổ ghi việc «Lắp trụ turbine số 5» hạn 05/11/2026, còn Ban điều hành tổng thầu (cấp 4) ghi hạn 30/10/2026: bản bên ngoài không đè được bản trong công ty.",
            "Giả sử một người mới chưa gán đơn vị, chưa có cấp theo chức vụ, đang mang cấp 3 theo ô «Cấp thấp nhất trong công ty». Đặt ô đó là 5 thì từ đó họ mang cấp 5.",
          ],
        },
        { luuY: ["Máy từ chối lưu nếu cấp không phải số nguyên («Cấp phải là số nguyên»). Từ 28/09 văn bản đến không còn sinh việc, nên ô «Cấp của bên ngoài công ty» chủ yếu còn tác dụng với nguồn bên ngoài cũ còn trong sổ và khi quy tắc đè tính lại."] },
      ],
    },
  ],
  viDuLuu: [
    "Bạn đổi «Người chưa gán đơn vị» từ «Chặn gửi đến khi được gán đơn vị (mặc định)» sang «Cho gửi với cấp thấp nhất» rồi bấm «Lưu». Máy báo «Đã lưu … → phiên bản N. Có hiệu lực ngay.»",
    "Cột «Nhật ký phiên bản» ghi: tên bạn, giờ, ô «Người chưa gán đơn vị» từ lựa chọn chặn gửi sang lựa chọn cho gửi với cấp thấp nhất. Ba người chưa gán đơn vị lúc nãy bị chặn, nay mở lại màn Báo cáo là gửi được.",
  ],
  vuong: [
    ["Người mới báo không gửi được báo cáo", "Họ chưa gán đơn vị và ô «Người chưa gán đơn vị» đang ở «Chặn gửi…». Gán đơn vị ở mục «Tổ chức & người dùng», hoặc đổi sang «Cho gửi với cấp thấp nhất»."],
    ["Tệp không theo mẫu bị chặn dù đã bật gửi tự do", "Chỉ cá nhân thuộc đơn vị loại «Nhóm cá nhân» hoặc «Đơn vị riêng» mới được. Nhân viên các phòng vẫn phải dùng mẫu Word."],
    ["Báo «Cấp phải là số nguyên»", "Ô cấp đang để trống hoặc có số lẻ. Nhập số nguyên 0 đến 99."],
    ["Đặt cấp bên ngoài thấp (vd 3) và thấy việc bất thường", "Mọi nguồn có cấp từ mức đó trở lên bị coi là bên ngoài và không đè được việc trong công ty. Nên giữ 9."],
    ["Không thấy nút «Lưu»", "Bạn không có quyền sửa nhóm này (nhãn «chỉ xem»). Xem mục «Phân quyền cài đặt»."],
  ],
  canCu: "Nhãn ô chép từ biểu mẫu cài đặt Người ngoài · quy tắc đè (cấp nhỏ là cấp cao, bản bên ngoài không đè việc trong công ty) · chốt 28/09/2026 văn bản đến không sinh việc.",
});
