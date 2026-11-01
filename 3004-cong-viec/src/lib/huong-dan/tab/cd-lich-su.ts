// Hướng dẫn bản 2 (tab) — Cài đặt › Riêng của agent › Lịch sử. Viết 20/10/2026. Nhãn chép từ components/lich-su/TraCuuLichSu.tsx và KiemTraToanVen.tsx.
// Đối chiếu code 20/10: quyền xem theo «lich_su.xem» (phạm vi cua_minh · don_vi · don_vi_va_cap_duoi · toan_bo, quản trị xem toàn bộ); sổ chỉ ghi thêm (cơ sở dữ liệu chặn sửa, xoá); mỗi dòng có mã băm nối với dòng trước.
// Màn này không dùng AI. Bấm một tên đối tượng mở khung «Dòng thời gian» (hướng dẫn riêng: ls-dong-thoi-gian). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Cài đặt — Lịch sử (sổ ghi mọi thao tác, chỉ ghi thêm)",
  ai: "Người được cấp quyền «Xem lịch sử» mới tra được; quản trị viên xem toàn bộ. Phạm vi xem của mỗi người ghi ngay dưới tên màn («Bạn đang xem: …»). Người chưa có quyền thấy dòng đỏ «Bạn chưa được cấp quyền xem lịch sử». Màn chỉ để xem, không có nút sửa hay xoá nào.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Lịch sử là cuốn sổ ghi lại mọi thao tác trong ứng dụng: ai tải tài liệu lên, ai gửi, ai giao việc, ai gia hạn, ai đổi cài đặt, ai cấp khoá cho agent khác… Mỗi dòng cho biết lúc nào, ai làm, làm gì, trên đối tượng nào, kèm chi tiết ngắn.",
            "Sổ này CHỈ GHI THÊM. Không ai sửa hay xoá được một dòng đã ghi, kể cả quản trị viên: cơ sở dữ liệu chặn sửa và xoá. Bản tài liệu bị đè bằng bản mới hay bị đưa vào thùng rác vẫn còn nguyên trong sổ để mở lại.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Khi có tranh luận «ai đã đổi hạn việc này», «bản báo cáo nào đã gửi lúc nào», sổ cho câu trả lời có căn cứ thay vì nhớ lại.",
            "Mỗi dòng mang một mã băm nối với dòng liền trước. Nếu ai đó sửa lén một dòng, mã băm của dòng đó và mọi dòng sau không còn khớp, nút «Kiểm tra toàn vẹn» sẽ chỉ ra dòng bị sửa.",
            "Người xem chỉ thấy phần thuộc phạm vi của mình, nên tra cứu được mà không lộ việc của đơn vị khác.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của Lịch sử"],
            ["Trước", "Mọi màn khác (gửi báo cáo, giao việc, Sơ đồ tổ chức, Cài đặt…) làm việc của mình", "Mỗi thao tác tự ghi một dòng vào sổ, người dùng không phải làm gì thêm"],
            ["Màn này", "Tra cứu, đối chiếu, kiểm tra sổ còn nguyên vẹn", "Chỉ ĐỌC sổ"],
            ["Sau", "Khi cần giải trình hoặc tìm lại bản cũ", "Từ một dòng, mở dòng thời gian của đối tượng, mở lại đúng bản tài liệu cũ, tải bản Word, hoặc mở việc trên Sơ đồ tổ chức"],
          ],
        },
        {
          tieuDe: "④ Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Tên màn «Lịch sử», câu giải thích và dòng «Bạn đang xem: …»", "Cho biết phạm vi bạn được xem", "① Lọc và tìm"],
            ["Nút «Kiểm tra toàn vẹn» (góc phải trên)", "Băm lại cả sổ, báo còn nguyên hay gãy ở dòng nào", "③ Kiểm tra toàn vẹn"],
            ["Hàng ô lọc: «Từ ngày», «Đến ngày», «Người», «Đơn vị», «Loại», «Hành động», «Từ khóa», nút «Tìm», «Bỏ lọc»", "Thu hẹp sổ theo điều kiện", "① Lọc và tìm"],
            ["Dòng «N dòng, mới nhất trước» và bảng sáu cột «Lúc», «Người», «Hành động», «Đối tượng», «Chi tiết», «Mã băm»", "Danh sách kết quả", "② Đọc bảng"],
            ["Thanh chia trang ở cuối bảng", "Mỗi trang 30 dòng", "② Đọc bảng"],
            ["Khung mở khi bấm tên một đối tượng", "Dòng thời gian đầy đủ của đối tượng đó", "Hướng dẫn riêng «Dòng thời gian của một đối tượng»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở màn này"],
            ["Người", "Chọn điều kiện lọc, bấm «Tìm», đọc kết quả, bấm tên đối tượng để xem dòng thời gian, bấm «Kiểm tra toàn vẹn» khi cần chắc sổ không bị sửa."],
            ["Máy", "Ghi mỗi thao tác vào sổ ngay lúc nó xảy ra; chỉ trả về phần bạn được xem; chia trang; tính mã băm và so lại khi kiểm tra. Cùng dữ liệu thì luôn ra cùng kết quả."],
            ["🤖 AI", "— Màn này không dùng AI. Mọi dòng trong sổ là máy ghi lại việc đã xảy ra, không phải AI diễn giải. Riêng những dòng của việc do AI đề xuất (ví dụ «Duyệt mã WBS 🤖 AI đề xuất») đã mang dấu 🤖 ngay trong tên hành động."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI: người tra, máy đọc sổ và trả về đúng phần được xem."],
        },
        {
          luuY: [
            "Mục nằm ở tab «🧩 Riêng của agent» của màn Cài đặt (menu tên người → Cài đặt → Lịch sử). Đường dẫn cũ /lich-su vẫn dùng được: tự chuyển về đây và giữ nguyên bộ lọc.",
            "Bộ lọc bạn bấm «Tìm» được ghi lên địa chỉ trang, nên dán địa chỉ đó cho đồng nghiệp là họ thấy cùng kết quả (trong phạm vi quyền của họ).",
          ],
        },
      ],
    },
    {
      ten: "① Lọc và tìm",
      khoi: [
        {
          doan: ["Mở màn là thấy ngay các dòng mới nhất, chưa lọc gì. Khi cần tìm một việc cụ thể, bạn gõ điều kiện rồi bấm «Tìm». Bỏ trống ô nào thì ô đó không lọc."],
        },
        {
          tieuDe: "Các ô lọc",
          bang: [
            ["Ô", "Lọc theo", "Ghi chú"],
            ["«Từ ngày» · «Đến ngày»", "Khoảng thời gian", "Gõ hoặc chọn dd/mm/yyyy"],
            ["«Người»", "Người làm thao tác", "Gõ tên hoặc email; có danh sách gợi ý để chọn"],
            ["«Đơn vị»", "Đơn vị của người làm", "Chọn trong danh sách; «Tất cả» là không lọc"],
            ["«Loại»", "Loại đối tượng: Tài liệu · Công việc · Thư mục · Cài đặt · Người dùng · Đơn vị · Mẫu báo cáo · Kỹ năng AI · Agent", "Chọn trong danh sách"],
            ["«Hành động»", "Việc đã làm, chia nhóm «Tài liệu», «Công việc», «Khác»", "Mỗi hành động có tên tiếng Việt, ví dụ «Giao việc», «Gia hạn», «Vào sổ cái», «Đổi cài đặt»"],
            ["«Từ khóa»", "Chữ có trong chi tiết dòng", "Tên tài liệu, mã việc, tên tệp, lý do…"],
          ],
        },
        {
          tieuDe: "Bấm gì, theo thứ tự",
          bam: [
            "Mở Cài đặt → tab «🧩 Riêng của agent» → mục «Lịch sử».",
            "Chọn hoặc gõ điều kiện vào các ô lọc.",
            "Bấm «Tìm» (hoặc nhấn Enter trong một ô). Biểu tượng quay hiện lên trong lúc máy tìm.",
            "Muốn xoá hết điều kiện: bấm «Bỏ lọc» (chỉ hiện khi đang có điều kiện) — màn tìm lại không lọc.",
          ],
        },
        {
          viDu: [
            "Tình huống: trưởng phòng hỏi «tuần trước ai xin gia hạn việc của phòng mình». Bạn chọn «Từ ngày» và «Đến ngày» là tuần trước (ví dụ khoảng 7 ngày · 12/10/2026 – 18/10/2026), chọn «Đơn vị» là phòng đó, chọn «Hành động» → nhóm «Công việc» → «Gia hạn», bấm «Tìm».",
            "Bảng chỉ còn những dòng «Gia hạn» của tuần đó; cột «Chi tiết» ghi «hạn <cũ> → <mới>» và lý do nếu người xin có ghi.",
          ],
        },
        {
          ketQua: [
            "Dòng «N dòng, mới nhất trước» cho biết tổng số dòng khớp. Không khớp dòng nào thì bảng hiện «Không có dòng lịch sử nào khớp bộ lọc.»",
            "Điều kiện bạn đã bấm «Tìm» được giữ trên địa chỉ trang. Điều kiện bạn mới gõ mà chưa bấm «Tìm» thì chưa tính, kể cả khi sang trang khác.",
          ],
        },
        {
          luuY: [
            "Chỉ thấy phần thuộc phạm vi của bạn: «việc của mình và tài liệu, công việc của mình», «đơn vị mình», «đơn vị mình và cấp dưới» hoặc «toàn bộ». Không thấy dòng bạn cần chưa chắc là nó không có, có thể nó nằm ngoài phạm vi của bạn.",
            "Ô «Người» gõ dở một phần tên có thể không khớp; hãy chọn từ danh sách gợi ý cho chắc.",
          ],
        },
      ],
    },
    {
      ten: "② Đọc bảng",
      khoi: [
        {
          doan: ["Mỗi dòng của bảng là một thao tác đã xảy ra. Sáu cột:"],
        },
        {
          bang: [
            ["Cột", "Cho biết gì", "Bấm thì sao"],
            ["«Lúc»", "Ngày giờ thao tác", "—"],
            ["«Người»", "Người làm; dòng nhỏ bên dưới là đơn vị của họ, và «thay cho …» nếu văn thư nhập hộ người khác", "—"],
            ["«Hành động»", "Tên việc đã làm, ví dụ «Tải lên», «Gửi», «Giao việc», «Xong việc (người làm báo xong)», «Cấp khóa agent»", "—"],
            ["«Đối tượng»", "Tên tài liệu, việc, thư mục… và loại của nó (dòng nhỏ)", "Bấm tên: mở khung dòng thời gian đầy đủ của đối tượng đó"],
            ["«Chi tiết»", "Tóm tắt ngắn: bản số mấy, tên tệp, thư mục, lý do, nơi nhận, hạn cũ → hạn mới…", "—"],
            ["«Mã băm»", "Số thứ tự dòng và mười ký tự đầu của mã băm", "Rê chuột: thấy mã băm đầy đủ và mã dòng trước"],
          ],
        },
        {
          bam: [
            "Đọc từ trên xuống: dòng mới nhất nằm trên cùng.",
            "Muốn thấy toàn bộ đường đi của một tài liệu hay một việc: bấm vào tên nó ở cột «Đối tượng» (xem hướng dẫn «Dòng thời gian của một đối tượng»).",
            "Hơn 30 dòng thì sang trang bằng thanh chia trang ở cuối bảng; mỗi lần sang trang máy hỏi lại đúng trang đó với bộ lọc đang áp.",
          ],
        },
        {
          viDu: [
            "Tình huống: bạn thấy dòng «Giao việc» với cột «Đối tượng» là tên một việc, cột «Người» là anh A và dòng nhỏ «thay cho chị B». Nghĩa là việc do văn thư nhập hộ chị B, người giao thật là chị B.",
            "Bạn bấm tên việc đó để xem việc đã được gia hạn, đổi người hay báo xong ra sao sau lần giao đầu.",
          ],
        },
        {
          luuY: [
            "Dòng nào cũng đọc được, nhưng chữ ở cột «Chi tiết» là bản tóm tắt. Muốn xem đủ mọi trường của một dòng, mở dòng thời gian của đối tượng rồi bấm mã băm của dòng (xem hướng dẫn kia).",
            "Có dòng ghi hành động có biểu tượng 🤖 trong tên (ví dụ gắn lãnh đạo phối hợp, duyệt mã WBS do AI đề xuất): dòng đó cho biết việc do AI đề xuất đã được ghi nhận vào sổ. Dòng chỉ là dấu vết; quyết định cuối vẫn của người.",
          ],
        },
      ],
    },
    {
      ten: "③ Kiểm tra toàn vẹn",
      khoi: [
        {
          doan: [
            "Mỗi dòng của sổ mang một mã băm được tính từ nội dung dòng đó cộng với mã băm của dòng liền trước, nên các dòng móc vào nhau thành một chuỗi. Nếu ai đó sửa lén dù một chữ ở một dòng cũ, mã băm của dòng đó đổi, và mọi dòng sau không còn nối khớp.",
            "Nút «Kiểm tra toàn vẹn» tính lại toàn bộ chuỗi từ đầu và so với mã đã lưu.",
          ],
        },
        {
          bam: [
            "Bấm «Kiểm tra toàn vẹn» (góc phải trên của màn). Nút quay vài giây.",
            "Đọc kết quả hiện ngay cạnh nút.",
          ],
        },
        {
          ketQua: [
            "Chữ xanh «Nguyên vẹn: N dòng, chuỗi băm khớp (ngày giờ)»: cả sổ còn nguyên, chưa có dòng nào bị sửa.",
            "Chữ đỏ «Chuỗi băm gãy tại dòng #N: lịch sử từ dòng này có dấu hiệu bị sửa»: dòng số N không còn khớp. Báo ngay cho quản trị viên hệ thống.",
            "Chữ đỏ khác (không kèm số dòng) là lỗi gọi máy chủ hoặc bạn không có quyền kiểm tra; đọc nội dung chữ đỏ để biết.",
          ],
        },
        {
          viDu: [
            "Tình huống: trước buổi thanh tra, trưởng phòng muốn chắc lịch sử gửi báo cáo chưa bị ai chỉnh. Bạn bấm «Kiểm tra toàn vẹn» và chụp dòng «Nguyên vẹn …» làm bằng chứng kèm giờ kiểm tra.",
          ],
        },
        {
          luuY: [
            "Nút kiểm tra duyệt cả sổ, không chỉ trang đang xem và không phụ thuộc bộ lọc.",
            "Nút này cũng có bản nhỏ trong khung «Dòng thời gian» của từng đối tượng, kết quả giống hệt.",
            "Quyền kiểm tra: người có quyền «Xem lịch sử» hoặc quyền «Xem tài liệu».",
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
            ["Dòng đỏ «Bạn chưa được cấp quyền xem lịch sử»", "Tài khoản của bạn chưa có quyền «Xem lịch sử». Nhờ quản trị viên cấp ở mục «Vai trò và quyền»."],
            ["Tìm không ra dòng mình biết là có", "Dòng đó nằm ngoài phạm vi bạn được xem (xem dòng «Bạn đang xem: …»), hoặc bộ lọc đang quá chặt: bấm «Bỏ lọc» rồi lọc lại từng điều kiện một."],
            ["Gõ xong điều kiện nhưng kết quả không đổi", "Phải bấm «Tìm»; gõ xong chưa bấm thì chưa tính."],
            ["Muốn sửa hoặc xoá một dòng đã ghi nhầm", "Không làm được, kể cả quản trị viên: sổ chỉ ghi thêm. Nếu thao tác sai, làm thao tác đúng tiếp theo; cả hai cùng nằm trong sổ."],
            ["«Chuỗi băm gãy tại dòng #N»", "Có dấu hiệu sổ bị can thiệp ngoài ứng dụng. Giữ nguyên hiện trường, không làm gì thêm với dữ liệu, báo quản trị viên hệ thống."],
            ["Mở link cũ /lich-su thấy sang trang Cài đặt", "Bình thường: Lịch sử đã chuyển vào Cài đặt, link cũ tự chuyển và giữ bộ lọc."],
          ],
        },
      ],
    },
  ],
  canCu: "Sổ lịch sử chỉ ghi thêm, mỗi dòng có mã băm nối với dòng trước (cơ sở dữ liệu chặn sửa và xoá); quyền «Xem lịch sử» chia bốn phạm vi: của mình, đơn vị, đơn vị và cấp dưới, toàn bộ.",
};
