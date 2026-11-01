// Hướng dẫn bản 2 (tab) — màn Việc của tôi. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI (Mr. Đại).
// Căn cứ code: components/viec-cua-toi/ViecCuaToiView.tsx · app/api/viec-cua-toi/route.ts · lib/cay-viec/issue/viec-cho-duyet.ts (nhapChoDuyet, giaoTuIssue)
// · lib/cay-viec/hoi-trung.ts (hỏi trùng, AI phán) · lib/mcp/cong-base.ts (base.viec_cua_toi). Không có số thật của dự án vì 3004 chứa dữ liệu người thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Việc của tôi — việc tôi cần giao, việc tôi giao, nhận và phối hợp",
  ai: "Mọi người đăng nhập đều xem được nửa phải (việc của mình). Nửa trái («Agent Công việc đề xuất giao việc») chỉ hiện việc chờ duyệt cho người có quyền «Giao việc» (hoặc Quản trị); người không có quyền thấy dòng «Bạn không có quyền Giao việc — không có việc chờ duyệt».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì?",
          doan: [
            "«Việc của tôi» là bàn làm việc cá nhân trong phần mềm: mở ra là biết hôm nay mình phải làm gì, đã giao gì cho người khác, và đang được nhờ phối hợp ở việc nào. Không phải đi lục từng dự án, từng báo cáo tuần.",
            "Màn chia đôi: NỬA TRÁI là những việc do máy soạn sẵn mà tôi (người có quyền giao) cần quyết có giao hay không; NỬA PHẢI là danh sách việc của tôi, chia 3 nút: «Việc tôi giao», «Việc tôi nhận», «Việc cần phối hợp».",
          ],
        },
        {
          tieuDe: "Vì sao phải có?",
          ds: [
            "Việc nằm rải ở nhiều chỗ (Sơ đồ tổ chức, Cây việc, Issue, báo cáo tuần). Một nơi duy nhất gom hết phần liên quan đến mình, ai cũng mở là thấy.",
            "Việc quá hạn tự lộ ra ngay ở chữ bên phải mỗi dòng («quá hạn N ngày»), không cần ai nhắc.",
            "Việc máy phát hiện cần giao (chỗ đường găng đang không có người làm, issue cần xử lý) được soạn sẵn nội dung — người có quyền chỉ cần nhìn, chọn người nhận và bấm một nút.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn «Việc của tôi»"],
            ["① Giao việc", "Máy phát hiện chỗ cần giao (Cây việc, Issue) hoặc người tự giao ở Sơ đồ tổ chức", "Nửa trái là nơi DUYỆT giao nhanh"],
            ["② Làm việc", "Người nhận làm, cập nhật tình trạng ngay trong thẻ việc", "Nửa phải là danh sách việc đang làm"],
            ["③ Báo cáo tuần", "Đơn vị nộp báo cáo, việc mới vào sổ", "Việc mới hiện ở đây sau khi vào sổ cái"],
            ["④ Lãnh đạo xem", "Ban lãnh đạo xem toàn cảnh", "Chữ «quá hạn» và dấu «!» đường găng cho thấy việc nào nguy hiểm"],
          ],
        },
        {
          tieuDe: "Màn có những khối nào (từ trái sang phải)?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Trái: dòng tiêu đề «Agent Công việc đề xuất giao việc · N việc · Nguồn: Cây việc & đường găng / Issue»", "Biết có bao nhiêu việc máy soạn sẵn đang chờ tôi, từ nguồn nào", "① Việc đề xuất giao"],
            ["Trái: ba ô «Tải lại» · «Mọi dự án» · ô lọc («Mới soạn trước», «Gấp nhất trước»…)", "Làm mới, lọc theo dự án, đổi cách xếp", "① Việc đề xuất giao"],
            ["Trái: các thẻ «Máy soạn sẵn từ … — chưa gửi đi đâu cả», nút «Giao việc» · «Sửa» · «Bỏ qua»", "Duyệt giao hoặc bỏ", "① · ②"],
            ["Phải: 3 nút «Việc tôi giao» · «Việc tôi nhận» · «Việc cần phối hợp» và ô tìm", "Chọn xem loại việc nào, tìm theo mã, tên, người, dự án", "③ Việc của tôi"],
            ["Phải: danh sách chia theo đơn vị; dòng việc; khối «Việc làm xong»", "Xem, bấm mở thẻ việc ngay tại chỗ", "③ · ④"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Xem việc · chọn người nhận · bấm «Giao việc», «Sửa», «Bỏ qua» · mở thẻ việc để cập nhật", "Người QUYẾT giao hay không, giao cho ai, hạn nào"],
            ["MÁY", "Gom việc của tôi từ sổ cái, đếm số trên ba nút, tính «quá hạn N ngày», dấu «!» đường găng · điền sẵn tên việc, hạn, kết quả cần có theo khuôn · kiểm không cho giao khi thiếu tên, thiếu người nhận, thiếu hạn hoặc hạn đã qua", "Cùng số liệu thì luôn ra cùng danh sách"],
            ["🤖 AI", "🤖 Gợi ý ai nên nhận việc ở nút đường găng chưa có người (đọc lịch sử «loại việc này thường ai làm» và chức năng từng đơn vị), kèm câu căn cứ hiện sau chữ «🤖» ở dòng «Giao cho»", "🤖 Chỉ là gợi ý, có thể sai; người đổi được ngay ở ô chọn. Máy kiểm lại mã người/đơn vị AI đưa ra có thật không, bịa thì bỏ"],
            ["🤖 AI", "🤖 Khi bấm «Giao việc», nếu có ứng viên gần giống thì AI của các agent khác xét giúp việc này có TRÙNG việc đã có không", "🤖 Kết luận trùng có thể sai — vì vậy có nút «Vẫn giao việc riêng»"],
          ],
          ai: [
            "Màn này KHÔNG tự gọi AI mỗi lần mở. Người nhận gợi ý lấy từ kết quả lần AI chạy trước đã lưu lại, nên mở màn nhanh.",
            "🤖 AI không bao giờ tự tạo việc: việc chỉ vào sổ cái sau khi người bấm «Giao việc».",
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI (nửa trái)",
          bam: [
            "🤖 AI (chạy ở màn Cây việc & đường găng, không chạy ở đây): với nút đường găng chưa ai được giao, AI đọc lịch sử giao việc và chức năng từng đơn vị rồi đề xuất MỘT người hoặc MỘT đơn vị, kèm câu căn cứ. Kết quả được lưu lại.",
            "MÁY: mở màn «Việc của tôi», máy đọc kết quả đã lưu, điền sẵn tên việc, hạn, kết quả cần có, người nhận gợi ý; kiểm người đó có nằm trong phạm vi bạn giao được không.",
            "NGƯỜI: bạn đọc thẻ, đổi người nhận nếu thấy không hợp, rồi bấm «Giao việc», «Sửa» hoặc «Bỏ qua». Chưa bấm thì chưa có việc nào được tạo.",
            "🤖 AI (chỉ khi bạn bấm «Giao việc» và máy tìm được việc gần giống): AI của các agent khác xét giúp việc này có trùng việc đã có không. AI chỉ báo, bạn quyết bằng nút «Vẫn giao việc riêng».",
            "MÁY: tạo việc trong sổ cái, gửi chuông cho người nhận. Việc hiện ở «Việc tôi giao» của bạn và «Việc tôi nhận» của người nhận.",
          ],
          luuY: ["Thẻ từ Issue (không phải nút đường găng) không có gợi ý người của AI: dòng «Giao cho» ghi «máy chưa biết ai» và bạn tự chọn."],
        },
        {
          tieuDe: "Thứ tự làm gợi ý mỗi sáng",
          bam: [
            "Mở «Việc của tôi» (nút trên thanh trên). Máy ghi nhận bạn đã xem nên nút hết phát sáng.",
            "Nếu có quyền giao: lướt các thẻ bên trái, giao hoặc bỏ qua từng thẻ.",
            "Bên phải, bấm «Việc tôi nhận» và làm từ việc quá hạn trước.",
            "Cuối ngày xem «Việc tôi giao» để biết người mình giao có trễ không.",
          ],
        },
      ],
    },
    {
      ten: "① Việc đề xuất giao",
      khoi: [
        {
          tieuDe: "Thẻ ở nửa trái là gì và vì sao có",
          doan: [
            "Mỗi thẻ là MỘT việc mới mà máy thấy nên có người làm nhưng chưa ai giao. Máy soạn sẵn nội dung, chưa gửi đi đâu cả (dòng chữ nhỏ đầu thẻ nói đúng như vậy: «Máy soạn sẵn từ cây việc & đường găng — chưa gửi đi đâu cả», hoặc «… từ issue …»).",
            "Hai nguồn: nút đường găng ở Cây việc chưa có người được giao, và Issue cần xử lý. Dòng tiêu đề ghi số việc của từng nguồn; bấm tên nguồn («Cây việc & đường găng», «Issue») để mở màn nguồn đối chiếu.",
            "Thẻ nhắc kiểu «nhắc đóng việc», «tồn việc quá hạn» KHÔNG hiện ở đây — việc cũ đã có người giữ, không giao thêm việc mới; muốn nhắc thì vào màn Cảnh báo.",
          ],
        },
        {
          tieuDe: "Trong mỗi thẻ có gì",
          bang: [
            ["Dòng", "Ý nghĩa"],
            ["Tên việc", "Tên máy soạn; sửa được ở «Sửa»"],
            ["Giao cho", "Người hoặc đơn vị nhận. Nếu máy chưa biết thì ghi «máy chưa biết ai — chọn ở ô bên dưới». Có chữ nghiêng bắt đầu bằng 🤖 là căn cứ AI nêu khi gợi ý người"],
            ["Hạn", "Ngày phải xong. Nếu hạn đã qua, máy ghi đỏ «đã qua, bấm Sửa chọn hạn mới»"],
            ["Thuộc dự án", "Việc thuộc dự án nào"],
            ["Kết quả cần có", "Việc xong thì phải có cái gì (để nghiệm thu việc)"],
            ["Nguồn", "Thẻ sinh từ cây việc hay issue nào, soạn ngày nào"],
          ],
        },
        {
          tieuDe: "Bộ lọc",
          bang: [
            ["Ô", "Chọn gì", "Tác dụng"],
            ["«Mọi dự án»", "Một dự án", "Chỉ hiện thẻ của dự án đó"],
            ["«Mới soạn trước»", "Cách xếp mặc định", "Thẻ mới soạn lên đầu"],
            ["«Gấp nhất trước»", "Cách xếp", "Hạn gần nhất lên đầu"],
            ["«Việc trên đường găng»", "Lọc", "Chỉ việc nằm trên đường găng (trễ là lùi ngày hoàn thành dự án)"],
            ["«Việc nghiêm trọng»", "Lọc", "Chỉ thẻ mức đỏ"],
            ["«Chưa có người nhận»", "Lọc", "Thẻ máy chưa chọn được ai"],
            ["«Hạn trong 7 ngày»", "Lọc", "Hạn từ hôm nay tới 7 ngày nữa"],
          ],
          luuY: ["Chọn trong danh sách là áp dụng ngay, không có nút xác nhận. Mỗi trang hiện đúng 2 thẻ; bấm «← Trước» / «Sau →» để lật."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A là trưởng phòng, có quyền «Giao việc». Sáng mở màn, dòng tiêu đề ghi «Agent Công việc đề xuất giao việc» kèm số việc đang chờ. Chị chọn «Việc trên đường găng» ở ô lọc: chỉ còn các thẻ mà trễ là lùi ngày hoàn thành dự án.",
            "Chị chọn một dự án ở ô «Mọi dự án» rồi chọn «Hạn trong 7 ngày»: màn chỉ giữ thẻ của dự án đó có hạn từ hôm nay tới 7 ngày nữa. Số trên dòng tiêu đề đổi sang dạng «số thẻ còn lại / tổng số thẻ» để chị biết bộ lọc đang giấu bao nhiêu thẻ.",
          ],
        },
        {
          ai: [
            "🤖 Việc AI làm: gợi ý người nhận cho nút đường găng chưa ai được giao. AI đọc những việc cùng giai đoạn đã giao trước đó, chức năng từng đơn vị và phân công lãnh đạo rồi chọn một người hoặc một đơn vị, kèm câu giải thích.",
            "🤖 AI chỉ được chọn người có thật trong danh sách mà máy đưa vào. Máy kiểm lại, chọn ngoài danh sách thì bỏ.",
            "🤖 AI KHÔNG tạo việc, không gửi tin cho ai.",
            "Người kiểm: nhìn tên ở dòng «Giao cho» và đổi ở ô chọn nếu thấy không hợp. Nếu AI chưa chạy được thì ô để trống, bạn tự chọn người.",
          ],
        },
      ],
    },
    {
      ten: "② Giao · Sửa · Bỏ qua",
      khoi: [
        {
          tieuDe: "Ba nút ở mỗi thẻ",
          bang: [
            ["Nút", "Làm gì", "Khi nào dùng"],
            ["«Giao việc»", "Tạo việc THẬT trong sổ cái, người nhận được chuông báo", "Nội dung đã đúng, chỉ cần chọn người nhận"],
            ["«Sửa»", "Mở ô giao việc ở nửa phải để sửa tên việc, người nhận, hạn, kết quả cần có, kẹp tệp", "Muốn đổi nội dung máy soạn"],
            ["«Bỏ qua»", "Nhớ «không cần giao việc» cho thẻ này, thẻ rời đi", "Việc không cần giao; muốn khôi phục thì vào màn Cảnh báo bỏ đánh dấu"],
          ],
        },
        {
          tieuDe: "Giao việc từng bước",
          bam: [
            "Đọc dòng «Giao cho». Nếu đúng người thì giữ; nếu sai hoặc trống, bấm ô chọn bên cạnh nút «Giao việc», chọn một người hoặc một đơn vị (chọn là áp dụng luôn).",
            "Kiểm hạn. Hạn đã qua thì nút «Giao việc» mờ; bấm «Sửa» chọn hạn mới.",
            "Bấm «Giao việc». Nút đổi thành «Đang giao…» rồi thẻ rời danh sách, có dòng báo «Đã giao việc» hoặc thông điệp lỗi.",
          ],
          ketQua: [
            "Máy tạo việc trong sổ cái với người giao là bạn. Người nhận thấy việc ở «Việc tôi nhận» và có chuông báo.",
            "Nút «Giao việc» đang mờ có nghĩa còn thiếu: «Chưa có nội dung việc», «Chưa chọn người nhận», «Chưa có hạn» hoặc «Hạn đã qua — bấm Sửa chọn hạn mới». Rê chuột vào nút để đọc đúng câu.",
          ],
          luuY: ["Mỗi lần bấm là một việc thật. Dữ liệu 3004 là dữ liệu công ty đang dùng, đừng bấm thử cho vui."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Thẻ ghi «Giao cho: máy chưa biết ai — chọn ở ô bên dưới», hạn còn xa. Chị A bấm ô chọn cạnh nút «Giao việc», chọn một đơn vị trong danh sách (chọn là áp dụng và đóng luôn), rồi bấm «Giao việc». Thẻ rời danh sách, dòng báo «Đã giao việc …» hiện ngay dưới thẻ.",
            "Một thẻ khác có hạn trước hôm nay: nút «Giao việc» mờ, rê chuột ghi «Hạn đã qua — bấm Sửa chọn hạn mới». Chị bấm «Sửa», chọn hạn mới ở khung bên phải (xem hướng dẫn «Khung sửa việc đề xuất») rồi giao.",
            "Một thẻ chị thấy không cần giao nữa (đã có người làm ngoài hệ thống): chị bấm «Bỏ qua». Thẻ biến mất và máy nhớ «không cần giao việc».",
          ],
        },
        {
          tieuDe: "Khi máy báo trùng",
          doan: [
            "Trước khi tạo việc, máy hỏi 5 agent khác (Tiến độ, Hợp đồng, Pháp lý, Nghiệm thu, Main) xem có việc nào đang mở nội dung gần giống không (luật 33 «Hỏi trùng trước khi soạn việc»). Nếu có thì thẻ hiện dòng bắt đầu bằng 🤖 nêu rõ việc nào đã có, kèm nút «Vẫn giao việc riêng».",
            "Hiểu đơn giản: tránh hai người cùng được giao một việc từ hai agent khác nhau. Nếu bạn xác định đây là việc khác thật, bấm «Vẫn giao việc riêng».",
          ],
          ai: [
            "🤖 Việc AI làm: nhận mô tả việc định giao, so với các việc đang mở của cùng dự án và nói «có trùng» hoặc «không trùng» kèm mã việc.",
            "🤖 AI KHÔNG chặn việc giao. Chỉ báo, người quyết.",
            "Nếu agent khác không trả lời kịp (hỏi tối đa 3 lần: ngay, sau 1 phút, sau 3 phút) thì việc vẫn được soạn, ghi rõ «chưa hỏi được agent …».",
          ],
        },
        {
          tieuDe: "Sửa ở nửa phải",
          doan: ["Bấm «Sửa» thì nửa phải ẩn danh sách và hiện ô giao việc giống dấu «+» ở Sơ đồ tổ chức, đã điền sẵn. Sửa xong bấm «Giao việc» (trong ô) hoặc «Huỷ sửa» để quay về danh sách. Có thể kẹp tệp 📎 kèm việc."],
        },
      ],
    },
    {
      ten: "③ Việc của tôi",
      khoi: [
        {
          tieuDe: "Ba nút ở nửa phải khác nhau thế nào",
          bang: [
            ["Nút", "Việc nào hiện", "Vì sao tách"],
            ["«Việc tôi giao»", "Việc TÔI giao tay (nút «+ Giao việc» hoặc quyết định của Tổng giám đốc) đang mở", "Để theo dõi người mình giao có làm không"],
            ["«Việc tôi nhận»", "Việc tôi CHỦ TRÌ đích danh (tên tôi hoặc chức danh lãnh đạo tôi giữ)", "Việc tôi phải làm"],
            ["«Việc cần phối hợp»", "Phần phối hợp chưa xong giao cho tôi, hoặc đơn vị tôi đứng đầu; việc tôi đã chủ trì thì không tính ở đây", "Tôi hỗ trợ chứ không đứng tên chính"],
          ],
          luuY: ["Số trong ngoặc cạnh tên nút là tổng số việc đang mở. Dưới danh sách có dòng «Hiện N/M việc mới nhất» nếu danh sách dài hơn giới hạn hiển thị."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Anh B vừa được chị A giao một việc. Anh mở màn, bấm «Việc tôi nhận»: việc nằm trong nhóm tên đơn vị của anh, bên phải ghi «hạn dd/mm/yyyy» hoặc «quá hạn N ngày». Dòng nào có dấu đỏ «!» đứng trước tên thì anh làm trước, vì trễ việc đó là lùi ngày hoàn thành dự án.",
            "Chị A bấm «Việc tôi giao» để xem người mình đã giao: gõ tên anh B vào ô «Tìm mã việc, tên việc, tên người, dự án…» là danh sách chỉ còn việc của anh B (gõ không dấu cũng ra).",
            "Anh C chỉ được nhờ hỗ trợ một việc của phòng khác: việc đó hiện ở «Việc cần phối hợp», không hiện ở «Việc tôi nhận».",
          ],
        },
        {
          tieuDe: "Đọc một dòng việc",
          bang: [
            ["Phần", "Nghĩa"],
            ["Dấu «›»", "Bấm vào dòng để mở thẻ việc ngay tại chỗ"],
            ["Dấu đỏ «!»", "Việc chưa xong nằm trên ĐƯỜNG GĂNG — trễ việc này là lùi ngày hoàn thành dự án"],
            ["Tên việc", "Tối đa 2 dòng"],
            ["Chữ bên phải", "Tình trạng do máy tính: «quá hạn N ngày», «hạn dd/mm/yyyy», xong…"],
          ],
        },
        {
          tieuDe: "Nhóm theo đơn vị và ô tìm",
          ds: [
            "Việc xếp theo đơn vị (như khu phải của Sơ đồ tổ chức); số bên phải tên đơn vị là số việc.",
            "Ô tìm (Tìm mã việc, tên việc, tên người, dự án…) bỏ dấu tiếng Việt khi so, gõ «cong viec» vẫn ra «công việc».",
            "Đổi sang nút khác thì thẻ đang mở đóng lại.",
          ],
        },
      ],
    },
    {
      ten: "④ Mở thẻ việc",
      khoi: [
        {
          tieuDe: "Bấm một việc thì sao",
          doan: [
            "Bấm tên việc: thẻ việc (cùng thẻ với màn Sơ đồ) bung ngay tại chỗ, không chuyển trang. Khi thẻ mở, cả danh sách còn lại tối đi để tập trung vào việc đang xem. Bấm lại tiêu đề trong thẻ là thu lại.",
            "Trong thẻ bạn đọc nội dung, thanh ngày, kết quả cần có, rồi tuỳ quyền mà bấm «Xong việc», «Gia hạn», «＋ Phối hợp», «Hủy việc», cây bút ✎ hoặc viết bình luận (mỗi nút có hướng dẫn riêng, bấm «? Hướng dẫn» khi thẻ đang mở). Người không có quyền sẽ không thấy nút. Đổi gì trong thẻ thì danh sách tự tải lại.",
          ],
          viDu: [
            "Anh B bấm vào việc «Soạn tờ trình xin gia hạn giấy phép» trong «Việc tôi nhận». Thẻ bung ra tại chỗ, các việc khác tối đi. Anh làm xong, bấm «Xong việc», gõ một dòng báo kết quả, kẹp bản tờ trình bằng nút 📎 rồi bấm «Xong việc» lần nữa. Danh sách tải lại và việc rời «Việc tôi nhận», sang khối «Việc làm xong» của nhóm.",
          ],
        },
        {
          tieuDe: "Khối «Việc làm xong»",
          doan: ["Dưới mỗi đơn vị có dòng gấp «▸ …» ghi số việc đã xong gần đây (khoảng thời gian ghi trong chú giải khi rê chuột vào). Bấm để mở xem, mở được thẻ việc như việc đang làm. Việc đã xong KHÔNG đếm vào số trên ba nút."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Nửa trái ghi «Bạn không có quyền Giao việc»", "Tài khoản chưa được cấp quyền «Giao việc». Nhờ Quản trị cấp ở Cài đặt, vai trò và quyền. Nửa phải vẫn dùng bình thường."],
            ["Nửa trái ghi «Không có việc soạn sẵn nào đang chờ duyệt»", "Máy chưa thấy chỗ nào cần giao, hoặc đã giao hết. Không phải lỗi."],
            ["Nút «Giao việc» mờ", "Rê chuột vào nút để đọc lý do (thiếu nội dung, người nhận, hạn, hoặc hạn đã qua). Bấm «Sửa» để bổ sung."],
            ["Dòng «Giao cho» ghi «máy chưa biết ai»", "AI chưa gợi ý được hoặc chưa chạy. Chọn người ở ô bên cạnh nút «Giao việc»."],
            ["Hiện dòng 🤖 báo trùng", "AI thấy đã có việc gần giống. Mở việc đã có để đối chiếu; khác thật thì bấm «Vẫn giao việc riêng»."],
            ["Đã giao nhầm", "Mở việc ở «Việc tôi giao» và sửa/đóng trong thẻ việc, tuỳ quyền của bạn."],
            ["Bấm «Bỏ qua» nhầm", "Vào màn Cảnh báo, bỏ đánh dấu «không cần giao» của thẻ đó, thẻ sẽ hiện lại."],
            ["Việc của tôi trống nhưng tôi có việc", "Việc chưa được ghi người chủ trì là tên/chức danh của bạn. Nhờ người giao sửa người chủ trì."],
          ],
        },
      ],
    },
  ],
  canCu: "Luật 33 «Hỏi trùng trước khi soạn việc» · luật 32 «Việc chưa tới lúc thì ẩn» (việc dự báo chỉ hiện từ 7 ngày trước ngày phải bắt đầu) · luật 17 riêng 3004 (nút không có quyền thì ẨN) · bản thiết kế «Việc chờ duyệt dùng chung» 04/10/2026.",
};
