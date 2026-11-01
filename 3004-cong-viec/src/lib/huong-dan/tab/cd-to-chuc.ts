// Hướng dẫn bản 2 (tab) — Cài đặt › Người dùng & phân quyền › Tổ chức & người dùng. Viết 20/10/2026.
// Căn cứ code: components/quan-tri/ToChucNguoiDung.tsx (cây, đơn vị đang chọn, trưởng chính, ngoài SCI, chức năng nhiệm vụ, bảng người) · app/api/quan-tri/don-vi/*, nguoi-dung/* (quyền thật)
// · lib/to-chuc.ts (kiemUyQuyen) · lib/cay-viec/soan-giao.ts + app/api/cay-viec/soan-giao/route.ts:119 (AI đọc «Chức năng nhiệm vụ») · lib/so-cai/lanh-dao-phoi-hop.ts:119,244 (AI gắn lãnh đạo phối hợp).
// ⏸ Ô «Ngoài SCI» hiện cho mọi người sửa được đơn vị nhưng máy chủ chỉ cho người quản lý toàn bộ → người ở phạm vi hẹp bấm sẽ gặp lỗi 403.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Tổ chức và người dùng — cây đơn vị, ai thuộc đơn vị nào, ai là trưởng",
  ai: "Mở màn: người có quyền «Quản lý người dùng, đơn vị, vai trò» ở phạm vi nào đó (bộ vai trò cài sẵn chỉ có Quản trị viên); không có quyền thì mục không hiện trong menu trái. Sửa đơn vị, thêm hoặc sửa người: chỉ trong đơn vị thuộc phạm vi quản lý của bạn — ngoài phạm vi thì nút «Sửa», «Sửa đơn vị», «Đơn vị con» và nút ngừng hoạt động không hiện. Thêm đơn vị gốc, đổi cấp đơn vị, nhập Excel: chỉ người quản lý ở phạm vi Toàn bộ. Quản trị viên chỉ do quản trị viên sửa.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Một màn gom hai thứ trước đây ở hai chỗ: cây các đơn vị của công ty (Ban Tổng giám đốc, các phòng, các nhà máy, ban quản lý dự án, ban điều hành…) và danh sách người trong từng đơn vị. Bên trái là cây và ô tìm người; bên phải là đơn vị đang chọn: thông tin, trưởng, chức năng nhiệm vụ, và danh sách người của đơn vị (kể cả người kiêm nhiệm).",
            "Mỗi thông tin chỉ khai MỘT nơi: tên đơn vị khai ở đây, ai thuộc đơn vị nào khai ở đây, ai là trưởng cũng suy ra từ đây.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: [
            "Cả hệ thống đọc cây này: giao việc cho ai, sơ đồ tổ chức vẽ ra sao, báo cáo của đơn vị nào gửi cho ai, ai thấy tài liệu của đơn vị nào, ai là trưởng nhận chuông. Gán sai người vào sai đơn vị là gán sai quyền.",
            "Đơn vị có hai trưởng mà chưa chọn ai đứng tên, hoặc không có trưởng, sẽ làm việc giao tự động không biết ghi tên ai. Màn này cảnh báo ngay trên cây.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn này"],
            ["Trước", "Quản trị khai vai trò (mục «Vai trò và quyền») và độ dài mật khẩu, vai trò gán sẵn (mục «Tài khoản người dùng»)", "Có vai trò để gán cho người"],
            ["Màn này", "Lập cây đơn vị · thêm, sửa, khóa người · gán người vào đơn vị · chọn trưởng chính · ghi chức năng nhiệm vụ", "Nguồn gốc của cây tổ chức"],
            ["Sau", "Sơ đồ tổ chức, giao việc, gửi báo cáo, thư mục tài liệu, chuông, mọi nơi kiểm quyền", "Đọc cây và hồ sơ người từ đây"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Đầu khối: «Tổ chức & người dùng», «N đơn vị · M người · K chưa gán đơn vị»; ô tích «Đơn vị đã ngừng», «Tài khoản bị khóa»; nút «Đơn vị gốc»", "Tóm tắt và bộ lọc", "① Cây đơn vị và tìm người"],
            ["Ô «Tìm người: tên, email, chức vụ…» và cây đơn vị (cột trái)", "Tìm người, chọn đơn vị", "① Cây đơn vị và tìm người"],
            ["Đầu cột phải: tên đơn vị, nút «Sửa đơn vị», «Đơn vị con», nút ngừng hoặc mở lại", "Thông tin và thao tác với đơn vị", "② Đơn vị đang chọn"],
            ["Dòng trưởng; ô «Trưởng chính:»", "Biết ai là trưởng, chọn trưởng chính", "③ Trưởng chính, trưởng phụ"],
            ["Ô tích «Ngoài SCI (công ty SCI có cổ phần, không trực thuộc)»", "Đánh dấu đơn vị không trực thuộc SCI", "④ Ngoài SCI"],
            ["Khối «Chức năng nhiệm vụ»", "Ghi đơn vị làm việc gì", "⑤ Chức năng nhiệm vụ"],
            ["Bảng người: «Người», «Chức vụ», «Vai trò»; nút «Thêm người vào đây», «Sửa»", "Danh sách người của đơn vị", "⑥ Người trong đơn vị"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở màn này"],
            ["Người", "Quản trị hoặc người quản lý đơn vị: lập cây, thêm sửa khóa người, chọn trưởng chính, ghi chức năng nhiệm vụ"],
            ["Máy", "Xếp cây theo cấp và thứ tự; tính trưởng từ vai trò «Trưởng phòng / GĐ đơn vị»; cảnh báo «N trưởng» hoặc «chưa có trưởng»; tự ghép tên đơn vị chức danh; kiểm quyền từng nút; ghi nhật ký mọi thay đổi"],
            ["🤖 AI", "🤖 Không làm gì trên màn này. Nhưng ở màn Cây việc, AI ĐỌC khối «Chức năng nhiệm vụ» của từng đơn vị khi soạn gợi ý giao việc (xem tab ⑤)"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người ghi «Chức năng nhiệm vụ» của đơn vị ở màn này (nhiều dòng, mỗi nhóm nhiệm vụ một dòng, ghi cả nguồn như số nghị quyết, ngày).",
            "🤖 Ở màn Cây việc, khi người nhờ AI gợi ý ai nhận một việc trên đường găng chưa có người nhận, AI đọc ô này cùng phân công lãnh đạo và lịch sử ai thường làm việc tương tự, rồi đề xuất người hoặc đơn vị.",
            "Máy kiểm lại mọi mã người, mã đơn vị AI đề xuất có thật trong danh sách; AI bịa thì bỏ.",
            "Người bấm «Giao việc» thì việc mới được ghi; AI không tự giao.",
          ],
        },
        {
          tieuDe: "Thứ tự làm gợi ý",
          bam: [
            "Lập đơn vị (hoặc kiểm cây có đủ không).",
            "Thêm người vào đơn vị, gán vai trò, chọn kiêm nhiệm nếu có.",
            "Nhìn cây: chỗ nào có chữ vàng «⚠ …» thì xử lý (chọn trưởng chính, gán trưởng).",
            "Ghi «Chức năng nhiệm vụ» cho đơn vị để AI gợi ý giao việc sát hơn.",
          ],
        },
      ],
    },
    {
      ten: "① Cây đơn vị và tìm người",
      khoi: [
        { doan: ["Cột trái là ô tìm người và cây đơn vị. Cây xếp đơn vị con thụt vào dưới đơn vị cha, theo cấp và thứ tự hiển thị."] },
        {
          tieuDe: "Đọc mỗi dòng của cây",
          bang: [
            ["Phần", "Nghĩa"],
            ["Tên đơn vị", "Bấm để chọn; cột phải hiện thông tin và người của đơn vị đó"],
            ["Số ở cuối dòng", "Số người của đơn vị (tính cả người kiêm nhiệm; người bị khóa chỉ được tính khi tích «Tài khoản bị khóa»)"],
            ["Chữ vàng «⚠ N trưởng»", "Đơn vị loại Phòng hoặc Đơn vị đang có từ 2 người cùng vai trò trưởng mà chưa chọn trưởng chính"],
            ["Chữ vàng «⚠ chưa có trưởng»", "Đơn vị loại Phòng hoặc Đơn vị đã có người nhưng chưa ai mang vai trò «Trưởng phòng / GĐ đơn vị»"],
            ["Dòng mờ", "Đơn vị đã ngừng hoạt động (chỉ hiện khi tích «Đơn vị đã ngừng»)"],
            ["Dòng vàng «Chưa gán đơn vị» ở cuối (kèm số)", "Những người có tài khoản nhưng chưa thuộc đơn vị nào"],
          ],
        },
        {
          tieuDe: "Tìm người",
          doan: ["Gõ vào ô «Tìm người: tên, email, chức vụ…». Cây được thay bằng danh sách kết quả (tối đa 30 người), mỗi dòng ghi tên và «đơn vị · chức vụ». Bấm một người: máy mở đơn vị của người đó và tô nền dòng người đó trong bảng bên phải."],
        },
        {
          tieuDe: "Hai bộ lọc ở đầu khối",
          ds: [
            "«Đơn vị đã ngừng»: hiện thêm đơn vị đã ngừng hoạt động.",
            "«Tài khoản bị khóa»: hiện thêm người đã bị khóa (chữ mờ, nhãn «ĐÃ KHÓA»).",
          ],
        },
        {
          viDu: [
            "Giả sử bạn cần tìm chị Trần Thị B nhưng không nhớ chị ở phòng nào. Gõ «Trần Thị» vào ô tìm: kết quả hiện dòng «Trần Thị B · Phòng Kinh tế và Vận hành · Nhân viên». Bấm vào đó, cột phải mở Phòng Kinh tế và Vận hành, dòng chị B được tô nền.",
            "Trong cây, dòng «Phòng Hành chính Tổng hợp» có chữ vàng «⚠ chưa có trưởng»: nghĩa là phòng đã có người nhưng chưa ai mang vai trò trưởng; bạn sang tab ③ xử lý.",
          ],
        },
        { luuY: ["Nút «Đơn vị gốc» ở đầu khối chỉ hiện với người quản lý ở phạm vi Toàn bộ. Muốn thêm đơn vị con thì chọn đơn vị cha rồi bấm «Đơn vị con» (xem tab ②)."] },
      ],
    },
    {
      ten: "② Đơn vị đang chọn",
      khoi: [
        {
          tieuDe: "Đầu cột phải",
          bang: [
            ["Phần", "Nghĩa"],
            ["Tên đơn vị (và chữ đỏ «NGỪNG»)", "Tên đầy đủ"],
            ["Dòng nhỏ bên dưới", "Tên ngắn · mã · «cấp N» · loại đơn vị · «mẫu Form N» nếu có mẫu báo cáo"],
            ["Nút «Sửa đơn vị»", "Mở hộp sửa (tên, cấp, đơn vị cha, loại, mẫu báo cáo, thứ tự). Hộp có hướng dẫn riêng"],
            ["Nút «Đơn vị con»", "Thêm đơn vị con dưới đơn vị này (chỉ khi đơn vị đang hoạt động)"],
            ["Nút tròn ngừng (rê chuột hiện «Ngừng hoạt động») hoặc mở lại («Mở lại»)", "Ngừng hoặc mở lại đơn vị"],
          ],
        },
        {
          tieuDe: "Ngừng hoạt động nghĩa là gì",
          doan: ["Đơn vị không bị xóa. Lịch sử và thư mục cũ vẫn trỏ tới nó. Máy hỏi xác nhận «Ngừng hoạt động …? Đơn vị không bị xóa: lịch sử và thư mục cũ vẫn giữ nguyên.» Máy từ chối nếu đơn vị còn đơn vị con đang hoạt động hoặc còn người đang hoạt động thuộc đơn vị: phải ngừng hoặc chuyển họ trước."],
        },
        {
          bam: [
            "Bấm một đơn vị ở cây bên trái.",
            "Muốn sửa tên, cấp… bấm «Sửa đơn vị».",
            "Muốn thêm đơn vị con bấm «Đơn vị con».",
            "Muốn ngừng đơn vị: chuyển hết người đi rồi bấm nút ngừng, xác nhận.",
          ],
        },
        {
          viDu: [
            "Phòng Kinh tế và Vận hành có nhà máy con «Nhà máy thủy điện Ca Nan 1». Nhà máy không còn hoạt động: chuyển nhân viên sang nhà máy khác, bấm nút ngừng ở dòng nhà máy → xác nhận. Cây hiện mờ khi tích «Đơn vị đã ngừng», lịch sử cũ vẫn nguyên.",
            "Nếu bấm ngừng Phòng Kinh tế và Vận hành khi nhà máy con còn hoạt động, máy báo còn bao nhiêu đơn vị con đang hoạt động, bạn phải ngừng hoặc chuyển chúng trước.",
          ],
        },
        { luuY: ["Đơn vị loại «Chức danh lãnh đạo» (từng chức danh trong Ban Tổng giám đốc) hiện «Người giữ chức danh: …». Tên đơn vị loại này do máy tự ghép từ chức danh và tên người giữ; muốn đổi chức danh, bấm «Sửa đơn vị»."] },
      ],
    },
    {
      ten: "③ Trưởng chính, trưởng phụ",
      khoi: [
        { doan: ["Máy KHÔNG có ô «chọn trưởng» riêng. Trưởng của một đơn vị là người đang hoạt động, thuộc đơn vị đó (biên chế hoặc kiêm nhiệm) và mang vai trò «Trưởng phòng / GĐ đơn vị». Bạn đổi trưởng bằng cách gán hoặc gỡ vai trò đó ở hộp «Sửa người dùng»."] },
        {
          tieuDe: "Dòng trưởng dưới tên đơn vị",
          bang: [
            ["Dòng hiện", "Nghĩa"],
            ["★ Trưởng: <tên>", "Đơn vị có đúng một trưởng"],
            ["⚠ N người cùng vai trò trưởng: … — chọn Trưởng chính ở ô dưới để máy biết ai là người giao việc", "Từ 2 người trở lên, chưa chọn trưởng chính"],
            ["⚠ Chưa có trưởng (chưa ai có vai trò «Trưởng phòng / GĐ đơn vị»)", "Chưa ai mang vai trò trưởng"],
            ["★ Trưởng chính: <tên> — … · trưởng phụ: <tên>", "Đã chọn trưởng chính; những trưởng còn lại là trưởng phụ"],
          ],
        },
        {
          tieuDe: "Trưởng chính và trưởng phụ khác nhau ở đâu",
          bang: [
            ["", "Trưởng chính", "Trưởng phụ"],
            ["Quyền trưởng (giao việc cho nhân viên, chuyển tiếp việc của phòng, Xong việc · Gia hạn · Phối hợp, xem như trưởng)", "Có", "Có, đủ như trưởng chính"],
            ["Nhận chuông như trưởng", "Có", "Có"],
            ["Đứng tên người giao khi máy tự giao việc", "Có", "Không"],
            ["Là người mặc định nhận việc giao cho cả phòng", "Có", "Không"],
            ["Tên hiện ở Thư mục", "Có", "Không"],
          ],
        },
        {
          tieuDe: "Chọn trưởng chính",
          bam: [
            "Chọn đơn vị loại Phòng hoặc Đơn vị đang có từ 2 người trưởng.",
            "Dưới dòng cảnh báo hiện ô «Trưởng chính:». Bấm ô, chọn một người trong danh sách (mỗi dòng có tên và chức vụ).",
            "Chọn xong là lưu ngay, không có nút xác nhận. Máy báo «Đã chọn … làm trưởng chính …».",
            "Muốn bỏ chọn, chọn lại «— Chưa chọn —»; máy báo «Đã bỏ chọn trưởng chính …».",
          ],
        },
        {
          ketQua: [
            "Chữ vàng «⚠ N trưởng» ở cây biến mất ngay vì máy đã biết ai đứng tên giao việc.",
            "Người được chọn có nhãn «TRƯỞNG CHÍNH» trong bảng người. Người còn lại vẫn là trưởng phụ.",
          ],
        },
        {
          viDu: [
            "Giả sử Phòng Kinh tế và Vận hành có hai người cùng mang vai trò trưởng: anh A (trưởng phòng) và chị B (phó phòng). Cây hiện «⚠ 2 trưởng». Bạn chọn anh A ở ô «Trưởng chính:». Từ giờ việc máy tự giao cho cả phòng đứng tên anh A; chị B làm trưởng phụ vẫn giao được việc cho nhân viên và nhận chuông.",
            "Ngược lại, nếu Phòng Hành chính Tổng hợp chỉ có một người mang vai trò trưởng thì không hiện ô «Trưởng chính:» vì không cần chọn.",
          ],
        },
        {
          luuY: [
            "Ô «Trưởng chính:» chỉ hiện khi đơn vị loại Phòng hoặc Đơn vị, bạn quản lý được đơn vị đó và có từ 2 người làm trưởng; người không có quyền thì không thấy ô này.",
            "Trưởng chính phải là người đang hoạt động, thuộc đơn vị (biên chế hoặc kiêm nhiệm) và mang vai trò «Trưởng phòng / GĐ đơn vị» (máy từ chối nếu không).",
            "Người kiêm nhiệm ở nhiều đơn vị có thể được đánh dấu «Làm trưởng ở» chỉ một số đơn vị (xem hộp «Sửa người dùng»); khi đó vai trò trưởng chỉ áp ở các đơn vị được đánh dấu.",
          ],
        },
      ],
    },
    {
      ten: "④ Ngoài SCI",
      khoi: [
        { doan: ["Ô tích «Ngoài SCI (công ty SCI có cổ phần, không trực thuộc)» chỉ hiện với đơn vị loại «Đơn vị» khi bạn sửa được đơn vị đó. Bấm là lưu ngay."] },
        {
          tieuDe: "Tác dụng",
          ds: [
            "Đánh dấu thì người ngoài đơn vị này chỉ giao việc cho CẢ đơn vị, không giao đích danh một cá nhân của đơn vị (giao mới và giao chuyển tiếp). Người đứng đầu đơn vị tự giao tiếp cho nhân viên của mình.",
            "Mọi đơn vị con của đơn vị đánh dấu cũng tính là ngoài SCI.",
            "Đơn vị trực thuộc SCI chỉ gồm các ban quản lý dự án và các nhà máy. SCI PMC, SCI E&C là công ty SCI có cổ phần nên không trực thuộc; ban điều hành tổng thầu cũng vậy.",
          ],
        },
        {
          viDu: [
            "Trong bộ đơn vị cài sẵn, SCI PMC đã được đánh dấu ngoài SCI. Chị B ở Phòng Đầu tư và Pháp chế giao việc cho SCI PMC thì chỉ giao được cho cả đơn vị SCI PMC, không giao đích danh một nhân viên của SCI PMC. Giám đốc SCI PMC tự giao tiếp cho nhân viên.",
            "Bỏ dấu tích: sau đó người có quyền giao việc ở phạm vi phù hợp giao đích danh được nhân viên SCI PMC.",
          ],
        },
        { luuY: ["Chỉ người quản lý ở phạm vi Toàn bộ đổi được ô này. Người ở phạm vi hẹp vẫn thấy ô nhưng bấm sẽ nhận lỗi «Chỉ người quản lý toàn bộ người dùng mới đổi đơn vị trực thuộc / ngoài SCI»."] },
      ],
    },
    {
      ten: "⑤ Chức năng nhiệm vụ",
      khoi: [
        { doan: ["Khối «Chức năng nhiệm vụ» là một ô văn bản dài ghi đơn vị làm những việc gì. Dòng nhỏ cạnh tiêu đề ghi «🤖 AI đọc khi soạn giao việc ở Cây việc». Khi chưa ghi, màn hiện «Chưa ghi — 🤖 AI không biết đơn vị này làm việc gì.»"] },
        {
          bam: [
            "Chọn đơn vị. Ở khối «Chức năng nhiệm vụ» bấm «Sửa» (chỉ hiện khi bạn sửa được đơn vị).",
            "Gõ vào ô. Gợi ý trong ô: «Mỗi nhóm nhiệm vụ một dòng. Ghi cả nguồn (số nghị quyết, ngày).»",
            "Bấm «Lưu» (hoặc «Thôi» để bỏ). Tối đa 8.000 ký tự.",
          ],
        },
        {
          ai: [
            "🤖 Nhận gì: chức năng nhiệm vụ của từng đơn vị, phân công Ban lãnh đạo, và lịch sử ai thường làm loại việc tương tự trong sổ cái.",
            "🤖 Làm gì: khi người nhờ gợi ý nơi giao một việc trên đường găng chưa có người nhận, AI chọn người hoặc đơn vị phù hợp, kèm đơn vị phối hợp và lãnh đạo phụ trách, kèm căn cứ.",
            "🤖 Cũng ở màn Sơ đồ, AI đọc chức năng nhiệm vụ của lãnh đạo để gắn «lãnh đạo phối hợp» cho việc chưa có.",
            "🤖 KHÔNG được làm: tự giao việc; chọn người hoặc đơn vị không có trong danh sách máy đưa vào (máy kiểm lại, AI bịa thì bỏ).",
            "Người kiểm: đọc căn cứ AI nêu, rồi tự bấm «Giao việc» thì việc mới thành thật. Không bấm thì không có gì được ghi.",
            "Mất kết nối AI: người giao việc bằng tay như bình thường; ô chức năng nhiệm vụ vẫn dùng được cho lần sau.",
          ],
        },
        {
          viDu: [
            "Giả sử bạn ghi cho Phòng Cơ điện: «Thiết kế và giám sát thi công phần điện của nhà máy. Nghiệm thu thiết bị điện (theo quyết định của Tổng giám đốc).» Một việc trên đường găng «Thử nghiệm tần số» chưa có người nhận. AI đọc ô này, thấy phần việc thuộc điện nên đề xuất giao Phòng Cơ điện, kèm lãnh đạo phụ trách. Bạn đọc căn cứ rồi bấm «Giao việc».",
            "Phòng chưa ghi gì: AI không có căn cứ chức năng, chỉ còn dựa lịch sử ai làm việc tương tự nên đề xuất kém sát.",
          ],
        },
        { luuY: ["Ghi cụ thể, mỗi nhóm nhiệm vụ một dòng, kèm nguồn. Ghi chung chung («làm các việc được giao») thì AI không phân biệt được đơn vị này với đơn vị khác."] },
      ],
    },
    {
      ten: "⑥ Người trong đơn vị",
      khoi: [
        {
          tieuDe: "Bảng người",
          bang: [
            ["Cột", "Nghĩa"],
            ["Người", "Vòng tròn chữ cái đầu, họ tên, email; nhãn «★ TRƯỞNG», «TRƯỞNG CHÍNH», «QUẢN TRỊ», «ĐÃ KHÓA»"],
            ["Chức vụ", "Chức vụ của người. Người kiêm nhiệm hiện «kiêm …» và ghi «biên chế ở …»; người biên chế ở đây mà kiêm nơi khác có dòng «kiêm …» nhỏ bên dưới"],
            ["Vai trò", "Các vai trò của người, ngăn cách bằng dấu chấm giữa"],
            ["(cột cuối)", "Nút «Sửa» — chỉ hiện nếu bạn quản lý được người đó (và nếu người đó là quản trị viên thì bạn cũng phải là quản trị viên)"],
          ],
        },
        {
          tieuDe: "Thêm và sửa người",
          bam: [
            "Chọn đơn vị rồi bấm «Thêm người vào đây» (ở dòng nhóm «Chưa gán đơn vị» thì nút ghi «Thêm người»). Hộp «Thêm người dùng» mở ra, ô Đơn vị chọn sẵn đơn vị đang xem.",
            "Muốn sửa, bấm «Sửa» ở dòng người. Hộp «Sửa người dùng: …» mở ra. Hai hộp này có hướng dẫn riêng.",
          ],
        },
        {
          viDu: [
            "Nhóm «Chưa gán đơn vị» có 3 người mới. Chọn nhóm, bấm «Sửa» ở người đầu tiên, chọn đơn vị «Phòng Hành chính Tổng hợp» trong ô Đơn vị, bấm «Lưu»: người đó rời nhóm «Chưa gán đơn vị», xuất hiện trong phòng, số người của phòng ở cây tăng lên 1.",
            "Giả sử anh C có đơn vị chính là Phòng Kinh tế và Vận hành và kiêm nhiệm ở Phòng Cơ điện: ở bảng của Phòng Cơ điện dòng anh C ghi «kiêm …» và «biên chế ở Phòng Kinh tế và Vận hành»; bấm «Sửa» ở dòng nào cũng là sửa cùng một hồ sơ của anh.",
          ],
        },
        { luuY: ["Nút «Thêm người» trong nhóm «Chưa gán đơn vị» hiện với mọi người mở được màn này, nhưng thêm người chưa gán đơn vị chỉ người quản lý ở phạm vi Toàn bộ làm được; người khác bấm «Lưu» sẽ nhận lỗi ngoài phạm vi."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy mục «Tổ chức & người dùng» trong menu", "Bạn không có quyền «Quản lý người dùng, đơn vị, vai trò». Nhờ quản trị viên."],
            ["Không thấy nút «Sửa» ở một người", "Người đó ngoài đơn vị thuộc phạm vi quản lý của bạn, hoặc là quản trị viên mà bạn không phải. Nút không có quyền thì ẩn."],
            ["Cây có chữ vàng «⚠ N trưởng»", "Đơn vị có nhiều người mang vai trò trưởng. Chọn «Trưởng chính:» (tab ③)."],
            ["Cây có chữ vàng «⚠ chưa có trưởng»", "Chưa ai có vai trò «Trưởng phòng / GĐ đơn vị» trong đơn vị. Mở «Sửa» người sẽ làm trưởng, tích vai trò đó."],
            ["Người vừa thêm không thấy trong danh sách", "Có thể người đó thuộc đơn vị khác, hoặc bị khóa (tích «Tài khoản bị khóa»), hoặc chưa gán đơn vị (xem nhóm «Chưa gán đơn vị»)."],
            ["Ngừng đơn vị báo còn người hoặc còn đơn vị con", "Máy không cho ngừng khi đơn vị còn người đang hoạt động hoặc còn đơn vị con đang hoạt động. Chuyển họ rồi ngừng lại."],
            ["Đổi cấp đơn vị báo lỗi", "Đổi cấp ảnh hưởng quy tắc đè của cả công ty nên chỉ người quản lý Toàn bộ làm được."],
            ["Mở link /quan-tri cũ", "Trang cũ tự chuyển về Cài đặt, mục «Tổ chức & người dùng»."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt 28/09/2026 (gộp «Người dùng» và «Đơn vị, chức danh») · trưởng chính chốt 03/10/2026, trưởng phụ chốt lại 08/10/2026 · «Làm trưởng ở» chốt 10/10/2026 · ngoài SCI chốt 09–10/10/2026 · chức năng nhiệm vụ chốt 03/10/2026 · luật 17 riêng 3004 (nút không có quyền thì ẩn) · luật 30 (mã luôn kèm tên).",
};
