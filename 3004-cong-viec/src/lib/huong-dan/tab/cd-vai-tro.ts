// Hướng dẫn bản 2 (tab) — Cài đặt › Người dùng & phân quyền › Vai trò và quyền (ma trận quyền). Viết 20/10/2026.
// Căn cứ code: components/quan-tri/MaTranQuyen.tsx (ma trận, nút, nhóm quyền) · lib/types.ts (DANH_MUC_QUYEN — 19 quyền) · lib/khoi-tao.ts (VAI_TRO_MAC_DINH — 6 vai trò cài sẵn)
// · packages/sci-identity/src/quyen.ts (phạm vi, laQuanTriToanBo, duocTraoVaiTro) · app/api/quan-tri/_chung.ts + vai-tro/*/route.ts (ai sửa được).
// Bộ vai trò và phạm vi dưới đây là bộ CÀI SẴN khi lập hệ thống; bản đang chạy có thể đã được chỉnh — ma trận trên màn mới là số thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Vai trò và quyền — ai được làm gì, ở phạm vi nào",
  ai: "Xem: người có quyền «Quản lý người dùng, đơn vị, vai trò» ở phạm vi nào đó (bộ cài sẵn chỉ có Quản trị viên). Sửa: chỉ người quản lý người dùng ở phạm vi «Toàn bộ» — người khác mở ra chỉ xem, thấy dòng «Chỉ người quản lý toàn bộ người dùng mới sửa được ma trận này. Bạn đang xem.» và không thấy các nút «Vai trò mới», «Lưu thay đổi», biểu tượng bút và thùng rác. Không ai nâng được phạm vi vượt quá quyền mình đang có.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Một bảng lớn: mỗi hàng là một quyền (ví dụ «Giao việc», «Xem sổ cái»), mỗi cột là một vai trò (ví dụ «Nhân viên», «Trưởng phòng / GĐ đơn vị»). Ô giao giữa hàng và cột cho biết vai trò đó làm được việc đó ở PHẠM VI nào: Không · Của mình · Đơn vị mình · Mình + cấp dưới · Toàn bộ.",
            "Người dùng không được cấp quyền trực tiếp. Mỗi người được gán một hoặc vài vai trò (ở mục «Tổ chức & người dùng»); quyền của họ là phần rộng nhất trong các vai trò đó.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          doan: [
            "Nếu phải cấp quyền cho từng người thì khó kiểm soát và dễ sót. Gom thành vai trò thì khi muốn mọi trưởng phòng thêm một quyền, chỉ đổi một ô.",
            "Phạm vi quan trọng ngang quyền: cùng là «Giao việc» nhưng nhân viên không có, trưởng phòng chỉ giao trong phòng và các đơn vị dưới, lãnh đạo giao toàn công ty.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn này"],
            ["Trước", "Lập cây đơn vị ở mục «Tổ chức & người dùng»", "Phạm vi «Đơn vị mình», «Mình + cấp dưới» tính theo cây này"],
            ["Màn này", "Quyết định vai trò nào có quyền gì, ở phạm vi nào; tạo vai trò mới", "Bộ luật phân quyền của cả hệ thống"],
            ["Sau", "Gán vai trò cho người (mục «Tổ chức & người dùng», «Nhập từ Excel»); mọi màn khác kiểm quyền theo ma trận này", "Nút nào hiện, việc nào giao được, hồ sơ nào xem được"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Ma trận (3 nhóm quyền: «Thư mục và tài liệu», «Công việc và sổ cái», «Quản trị»)", "Xem và đổi phạm vi từng ô", "① Đọc ma trận · ② Sửa và lưu"],
            ["Đầu cột vai trò: tên, «N người», «· hệ thống», biểu tượng bút, thùng rác", "Biết vai trò có mấy người; đổi tên hay xóa", "④ Vai trò mới, sửa, xóa"],
            ["Nút «Vai trò mới», «Bỏ thay đổi», «Lưu thay đổi (N)» (góc trên phải)", "Tạo vai trò; hủy hoặc lưu các ô đang sửa", "② · ④"],
            ["Dòng chú thích cuối bảng", "Nhắc cách tính khi người có nhiều vai trò", "① Đọc ma trận"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở màn này"],
            ["Người", "Quản trị bấm ô để đổi phạm vi, tạo vai trò, bấm «Lưu thay đổi»"],
            ["Máy", "Xoay vòng phạm vi, chặn mức vượt quyền của người đang sửa, kiểm tra lúc lưu, ghi nhật ký từng thay đổi, rồi áp dụng quyền mới ở thao tác kế tiếp của mọi người"],
            ["🤖 AI", "— Màn này không dùng AI."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI: quyền là việc nghiêm túc nhất của hệ thống nên chỉ người quyết định và máy áp dụng đúng như đã ghi."],
        },
      ],
    },
    {
      ten: "① Đọc ma trận",
      khoi: [
        {
          tieuDe: "Năm mức phạm vi",
          bang: [
            ["Chữ trong ô", "Nghĩa", "Màu viền"],
            ["Không", "Vai trò không có quyền này", "Xám nhạt"],
            ["Của mình", "Chỉ với thứ do chính mình tạo hoặc giao", "Xám"],
            ["Đơn vị mình", "Mọi thứ thuộc đơn vị mình đang thuộc (kể cả đơn vị kiêm nhiệm)", "Xanh dương"],
            ["Mình + cấp dưới", "Đơn vị mình và mọi đơn vị con, cháu bên dưới", "Vàng"],
            ["Toàn bộ", "Toàn công ty", "Xanh lá"],
          ],
        },
        {
          doan: [
            "Ý nghĩa cụ thể của từng phạm vi nằm trong lời mô tả của từng quyền ngay cột trái. Ví dụ quyền «Gia hạn, thêm hoặc đổi người, hủy việc»: Của mình là việc mình giao; Đơn vị mình là việc đơn vị mình chủ trì; Mình + cấp dưới là cả đơn vị cấp dưới chủ trì; Toàn bộ là mọi việc. Đứng phối hợp thì không bao giờ được sửa.",
            "Dưới mỗi tên quyền có một mã chữ nhỏ (ví dụ cong_viec.giao). Mã đó chỉ để quản trị tra cứu khi làm việc với người phát triển.",
          ],
        },
        {
          tieuDe: "Ba nhóm và 19 quyền",
          bang: [
            ["Nhóm", "Quyền (rút gọn)"],
            ["Thư mục và tài liệu (7)", "Xem tài liệu · Tải thẳng lên thư mục · Xóa · Khôi phục từ thùng rác · Gửi, chuyển tiếp, trả lại · Kiểm soát báo cáo · Văn thư vào sổ văn bản đến"],
            ["Công việc và sổ cái (6)", "Giao việc và bình luận · Gia hạn, đổi người, hủy việc · Sửa việc (cây bút) · Tag tên mở rộng (@@) · Xem sổ cái · Xem lịch sử"],
            ["Quản trị (6)", "Duyệt gắn WBS · Quản lý mẫu báo cáo · Thêm kỹ năng AI vào kho chung · Cấp khóa cho agent đọc sổ cái · Quản lý người dùng, đơn vị, vai trò · Sửa cài đặt hệ thống"],
          ],
        },
        {
          luuY: [
            "Dòng cuối bảng nhắc ba điều: người có nhiều vai trò lấy phạm vi rộng nhất; quản trị viên (cờ đặt trên tài khoản) luôn có mọi quyền, không phụ thuộc vai trò; vai trò hệ thống sửa được quyền nhưng không xóa được.",
            "Quyền của vai trò «Trưởng phòng / GĐ đơn vị» chỉ áp ở đơn vị mà người đó thật sự làm trưởng (xem mục «Tổ chức & người dùng», phần «Làm trưởng ở»).",
          ],
        },
        {
          viDu: [
            "Giả sử chị A là nhân viên của Phòng Kinh tế và Vận hành, có thêm vai trò «Văn thư». Cột «Nhân viên» ghi quyền «Giao việc» là Không, cột «Văn thư» cũng Không → chị A không giao được việc.",
            "Với quyền «Tag tên mở rộng»: «Nhân viên» có Mình + cấp dưới, «Văn thư» có Toàn bộ → chị A lấy mức rộng nhất là Toàn bộ, gõ @@ gợi ý được cả công ty.",
          ],
        },
      ],
    },
    {
      ten: "② Sửa và lưu",
      khoi: [
        { doan: ["Chỉ người quản lý người dùng ở phạm vi Toàn bộ mới sửa được. Người khác thấy ma trận nhưng các ô không bấm được."] },
        {
          bam: [
            "Mở Cài đặt → tab «👥 Người dùng & phân quyền» → mục «Vai trò và quyền».",
            "Bấm vào ô cần đổi: mỗi lần bấm đổi sang mức kế tiếp theo vòng Không → Của mình → Đơn vị mình → Mình + cấp dưới → Toàn bộ → Không.",
            "Ô đã đổi so với bản đang chạy có viền cam. Nút «Lưu thay đổi» hiện số ô đã đổi, ví dụ «Lưu thay đổi (3)».",
            "Đổi xong bấm «Lưu thay đổi (N)». Muốn hủy hết bấm «Bỏ thay đổi».",
          ],
        },
        {
          ketQua: [
            "Máy báo «Đã lưu N thay đổi quyền. Ghi vào nhật ký.» Mỗi thay đổi (vai trò nào, quyền nào, từ mức nào sang mức nào) vào mục «Lịch sử».",
            "Quyền mới áp dụng từ thao tác kế tiếp của từng người; người đang mở màn có thể cần tải lại trang để menu hiện đúng.",
          ],
        },
        {
          tieuDe: "Giới hạn khi sửa",
          ds: [
            "Bạn không nâng được ô lên mức rộng hơn quyền bạn đang có. Khi bấm, các mức vượt quyền bị bỏ qua tự động; quản trị viên (có cờ) thì không bị giới hạn này.",
            "Máy lưu lần lượt từng vai trò. Nếu một vai trò bị từ chối giữa chừng, thông báo lỗi hiện lên và các vai trò đã lưu trước đó vẫn giữ nguyên.",
          ],
        },
        {
          viDu: [
            "Muốn nhân viên cũng xem được lịch sử đơn vị mình: tại hàng «Xem lịch sử» cột «Nhân viên» đang là Của mình, bấm hai lần đến «Mình + cấp dưới» hoặc một lần đến «Đơn vị mình». Ô viền cam, nút ghi «Lưu thay đổi (1)». Bấm Lưu: mọi nhân viên từ nay xem được lịch sử trong đơn vị mình.",
            "Đổi nhầm: chưa bấm «Lưu thay đổi» thì bấm «Bỏ thay đổi» là về nguyên trạng; đã lưu rồi thì bấm lại ô đó đổi về mức cũ và lưu lần nữa.",
          ],
        },
        { luuY: ["Đổi quyền là đổi cho TẤT CẢ người mang vai trò đó. Trước khi đổi, đọc số ở đầu cột («N người») để biết bao nhiêu người bị ảnh hưởng."] },
      ],
    },
    {
      ten: "③ Bộ vai trò cài sẵn",
      khoi: [
        {
          doan: [
            "Khi lập hệ thống có sẵn 6 vai trò (đều là vai trò hệ thống, không xóa được). Bảng dưới là quyền cài sẵn; bản đang chạy có thể đã được chỉnh, nên luôn lấy ma trận trên màn làm chuẩn.",
            "Viết tắt: TB = Toàn bộ · CD = Mình + cấp dưới · ĐV = Đơn vị mình · CM = Của mình · dấu gạch = Không.",
          ],
        },
        {
          bang: [
            ["Quyền (rút gọn)", "Quản trị viên", "Lãnh đạo", "Trưởng phòng / GĐ", "Nhân viên", "Văn thư", "Tải thẳng lên"],
            ["Xem tài liệu", "TB", "TB", "TB", "TB", "—", "—"],
            ["Tải thẳng lên thư mục", "TB", "—", "—", "—", "TB", "ĐV"],
            ["Xóa tài liệu", "TB", "CM", "ĐV", "CM", "—", "—"],
            ["Khôi phục từ thùng rác", "TB", "CM", "ĐV", "CM", "—", "—"],
            ["Gửi, chuyển tiếp, trả lại", "TB", "TB", "ĐV", "ĐV", "TB", "—"],
            ["Kiểm soát báo cáo", "TB", "TB", "CD", "—", "—", "—"],
            ["Văn thư vào sổ đến", "TB", "—", "—", "—", "TB", "—"],
            ["Giao việc và bình luận", "TB", "TB", "CD", "—", "—", "—"],
            ["Gia hạn, đổi người, hủy việc", "TB", "TB", "CM", "CM", "—", "—"],
            ["Sửa việc (cây bút)", "TB", "TB", "CM", "CM", "—", "—"],
            ["Tag tên mở rộng (@@)", "TB", "TB", "TB", "CD", "TB", "—"],
            ["Xem sổ cái", "TB", "TB", "TB", "TB", "—", "—"],
            ["Xem lịch sử", "TB", "TB", "CD", "CM", "—", "—"],
            ["Duyệt gắn WBS", "TB", "TB", "CD", "—", "—", "—"],
            ["Quản lý mẫu báo cáo", "TB", "—", "—", "—", "—", "—"],
            ["Thêm kỹ năng AI vào kho chung", "TB", "—", "—", "—", "—", "—"],
            ["Cấp khóa cho agent", "TB", "—", "—", "—", "—", "—"],
            ["Quản lý người dùng, đơn vị, vai trò", "TB", "—", "—", "—", "—", "—"],
            ["Sửa cài đặt hệ thống", "TB", "—", "—", "—", "—", "—"],
          ],
        },
        {
          tieuDe: "Bốn nhóm người dùng thường gặp",
          bang: [
            ["Nhóm", "Vai trò", "Làm được gì về cơ bản"],
            ["Quản trị viên", "Cờ «Quản trị viên» trên tài khoản + vai trò «Quản trị viên»", "Mọi thứ, kể cả phân quyền, cài đặt, người dùng"],
            ["Lãnh đạo (Tổng giám đốc, Phó Tổng giám đốc)", "Lãnh đạo (TGĐ, Phó TGĐ)", "Xem, kiểm soát và giao việc mọi đơn vị; không sửa được người dùng, vai trò và cài đặt"],
            ["Trưởng phòng, giám đốc đơn vị", "Trưởng phòng / GĐ đơn vị", "Giao việc và kiểm soát báo cáo trong đơn vị mình và đơn vị dưới"],
            ["Nhân viên", "Nhân viên", "Xem, soạn và gửi báo cáo của đơn vị; chỉ sửa việc do mình giao"],
          ],
        },
        {
          doan: ["Hai vai trò còn lại là vai trò GẮN THÊM, không đứng một mình: «Văn thư» (vào sổ văn bản đến thay người ngoài công ty) và «Tải thẳng lên thư mục» (cho phép tải tài liệu vào thư mục đơn vị mình mà không qua màn Soạn và gửi)."],
        },
        {
          luuY: ["Trong bộ cài sẵn không có vai trò riêng cho người chỉ xem. Nếu cần, tạo bằng nút «Vai trò mới» rồi bật chỉ các quyền xem (xem tab «④ Vai trò mới, sửa, xóa»)."],
        },
        {
          viDu: [
            "Chị B làm trưởng Phòng Cơ điện nên mang vai «Trưởng phòng / GĐ đơn vị»: giao việc được cho Phòng Cơ điện và đơn vị dưới (Mình + cấp dưới), nhưng không giao được việc cho Phòng Tài chính Kế toán.",
            "Anh C là nhân viên Phòng Cơ điện: không có quyền «Giao việc», nên nút giao việc không hiện với anh (nút không có quyền thì ẩn hẳn).",
          ],
        },
      ],
    },
    {
      ten: "④ Vai trò mới, sửa, xóa",
      khoi: [
        { doan: ["Ngoài 6 vai trò cài sẵn, quản trị tạo thêm vai trò riêng, ví dụ cho nhóm chỉ xem hoặc người phụ trách một mảng. Mỗi thao tác dưới đây chỉ người quản lý toàn bộ người dùng mới thấy."] },
        {
          tieuDe: "Tạo vai trò mới",
          bam: [
            "Bấm «Vai trò mới» (góc trên phải). Hộp «Vai trò mới» có hướng dẫn riêng.",
            "Điền «Tên vai trò», «Mô tả»; có thể chọn «Chép quyền từ vai trò» để bắt đầu từ bộ quyền sẵn có.",
            "Bấm «Lưu». Vai trò mới thành một cột mới ở cuối ma trận; bấm các ô trong cột để bật quyền rồi «Lưu thay đổi».",
          ],
        },
        {
          tieuDe: "Sửa tên, mô tả",
          doan: ["Ở đầu cột của vai trò, bấm biểu tượng bút (rê chuột hiện «Đổi tên, mô tả») để mở hộp «Sửa vai trò: …». Đổi tên hay mô tả không đổi mã vai trò và không ảnh hưởng quyền."],
        },
        {
          tieuDe: "Xóa vai trò",
          doan: ["Ở đầu cột của vai trò tự tạo, bấm biểu tượng thùng rác (rê chuột hiện «Xóa vai trò»), rồi xác nhận câu hỏi «Xóa vai trò …?»."],
          luuY: [
            "Vai trò hệ thống (có chữ «· hệ thống» ở đầu cột) không có thùng rác — không xóa được.",
            "Vai trò đang gán cho người thì máy từ chối: «Vai trò đang gán cho N người — gỡ khỏi họ trước khi xóa».",
          ],
        },
        {
          viDu: [
            "Tạo vai trò «Người xem báo cáo»: bấm «Vai trò mới», tên «Người xem báo cáo», mô tả «Chỉ xem tài liệu và sổ cái», chọn «Chép quyền từ vai trò» để trống. Lưu. Trong cột mới bấm hàng «Xem tài liệu» đến Toàn bộ và hàng «Xem sổ cái» đến Toàn bộ, các hàng khác để Không, bấm «Lưu thay đổi (2)».",
            "Gán vai trò này cho người cần xem ở mục «Tổ chức & người dùng» → «Sửa» → ô Vai trò. Người đó không thấy nút giao việc, xóa hay gửi.",
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
            ["Không thấy mục «Vai trò và quyền» trong menu", "Bạn không có quyền «Quản lý người dùng, đơn vị, vai trò». Nhờ quản trị viên."],
            ["Mở được nhưng các ô không bấm được", "Bạn chỉ xem. Chỉ người quản lý toàn bộ người dùng sửa được ma trận."],
            ["Bấm ô mà không lên được mức rộng hơn", "Quyền của chính bạn ở hàng đó chỉ tới mức hiện tại; không ai trao được quyền rộng hơn quyền mình có."],
            ["Lưu báo «Không đặt được phạm vi rộng hơn quyền bạn đang có»", "Bạn đang đặt cho vai trò một ô vượt quyền của mình. Hạ ô đó xuống rồi lưu lại."],
            ["Đổi quyền rồi mà một người vẫn không làm được", "Người đó có thể không mang vai trò vừa sửa; hoặc đang là trưởng ở đơn vị khác với đơn vị bạn nghĩ. Mở người đó ở mục «Tổ chức & người dùng»."],
            ["Muốn cho ai đó xem tất cả mà không giao việc", "Tạo vai trò mới chỉ bật quyền xem (xem tab «④ Vai trò mới, sửa, xóa»)."],
            ["Xóa vai trò báo lỗi", "Vai trò hệ thống hoặc đang gán cho người. Gỡ khỏi người trước; vai trò hệ thống không xóa được."],
          ],
        },
      ],
    },
  ],
  canCu: "Danh mục 19 quyền và 6 vai trò cài sẵn của phần mềm · phạm vi Của mình ⊂ Đơn vị mình ⊂ Mình + cấp dưới ⊂ Toàn bộ · không trao quyền rộng hơn quyền mình · nút không có quyền thì ẩn (luật 17 riêng 3004) · trưởng chính / trưởng phụ (chốt 03/10 và 08/10/2026).",
};
