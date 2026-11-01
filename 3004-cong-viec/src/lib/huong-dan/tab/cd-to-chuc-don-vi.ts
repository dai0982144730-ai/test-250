// Hướng dẫn bản 2 (tab) — hộp «Thêm đơn vị gốc» / «Thêm đơn vị con của …» / «Sửa đơn vị: …» (mở từ mục Tổ chức & người dùng). Viết 20/10/2026. Không dùng AI.
// Căn cứ code: components/quan-tri/CayDonVi.tsx (SuaDonVi — nhãn, gợi ý ô) · app/api/quan-tri/don-vi/route.ts, [id]/route.ts (quyền) · packages/sci-identity/src/don-vi.ts (kiểm, ngừng) · lib/to-chuc.ts (đơn vị chức danh).
// Ô «Mẫu báo cáo của đơn vị»: chỉ thấy hiện ở cột mẫu của Thư mục và ở trợ lý chat; chưa thấy chỗ kiểm tra báo cáo đọc ô này (ghi ⏸ trong báo cáo).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Hộp «Đơn vị» — thêm đơn vị gốc, thêm đơn vị con, sửa đơn vị",
  ai: "Sửa và thêm đơn vị con: người quản lý đơn vị đó (trong phạm vi quyền «Quản lý người dùng, đơn vị, vai trò»). Thêm đơn vị gốc, đưa đơn vị lên làm gốc, đổi cấp đơn vị, đặt đơn vị con có cấp cao hơn đơn vị cha: chỉ người quản lý ở phạm vi Toàn bộ. Người không đủ quyền không thấy nút «Sửa đơn vị» và «Đơn vị con».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Hộp này là gì",
          doan: [
            "Hộp khai báo một đơn vị của công ty: Ban Tổng giám đốc, phòng, nhà máy, ban quản lý dự án, ban điều hành… Ba tiêu đề: «Thêm đơn vị gốc» (đơn vị không có cha), «Thêm đơn vị con của <tên đơn vị cha>», «Sửa đơn vị: <tên>».",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: [
            "Đơn vị là nền của mọi thứ: sơ đồ tổ chức, giao việc, luồng báo cáo, thư mục tài liệu, quyền theo phạm vi. Thêm đơn vị mới hoặc đổi cấp, đơn vị cha là đổi cả bức tranh đó.",
            "Cấp đặc biệt quan trọng: cấp nhỏ là cấp cao, quy tắc đè khi hai báo cáo trùng một việc dựa vào cấp.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Việc", "Vai trò của hộp"],
            ["Trước", "Công ty lập hoặc thay đổi tổ chức (thêm nhà máy, thêm ban điều hành, đổi tên phòng)", "—"],
            ["Hộp này", "Quản trị khai đơn vị mới hoặc sửa đơn vị", "Cập nhật cây đơn vị"],
            ["Sau", "Thêm người vào đơn vị; khai luồng báo cáo, tên gọi khác, công ty của đơn vị ở các mục Cài đặt khác", "Đơn vị mới dùng được ở khắp hệ thống"],
          ],
        },
        {
          tieuDe: "④ Các ô trong hộp",
          bang: [
            ["Ô", "Để làm gì", "Xem tab"],
            ["«Tên đơn vị» (hoặc «Chức danh» nếu loại là chức danh), «Tên ngắn» (hoặc «Viết tắt»)", "Tên hiện khắp nơi", "① Tên và mã"],
            ["«Mã (không bắt buộc)» (chỉ khi thêm)", "Mã nội bộ không đổi được", "① Tên và mã"],
            ["«Cấp», «Đơn vị cha», «Loại»", "Vị trí và tính chất trong cây", "② Cấp, đơn vị cha, loại"],
            ["«Mẫu báo cáo của đơn vị», «Thứ tự hiển thị»", "Mẫu và thứ tự", "③ Mẫu báo cáo, thứ tự"],
            ["Nút «Hủy» và «Lưu»", "Đóng hoặc ghi. «Lưu» mờ khi chưa có tên hoặc cấp", "Mọi tab"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở hộp này"],
            ["Người", "Điền tên, cấp, đơn vị cha, loại; bấm «Lưu»"],
            ["Máy", "Gợi ý cấp mặc định (cấp đơn vị cha cộng 1, tối đa 9; đơn vị gốc mặc định 3); tạo mã từ tên ngắn; chặn đặt đơn vị cha thành chính con cháu của nó; kiểm quyền; ghi nhật ký; tự ghép tên cho đơn vị chức danh"],
            ["🤖 AI", "— Hộp này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Hộp này không dùng AI: người điền, máy kiểm và ghi."],
        },
      ],
    },
    {
      ten: "① Tên và mã",
      khoi: [
        {
          bang: [
            ["Ô", "Điền gì", "Ghi chú"],
            ["Tên đơn vị", "Tên đầy đủ, gợi ý trong ô: Văn phòng HĐQT", "Bắt buộc"],
            ["Tên ngắn", "Tên viết gọn, gợi ý: VP HĐQT", "Để trống thì máy lấy luôn tên đầy đủ. Tên ngắn hiện trong nhiều bảng và là cách điền đơn vị khi nhập Excel"],
            ["Mã (không bắt buộc)", "Chữ thường không dấu, số, gạch ngang; gợi ý: vp-hdqt", "Chỉ có khi thêm. Để trống thì máy tự tạo từ tên ngắn. Không đổi được sau khi tạo; trùng mã máy báo lỗi"],
          ],
        },
        {
          tieuDe: "Với đơn vị loại chức danh lãnh đạo",
          doan: ["Nếu ô «Loại» chọn «Chức danh lãnh đạo (hiện tên người)», hai ô đầu đổi nhãn thành «Chức danh» (gợi ý: Phó Tổng Giám đốc) và «Viết tắt» (gợi ý: PTGĐ). Bạn chỉ ghi chức danh; tên đơn vị trên cây do máy tự ghép từ chức danh và tên người giữ chức danh đó."],
        },
        {
          viDu: [
            "Giả sử công ty có thêm một ban điều hành tổng thầu: «Tên đơn vị» ghi «Ban điều hành tổng thầu dự án Ví dụ», «Tên ngắn» ghi «BĐH Ví dụ». Bỏ trống «Mã»: máy tạo mã từ «BĐH Ví dụ».",
            "Gõ mã trùng một mã đã có: máy báo «Mã đơn vị … đã có». Bỏ trống mã thì máy tự thêm số để không trùng.",
          ],
        },
      ],
    },
    {
      ten: "② Cấp, đơn vị cha, loại",
      khoi: [
        {
          tieuDe: "Cấp",
          doan: ["Ô «Cấp» là số nguyên từ 0 đến 99, gợi ý ngay cạnh ô: 0 = trên Ban Tổng giám đốc, 1 = Ban Tổng giám đốc, 2 = phòng, 3 = đơn vị, 9 = bên ngoài. Cấp nhỏ là cấp cao. Khi thêm đơn vị con, máy điền sẵn cấp bằng cấp của đơn vị cha cộng 1 (tối đa 9); thêm đơn vị gốc điền sẵn 3."],
        },
        {
          tieuDe: "Đơn vị cha",
          doan: ["Danh sách đơn vị đang hoạt động, đơn vị con thụt vào; đơn vị ngoài phạm vi quản lý của bạn hiện mờ. Khi sửa, danh sách bỏ chính đơn vị này và mọi đơn vị con cháu của nó (chọn vào đó sẽ thành vòng tròn). «— Không (đơn vị gốc) —» để trống."],
        },
        {
          tieuDe: "Loại",
          bang: [
            ["Loại", "Dùng cho"],
            ["Ban Tổng giám đốc", "Cấp lãnh đạo cao nhất"],
            ["Chức danh lãnh đạo (hiện tên người)", "Từng chức danh trong Ban Tổng giám đốc; tên hiện kèm người giữ"],
            ["Phòng", "Các phòng chuyên môn"],
            ["Đơn vị", "Nhà máy, ban quản lý dự án, ban điều hành…"],
            ["Đơn vị riêng", "Đơn vị đặc thù, ngoài cơ cấu phòng và đơn vị thường"],
            ["Nhóm cá nhân", "Nhóm cá nhân ngoài cơ cấu; người thuộc nhóm này có thể được gửi tệp không theo mẫu nếu bật ở mục «Người ngoài, chưa gán đơn vị»"],
            ["Bên ngoài", "Đối tác, bên ngoài công ty"],
          ],
        },
        { luuY: ["Loại «Phòng» và «Đơn vị» là hai loại được máy kiểm tra có đúng một trưởng (cảnh báo vàng trên cây); các loại khác không bị xét."] },
        {
          viDu: [
            "Thêm một nhà máy mới dưới Phòng Kinh tế và Vận hành: chọn Phòng Kinh tế và Vận hành rồi bấm «Đơn vị con». Hộp mở với tiêu đề «Thêm đơn vị con của Phòng Kinh tế và Vận hành», «Cấp» tự điền 3, «Đơn vị cha» là Phòng Kinh tế và Vận hành, «Loại» chọn «Đơn vị».",
            "Muốn đặt nhà máy này cấp 2 hoặc 1 (cao hơn cấp 3 mặc định): nếu cấp đó nhỏ hơn cấp của đơn vị cha thì chỉ người quản lý toàn bộ mới đặt được.",
          ],
        },
        { luuY: ["Đổi cấp của đơn vị đã có, đưa đơn vị lên làm đơn vị gốc, hoặc đặt cấp nhỏ hơn cấp của đơn vị cha đều ảnh hưởng quy tắc đè của cả công ty nên chỉ người quản lý toàn bộ làm được. Người khác bấm «Lưu» sẽ nhận lời báo từ chối."] },
      ],
    },
    {
      ten: "③ Mẫu báo cáo, thứ tự",
      khoi: [
        {
          bang: [
            ["Ô", "Điền gì", "Ghi chú"],
            ["Mẫu báo cáo của đơn vị", "Chọn một mẫu báo cáo trong danh sách (mỗi dòng ghi mã và tên mẫu) hoặc «— Không có mẫu riêng —»", "Ghi nhận đơn vị dùng mẫu báo cáo nào. Mẫu hiện ở cột mẫu của bảng Thư mục (ví dụ Form 7) và được trợ lý chat dùng để lọc báo cáo"],
            ["Thứ tự hiển thị", "Một số; để trống thì tự xếp cuối", "Số nhỏ xếp trước cùng cấp cha trong cây và nhiều danh sách"],
          ],
        },
        {
          viDu: [
            "BQLDA Lào cùng cách làm báo cáo với BQLDA Quảng Trị nên dùng cùng mẫu (Form 7). Nhà máy Nậm Xe và các nhà máy khác cùng khối dùng Form 8. Ban điều hành tổng thầu từng dự án dùng Form 10.",
            "Thứ tự hiển thị: muốn một phòng mới đứng trước các phòng đang có cùng đơn vị cha, đặt số nhỏ hơn số của chúng; để trống thì phòng đó nằm cuối.",
          ],
        },
        { luuY: ["Máy nhận ra báo cáo của đơn vị nào chủ yếu từ nội dung tệp báo cáo (xem mục «Tên gọi khác của đơn vị»), không chỉ từ ô này."] },
      ],
    },
    {
      ten: "④ Lưu và ngừng",
      khoi: [
        {
          bam: [
            "Điền xong bấm «Lưu» (đang lưu ghi «Đang lưu…»).",
            "Thêm: máy báo «Đã thêm đơn vị … (mã …)». Sửa: báo «Đã lưu …».",
            "Đơn vị mới hiện ngay trên cây ở mục «Tổ chức & người dùng».",
          ],
        },
        {
          ketQua: [
            "Máy ghi một dòng nhật ký: thêm hoặc sửa đơn vị, từng trường đổi từ gì sang gì.",
            "Đơn vị chức danh: máy tự ghép lại tên đơn vị theo chức danh và người giữ.",
          ],
        },
        {
          tieuDe: "Ngừng hoạt động (không nằm trong hộp)",
          doan: ["Ngừng đơn vị làm bằng nút tròn ở đầu cột phải của mục «Tổ chức & người dùng». Máy không cho ngừng khi đơn vị còn đơn vị con đang hoạt động hoặc còn người đang hoạt động thuộc đơn vị đó."],
        },
        {
          viDu: [
            "Sửa tên «Phòng Hành chính Tổng hợp» thành «Phòng Hành chính – Nhân sự»: mở «Sửa đơn vị», đổi «Tên đơn vị», bấm «Lưu». Mọi nơi hiện tên mới; mã và lịch sử giữ nguyên.",
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
            ["Nút «Lưu» mờ", "Chưa có tên đơn vị hoặc ô «Cấp» để trống."],
            ["Không thấy nút «Sửa đơn vị» hoặc «Đơn vị con»", "Đơn vị đó ngoài phạm vi quản lý của bạn."],
            ["Không có nút «Đơn vị gốc»", "Chỉ người quản lý toàn bộ người dùng mới thêm đơn vị gốc."],
            ["Báo «Đơn vị con không được có cấp cao hơn đơn vị cha …»", "Chỉ người quản lý toàn bộ mới đặt được. Chọn cấp bằng hoặc lớn hơn cấp của đơn vị cha."],
            ["Báo «Chỉ người quản lý toàn bộ … đổi cấp đơn vị»", "Đổi cấp ảnh hưởng quy tắc đè toàn công ty. Nhờ người quản lý toàn bộ."],
            ["Không chọn được đơn vị cha mong muốn", "Đơn vị đó nằm trong cây con của chính đơn vị đang sửa, hoặc đã ngừng, hoặc ngoài phạm vi của bạn."],
            ["Báo «Mã đơn vị chỉ gồm chữ thường không dấu, số và dấu gạch ngang»", "Sửa lại mã hoặc để trống."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Quản lý người dùng, đơn vị, vai trò» theo phạm vi · cấp ảnh hưởng quy tắc đè nên đổi cấp chỉ người quản lý toàn bộ · đơn vị chức danh tự ghép tên (chốt đợt Chức danh) · luật 17 riêng 3004 (nút không có quyền thì ẩn).",
};
