// Hướng dẫn bản 2 (tab) — hộp «Thêm người dùng» / «Sửa người dùng: …» (mở từ mục Tổ chức & người dùng). Viết 20/10/2026. Không dùng AI.
// Căn cứ code: components/quan-tri/BangNguoiDung.tsx (SuaNguoiDung — nhãn, nút, điều kiện hiện) · app/api/quan-tri/nguoi-dung/route.ts, [id]/route.ts, [id]/dat-lai-mat-khau/route.ts
// · packages/sci-identity/src/nguoi-dung.ts (themNguoiDung, suaNguoiDung, datLaiMatKhau, matKhauDau) · lib/phien.ts (Làm trưởng ở) · app/api/quan-tri/_chung.ts (kiểm quyền).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Hộp «Thêm người dùng» và «Sửa người dùng» — hồ sơ một người",
  ai: "Chỉ người quản lý người dùng trong phạm vi của đơn vị đó. Thêm người vào đơn vị nào hoặc chuyển người sang đơn vị nào thì bạn phải quản lý được đơn vị ấy (đơn vị ngoài phạm vi hiện mờ, không chọn được). Ô «Quản trị viên» chỉ hiện với quản trị viên; sửa tài khoản quản trị viên và đặt lại mật khẩu của họ chỉ quản trị viên làm được.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Hộp này là gì",
          doan: [
            "Hồ sơ của MỘT người: email đăng nhập, họ tên, đơn vị, chức vụ, cấp, vai trò, kiêm nhiệm. Hộp mở ở hai chế độ: «Thêm người dùng» (người mới) và «Sửa người dùng: <tên>» (người đã có, thêm các nút «Đặt lại mật khẩu» và «Khóa»).",
            "Hộp mở từ nút «Thêm người vào đây» hoặc «Thêm người», hoặc nút «Sửa» ở dòng người trong bảng của mục «Tổ chức & người dùng».",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: [
            "Đơn vị của người dùng quyết định phạm vi quyền (đơn vị mình, cấp dưới…). Vai trò quyết định họ làm được gì. Kiêm nhiệm và «Làm trưởng ở» quyết định họ có quyền trưởng ở những đâu. Hồ sơ sai là quyền sai, nên các thông tin này gom một chỗ và có nhật ký.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Việc", "Vai trò của hộp"],
            ["Trước", "Có cây đơn vị và bộ vai trò; có thể đã nhập danh sách bằng Excel", "—"],
            ["Hộp này", "Thêm người, gán đơn vị và vai trò, khóa hoặc đặt lại mật khẩu", "Tạo và chỉnh hồ sơ"],
            ["Sau", "Người được thông báo email và mật khẩu lần đầu; đăng nhập; mọi màn kiểm quyền theo hồ sơ này", "Quyền thực tế của họ"],
          ],
        },
        {
          tieuDe: "④ Các ô trong hộp",
          bang: [
            ["Ô / nút", "Để làm gì", "Xem tab"],
            ["«Email (tên đăng nhập)», «Họ tên»", "Danh tính", "① Đăng nhập và họ tên"],
            ["«Đơn vị», «Chức vụ», «Cấp theo chức vụ»", "Người thuộc đâu, tên chức, cấp", "② Đơn vị, chức vụ, cấp"],
            ["«Vai trò» (các ô tích)", "Quyền", "③ Vai trò"],
            ["«Kiêm nhiệm (thuộc thêm đơn vị khác)», «Làm trưởng ở»", "Thuộc nhiều đơn vị", "④ Kiêm nhiệm, làm trưởng ở"],
            ["Nút «Đặt lại mật khẩu», «Khóa», «Mở khóa»; ô «Quản trị viên (luôn có mọi quyền, không phụ thuộc vai trò)»", "Quản lý tài khoản", "⑤ Mật khẩu, khóa, quản trị viên"],
            ["Nút «Hủy» và «Lưu»", "Đóng hoặc ghi", "Mọi tab"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở hộp này"],
            ["Người", "Quản trị hoặc người quản lý đơn vị điền thông tin, chọn vai trò, bấm «Lưu», khóa, đặt lại mật khẩu. Người dùng nhận mật khẩu lần đầu từ quản trị"],
            ["Máy", "Kiểm email hợp lệ và chưa trùng; kiểm đơn vị và vai trò tồn tại; chặn trao vai trò rộng hơn quyền của bạn; tạo mật khẩu lần đầu; ghi nhật ký; tự ghép chức vụ cho đơn vị chức danh; nhắc quản trị khi người chưa gán đơn vị"],
            ["🤖 AI", "— Hộp này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Hộp này không dùng AI: người điền, máy kiểm và ghi. Cùng thông tin luôn ra cùng kết quả."],
        },
      ],
    },
    {
      ten: "① Đăng nhập và họ tên",
      khoi: [
        {
          bang: [
            ["Ô", "Điền gì", "Ghi chú"],
            ["Email (tên đăng nhập)", "Email của người đó, ví dụ ten@scigroup.vn", "Bắt buộc. Máy đổi sang chữ thường. Sửa được cả khi đã có tài khoản: mã tài khoản bên trong giữ nguyên nên việc và lịch sử cũ vẫn của người này; mật khẩu giữ nguyên"],
            ["Họ tên", "Họ và tên đầy đủ", "Bắt buộc"],
            ["Mật khẩu ban đầu (chỉ khi Thêm)", "Có thể để trống", "Trống: mật khẩu lần đầu là chính email. Điền: dùng đúng mật khẩu đó (phải đủ độ dài tối thiểu đặt ở mục «Tài khoản người dùng»)"],
          ],
        },
        { luuY: ["Nút «Lưu» mờ cho đến khi cả «Họ tên» và «Email» đều có chữ."] },
        { bam: ["Ở mục «Tổ chức & người dùng», chọn đơn vị rồi bấm «Thêm người vào đây».", "Gõ «Email (tên đăng nhập)» và «Họ tên».", "Để trống «Mật khẩu ban đầu» (hoặc gõ mật khẩu riêng)."] },
        {
          ketQua: [
            "Sau khi «Lưu», nếu bạn để trống mật khẩu, hộp «Mật khẩu mới» hiện chính mật khẩu lần đầu và chỉ hiện MỘT lần. Bấm «Chép» rồi «Đã ghi lại».",
            "Nếu bạn gõ mật khẩu riêng thì máy không hiện hộp này (bạn đã biết mật khẩu).",
          ],
        },
        {
          viDu: [
            "Thêm nhân viên mới: email nguyenvana@scigroup.vn, họ tên Nguyễn Văn A, để trống mật khẩu. Sau khi lưu, hộp «Mật khẩu mới» hiện mật khẩu của nguyenvana@scigroup.vn (chính là email). Bạn báo cho anh A đăng nhập bằng email và đổi mật khẩu.",
            "Email đã dùng cho người khác (kể cả tài khoản cũ đổi sang email thật): máy báo «Email … đã có tài khoản» và không tạo.",
          ],
        },
      ],
    },
    {
      ten: "② Đơn vị, chức vụ, cấp",
      khoi: [
        {
          bang: [
            ["Ô", "Cách dùng", "Ghi chú"],
            ["Đơn vị", "Chọn trong danh sách xổ ra. Mỗi dòng ghi tên và «(cấp N)»; đơn vị con thụt vào. Giá trị «— Chưa gán đơn vị —» để trống", "Đơn vị ngoài phạm vi quản lý của bạn hiện mờ, không chọn được. Chưa gán đơn vị: người đó đăng nhập được nhưng chỉ có quyền tối thiểu; quản trị được nhắc"],
            ["Chức vụ", "Gõ tự do: Nhân viên, Phó phòng, Trưởng phòng…", "Nếu đơn vị chọn là loại «Chức danh lãnh đạo» thì ô xám và máy tự điền chức danh của đơn vị (sửa chức danh ở «Sửa đơn vị»)"],
            ["Cấp theo chức vụ", "Số nguyên 0 đến 99. Để trống = lấy cấp của đơn vị", "Ví dụ Chủ tịch HĐQT cấp 0 (cao hơn Ban Tổng giám đốc cấp 1). Cấp nhỏ là cấp cao và ảnh hưởng quy tắc đè khi hai báo cáo trùng một việc"],
          ],
        },
        {
          viDu: [
            "Chuyển chị B từ Phòng Hành chính Tổng hợp sang Phòng Cơ điện: mở «Sửa» ở dòng chị B, ô «Đơn vị» chọn Phòng Cơ điện. Bạn phải quản lý được CẢ hai đơn vị (đơn vị cũ để sửa, đơn vị mới để nhận). Bấm «Lưu»: máy báo «Đã lưu …».",
            "Người thuộc đơn vị chức danh «Phó Tổng Giám đốc»: ô «Chức vụ» xám, hiện chữ «Phó Tổng Giám đốc» do máy điền.",
          ],
        },
        { luuY: ["Đừng lẫn hai loại cấp: cấp của đơn vị (đổi ở «Sửa đơn vị», chỉ người quản lý toàn bộ đổi được) và cấp theo chức vụ của từng người (đổi ngay trong hộp này)."] },
      ],
    },
    {
      ten: "③ Vai trò",
      khoi: [
        { doan: ["Phần «Vai trò» là danh sách các ô tích, mỗi vai trò kèm mô tả nhỏ bên dưới. Người có nhiều vai trò lấy phạm vi rộng nhất ở từng quyền. Xem mục «Vai trò và quyền» để biết mỗi vai trò làm được gì."] },
        {
          bang: [
            ["Tình huống", "Kết quả"],
            ["Thêm người, không tích vai trò nào", "Người mới nhận các vai trò gán sẵn (mặc định chỉ «Nhân viên»). Hộp ghi nhắc «(trống = vai trò mặc định trong Cài đặt)»"],
            ["Sửa người, đổi tích", "Danh sách vai trò mới THAY toàn bộ vai trò cũ"],
            ["Tích vai trò rộng hơn quyền của chính bạn", "Máy từ chối: «Bạn không trao được vai trò … vì nó có quyền rộng hơn quyền của bạn». Chỉ kiểm với vai trò MỚI thêm cho người đó"],
          ],
        },
        {
          viDu: [
            "Chị B vừa được bổ nhiệm làm trưởng Phòng Cơ điện: mở «Sửa» ở dòng chị, tích thêm «Trưởng phòng / GĐ đơn vị» (giữ «Nhân viên» nếu muốn), bấm «Lưu». Ở mục «Tổ chức & người dùng» dòng Phòng Cơ điện hiện «★ Trưởng: chị B».",
            "Người phụ trách sổ văn bản đến: tích thêm «Văn thư». Người này có thêm quyền vào sổ văn bản đến, vẫn giữ quyền nhân viên.",
          ],
        },
        { luuY: ["Quyền mới áp dụng từ thao tác kế tiếp của người đó; không cần họ đăng nhập lại (menu có thể cần tải lại trang)."] },
      ],
    },
    {
      ten: "④ Kiêm nhiệm, làm trưởng ở",
      khoi: [
        {
          tieuDe: "Kiêm nhiệm",
          doan: ["Người thuộc một đơn vị chính (ô «Đơn vị») và có thể kiêm nhiệm thêm ở đơn vị khác. Phần «Kiêm nhiệm (thuộc thêm đơn vị khác)» có nút «Thêm» để thêm một dòng: chọn đơn vị (không gồm đơn vị chính) và gõ «Chức vụ kiêm nhiệm». Biểu tượng thùng rác cuối dòng («Bỏ») gỡ dòng đó. Không kiêm nhiệm thì ghi «Không kiêm nhiệm.»"],
        },
        {
          tieuDe: "Làm trưởng ở",
          doan: [
            "Phần «Làm trưởng ở» chỉ hiện khi bạn SỬA một người (không hiện lúc Thêm), người đó mang vai trò «Trưởng phòng / GĐ đơn vị» và thuộc từ 2 đơn vị trở lên (chính + kiêm nhiệm). Mỗi đơn vị một ô tích.",
            "Tích đơn vị nào thì vai trò trưởng chỉ áp ở đơn vị đó. Không tích ô nào: người đó làm trưởng ở mọi đơn vị của họ.",
          ],
        },
        {
          viDu: [
            "Giả sử anh C có đơn vị chính là Phòng Kinh tế và Vận hành (làm trưởng phòng) và kiêm nhiệm ở Phòng Cơ điện với chức vụ «Cố vấn kỹ thuật». Nếu anh có vai trò trưởng mà bạn không đánh dấu gì ở «Làm trưởng ở», anh sẽ có quyền trưởng cả ở Phòng Cơ điện, nơi anh chỉ là cố vấn. Hãy tích chỉ «Phòng Kinh tế và Vận hành».",
            "Trong bảng người của Phòng Cơ điện dòng anh C ghi «kiêm Cố vấn kỹ thuật» và «biên chế ở Phòng Kinh tế và Vận hành».",
          ],
        },
        { luuY: ["Bạn chỉ gán kiêm nhiệm ở đơn vị mà bạn quản lý được; đơn vị ngoài phạm vi hiện mờ. Máy chỉ giữ «Làm trưởng ở» cho các đơn vị người đó đang thuộc."] },
      ],
    },
    {
      ten: "⑤ Mật khẩu, khóa, quản trị viên",
      khoi: [
        { doan: ["Ba nút nằm bên trái dưới đáy hộp, chỉ có khi SỬA người đã có: «Đặt lại mật khẩu», «Khóa» hoặc «Mở khóa». Ô «Quản trị viên (luôn có mọi quyền, không phụ thuộc vai trò)» nằm cuối phần thân hộp."] },
        {
          bang: [
            ["Việc", "Cách làm", "Điều cần biết"],
            ["Đặt lại mật khẩu", "Bấm «Đặt lại mật khẩu», xác nhận câu «Đặt lại mật khẩu cho …? Mật khẩu cũ hết dùng ngay.»", "Mật khẩu mới là chính email của người đó, hiện một lần trong hộp «Mật khẩu mới». Người đó nên đổi ngay sau khi đăng nhập"],
            ["Khóa tài khoản", "Bấm «Khóa», xác nhận «Khóa tài khoản …? Người này sẽ không đăng nhập được.»", "Không xóa gì; dữ liệu và việc cũ vẫn còn. Khóa rồi chỉ thấy khi tích «Tài khoản bị khóa». Nút này không hiện ở tài khoản của chính bạn"],
            ["Mở khóa", "Bấm «Mở khóa» (chỉ hiện khi tài khoản đang khóa)", "Người đó đăng nhập lại được ngay"],
            ["Quản trị viên", "Tích ô «Quản trị viên (luôn có mọi quyền, không phụ thuộc vai trò)»", "Chỉ quản trị viên thấy ô này. Ô không bấm được ở tài khoản của chính bạn"],
          ],
        },
        {
          viDu: [
            "Giả sử chị B quên mật khẩu: mở «Sửa» ở dòng chị, bấm «Đặt lại mật khẩu», xác nhận. Hộp «Mật khẩu mới» hiện email của chị (cũng là mật khẩu mới). Bấm «Chép», gửi cho chị rồi bấm «Đã ghi lại».",
            "Anh A nghỉ việc: mở «Sửa» ở dòng anh, bấm «Khóa». Anh không đăng nhập được nhưng việc và lịch sử anh từng làm vẫn nguyên. Việc anh đang làm dở cần được đơn vị xử lý theo quy trình giao việc thông thường.",
          ],
        },
        {
          luuY: [
            "Quản trị viên không tự khóa được chính mình (máy báo «Không tự khóa tài khoản của chính mình được»).",
            "Hộp đổi mật khẩu của chính người dùng (do họ tự đổi sau khi vào) không thuộc hộp này.",
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
            ["Nút «Lưu» mờ", "Thiếu «Họ tên» hoặc «Email»."],
            ["Báo «Email … đã có tài khoản»", "Email đã dùng. Tìm người đó (có thể đã bị khóa: tích «Tài khoản bị khóa») thay vì tạo mới."],
            ["Đơn vị trong danh sách bị mờ", "Ngoài phạm vi quản lý của bạn. Nhờ người quản lý toàn bộ hoặc người quản lý đơn vị đó."],
            ["Báo «ngoài phạm vi quản lý của bạn»", "Bạn đang đổi một thông tin ở đơn vị ngoài phạm vi (đơn vị mới, đơn vị kiêm nhiệm). Chọn đơn vị trong phạm vi."],
            ["Không tích được vai trò", "Báo vai trò rộng hơn quyền bạn đang có. Nhờ người có quyền rộng hơn gán."],
            ["Không thấy «Làm trưởng ở»", "Chỉ hiện khi sửa người có vai trò trưởng và thuộc từ 2 đơn vị."],
            ["Không thấy nút «Khóa»", "Đó là tài khoản của chính bạn."],
            ["Người mới đăng nhập không được", "Mật khẩu lần đầu là email viết thường, không dấu cách. Nếu vẫn lỗi, bấm «Đặt lại mật khẩu»."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Quản lý người dùng, đơn vị, vai trò» theo phạm vi · mật khẩu lần đầu = email (chốt 02/10/2026) · «Làm trưởng ở» chốt 10/10/2026 · đổi email giữ mã tài khoản (chốt 29/09/2026) · không trao quyền rộng hơn quyền mình · luật 17 riêng 3004 (nút không có quyền thì ẩn).",
};
