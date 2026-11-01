// Hướng dẫn bản 2 (tab) — Cài đặt › Người dùng & phân quyền › Nhập từ Excel. Viết 20/10/2026.
// Căn cứ code: components/quan-tri/NhapExcel.tsx (nhãn, nút) · packages/sci-identity/src/nhap-excel.ts (cột, quy tắc từng dòng, tệp mẫu) · app/api/quan-tri/nhap-excel/route.ts (quyền, giới hạn 5 MB).
// Hiện mục: TrangCaiDat.tsx mucCan — cần quyền quản lý người dùng VÀ ở phạm vi toàn bộ. Không dùng AI.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Nhập người dùng từ Excel — thêm hoặc cập nhật nhiều người một lần",
  ai: "Chỉ người quản lý người dùng ở phạm vi toàn bộ (quản trị viên, hoặc vai trò có quyền «Quản lý người dùng, đơn vị, vai trò» ở mức «Toàn bộ»). Người khác không thấy mục này trong menu trái; nếu cố gọi bằng đường khác, máy trả lời «Chỉ người quản lý toàn bộ người dùng mới nhập được từ Excel».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Thay vì thêm từng người một ở mục «Tổ chức & người dùng», bạn điền một bảng Excel (họ tên, email, đơn vị, chức vụ, vai trò) rồi tải lên. Máy đọc từng dòng, báo dòng nào đúng, dòng nào sai, rồi nhập các dòng đúng trong một lần bấm.",
            "Máy cũng dùng bảng này để cập nhật người đã có tài khoản (đổi đơn vị, chức vụ, vai trò) nếu bạn cho phép.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: [
            "Công ty có hàng chục người ở nhiều phòng và nhà máy. Thêm tay từng người mất nhiều thời gian và dễ sót. Danh sách nhân sự vốn đã có sẵn trong Excel của phòng Hành chính, chỉ cần chuẩn lại cột là nhập được.",
            "Bước kiểm tra trước khi nhập giúp bắt lỗi (sai tên đơn vị, trùng email) mà chưa ghi gì vào hệ thống.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn này"],
            ["Trước", "Cây đơn vị đã có (mục «Tổ chức & người dùng») và các vai trò đã có (mục «Vai trò và quyền»)", "Danh mục để điền vào cột Đơn vị và Vai trò"],
            ["Màn này", "Tải mẫu → điền → chọn tệp → xem kết quả kiểm tra → nhập", "Tạo hoặc cập nhật nhiều tài khoản"],
            ["Sau", "Người mới đăng nhập lần đầu bằng email; quản trị gán đơn vị cho ai còn thiếu", "Mục «Tổ chức & người dùng», nhóm «Chưa gán đơn vị»"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Nút «Tải file mẫu» (góc trên phải)", "Tải bảng Excel mẫu đúng cột", "① Tải mẫu và điền"],
            ["Khung nét đứt «Kéo file Excel vào đây hoặc bấm để chọn»", "Chọn tệp; chọn xong máy kiểm tra ngay", "② Chọn tệp và xem kết quả kiểm tra"],
            ["Ô «Mật khẩu ban đầu cho người mới» và ô tích «Email đã có tài khoản thì cập nhật tên, đơn vị, chức vụ, vai trò»", "Hai tuỳ chọn cho lần nhập", "③ Hai tuỳ chọn"],
            ["Nút «Kiểm tra lại» và nút «Nhập N dòng hợp lệ»", "Kiểm tra lại sau khi đổi tuỳ chọn; ghi thật vào hệ thống", "④ Nhập thật"],
            ["Bảng kết quả (Dòng · Họ tên · Email · Đơn vị · Chức vụ · Vai trò · Kết quả)", "Xem từng dòng sẽ ra sao", "② · ④"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở màn này"],
            ["Người", "Điền Excel · chọn tệp · đọc kết quả kiểm tra · sửa tệp nếu có dòng lỗi · bấm «Nhập N dòng hợp lệ» · lưu danh sách mật khẩu lần đầu"],
            ["Máy", "Đọc cột theo tên tiêu đề, đối chiếu đơn vị và vai trò với danh mục, báo lỗi và cảnh báo từng dòng, tạo tài khoản, cập nhật tài khoản, ghi nhật ký, nhắc quản trị về người chưa gán đơn vị"],
            ["🤖 AI", "— Màn này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI: người điền bảng và quyết định, máy kiểm tra và ghi theo quy tắc cố định. Cùng một tệp đưa vào luôn ra cùng kết quả."],
        },
        {
          tieuDe: "Thứ tự làm gợi ý",
          bam: [
            "Bấm «Tải file mẫu», điền danh sách (nhớ xóa hai dòng ví dụ).",
            "Kéo tệp vào khung nét đứt, đọc bảng kiểm tra.",
            "Sửa tệp, chọn lại, đến khi không còn dòng lỗi (hoặc chấp nhận bỏ qua dòng lỗi).",
            "Bấm «Nhập N dòng hợp lệ» và lưu danh sách mật khẩu lần đầu nếu có.",
          ],
        },
      ],
    },
    {
      ten: "① Tải mẫu và điền",
      khoi: [
        { doan: ["Nút «Tải file mẫu» tải về tệp Excel «Mẫu nhập người dùng.xlsx» gồm hai trang."] },
        {
          bang: [
            ["Trang", "Có gì"],
            ["Người dùng", "Dòng tiêu đề và hai dòng ví dụ (Nguyễn Văn A, Trần Thị B)"],
            ["Danh mục", "Bảng mã đơn vị, tên đơn vị, tên ngắn, cấp, cùng bảng mã vai trò và tên vai trò đang có trong hệ thống"],
          ],
        },
        {
          tieuDe: "Năm cột",
          bang: [
            ["Cột", "Điền gì", "Bắt buộc"],
            ["Họ tên", "Họ và tên đầy đủ", "Có"],
            ["Email", "Email đăng nhập. Máy tự đổi thành chữ thường", "Có"],
            ["Mã đơn vị hoặc tên đơn vị", "Mã, tên đầy đủ hoặc tên ngắn của đơn vị (xem trang «Danh mục»)", "Không — bỏ trống thì người đó chưa gán đơn vị"],
            ["Chức vụ", "Ví dụ Nhân viên, Trưởng phòng", "Không"],
            ["Vai trò", "Mã hoặc tên vai trò. Nhiều vai trò thì cách nhau dấu phẩy, chấm phẩy hoặc xuống dòng", "Không — bỏ trống thì dùng vai trò gán sẵn (cho người mới)"],
          ],
        },
        { doan: ["Tiêu đề cột không nhất thiết đứng dòng đầu: máy tìm dòng có cột Email trong 20 dòng đầu. Tên cột máy cũng nhận một số cách gọi khác (ví dụ «Họ và tên», «Phòng ban», «Chức danh», «Quyền»)."] },
        { bam: ["Mở mục «Nhập từ Excel» (Cài đặt → tab «👥 Người dùng & phân quyền»).", "Bấm «Tải file mẫu».", "Xóa hai dòng ví dụ rồi điền danh sách thật, mỗi người một dòng.", "Lưu tệp ở dạng .xlsx."] },
        {
          viDu: [
            "Phòng Hành chính Tổng hợp nhận ba nhân viên: ở trang «Người dùng» điền dòng 2 là Nguyễn Văn A · nguyenvana@scigroup.vn · Phòng Hành chính Tổng hợp · Nhân viên · Nhân viên; dòng 3 và 4 tương tự cho hai người còn lại.",
            "Cột Đơn vị gõ «P.HCTH» (tên ngắn) hoặc «Phòng Hành chính Tổng hợp» (tên đầy đủ) hoặc mã của đơn vị đều được; máy không phân biệt chữ hoa chữ thường, bỏ qua dấu tiếng Việt khi so tên.",
          ],
        },
        { luuY: ["Quên xóa hai dòng ví dụ thì máy sẽ tạo luôn hai tài khoản nguyenvana@scigroup.vn và tranthib@scigroup.vn. Hãy xóa trước khi chọn tệp. Tệp tối đa 5 MB và chỉ đọc trang đầu tiên."] },
      ],
    },
    {
      ten: "② Chọn tệp và xem kết quả kiểm tra",
      khoi: [
        { doan: ["Kéo tệp vào khung nét đứt «Kéo file Excel vào đây hoặc bấm để chọn», hoặc bấm vào khung để chọn tệp. Chọn xong máy tự kiểm tra ngay, chưa ghi gì vào hệ thống."] },
        {
          tieuDe: "Đọc bảng kết quả",
          bang: [
            ["Cột «Kết quả»", "Màu", "Nghĩa"],
            ["Tạo mới", "Xanh lá", "Email chưa có tài khoản — sẽ tạo mới"],
            ["Cập nhật", "Xanh dương", "Email đã có tài khoản — sẽ cập nhật (nếu tích ô cho phép cập nhật)"],
            ["Bỏ qua", "Đỏ", "Dòng có lỗi, hoặc email đã có mà bạn không cho cập nhật"],
          ],
        },
        {
          tieuDe: "Lỗi máy hay báo (chữ đỏ)",
          ds: [
            "«Thiếu họ tên», «Thiếu email», «Email không hợp lệ: …», «Email trùng với dòng N» (trùng ngay trong tệp).",
            "«Không có đơn vị …» (ghi mã, tên hoặc tên ngắn của đơn vị) hoặc «Đơn vị … đã ngừng hoạt động».",
            "«Không có vai trò …».",
          ],
        },
        {
          tieuDe: "Cảnh báo (chữ vàng, vẫn nhập được)",
          ds: [
            "«Chưa gán đơn vị — quản trị viên sẽ được nhắc».",
            "«Không ghi vai trò — dùng mặc định: …».",
            "«Email đã có tài khoản — bỏ qua» khi bạn bỏ tích ô cập nhật.",
          ],
        },
        {
          tieuDe: "Dòng tóm tắt",
          doan: ["Cạnh nút «Nhập…» máy ghi «N dòng · M hợp lệ · K dòng lỗi (bỏ qua)» hoặc «không có lỗi»."],
        },
        {
          viDu: [
            "Giả sử tệp có 3 dòng: (1) Nguyễn Văn A đúng hết → Tạo mới. (2) một dòng thiếu email → Bỏ qua, chữ đỏ «Thiếu email». (3) Trần Thị B ghi đơn vị là «Phong KTVH» → Bỏ qua, chữ đỏ «Không có đơn vị …».",
            "Tóm tắt: «3 dòng · 1 hợp lệ · 2 dòng lỗi (bỏ qua)». Nút ghi «Nhập 1 dòng hợp lệ». Sửa tệp rồi chọn lại, máy kiểm tra lại từ đầu.",
          ],
        },
        { luuY: ["Máy báo các lỗi chung ở khung đỏ phía trên bảng: không tìm thấy dòng tiêu đề có cột Email, tệp thiếu cột Họ tên, tệp quá lớn (tối đa 5 MB), tệp không có dòng người dùng nào dưới dòng tiêu đề. Khi gặp, sửa tệp rồi chọn lại."] },
      ],
    },
    {
      ten: "③ Hai tuỳ chọn",
      khoi: [
        { doan: ["Hai tuỳ chọn nằm dưới khung chọn tệp. Đổi xong, bấm «Kiểm tra lại» để máy tính lại kết quả (chọn lại tệp cũng kiểm tra lại)."] },
        {
          bang: [
            ["Tuỳ chọn", "Mặc định", "Tác dụng"],
            ["Ô «Mật khẩu ban đầu cho người mới»", "Trống", "Trống: mật khẩu lần đầu của mỗi người là chính email của họ. Có điền: mọi người mới dùng chung mật khẩu đó (phải đủ độ dài tối thiểu đặt ở mục «Tài khoản người dùng»; dưới mức đó máy từ chối)."],
            ["Ô tích «Email đã có tài khoản thì cập nhật tên, đơn vị, chức vụ, vai trò»", "Đã tích", "Tích: người đã có tài khoản được cập nhật theo tệp. Bỏ tích: dòng của họ ghi «Bỏ qua»."],
          ],
        },
        {
          tieuDe: "Khi cập nhật người đã có, máy đổi gì",
          bang: [
            ["Thông tin", "Quy tắc"],
            ["Họ tên", "Luôn đổi theo tệp"],
            ["Đơn vị", "Chỉ đổi nếu cột Đơn vị có ghi; để trống thì giữ nguyên"],
            ["Chức vụ", "Chỉ đổi nếu cột Chức vụ có ghi"],
            ["Vai trò", "Chỉ đổi nếu cột Vai trò có ghi — khi đó THAY toàn bộ vai trò cũ bằng danh sách trong tệp"],
            ["Email, kiêm nhiệm, khóa hoặc mở khóa tài khoản", "Không đổi"],
          ],
        },
        {
          viDu: [
            "Giả sử Phòng Kinh tế và Vận hành điều chuyển anh Nguyễn Văn A (đã có tài khoản) sang Phòng Cơ điện. Bạn điền dòng: Nguyễn Văn A · email cũ · Phòng Cơ điện · (trống) · (trống). Kết quả «Cập nhật»: đơn vị đổi sang Phòng Cơ điện; chức vụ và vai trò cũ giữ nguyên.",
            "Cũng dòng đó nhưng cột Vai trò ghi «Trưởng phòng / GĐ đơn vị»: vai trò cũ của anh bị thay bằng vai trò này.",
          ],
        },
        { luuY: ["Mật khẩu ban đầu chỉ áp cho người tạo mới. Người đã có tài khoản không bị đổi mật khẩu bởi màn này; muốn đặt lại, vào mục «Tổ chức & người dùng» → «Sửa» → «Đặt lại mật khẩu»."] },
      ],
    },
    {
      ten: "④ Nhập thật",
      khoi: [
        { doan: ["Nút «Nhập N dòng hợp lệ» (N là số dòng không lỗi) mờ cho đến khi đã có kết quả kiểm tra và có ít nhất một dòng hợp lệ. Bấm nút, máy ghi các dòng hợp lệ trong một lượt: hoặc cả lượt thành công, hoặc không ghi gì nếu có sự cố giữa chừng. Dòng lỗi bị bỏ qua, không chặn cả lượt."] },
        {
          bam: [
            "Đọc kỹ bảng kết quả và dòng tóm tắt.",
            "Bấm «Nhập N dòng hợp lệ» (đang xử lý nút ghi «Đang xử lý…»).",
            "Máy báo «Đã nhập: N tạo mới, M cập nhật, K bỏ qua» và hiện khung xanh «Đã nhập xong: …».",
            "Nếu có người mới, khung xanh có nút «Tải danh sách mật khẩu lần đầu (N)». Bấm để tải tệp mat-khau-tam.csv gồm hai cột Email và Mật khẩu lần đầu.",
          ],
        },
        {
          ketQua: [
            "Người mới có tài khoản, đăng nhập bằng email; máy ghi một dòng «nhập từ Excel» vào nhật ký thao tác.",
            "Nếu có dòng chưa gán đơn vị và công tắc nhắc đang bật (mục «Tài khoản người dùng»), quản trị nhận một tin nhắc duy nhất cho cả lượt.",
            "Mở mục «Tổ chức & người dùng» thấy người mới ngay trong cây đơn vị.",
          ],
        },
        {
          viDu: [
            "Nhập 3 dòng hợp lệ cho Phòng Hành chính Tổng hợp: báo «Đã nhập: 3 tạo mới, 0 cập nhật, 0 bỏ qua». Khung xanh hiện «Tải danh sách mật khẩu lần đầu (3)»; tệp CSV ghi cả ba email và mật khẩu lần đầu (chính là email, vì bạn không điền mật khẩu ban đầu).",
            "Giao tệp đó cho trưởng phòng và nhắc mọi người đổi mật khẩu sau khi đăng nhập.",
          ],
        },
        { luuY: ["Danh sách mật khẩu chỉ tải được ngay lúc này (khung ghi «chỉ tải được lúc này»). Đóng trang hoặc nhập tệp khác là mất. Nhập lại cùng tệp thì những người đó đã có tài khoản nên sẽ thành «Cập nhật» hoặc «Bỏ qua», không có mật khẩu mới."] },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy mục «Nhập từ Excel» trong menu", "Mục chỉ hiện với người quản lý người dùng ở phạm vi toàn bộ. Nhờ quản trị viên."],
            ["Mọi dòng đều báo «Không có đơn vị …»", "Tên đơn vị trong tệp không khớp. Mở trang «Danh mục» trong tệp mẫu, copy đúng mã hoặc tên ngắn."],
            ["Báo «Không có vai trò …»", "Vai trò gõ sai hoặc đã xóa. Dùng đúng mã hoặc tên ở trang «Danh mục»; nhiều vai trò cách nhau dấu phẩy."],
            ["Báo «Không tìm thấy dòng tiêu đề có cột Email»", "Tệp thiếu cột Email hoặc tiêu đề viết khác tên máy nhận. Dùng đúng tên cột trong tệp mẫu."],
            ["Bấm «Nhập…» mà báo 403", "Bạn không còn là người quản lý toàn bộ; nhờ quản trị viên."],
            ["Tạo nhầm hai tài khoản nguyenvana và tranthib", "Quên xóa hai dòng ví dụ trong tệp mẫu. Vào «Tổ chức & người dùng», mở từng người, bấm «Khóa»."],
            ["Người mới không có quyền gì", "Họ chưa có vai trò hoặc dùng vai trò gán sẵn quá hẹp. Kiểm tra mục «Tài khoản người dùng» và vai trò của họ."],
            ["Mất danh sách mật khẩu", "Vào «Tổ chức & người dùng» → «Sửa» người đó → «Đặt lại mật khẩu»; mật khẩu mới chính là email và hiện một lần."],
          ],
        },
      ],
    },
  ],
  canCu: "Cột và cách đọc tệp theo trang tải mẫu · giới hạn 5 MB · mật khẩu lần đầu = email (chốt 02/10/2026) · nhập hàng loạt chỉ người quản lý toàn bộ người dùng · nút không có quyền thì ẩn (luật 17 riêng 3004).",
};
