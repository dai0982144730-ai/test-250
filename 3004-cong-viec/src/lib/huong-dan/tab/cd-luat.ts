// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Luật kiểm tra (trang danh sách luật). Viết 20/10/2026 (nhóm B3).
// Căn cứ code: components/luat/TrangLuatKiemTra.tsx (ô số, bộ lọc, dòng luật, menu ⋯, hộp «Xóa luật», 30 luật một trang) · components/luat/chung.tsx (nhãn mức, nhãn cách kiểm)
// · lib/luat/chay-luat.ts (luật code chạy ngay, luật AI đọc kết quả khi Gửi) · lib/luat/kho-luat.ts (duocSuaLuat) · lib/cau-hinh/mac-dinh.ts (9 luật hệ thống).
// Ngăn kéo thêm/sửa, tham số, chạy thử, lịch sử có hướng dẫn riêng: luat-trinh-sua · luat-he-thong · luat-tham-so · luat-chay-thu · luat-lich-su.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Luật kiểm tra — máy soát báo cáo trước khi gửi",
  ai: "Ai đăng nhập cũng XEM được danh sách. SỬA (bật tắt, đổi mức, thêm, xóa, chạy thử) chỉ có quản trị viên, người có quyền «cau_hinh.sua», hoặc người được mục «Phân quyền cài đặt» cho phép nhóm luật kiểm tra (mặc định ghi sẵn: trưởng đơn vị của Phòng Đầu tư và Pháp chế). Người chỉ xem thấy nhãn «Chỉ xem», không có nút «Thêm luật», không đổi được mức, không thấy mục «Xóa luật».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì",
          doan: [
            "Mỗi báo cáo tuần hay tháng đều phải đạt một số điều kiện trước khi gửi lên cấp trên: ô bắt buộc đã điền, ngày bắt đầu không sau ngày kết thúc, dòng TỔNG khớp với các dòng, mục nội dung không để trống… Mỗi điều kiện như vậy gọi là một «luật kiểm tra». Màn này là cuốn sổ ghi tất cả các luật đó: luật nào đang bật, khi vi phạm thì chặn gửi hay chỉ nhắc, áp dụng cho mẫu báo cáo nào.",
            "Có hai loại luật. Luật «Code»: máy kiểm theo công thức cố định, cùng báo cáo thì luôn ra cùng kết quả, chạy ngay lúc tải lên. Luật «AI»: 🤖 AI đọc hiểu nội dung (ví dụ ghi chú có nêu lý do chưa, hai mục có mâu thuẫn không) nên linh hoạt hơn nhưng có thể sai. Luật «Code + AI» là loại pha: máy kiểm phần chắc chắn, AI xem phần cần đọc hiểu.",
            "Luật «hệ thống» là bộ luật gốc đi kèm phần mềm (9 luật), chỉ tắt, đổi mức hoặc đổi mẫu áp dụng được, không xóa được. Luật «riêng» do người quản trị tự thêm.",
          ],
        },
        {
          tieuDe: "② Vì sao cần",
          ds: [
            "Báo cáo sai khuôn thì cấp trên không tổng hợp được. Bắt lỗi ngay lúc nộp rẻ hơn nhiều so với phát hiện ở cuối tuần.",
            "Mỗi mẫu báo cáo (Form 0 đến Form 10) có đặc thù riêng, nên luật phải thêm bớt được mà không phải nhờ người lập trình sửa phần mềm.",
            "Người nộp cần biết lỗi nào chặn họ, lỗi nào chỉ là nhắc: màn này là nơi quyết định điều đó, bằng ba mức «Chặn gửi» · «Cảnh báo» · «Gợi ý».",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn Luật kiểm tra"],
            ["Trước", "Mẫu báo cáo đã khai ô, bảng, cột (mục «Mẫu báo cáo»)", "Luật chỉ trỏ được tới ô, bảng, cột có trong mẫu"],
            ["Màn này", "Quản trị viết luật, chọn mức, chọn mẫu áp dụng", "Nơi duy nhất quyết định báo cáo bị chặn hay chỉ bị nhắc"],
            ["Sau", "Người lập tải báo cáo lên ở «Báo cáo»", "Luật Code chạy ngay; 🤖 luật AI chạy nền; bấm Gửi thì máy đọc kết quả"],
            ["Sau nữa", "Báo cáo đạt thì vào sổ cái, sinh việc, hiện ở Sơ đồ tổ chức", "Luật chặn mà chưa đạt thì khóa nút Gửi"],
          ],
        },
        {
          tieuDe: "④ Màn có những khối nào (từ trên xuống)",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Nút «Thêm luật» (hoặc nhãn «Chỉ xem») ở góc phải trên", "Mở ngăn kéo viết luật mới", "⑤ Thêm luật"],
            ["Bốn ô số: «Tổng số luật» · «Đang bật» · «Chặn gửi» · «Có phần AI»", "Đếm nhanh; bấm vào ô để lọc danh sách theo ô đó", "② Lọc và tìm"],
            ["Hàng chip «Mẫu» và hàng tìm kiếm, ba ô chọn, ô «Chỉ luật đang bật»", "Thu hẹp danh sách", "② Lọc và tìm"],
            ["Các nhóm luật (mỗi nhóm một khung)", "Mỗi dòng là một luật: công tắc, tên, câu luật, mức, menu «⋯»", "① Đọc một dòng luật"],
            ["Dòng chân trang nhỏ", "Nhắc: luật hệ thống không xóa được, mọi thay đổi có phiên bản", "④ Menu «⋯»"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì ở màn này"],
            ["Người", "Quản trị bật tắt luật, đổi mức, thêm, sửa, xóa, xem lịch sử. Người nộp báo cáo đọc kết quả kiểm."],
            ["Máy", "Chạy luật Code ngay khi báo cáo tải lên; ghi mỗi thay đổi thành một phiên bản; chặn nút Gửi khi luật «Chặn gửi» chưa đạt."],
            ["🤖 AI", "🤖 Đề xuất cách chạy cho một câu luật mới (trong ngăn kéo) · 🤖 đọc hiểu nội dung báo cáo với luật AI, chạy nền sau khi tải lên."],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "Người viết một câu luật bằng tiếng Việt trong ngăn kéo «Thêm luật kiểm tra».",
            "🤖 AI đọc câu đó và đề xuất: dùng Code hay AI, dạng luật nào, tham số gì, mức nào. Máy kiểm đề xuất có khớp mẫu không.",
            "Người xem lại đề xuất, sửa nếu thấy sai, bấm «Chạy thử trên báo cáo đã có» rồi mới «Lưu luật». Chưa có chữ nào của AI có hiệu lực cho tới bước lưu này.",
            "Khi người nộp tải báo cáo lên: máy chạy luật Code ngay. 🤖 AI kiểm các luật AI chạy nền (mất vài giây đến cả phút).",
            "Bấm Gửi: nếu có luật AI mức «Chặn gửi» thì máy đọc kết quả AI, chưa xong thì bảo chờ, không đạt thì chặn. Luật AI mức «Cảnh báo» hay «Gợi ý» không bao giờ chặn.",
          ],
        },
        {
          luuY: [
            "Mục này nằm ở Cài đặt › tab «🧩 Riêng của agent» › «Luật kiểm tra».",
            "Hai mục khác liên quan: «Luật hệ thống» (chuỗi coi là chưa điền) và «Mẫu báo cáo» (nơi khai ô, bảng, cột). Luật ở màn này trỏ tới ô, bảng, cột của mẫu.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc một dòng luật",
      khoi: [
        { doan: ["Danh sách chia theo nhóm. Thứ tự nhóm: «Luật hệ thống», «Ô chung», «Bảng Công việc», «Bảng Kiến nghị», «Số liệu», «Nội dung», rồi các nhóm khác theo vần, nhóm «Khác» ở cuối. Trong nhóm, luật hệ thống đứng trước. Mỗi trang hiện tối đa 30 luật, cuối danh sách có thanh chia trang."] },
        {
          tieuDe: "Một dòng gồm những gì (từ trái sang phải)",
          bang: [
            ["Phần", "Nghĩa"],
            ["Công tắc tròn", "Bật là luật đang chạy. Tắt là máy bỏ qua luật khi kiểm báo cáo (dòng mờ đi, có chữ «đã tắt»)."],
            ["Tên luật + huy hiệu «hệ thống»", "Bấm vào tên để mở ngăn kéo xem hoặc sửa."],
            ["Câu luật (hai dòng nhỏ bên dưới)", "Nội dung luật bằng tiếng Việt thường."],
            ["Biểu tượng «Mẫu áp dụng», «phiên bản N», tên người sửa + giờ", "Luật áp cho Form nào (hoặc «Mọi mẫu»); đã sửa mấy lần; ai sửa lúc nào."],
            ["Huy hiệu cách kiểm: «Code» · «AI» · «Code + AI»", "Cho biết máy hay AI kiểm."],
            ["Huy hiệu mức: «Chặn gửi» · «Cảnh báo» · «Gợi ý»", "Không đạt thì chuyện gì xảy ra (xem bảng dưới). Người sửa được bấm vào huy hiệu để đổi."],
            ["Nút «⋯»", "Menu thao tác (xem tab ④)."],
          ],
        },
        {
          tieuDe: "Ba mức khác nhau thế nào",
          bang: [
            ["Mức", "Khi báo cáo không đạt", "Dùng cho"],
            ["Chặn gửi", "Khóa nút Gửi, người nộp phải sửa mới gửi được", "Lỗi chắc chắn sai: thiếu ô bắt buộc, ngày bắt đầu sau ngày kết thúc"],
            ["Cảnh báo", "Báo cho người nộp nhưng vẫn gửi được", "Nghi ngờ nhưng chưa chắc sai: việc nghi trùng việc đã có"],
            ["Gợi ý", "Nhắc nhẹ, không làm phiền", "Chuyện nên làm cho tốt: ngày trống thì việc coi như luôn mở"],
          ],
        },
        {
          viDu: [
            "Trong 9 luật hệ thống ghi sẵn: «Đúng mẫu: nhận ra Form, đủ mục, không mất ô nhập» mức «Chặn gửi»; «Công việc có tên; phụ trách trống thì gán đơn vị lập» mức «Cảnh báo»; «Ngày trống: việc luôn mở» mức «Gợi ý».",
            "Tình huống: chị Lan nộp báo cáo của một phòng mà bảng Công việc có một dòng chưa ghi tên việc. Luật «Cảnh báo» nhắc chị Lan; chị vẫn bấm Gửi được. Nếu quản trị đổi mức luật đó sang «Chặn gửi» thì chị phải ghi tên việc mới gửi được.",
          ],
        },
      ],
    },
    {
      ten: "② Lọc và tìm",
      khoi: [
        { doan: ["Danh sách có thể dài (mỗi mẫu báo cáo có thêm luật riêng). Bộ lọc giúp bạn thu về đúng luật cần xem. Các bộ lọc cộng dồn: chọn nhiều thì chỉ còn luật thỏa tất cả."] },
        {
          bang: [
            ["Cách lọc", "Bấm gì", "Kết quả"],
            ["Theo mẫu", "Bấm chip «Mọi mẫu» hoặc chip «Form N» (mỗi chip có số luật áp cho mẫu đó). Bấm lại chip đang chọn để bỏ", "Chỉ luật áp cho mẫu đó; ô số «Tổng số luật» đổi thành «Luật của Form N»"],
            ["Theo chữ", "Gõ vào ô «Tìm theo tên, câu luật, nhóm…» (phím «/» nhảy tới ô; phím Esc xóa chữ)", "Tìm không phân biệt dấu trong tên, câu luật, mã, nhóm, hướng dẫn cho AI, mẫu áp dụng"],
            ["Theo nhóm", "Ô chọn «Mọi nhóm»", "Chỉ một nhóm"],
            ["Theo cách kiểm", "Ô chọn «Code và AI» · «Chỉ Code» · «Có phần AI» · «Code + AI»", "«Có phần AI» gồm cả luật AI lẫn luật Code + AI"],
            ["Theo mức", "Ô chọn «Mọi mức» · «Chặn gửi» · «Cảnh báo» · «Gợi ý»", "Chỉ luật mức đó"],
            ["Chỉ luật đang bật", "Đánh dấu ô «Chỉ luật đang bật»", "Ẩn luật đã tắt"],
            ["Bốn ô số đầu trang", "Bấm «Đang bật», «Chặn gửi» hoặc «Có phần AI»; bấm «Tổng số luật» để bỏ lọc (giữ mẫu đang chọn)", "Cùng kết quả như chọn bằng ô chọn"],
          ],
        },
        { bam: ["Muốn bỏ hết bộ lọc: bấm «Bỏ lọc» (hiện khi đang lọc) hoặc «Bỏ mọi bộ lọc» trong khung «Không có luật nào khớp bộ lọc».", "Góc phải hàng tìm kiếm có số «x / y luật» cho biết đang hiện x trên tổng y."] },
        {
          viDu: [
            "Muốn biết Form 7 (mẫu báo cáo của Ban quản lý dự án) bị những luật nào chặn gửi: bấm chip «Form 7», rồi bấm ô số «Chặn gửi». Danh sách chỉ còn các luật đang bật, mức «Chặn gửi», áp cho Form 7.",
            "Muốn rà các luật có AI đang chặn gửi: bấm ô «Có phần AI»; dòng nhỏ dưới ô cho biết «N luật AI đang chặn gửi» nếu có.",
          ],
        },
        { luuY: ["Bộ lọc chỉ để xem, không đổi gì trong hệ thống. Tải lại trang thì bộ lọc về trống (trừ khi địa chỉ có sẵn ?mau=…)."] },
      ],
    },
    {
      ten: "③ Bật tắt · đổi mức",
      khoi: [
        { doan: ["Hai thao tác hay làm nhất có sẵn ngay trên dòng, không cần mở ngăn kéo. Cả hai LƯU NGAY khi bấm, mỗi lần tạo một phiên bản mới của luật và có hiệu lực từ báo cáo tải lên kế tiếp."] },
        {
          bam: [
            "Bật hoặc tắt: bấm công tắc tròn đầu dòng. Chữ báo hiện ở góc: «Đã bật “tên luật”» hoặc «Đã tắt “tên luật”» kèm «phiên bản N».",
            "Đổi mức: bấm huy hiệu mức (có mũi tên nhỏ), chọn «Chặn gửi», «Cảnh báo» hoặc «Gợi ý». Chữ báo: «“tên luật” → mức mới».",
          ],
        },
        {
          ketQua: [
            "Dòng luật hiện một vạch màu nhấn bên trái trong chốc lát để bạn biết đã lưu.",
            "Nếu lưu lỗi, màn trả công tắc hoặc mức về như cũ và báo «Chưa lưu được: …».",
            "Luật hệ thống bật tắt hay đổi mức xong còn được ghi sang Cài đặt mục «Luật hệ thống» để hai nơi luôn khớp nhau.",
          ],
        },
        {
          viDu: [
            "Một đơn vị than rằng luật «Việc trùng việc trong sổ cái: áp quy tắc đè» cứ báo nhầm. Quản trị tắt công tắc của luật đó để quan sát một tuần. Muốn bật lại, bấm công tắc lần nữa: bản lịch sử vẫn đủ, không mất gì.",
            "Muốn luật «Công việc có tên…» nghiêm hơn: bấm huy hiệu «Cảnh báo» của dòng đó, chọn «Chặn gửi». Từ báo cáo tải lên sau đó, thiếu tên việc là không gửi được.",
          ],
        },
        {
          luuY: [
            "Luật có phần AI mà để «Chặn gửi» thì người nộp phải chờ AI kiểm xong mới gửi được, và AI có thể kết luận sai. Nên để «Cảnh báo» trừ khi thật cần.",
            "Người chỉ xem vẫn thấy công tắc nhưng không bấm được, huy hiệu mức không mở menu.",
          ],
        },
      ],
    },
    {
      ten: "④ Menu «⋯»",
      khoi: [
        { doan: ["Nút «⋯» cuối mỗi dòng mở menu nhỏ. Các mục như sau (mục nào bị ẩn thì người đó không có quyền dùng nó)."] },
        {
          bang: [
            ["Mục", "Làm gì", "Ai thấy"],
            ["«Sửa luật» (luật riêng) · «Bật/tắt, đổi mức» (luật hệ thống) · «Xem chi tiết» (người chỉ xem)", "Mở ngăn kéo, giống bấm vào tên luật", "Mọi người (tên mục khác nhau theo quyền)"],
            ["«Chạy thử»", "Mở ngăn kéo và nhảy thẳng tới bước chạy thử trên các báo cáo đã có", "Hiện với mọi người; riêng người chỉ xem bấm vào sẽ nhận thông báo không có quyền chạy thử"],
            ["«Lịch sử phiên bản»", "Mở hộp thoại các phiên bản của luật, quay lại bản cũ được", "Mọi người xem; chỉ người sửa được mới thấy nút quay lại"],
            ["«Xóa luật»", "Mở hộp hỏi xác nhận rồi xóa mềm", "Chỉ người sửa được, và chỉ với luật riêng. Luật hệ thống không bao giờ hiện mục này"],
          ],
        },
        {
          tieuDe: "Xóa luật",
          doan: ["Hộp xác nhận hiện tên luật, câu luật, cách kiểm, mức, mẫu áp dụng. Bấm «Xóa luật» để xóa, «Hủy» để thôi. Luật ngừng kiểm ngay từ báo cáo tải lên tiếp theo. Lịch sử phiên bản vẫn được giữ. Nếu chỉ muốn tạm dừng thì tắt công tắc thay vì xóa."],
        },
        {
          viDu: [
            "Quản trị thêm thử luật «Mục Nhân sự phải có nội dung» cho Form 3 nhưng thấy chưa cần. Bấm «⋯» › «Xóa luật» › «Xóa luật». Danh sách giảm một dòng; lịch sử các phiên bản của luật vẫn được giữ.",
          ],
        },
      ],
    },
    {
      ten: "⑤ Thêm luật",
      khoi: [
        { doan: ["Bấm «Thêm luật» ở góc phải trên (hoặc nhấn phím N khi con trỏ không nằm trong ô nhập) để mở ngăn kéo «Thêm luật kiểm tra». Nếu chưa có luật riêng nào, giữa màn có khung «Chưa có luật riêng nào» kèm vài câu gợi ý bấm một cái là mở ngăn kéo với câu đó điền sẵn."] },
        {
          luuY: [
            "Ngăn kéo thêm luật là nơi 🤖 AI tham gia. Cách dùng từng bước xem hướng dẫn «Thêm hoặc sửa một luật kiểm tra» (nút Hướng dẫn tự đổi khi ngăn kéo mở; trong ngăn kéo có hàng chọn để xem hướng dẫn khác).",
            "Khi tìm không ra luật nào (lọc quá chặt), màn có khung «Không có luật nào khớp bộ lọc» và nút «Thêm luật» điền sẵn chữ bạn đang tìm làm câu luật.",
          ],
        },
        {
          viDu: [
            "Muốn luật «Người kiểm soát phải là người khác người lập»: bấm «Thêm luật», bấm câu gợi ý cùng tên, bấm «AI đề xuất cách chạy» và làm theo ngăn kéo.",
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
            ["Màn báo «Không tải được luật kiểm tra»", "Mạng hoặc máy chủ trục trặc. Bấm «Thử lại» ở khung đỏ."],
            ["Không thấy nút «Thêm luật», chỉ thấy «Chỉ xem»", "Bạn chưa có quyền sửa luật. Nhờ quản trị cấp ở mục «Phân quyền cài đặt», nhóm «Luật kiểm tra»."],
            ["Tắt luật rồi mà báo cáo cũ vẫn hiện lỗi", "Luật chỉ ảnh hưởng báo cáo tải lên SAU khi đổi. Báo cáo đã kiểm rồi giữ kết quả cũ; tải lại bản sửa để kiểm lại."],
            ["Người nộp báo cáo than không gửi được dù đã sửa hết lỗi", "Có thể còn luật AI mức «Chặn gửi» đang chạy nền. Chờ vài giây rồi gửi lại. Nếu AI trục trặc, xem mục «Khi AI lỗi hoặc quá thời gian chờ» của luật đó (trong ngăn kéo, bước ④)."],
            ["Tìm không ra luật vừa thêm", "Kiểm các bộ lọc đang bật (chip mẫu, ô chọn nhóm, ô «Chỉ luật đang bật»); luật vừa lưu nằm đúng nhóm mà bạn gõ ở ô «Nhóm»."],
            ["Muốn xóa một luật hệ thống", "Không xóa được. Chỉ tắt công tắc hoặc đổi mức."],
          ],
        },
      ],
    },
  ],
  canCu: "Màn Luật kiểm tra nhúng trong Cài đặt; bộ luật gốc (9 luật) ở phần cấu hình luật hệ thống; cách chạy luật Code và chặn gửi theo luật AI ở phần kiểm tra báo cáo trước khi gửi; quyền sửa luật theo nhóm cài đặt «luật kiểm tra».",
};
