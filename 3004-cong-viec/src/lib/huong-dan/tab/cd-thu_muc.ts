// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Thư mục. Viết 20/10/2026 (nhóm B3). Nhãn chép từ components/cai-dat/nhom.tsx (NhomThuMuc) và lib/cau-hinh/bieu-mau.ts (LOAI_THU_MUC).
// Đối chiếu code 20/10: «Thư mục con mặc định» đọc ở lib/thu-muc/hat-giong.ts:44 (gieo lúc khởi động và khi đơn vị chưa có thư mục gốc: lib/thu-muc/dich-vu.ts:43, truy-van.ts:73);
// «Thùng rác giữ» ở lib/thu-muc/truy-van.ts:84,220 + dich-vu.ts:312; «Mở xem nội dung tài liệu phòng khác» ở lib/ai/quyen-doc.ts + lib/ai/chat-tools.ts:360 + lib/thu-muc/truy-van.ts;
// «Quy ước tên file» KHÔNG có chỗ nào đọc (grep quy_uoc: chỉ có ở biểu mẫu, mặc định, kiểm) → ghi thẳng trong hướng dẫn (⏸ báo cáo).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Thư mục",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Ai đăng nhập cũng xem được.",
  laGi: [
    "Thư mục là nơi cất các báo cáo và tài liệu đã nộp. Mỗi đơn vị trong công ty có một thư mục gốc mang tên đơn vị, bên trong là các thư mục con. Mục này chỉnh ba thứ: danh sách thư mục con tạo sẵn cho mỗi đơn vị, thùng rác giữ tài liệu đã xóa bao lâu, và ai được mở xem nội dung tài liệu của phòng khác.",
    "Một ô thứ tư, «Quy ước tên file», có trong biểu mẫu nhưng đến ngày 20/10/2026 máy chưa đọc (xem tab «④ Ô chưa dùng»).",
  ],
  vaoSao: [
    "Mỗi đơn vị cần có cùng một khuôn thư mục để người nộp và người nhận biết tìm ở đâu: tài liệu nhận về, tài liệu gửi đi, tài liệu theo dự án.",
    "Thùng rác giữ tài liệu lỡ xóa trong một thời gian để khôi phục, rồi ẩn đi cho gọn.",
    "Có đơn vị muốn mở tài liệu cho cả công ty xem, có đơn vị chỉ cho người đúng phạm vi: ô cuối quyết định điều đó.",
  ],
  vongLam: [
    "Bước trước: đơn vị được tạo trong cây đơn vị; mọi người vào menu thư mục tài liệu để xem cây.",
    "Mục này: định nghĩa khuôn thư mục con, hạn thùng rác, chế độ mở xem.",
    "Bước sau: đơn vị chưa có thư mục thì máy tạo thư mục gốc và thư mục con theo khuôn này (khi hệ thống khởi động hoặc khi có người mở cây thư mục); tài liệu đã xóa nằm ở thùng rác đến hết hạn; người xem tài liệu của phòng khác được cho hay không theo ô chế độ mở xem; trợ lý chat cũng chỉ đọc nội dung tài liệu theo đúng ô này.",
  ],
  cacKhoi: [
    ["Mục «Thư mục con mặc định của mỗi đơn vị»: danh sách dòng (tên + loại), mũi tên lên xuống, thùng rác, nút «Thêm thư mục con»", "Khuôn thư mục con tạo sẵn cho mỗi đơn vị", "① Thư mục con mặc định"],
    ["Ô «Thùng rác giữ bao lâu (ngày)» (mặc định 30)", "Số ngày giữ tài liệu đã xóa", "② Thùng rác"],
    ["Ô chọn «Mở xem nội dung tài liệu phòng khác»: «Ai cũng mở xem được» · «Theo quyền tai_lieu.xem» (mặc định: ai cũng mở xem được)", "Quy định ai mở được nội dung tài liệu của đơn vị khác", "③ Mở xem nội dung"],
    ["Ô «Quy ước tên file»", "Có ô nhập nhưng máy chưa đọc", "④ Ô chưa dùng"],
  ],
  nguoi: "Quản trị chỉnh khuôn thư mục, hạn thùng rác, chế độ mở xem, bấm «Lưu». Người dùng duyệt thư mục, xóa, khôi phục tài liệu theo quyền của mình.",
  may: "Tạo thư mục gốc và các thư mục con cho đơn vị còn thiếu; ẩn khỏi thùng rác tài liệu quá hạn; kiểm quyền mở nội dung theo chế độ đã chọn.",
  aiLam: "— Mục này không dùng AI. (Trợ lý chat chỉ đọc nội dung tài liệu theo đúng chế độ mở xem ở ô này; việc kiểm quyền do máy làm.)",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Thư mục con mặc định",
      khoi: [
        { doan: ["Mỗi dòng là một thư mục con có tên và loại. «Loại» cho máy biết thư mục dùng để làm gì (tài liệu đến, tài liệu đi, thùng rác…) nên tên có thể đổi mà việc của nó vẫn đúng."] },
        {
          bang: [
            ["Loại", "Thư mục này là"],
            ["Đến", "Tài liệu đơn vị nhận về"],
            ["Đi", "Tài liệu đơn vị gửi đi"],
            ["Dự án", "Tài liệu theo dự án"],
            ["Thùng rác", "Nơi tài liệu đã xóa chờ khôi phục (xem tab ②)"],
            ["Khác", "Thư mục thường, không có ý nghĩa đặc biệt"],
          ],
        },
        {
          tieuDe: "Mặc định (4 thư mục con)",
          bang: [
            ["Tên", "Loại"],
            ["Đến", "Đến"],
            ["Đi", "Đi"],
            ["Dự án", "Dự án"],
            ["Thùng rác", "Thùng rác"],
          ],
        },
        {
          bam: [
            "Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Thư mục».",
            "Sửa tên trong ô tên; chọn loại ở ô chọn bên cạnh (chọn là áp dụng).",
            "Dùng mũi tên «Lên» và «Xuống» để đổi thứ tự; thùng rác nhỏ («Bỏ») để xóa dòng.",
            "Bấm «Thêm thư mục con» để thêm dòng mới (tên «Thư mục mới», loại «Khác»), rồi đổi tên.",
            "Bấm «Lưu».",
          ],
        },
        {
          viDu: [
            "Công ty muốn mỗi đơn vị có thêm thư mục «Biên bản họp» để cất biên bản cuộc họp giao ban. Quản trị bấm «Thêm thư mục con», đổi tên thành «Biên bản họp», để loại «Khác», bấm «Lưu». Đơn vị nào được máy tạo thư mục từ nay sẽ có thêm thư mục đó.",
            "Đổi tên dòng «Dự án» thành «Hồ sơ dự án» nhưng giữ loại «Dự án»: đơn vị đã có thư mục loại «Dự án» thì máy giữ thư mục cũ (tên cũ), vì máy nhận thư mục đặc biệt theo LOẠI, không theo tên. Chỉ đơn vị chưa có thư mục loại đó mới được tạo với tên mới.",
          ],
        },
        {
          luuY: [
            "Danh sách phải có ít nhất một thư mục con; tên không được trùng nhau và không để trống.",
            "Máy chỉ THÊM thư mục còn thiếu cho đơn vị; không xóa và không đổi tên thư mục đã có. Với đơn vị đã có thư mục từ trước, thư mục thêm sau sẽ có ở lần hệ thống khởi động kế tiếp.",
            "Bỏ một dòng khỏi danh sách không xóa thư mục đã tạo trong các đơn vị.",
          ],
        },
      ],
    },
    {
      ten: "② Thùng rác",
      khoi: [
        { doan: ["Khi một tài liệu bị xóa khỏi thư mục, nó không biến mất mà sang thùng rác của đơn vị. Ô «Thùng rác giữ bao lâu (ngày)» là số ngày nó còn hiện trong thùng rác và khôi phục được. Hết số ngày thì ẩn khỏi thùng rác; nội dung và mọi phiên bản vẫn được giữ trong Lịch sử."] },
        { bam: ["Gõ số ngày vào ô «Thùng rác giữ bao lâu (ngày)» (số nguyên từ 0).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Mặc định 30 ngày: tài liệu xóa hôm 01/10/2026 còn khôi phục được đến hết 30 ngày. Quá hạn, người thường không khôi phục được nữa (báo «Đã quá hạn giữ trong Thùng rác»), chỉ quản trị viên còn kéo lại được.",
            "Đổi thành 90 để giữ lâu hơn: tài liệu đã xóa cách đây 40 ngày (đã bị ẩn với mức 30) sẽ hiện lại trong thùng rác, vì máy tính hạn theo ngày xóa cộng số ngày đang đặt.",
          ],
        },
        {
          luuY: [
            "Đổi số ngày áp cho cả tài liệu đã nằm trong thùng rác: tăng thì tài liệu hiện lại nếu chưa quá số ngày mới; giảm thì tài liệu bị ẩn sớm hơn.",
            "Thùng rác chỉ thấy được khi có quyền khôi phục tài liệu ở đơn vị đó.",
          ],
        },
      ],
    },
    {
      ten: "③ Mở xem nội dung",
      khoi: [
        { doan: ["Mọi người luôn thấy CÂY thư mục của cả công ty (tên thư mục, số tài liệu). Ô «Mở xem nội dung tài liệu phòng khác» quyết định ai mở được NỘI DUNG của tài liệu thuộc đơn vị khác."] },
        {
          bang: [
            ["Lựa chọn", "Ai mở được nội dung", "Dùng khi"],
            ["Ai cũng mở xem được (mặc định)", "Mọi người có quyền xem tài liệu, ở bất kỳ phạm vi nào", "Công ty muốn minh bạch báo cáo giữa các phòng"],
            ["Theo quyền tai_lieu.xem", "Chỉ người có quyền xem tài liệu ở đúng phạm vi đơn vị chứa tài liệu", "Muốn chặt chẽ: phòng nào xem tài liệu phòng đó"],
          ],
        },
        { bam: ["Chọn một trong hai lựa chọn ở ô «Mở xem nội dung tài liệu phòng khác» (chọn là áp dụng).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Mặc định: nhân viên Phòng Tài chính Kế toán mở xem được báo cáo của Nhà máy thủy điện Nậm Xe để so số liệu. Đổi sang «Theo quyền tai_lieu.xem»: nhân viên đó chỉ mở được nếu quyền xem tài liệu của họ phủ đơn vị của báo cáo đó.",
            "Dù chọn chế độ nào, người tải tài liệu lên và quản trị viên luôn mở được tài liệu của mình/ của hệ thống.",
          ],
        },
        {
          luuY: [
            "Báo cáo tài chính theo mẫu mật vẫn bị cắt chương mật với người không có tên trong danh sách riêng, bất kể ô này. Cài đặt mật nằm ở mục khác và chỉ quản trị viên sửa.",
            "Trợ lý chat cũng đọc nội dung tài liệu theo chính ô này nên đổi ở đây là đổi cả những gì trợ lý trả lời được.",
          ],
        },
      ],
    },
    {
      ten: "④ Ô chưa dùng",
      khoi: [
        { doan: ["Ô «Quy ước tên file» có trong biểu mẫu (mặc định {mau}_{ky}_{don_vi}, ví dụ gợi ý Form7_Tuan29_BQLDA-QT) nhưng đến ngày 20/10/2026 máy chưa đọc nó ở chỗ nào để đặt tên tệp. Bạn gõ được và lưu được, nhưng tên tệp không đổi theo."] },
        { viDu: ["Đổi quy ước thành {don_vi}_{mau}_{ky} và lưu: tên tệp các báo cáo nộp từ nay vẫn như cũ. Muốn tên tệp theo một quy ước, hiện phải nhờ người lập báo cáo tự đặt."] },
      ],
    },
  ],
  viDuLuu: ["Đổi «Thùng rác giữ bao lâu (ngày)» từ 30 thành 90 và bấm «Lưu» → nhật ký ghi «Thùng rác giữ (ngày): 30 → 90» (phiên bản mới, có hiệu lực ngay)."],
  vuong: [
    ["Lưu báo «Thư mục con … bị trùng tên» hoặc «thiếu tên»", "Mỗi thư mục con phải có tên riêng, không để trống."],
    ["Lưu báo «Phải có ít nhất một thư mục con mặc định»", "Đã xóa hết dòng. Thêm lại ít nhất một dòng."],
    ["Thêm thư mục mới mà đơn vị cũ chưa có", "Thư mục thêm sau được tạo cho đơn vị cũ ở lần hệ thống khởi động kế tiếp (suy từ cách máy gieo thư mục)."],
    ["Khôi phục tài liệu báo «Đã quá hạn giữ trong Thùng rác»", "Quá số ngày giữ. Quản trị viên khôi phục được; hoặc xem nội dung ở Lịch sử."],
    ["Người dùng than không mở được tài liệu phòng khác", "Chế độ đang là «Theo quyền tai_lieu.xem»; xem quyền xem tài liệu của họ ở «Vai trò và quyền», hoặc đổi sang «Ai cũng mở xem được»."],
    ["Đổi «Quy ước tên file» mà tên tệp không đổi", "Ô này chưa được máy dùng (tab ④)."],
  ],
  canCu: "Nhóm «thu_muc» trong cài đặt; cách gieo thư mục cho đơn vị, giữ thùng rác và kiểm quyền mở nội dung ở phần Thư mục tài liệu.",
});
