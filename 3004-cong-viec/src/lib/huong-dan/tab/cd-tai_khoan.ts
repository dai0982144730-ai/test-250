// Hướng dẫn bản 2 (tab) — Cài đặt › Người dùng & phân quyền › Tài khoản người dùng. Viết 20/10/2026. Nhãn chép từ lib/cau-hinh/bieu-mau.ts (BIEU_MAU.tai_khoan).
// Đối chiếu code 20/10: cả 5 ô đều có chỗ đọc — vai trò gán sẵn (api/quan-tri/nguoi-dung, nhap-excel), độ dài mật khẩu (nguoi-dung, dat-lai-mat-khau, nhap-excel, auth/doi-mat-khau),
// nhắc người chưa gán đơn vị (lib/cau-hinh/cau-noi-identity.ts), hai công tắc đăng nhập (api/auth/danh-sach, app/login/page.tsx).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Tài khoản người dùng",
  tab: "👥 Người dùng & phân quyền",
  ai: "Người có quyền «Sửa cài đặt hệ thống» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép. Người không có quyền sửa thấy nhãn «chỉ xem» và không thấy nút «Lưu».",
  laGi: [
    "Mục này gom năm lựa chọn chung cho mọi tài khoản: người mới được gán vai trò gì khi quản trị không chọn, mật khẩu ngắn nhất được phép bao nhiêu ký tự, có nhắc quản trị khi có người chưa gán đơn vị không, và trang đăng nhập có hiện danh sách người để bấm chọn không.",
    "Đây không phải nơi thêm hay sửa từng người. Thêm, sửa, khóa người làm ở mục «Tổ chức & người dùng»; nhập nhiều người một lần ở mục «Nhập từ Excel».",
  ],
  vaoSao: [
    "Người quản trị thêm người mới liên tục. Nếu mỗi lần phải tự tích vai trò thì dễ sót, người mới đăng nhập vào mà không có quyền gì. Vai trò gán sẵn giúp người mới luôn có bộ quyền cơ bản ngay từ đầu.",
    "Hai công tắc đăng nhập quyết định ai mở trang đăng nhập cũng thấy tên đồng nghiệp hay không. Khi chạy thử thì tiện, khi dùng thật thì cần cân nhắc.",
  ],
  vongLam: [
    "Bước trước: quản trị khai vai trò ở mục «Vai trò và quyền» (để có vai trò mà gán sẵn).",
    "Mục này: chọn vai trò gán sẵn, độ dài mật khẩu, hai công tắc đăng nhập, công tắc nhắc người chưa gán đơn vị.",
    "Bước sau: mỗi lần «Thêm người dùng» (mục «Tổ chức & người dùng»), nhập Excel, đặt lại mật khẩu, người dùng tự đổi mật khẩu, hoặc mở trang đăng nhập — máy đọc đúng các ô này.",
  ],
  cacKhoi: [
    ["Vai trò gán sẵn cho người mới", "Khi thêm hoặc nhập Excel mà không ghi vai trò.", "① Người mới"],
    ["Độ dài mật khẩu tối thiểu", "Số ký tự ngắn nhất của mật khẩu (từ 4 trở lên).", "② Mật khẩu"],
    ["Nhắc quản trị viên khi có người chưa gán đơn vị", "Bật thì có tin nhắc quản trị khi xuất hiện người chưa có đơn vị.", "③ Nhắc quản trị"],
    ["Màn đăng nhập hiện danh sách tài khoản để bấm chọn", "Trang đăng nhập hiện danh sách người, chia theo đơn vị.", "④ Trang đăng nhập"],
    ["Bấm tên là đăng nhập luôn bằng mật khẩu lần đầu (chính email)", "Bấm tên là vào luôn, nếu người đó chưa đổi mật khẩu.", "④ Trang đăng nhập"],
  ],
  nguoi: "Quản trị chọn vai trò gán sẵn, đặt độ dài mật khẩu, bật tắt ba công tắc, bấm «Lưu».",
  may: "Gán vai trò gán sẵn cho người mới không có vai trò; từ chối mật khẩu ngắn hơn mức đã đặt; gửi tin nhắc quản trị khi có người chưa gán đơn vị (nếu bật); hiện hoặc ẩn danh sách ở trang đăng nhập.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Người mới",
      khoi: [
        { doan: ["Ô «Vai trò gán sẵn cho người mới» là danh sách vai trò. Bấm vào ô để thêm vai trò từ danh sách xổ ra, bấm dấu bỏ cạnh vai trò để gỡ. Mặc định chỉ có vai trò «Nhân viên»."] },
        {
          tieuDe: "Máy dùng ô này lúc nào",
          bang: [
            ["Tình huống", "Kết quả"],
            ["Quản trị bấm «Thêm người dùng» và không tích vai trò nào", "Người mới nhận đúng các vai trò gán sẵn"],
            ["Nhập Excel, dòng của người mới để trống cột Vai trò", "Người mới nhận vai trò gán sẵn; bảng xem trước ghi cảnh báo «Không ghi vai trò — dùng mặc định: …»"],
            ["Nhập Excel, người đã có tài khoản mà cột Vai trò để trống", "Giữ nguyên vai trò cũ, không gán sẵn thêm"],
            ["Quản trị tích vai trò trong hộp thêm người", "Dùng đúng vai trò đã tích, không gán sẵn thêm"],
          ],
        },
        { bam: ["Mở Cài đặt → tab «👥 Người dùng & phân quyền» → mục «Tài khoản người dùng».", "Ở ô «Vai trò gán sẵn cho người mới» thêm hoặc gỡ vai trò.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Công ty tuyển thêm ba nhân viên cho Phòng Hành chính Tổng hợp. Giữ vai trò gán sẵn là «Nhân viên». Quản trị thêm từng người ở mục «Tổ chức & người dùng» mà không tích vai trò: cả ba tự có quyền của nhân viên.",
            "Nếu đổi vai trò gán sẵn thành «Văn thư» thì người mới sẽ có quyền vào sổ văn bản đến mà không có quyền của nhân viên — thường là không mong muốn. Nên giữ vai trò cơ bản nhất.",
          ],
        },
        { luuY: ["Máy từ chối lưu nếu ghi một vai trò không còn tồn tại («Vai trò mặc định … không tồn tại»). Đổi ô này không đổi vai trò của người đã có tài khoản."] },
      ],
    },
    {
      ten: "② Mật khẩu",
      khoi: [
        { doan: ["Ô «Độ dài mật khẩu tối thiểu» là số ký tự ngắn nhất mà máy chấp nhận. Mặc định 6. Máy không cho đặt dưới 4."] },
        {
          tieuDe: "Ô này được dùng ở bốn chỗ",
          ds: [
            "Quản trị thêm người và gõ «Mật khẩu ban đầu».",
            "Quản trị đặt lại mật khẩu cho người dùng.",
            "Nhập Excel có điền «Mật khẩu ban đầu cho người mới» — nếu ngắn hơn mức này, máy báo «Mật khẩu ban đầu phải có ít nhất N ký tự».",
            "Người dùng tự đổi mật khẩu của mình.",
          ],
        },
        {
          tieuDe: "Mật khẩu lần đầu",
          doan: ["Khi quản trị để trống mật khẩu, mật khẩu lần đầu của người mới là chính email đăng nhập của họ; người dùng nên đổi sau khi vào. Ô này không đổi cách đó."],
        },
        {
          viDu: [
            "Đặt 8: từ nay người dùng đổi mật khẩu thành 6 ký tự sẽ bị từ chối, phải từ 8 ký tự trở lên. Mật khẩu đã đặt trước đó (kể cả ngắn hơn) vẫn dùng được đến lúc người đó đổi.",
            "Đặt 3: máy không lưu, báo «Độ dài mật khẩu tối thiểu phải là số nguyên từ 4».",
          ],
        },
        { luuY: ["Đặt mức quá cao thì mật khẩu lần đầu bằng email có thể không đạt. Cần để ý nếu có email ngắn."] },
      ],
    },
    {
      ten: "③ Nhắc quản trị",
      khoi: [
        { doan: ["Người chưa gán đơn vị vẫn đăng nhập được nhưng chỉ có quyền tối thiểu và không nằm trong sơ đồ tổ chức. Công tắc «Nhắc quản trị viên khi có người chưa gán đơn vị» gửi tin cho quản trị mỗi khi có người như vậy, để họ không bị bỏ quên."] },
        {
          tieuDe: "Tin nhắc xuất hiện khi nào",
          ds: [
            "Quản trị thêm một người mà không chọn đơn vị.",
            "Nhập Excel có dòng không ghi đơn vị (máy gộp thành một tin cho cả lần nhập).",
          ],
        },
        { luuY: ["Riêng khi chính người chưa gán đơn vị mở màn gửi báo cáo, máy luôn gửi tin cho quản trị, bất kể công tắc này bật hay tắt."] },
        { doan: ["Bấm vào tin nhắc sinh ra lúc thêm hoặc nhập người, máy mở thẳng nhóm «Chưa gán đơn vị» ở mục «Tổ chức & người dùng»."] },
        {
          viDu: [
            "Quản trị nhập Excel 20 dòng, trong đó 4 dòng để trống đơn vị. Máy tạo đủ 20 tài khoản và gửi một tin: «Có người dùng chưa được gán đơn vị» kèm tên vài người đầu. Quản trị mở nhóm «Chưa gán đơn vị», bấm «Sửa» từng người để gán.",
            "Tắt công tắc: máy vẫn cho tạo người chưa gán đơn vị nhưng không gửi tin nào; nhóm «Chưa gán đơn vị» vẫn hiện ở cuối cây đơn vị.",
          ],
        },
      ],
    },
    {
      ten: "④ Trang đăng nhập",
      khoi: [
        { doan: ["Hai công tắc cuối quyết định trang đăng nhập trông thế nào. Cả hai đều dành cho giai đoạn chạy thử; khi dùng thật cần cân nhắc. Hai công tắc KHÔNG được bật cùng lúc: bật ô này thì ô kia tự tắt và mờ đi kèm lý do."] },
        {
          bang: [
            ["Công tắc", "Bật thì", "Tắt thì"],
            ["Màn đăng nhập hiện danh sách tài khoản để bấm chọn", "Ai mở trang đăng nhập cũng thấy danh sách tên và chức vụ (rê chuột vào thì thấy email), chia theo đơn vị", "Trang đăng nhập chỉ có ô email và mật khẩu"],
            ["Bấm tên là đăng nhập luôn bằng mật khẩu lần đầu (chính email)", "Bấm tên là máy thử vào bằng mật khẩu lần đầu; người đã đổi mật khẩu thì máy yêu cầu gõ mật khẩu", "Bấm tên chỉ điền sẵn email, người dùng gõ mật khẩu"],
          ],
        },
        { luuY: ["An toàn: bật cả hai thì bất kỳ ai mở được trang đăng nhập cũng vào được tài khoản của người chưa đổi mật khẩu chỉ bằng một lần bấm, nên máy không cho bật cùng lúc: màn Cài đặt tự tắt ô kia, máy chủ từ chối lưu nếu có cả hai, và nếu dữ liệu cũ đang có cả hai bật thì «Bấm tên là đăng nhập luôn» không có hiệu lực."] },
        {
          viDu: [
            "Buổi tập huấn nhân viên mới trong phòng họp: chỉ bật «Màn đăng nhập hiện danh sách tài khoản» để mọi người tìm tên mình, bấm là điền sẵn email, rồi gõ mật khẩu.",
            "Sau khi dùng thật: tắt luôn «Màn đăng nhập hiện danh sách tài khoản…» để người ngoài không thấy tên đồng nghiệp.",
          ],
        },
      ],
    },
  ],
  viDuLuu: [
    "Bạn đổi ô «Độ dài mật khẩu tối thiểu» từ 6 sang 8 và tắt «Bấm tên là đăng nhập luôn bằng mật khẩu lần đầu (chính email)». Bấm «Lưu». Máy báo «Đã lưu … → phiên bản N. Có hiệu lực ngay.» Cột «Nhật ký phiên bản» ghi: tên bạn, giờ, ô đã đổi từ 6 sang 8 và công tắc từ bật sang tắt.",
    "Trang đăng nhập từ giây đó chỉ điền sẵn email khi bấm tên; người dùng đổi mật khẩu mới phải từ 8 ký tự.",
  ],
  vuong: [
    ["Người mới không có vai trò nào", "Ô «Vai trò gán sẵn cho người mới» đang trống. Chọn ít nhất «Nhân viên» rồi «Lưu»."],
    ["Báo «Vai trò mặc định … không tồn tại»", "Vai trò đã bị xóa ở mục «Vai trò và quyền». Gỡ nó khỏi ô này."],
    ["Không nhận được tin nhắc người chưa gán đơn vị", "Công tắc «Nhắc quản trị viên khi có người chưa gán đơn vị» đang tắt, hoặc bạn không phải quản trị viên."],
    ["Trang đăng nhập không còn danh sách", "Công tắc «Màn đăng nhập hiện danh sách tài khoản để bấm chọn» đang tắt."],
    ["Bấm tên mà máy đòi mật khẩu", "Người đó đã đổi mật khẩu, hoặc công tắc «Bấm tên là đăng nhập luôn…» đang tắt, hoặc «Màn đăng nhập hiện danh sách tài khoản» đang bật (hai ô không được bật cùng lúc)."],
    ["Công tắc đăng nhập bị mờ, không bấm được", "Ô kia đang bật nên ô này mờ và ghi lý do ngay dưới nhãn. Tắt ô kia trước."],
    ["Không thấy nút «Lưu»", "Bạn không có quyền sửa nhóm này (nhãn «chỉ xem»). Xem mục «Phân quyền cài đặt»."],
  ],
  canCu: "Nhãn ô chép từ biểu mẫu cài đặt Tài khoản người dùng · mật khẩu lần đầu = email (chốt 02/10/2026) · luật 17 riêng 3004 (nút không có quyền thì ẩn) · quyền sửa nhóm theo mục «Phân quyền cài đặt».",
});
