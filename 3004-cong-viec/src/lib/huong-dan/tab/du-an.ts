// Hướng dẫn bản 2 (tab) — màn Dự án. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/DuAnPhong.tsx · TomTatTienDo.tsx · lib/phong/giai-doan.ts (AI xếp giai đoạn, chạy nền 2 phút/lượt) · giai-doan-thuan.ts (6 giai đoạn)
// · lib/gan-wbs/gan-wbs.ts (AI gắn việc vào mã WBS). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Dự án — việc của từng dự án, theo giai đoạn",
  ai: "Mọi người đăng nhập đều xem. Nút «＋ Giao việc» và các nút trong từng việc hiện theo quyền (không có quyền thì ẨN). Nút «Nạp tiến độ» chỉ người của Ban quản lý dự án đó thấy. Nút «🤖 Xếp ngay» chỉ Quản trị thấy.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì?",
          doan: [
            "Menu «Dự án» nhìn công việc theo DỰ ÁN thay vì theo phòng ban. Khác với Sơ đồ tổ chức (ai giữ việc), Dự án trả lời: dự án này có những việc gì, đang ở giai đoạn nào của vòng đời dự án.",
            "Bên trái là cây: nhóm dự án (SCI đầu tư, loại khác) → Ban quản lý dự án → từng dự án. Bên phải là danh sách việc của ô đang chọn, xếp theo giai đoạn quản lý dự án.",
          ],
        },
        {
          tieuDe: "Vì sao phải có?",
          ds: [
            "Một dự án nhiều phòng cùng làm; xem theo phòng không biết dự án nào đang nghẽn.",
            "Việc nhóm theo 6 giai đoạn quản lý dự án giúp thấy dự án đang dồn việc ở khâu nào (thiết kế, thực thi, kết thúc…).",
            "Từ ô dự án đi thẳng tới Cây việc & đường găng, Issue, Tóm tắt tiến độ của đúng dự án đó.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn Dự án"],
            ["① Giao việc", "Giao việc gắn với dự án", "Nút «＋ Giao việc» chọn dự án và nơi nhận"],
            ["② Làm việc", "Người nhận làm, báo xong", "Mở việc ở cột phải như Sơ đồ tổ chức"],
            ["③ Theo dõi", "Việc trễ, đường găng, tiến độ", "Quá hạn, ba nút lọc, các icon ở ô dự án"],
          ],
        },
        {
          tieuDe: "Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng nút: «＋ Giao việc» · «Tuần N» · «30 ngày» · «Quá hạn» · «Tôi giao / Tôi nhận / Cần phối hợp»", "Giao việc và lọc", "② Lọc và giao"],
            ["Cây dự án: ô nhóm, ô Ban QLDA, ô dự án với các icon nhỏ", "Chọn dự án, đi sang màn khác của dự án", "① Đọc cây"],
            ["Cột phải: ô tìm, đường đi, việc theo giai đoạn", "Xem và làm việc", "③ Cột việc"],
            ["Bảng «Tóm tắt tiến độ dự án» (thay cây khi mở)", "Xem Gantt rút gọn từ tệp Excel", "⑤ Tóm tắt tiến độ"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Chọn ô · giao việc · mở việc · đổi giai đoạn của việc · nạp tệp tóm tắt tiến độ (Ban QLDA)", "Người thắng AI ở mọi chỗ"],
            ["MÁY", "Xếp cây dự án · đếm việc, việc trễ · dấu ! đường găng · vẽ Gantt từ tệp Excel · kiểm quyền các nút", "Cùng dữ liệu thì cùng kết quả"],
            ["🤖 AI", "🤖 Xếp từng việc đang mở của dự án vào một trong 6 giai đoạn, kèm lý do (xếp lúc việc vào sổ, chạy nền)", "🤖 Có thể xếp sai. Bạn chọn lại ở ô «Giai đoạn» thì dòng đổi thành «Giai đoạn (người đã sửa):» và AI không xếp lại"],
            ["🤖 AI", "🤖 Gắn việc vào mã WBS (cây việc bên agent Tiến độ) cho dự án có «Mã bên Tiến độ»; kết quả thấy ở màn «Cây việc & đường găng» (icon lịch trên ô dự án), không hiện ở màn này", "🤖 Chỉ đề xuất kèm lý do và độ chắc; mã phải có trong cây thật; người duyệt hoặc sửa thì người thắng"],
          ],
          ai: [
            "🤖 Mỗi 2 phút máy lấy tối đa 25 việc đang mở thuộc dự án chưa có giai đoạn và gọi AI một lượt. AI lỗi thì nghỉ 30 phút.",
            "🤖 Tên nhóm có chữ «🤖» ở cột phải nghĩa là giai đoạn do AI xếp.",
            "🤖 Nhóm «🤖 chưa xếp giai đoạn» là việc AI chưa kịp xếp. Quản trị có nút «🤖 Xếp ngay» để không phải chờ lượt nền.",
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: giao việc gắn dự án bằng «＋ Giao việc» (hoặc việc vào sổ từ báo cáo tuần).",
            "MÁY: tạo việc, gắn vào dự án, đếm số việc và việc trễ trên ô.",
            "🤖 AI (nền, 2 phút một lượt): đọc tên việc, kết quả cần có, nguồn và ghi chú rồi xếp vào một trong 6 giai đoạn, kèm lý do. Việc chưa xếp nằm ở nhóm «🤖 chưa xếp giai đoạn».",
            "NGƯỜI: xem việc theo giai đoạn; thấy AI xếp sai thì chọn lại ở ô «🤖 Giai đoạn:» trong việc (người sửa thì AI không xếp lại).",
          ],
        },
        {
          tieuDe: "Các hướng dẫn riêng cho khung mở từ nút",
          ds: [
            "Nút «＋ Giao việc»: «Giao việc theo dự án».",
            "Icon ba gạch hoặc dấu «!» đỏ trên ô dự án: «Tóm tắt tiến độ dự án».",
            "Hai nút «Tuần N», «30 ngày»: «Xem việc đã xong».",
            "Mở một việc: «Thẻ một việc» và các khung nhỏ trong thẻ («Báo xong việc», «Gia hạn, phối hợp, hủy, mở lại, giao lại», «Sửa việc», «Bình luận trong việc»).",
          ],
        },
      ],
    },
    {
      ten: "① Đọc cây",
      khoi: [
        {
          tieuDe: "Các ô",
          bang: [
            ["Ô", "Là gì"],
            ["Nhóm (cấp 1)", "«Dự án SCI đầu tư» hoặc «Dự án loại khác»"],
            ["Ban QLDA", "Ban quản lý dự án, có dự án con xếp dọc"],
            ["Dự án", "Mỗi dự án một ô, ghi «N việc · M trễ». Bấm để xem việc của dự án đó"],
          ],
          luuY: ["Ô ở Dự án KHÔNG có quyển sổ báo cáo tuần và nút «＋» như Sơ đồ tổ chức. Giao việc dùng nút «＋ Giao việc» trên hàng nút."],
        },
        {
          tieuDe: "Các icon trên ô dự án",
          doan: ["Chỉ hiện ở dự án có điều kiện tương ứng:"],
          bang: [
            ["Icon", "Ở đâu", "Bấm thì sao", "Điều kiện"],
            ["Lịch có thanh bậc thang", "Bên trái ô", "Mở «Cây việc & đường găng» của dự án", "Dự án có «Mã bên Tiến độ» (khai ở Cài đặt) tức có cây WBS bên agent Tiến độ"],
            ["Ba gạch", "Dưới icon lịch", "Mở bảng «Tóm tắt tiến độ dự án»", "Dự án đang có việc và đã nạp bảng"],
            ["Dấu ! đỏ", "Dưới icon lịch", "Mở bảng tóm tắt, hướng dẫn nạp", "Dự án đang có việc nhưng chưa nạp bảng"],
            ["Dấu ! trong vòng tròn", "Bên phải ô", "Mở màn Cảnh báo của dự án", "Dự án có cây WBS"],
          ],
        },
        {
          luuY: ["Rê chuột lên một việc ở cột phải: ô dự án của việc đó sáng lên. Khi bật bộ lọc (Quá hạn, Tôi nhận…), ô nào không còn việc sẽ mờ đi."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A mở menu «Dự án» và thấy các nhóm «SCI đầu tư» và «loại khác», dưới nhóm đầu là các Ban QLDA, dưới mỗi Ban là các dự án. Một ô dự án ghi số việc và số việc trễ. Chị thấy ô dự án có icon lịch: chị bấm icon để sang «Cây việc & đường găng» của đúng dự án đó; bấm dấu «!» trong vòng tròn bên phải ô để xem Issue của dự án.",
          ],
        },
      ],
    },
    {
      ten: "② Lọc và giao",
      khoi: [
        {
          tieuDe: "Các nút lọc",
          doan: ["Giống Sơ đồ tổ chức, nhưng chỉ tính việc của các dự án."],
          bang: [
            ["Nút", "Cho xem"],
            ["«Tuần N: xong … · mới …»", "Việc xong và việc mới trong tuần đang chọn (số theo ô đang chọn và các ô con)"],
            ["«30 ngày: xong … · mới …»", "Như trên cho 30 ngày gần nhất"],
            ["«Quá hạn · N»", "Chỉ việc đang mở đã quá hạn"],
            ["«Tôi giao»", "Việc tôi giao tay"],
            ["«Tôi nhận»", "Việc tôi chủ trì đích danh"],
            ["«Cần phối hợp»", "Phần phối hợp chưa xong giao cho tôi"],
          ],
          luuY: ["Bấm lần nữa để tắt. Nút mờ nghĩa là chưa có việc nào thỏa."],
        },
        {
          tieuDe: "Giao việc theo dự án",
          bam: [
            "Chọn ô dự án bạn muốn giao (hoặc bỏ qua, chọn trong form).",
            "Bấm «＋ Giao việc» trên hàng nút. Cột phải hiện «Giao việc theo dự án».",
            "Chọn «Dự án» (danh sách ghi cả «SCI đầu tư» hay «loại khác»).",
            "Chọn «Giao cho»: bấm là chọn Ban lãnh đạo hoặc đơn vị; gõ @ để chọn đích danh một người.",
            "Gõ «Nội dung việc», tuỳ chọn «Kết quả cần có» và «Hạn», kẹp tệp 📎 nếu cần.",
            "Bấm «Giao việc». Việc mới hiện nổi ở cột phải.",
          ],
          ketQua: ["Nút «Giao việc» mờ thì cạnh nút có câu nói thiếu gì: «Chưa chọn dự án», «Chưa có nội dung việc», «Chưa chọn người nhận», «… ngoài phạm vi giao việc của bạn», «Hạn trước hôm nay»."],
          luuY: ["Giao trong phòng mình (trưởng phòng) thì bắt buộc chọn MỘT nhân viên làm chủ trì."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A bật «Tôi giao» để xem những việc mình đã giao trong các dự án; số bên cạnh nút cho biết có bao nhiêu việc, dự án nào không có việc của chị thì mờ. Nút «Quá hạn» chỉ còn việc trễ trong phạm vi lọc đó.",
            "Chi tiết khung giao việc: hướng dẫn «Giao việc theo dự án».",
          ],
        },
      ],
    },
    {
      ten: "③ Cột việc",
      khoi: [
        {
          tieuDe: "Việc xếp theo giai đoạn",
          doan: ["Cột phải xếp việc của ô đang chọn (gồm cả các ô con) vào 6 giai đoạn quản lý dự án. Giai đoạn không có việc thì không hiện."],
          bang: [
            ["Giai đoạn", "Hiểu đơn giản"],
            ["Khởi tạo", "Chủ trương đầu tư (kể cả phía Lào), khảo sát ban đầu, lập và duyệt báo cáo nghiên cứu khả thi (FS), quyền phát triển, pháp lý mở dự án"],
            ["Thiết kế", "CHỈ việc thuộc chuyên môn thiết kế hoặc ra một bộ hồ sơ thiết kế: thiết kế cơ sở, thiết kế kỹ thuật, bản vẽ thi công, tổng mặt bằng, phương án đấu nối, rà soát, thẩm định, phê duyệt hồ sơ thiết kế"],
            ["Lập kế hoạch", "Dự toán, kế hoạch đấu thầu, kế hoạch tiến độ, hồ sơ xin phép (không phải hồ sơ thiết kế)"],
            ["Thực thi", "Thi công, mua sắm, lắp đặt, giải phóng mặt bằng, ký và thực hiện hợp đồng"],
            ["Giám sát & Kiểm soát", "Theo dõi tiến độ, thanh toán và giải ngân, nghiệm thu từng phần, vận hành, sự cố, bảo dưỡng, gia hạn giấy phép"],
            ["Kết thúc", "Nghiệm thu hoàn thành, COD, quyết toán, bàn giao, đóng hồ sơ"],
          ],
          luuY: ["Đây là bảng AI dùng để xếp (chỉ dựa vào tên việc, kết quả cần có, nguồn và ghi chú). Nhóm «🤖 chưa xếp giai đoạn» là việc AI chưa xếp."],
        },
        {
          tieuDe: "Đổi giai đoạn của một việc",
          bam: [
            "Bấm tên việc để mở.",
            "Dòng «🤖 Giai đoạn:» có ô chọn. Chọn giai đoạn đúng, áp dụng ngay, không có nút xác nhận.",
            "Dòng đổi thành «Giai đoạn (người đã sửa):». Việc chuyển sang nhóm mới.",
          ],
          ai: [
            "🤖 Dòng «🤖 Giai đoạn:» kèm câu lý do của AI (chữ cam sau 🤖) khi AI xếp.",
            "🤖 Người sửa thì AI không xếp lại việc đó nữa. Việc đã xong không có ô này.",
          ],
        },
        {
          tieuDe: "Mở và làm việc",
          doan: ["Mở một việc: thanh ngày, kết quả cần có, các nút Xong việc, Gia hạn, ＋ Phối hợp, Hủy việc, Mở lại, bình luận… giống hệt Sơ đồ tổ chức. Xem hướng dẫn Sơ đồ tổ chức tab «④ Một việc»."],
        },
        {
          tieuDe: "Việc làm xong",
          doan: ["Cuối danh sách có khối gấp «▸ Việc làm xong: Tuần N−1 và N». Bấm để mở. Khối chỉ hiện khi bạn đang xem việc đang làm. Trong mỗi nhóm giai đoạn, việc chia theo người chủ trì: tên người viết đậm, xếp A–Z theo tên riêng; việc giao cả đơn vị (chưa có cá nhân) nằm cuối ở «Việc chung»."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Dự án có việc «Lập hồ sơ thiết kế kỹ thuật» (AI xếp giai đoạn «Thiết kế», câu lý do hiện cạnh dòng «🤖 Giai đoạn:»), việc «Giải phóng mặt bằng đợt 1» (giai đoạn «Thực thi»). Chị A mở việc đầu, thấy ô giai đoạn đúng thì để. Một việc mới giao nằm ở nhóm «🤖 chưa xếp giai đoạn»: chị chọn luôn «Thực thi» ở ô giai đoạn, dòng đổi thành «Giai đoạn (người đã sửa):» và việc chuyển nhóm ngay.",
          ],
        },
      ],
    },
    {
      ten: "④ Tìm việc",
      khoi: [
        {
          tieuDe: "Ô tìm và phạm vi",
          doan: ["Giống Sơ đồ tổ chức: ô tìm gõ tới đâu lọc tới đó. Ô nhỏ «Lọc tìm kiếm» chọn phạm vi:"],
          bang: [
            ["Phạm vi", "Tìm trong"],
            ["Bỏ trống", "Danh sách đang hiện"],
            ["«Việc toàn công ty»", "Mọi việc của dự án, đang làm và đã xong gần đây"],
            ["«Việc thuộc phòng»", "Việc đơn vị của tôi chủ trì hoặc phối hợp"],
            ["«Việc thuộc cá nhân»", "Việc tôi giao hoặc giao đích danh tôi"],
          ],
          luuY: ["Phạm vi chỉ có tác dụng khi bạn đã gõ chữ vào ô tìm; khi đó bỏ qua ô dự án đang chọn và các nút lọc. Menu Dự án chỉ tính việc thuộc dự án."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Chị A nhớ một việc có chữ «đấu nối» nhưng không nhớ dự án nào. Chị gõ «dau noi» (không dấu cũng ra) vào ô tìm và chọn phạm vi «Việc toàn công ty»: cột phải liệt kê mọi việc của các dự án có chữ đó, cả việc đã xong gần đây, không phụ thuộc ô dự án đang chọn."],
        },
      ],
    },
    {
      ten: "⑤ Tóm tắt tiến độ",
      khoi: [
        {
          tieuDe: "Hướng dẫn chi tiết",
          doan: ["Khi bảng đang mở, bấm «? Hướng dẫn» sẽ ra hướng dẫn «Tóm tắt tiến độ dự án» với đủ các nút, cách nạp tệp, lời nhắc lỗi và ví dụ. Dưới đây chỉ là tóm tắt."],
        },
        {
          tieuDe: "Bảng này là gì",
          doan: [
            "«Tóm tắt tiến độ dự án» là một bảng Gantt rút gọn vẽ từ tệp Excel sáu cột do Ban quản lý dự án nạp: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc.",
            "Đây là bản NHÁP để xem bằng mắt: KHÔNG nối với sổ cái công việc, cây việc & đường găng hay agent Tiến độ, và không vẽ quan hệ giữa các việc. Số và ngày chỉ đúng như tệp bạn nạp.",
          ],
        },
        {
          tieuDe: "Các nút",
          bang: [
            ["Nút", "Làm gì"],
            ["«← Quay lại»", "Về cây dự án"],
            ["«C2» · «C3» · «Full»", "Chỉ bung tới cấp WBS 2, cấp 3 hoặc toàn bộ"],
            ["«−» · «+»", "Thu nhỏ hoặc phóng to trục ngày"],
            ["«Tải file»", "Ai cũng tải được. Tệp Excel đúng khuôn nạp, dùng làm mẫu hoặc tải bảng hiện có để sửa"],
            ["«Nạp tiến độ»", "CHỈ người của Ban QLDA dự án; nạp tệp .xlsx. Nạp lại thì thay bảng đang có"],
            ["Nút toàn màn hình", "Cho đồ hoạ tràn sang cả khu việc bên phải"],
          ],
        },
        {
          tieuDe: "Đọc bảng",
          ds: [
            "Bảng trái: dòng cha có tam giác bung hoặc thu. Hai cột Bắt đầu, Kết thúc mặc định đóng; bấm mũi tên nhỏ cạnh chữ «KL» để mở.",
            "Đồ hoạ: tiêu đề hai tầng (tháng trên, tuần dưới); vạch dọc «Hôm nay»; thanh cấp 1 – 2 màu cam, cấp 3 trở xuống màu xám; dòng nhóm có tam giác chúc xuống ở hai đầu.",
            "Rê chuột lên một dòng: hộp chi tiết gồm mã và tên việc, đơn vị, khối lượng, khoảng ngày kèm số ngày và còn bao nhiêu ngày tới ngày kết thúc.",
            "Kéo vạch giữa bảng và đồ hoạ để chia lại bề rộng, bấm đúp để trả về.",
          ],
          luuY: ["Nếu tệp không có dòng nào ghi ngày bắt đầu hoặc kết thúc, màn báo chưa vẽ được đồ hoạ. Thanh màu chỉ để nhìn bố cục, không dùng để kết luận nhanh hay chậm so với Baseline hay Tiến độ mục tiêu."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Ban QLDA nạp tệp Excel sáu cột. Chị A (không thuộc Ban) bấm icon ba gạch trên ô dự án, bảng hiện ra. Chị bấm «C2» xem các hạng mục lớn, rê chuột lên một dòng để đọc khoảng ngày kèm số ngày, rồi bấm «← Quay lại» về cây. Chị không thấy nút «Nạp tiến độ» vì chị không thuộc Ban QLDA."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy icon lịch ở ô dự án", "Dự án chưa có «Mã bên Tiến độ» ở Cài đặt nên chưa có cây WBS."],
            ["Ô dự án có dấu ! đỏ ở góc trái", "Dự án có việc mà chưa nạp bảng tóm tắt tiến độ. Bấm vào, rồi người của Ban QLDA bấm «Nạp tiến độ»."],
            ["Không thấy nút «Nạp tiến độ»", "Bạn không thuộc Ban QLDA của dự án đó. Nút ẩn."],
            ["Việc nằm ở nhóm «🤖 chưa xếp giai đoạn»", "AI chưa xếp tới (mỗi 2 phút chỉ xếp 25 việc). Quản trị bấm «🤖 Xếp ngay», hoặc bạn tự chọn giai đoạn trong việc."],
            ["AI xếp sai giai đoạn", "Mở việc, chọn giai đoạn đúng ở ô «🤖 Giai đoạn:». Người sửa thắng AI."],
            ["Dự án mới không có trên cây", "Dự án chưa có việc nào trong sổ cái hoặc chưa khai ở Cài đặt."],
            ["Dấu ! đỏ đường găng chưa hiện", "Lấy từ agent Tiến độ nên hiện chậm hơn danh sách; hoặc dự án chưa có cây WBS."],
          ],
        },
      ],
    },
  ],
  canCu: "6 giai đoạn: Khởi tạo, Thiết kế, Lập kế hoạch, Thực thi, Giám sát & Kiểm soát, Kết thúc (năm giai đoạn quản lý dự án PMP cộng Thiết kế, Mr. Đại thêm 01/10/2026) · luật 17 riêng 3004 (nút không quyền thì ẨN) · luật 31 (khoảng ngày kèm số ngày) · luật 35, 36 (nhanh/chậm tính bằng ngày, ghi so với hệ nào).",
};
