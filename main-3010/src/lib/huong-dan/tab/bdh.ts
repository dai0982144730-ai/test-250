// Hướng dẫn bản 2 (tab) — Bảng điều hành (menu trái «Bảng điều hành»). Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Bảng điều hành",
  ai: "Mọi tài khoản đăng nhập đều xem được. Nút «Giao việc» / «Nhắc» và nút «🤖 Giải thích» cần quyền ghi (PM, Admin, Người dùng) — Người xem thấy nút mờ, rê chuột có lý do. Khối «Tiền» và «Hồ sơ pháp lý đang thiếu» chỉ hiện số cho người thuộc dự án đang chọn; người ngoài dự án thấy dòng «Ẩn — …».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Bảng điều hành là gì?",
          doan: [
            "Đây là màn mặc định của Main: một trang MỘT dự án, trả lời câu «dự án này đang thế nào?». Main không tự tính số của ai — nó hỏi bốn agent chuyên môn (Tiến độ, Hợp đồng, Pháp lý, Công việc), gom câu trả lời về một chỗ và bày ra cho lãnh đạo đọc một lượt.",
            "Hình dung: thay vì mở bốn phần mềm để ghép số, anh/chị mở một trang này. Trang chỉ nói ĐANG THẾ NÀO. Còn «phải xử gì» nằm ở màn Cảnh báo — màn này không có nút xử lý issue, chỉ có đường trỏ sang.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Lãnh đạo cần biết dự án chậm bao nhiêu ngày, vì ai, mà không phải đọc bốn báo cáo.",
            "Mọi số truy được về agent chủ — Main không ước, không làm tròn thay. Chỗ nào agent kia chưa trả lời, màn ghi thẳng «Chưa lấy được» thay vì đoán.",
            "Hai agent trả lời khác nhau về cùng một việc thì Main nêu cả hai bên cho anh/chị tự phán, không im lặng chọn một bên.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc của Main?",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Các agent Tiến độ · Hợp đồng · Pháp lý · Công việc cập nhật số của mình", "Bảng điều hành: đọc tình hình một dự án", "Màn Cảnh báo (phải xử gì) · Việc của tôi (giao, nhắc) · Báo cáo (tổng hợp định kỳ)"],
          ],
        },
        {
          tieuDe: "Các khối trên màn, từ trên xuống",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Dòng đầu «Dự án: …»", "Dự án đang chọn và chậm bao nhiêu ngày, ghi rõ so với Tiến độ mục tiêu hay Baseline", "① Đọc nhanh"],
            ["«Số lấy lúc …» và «↻ Lấy số mới»", "Cho biết số lấy lúc nào; bấm để hỏi lại các agent", "① Đọc nhanh"],
            ["Bốn dòng tóm tắt (Kéo lùi COD nhiều nhất · Kéo lùi COD thứ hai · Pháp lý · Tuần này)", "Đọc nhanh dự án đang có chuyện gì; bấm một dòng là xuống khối có số gốc", "① Đọc nhanh"],
            ["«S-Curve — bốn đường» · «Hạng mục đường găng»", "Đường tiến độ và hạng mục kéo COD chậm", "② Tiến độ"],
            ["«Tiền — hợp đồng BQL ký» · «Tuần này khác tuần trước»", "Tiền theo hợp đồng và so tuần", "③ Tiền, tuần, hồ sơ, việc tắc"],
            ["«Hồ sơ pháp lý đang thiếu» · «Đang tắc ở bàn ai»", "Hồ sơ thiếu và việc quá hạn, có nút «Giao việc» / «Nhắc»", "③ và ④"],
            ["«Chỗ hai agent nói khác nhau»", "Nơi hai agent trả lời trái nhau", "⑤ Chỗ nói khác nhau"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn dự án ở thanh trên; đọc; bấm «Giao việc» / «Nhắc»; bấm «Soát lại»", "Hỏi bốn agent, ghép số, đếm số ngày chậm, lọc theo quyền xem dự án, nhớ số 10 phút", "🤖 Viết câu tóm tắt đầu trang; 🤖 viết lời «Giải thích» khi hai agent nói khác nhau"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: [
            "Máy hỏi các agent và ghép sẵn bốn dòng tóm tắt — hiện NGAY, không chờ AI.",
            "🤖 AI đọc cùng bộ số đó rồi viết lại từng dòng cho dễ đọc. Máy soát từng dòng AI viết (số phải có trong dữ liệu dòng đó, không cộng dồn hạng mục, không nói «chưa giao» cho hồ sơ đã thành việc); dòng nào trượt thì giữ dòng máy ghép.",
            "Người đọc, thấy lạ thì mở khối bên dưới đối chiếu. AI chỉ viết chữ, không đổi số nào trên màn; nếu AI chưa trả lời kịp thì màn vẫn đủ số.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc nhanh",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Mở màn mỗi sáng: đọc dòng đầu và bốn dòng tóm tắt trước, 10 giây là biết dự án đang thế nào. Dự án đọc là dự án đang chọn ở thanh trên (nút tên dự án)."],
        },
        {
          tieuDe: "Bấm gì",
          bam: [
            "Chọn dự án ở nút dự án trên thanh trên (một bấm là đổi luôn).",
            "Đọc dòng «Dự án: … · chậm … ngày so với Tiến độ mục tiêu · chậm … ngày so với Baseline».",
            "Muốn số mới nhất thì bấm «↻ Lấy số mới» — máy hỏi lại các agent. Không bấm thì trong 10 phút màn dùng lại số cũ, ghi rõ «Số lấy lúc …».",
          ],
        },
        {
          ketQua: ["Chữ đỏ chỉ hiện khi chậm ở ít nhất một hệ. Có hai hệ so sánh: Tiến độ mục tiêu (Chủ đầu tư đưa ra) và Baseline (bản BQL ký với Tổng thầu) — màn luôn ghi rõ so với hệ nào."],
        },
        {
          ai: ["🤖 AI viết lại bốn dòng tóm tắt dưới dòng đầu; dòng có 🤖 là AI viết và đã qua máy soát, dòng không có 🤖 là máy ghép. Lúc AI chưa xong màn hiện «🤖 đang viết…» và vẫn đủ bốn dòng máy ghép.", "AI không được tự thêm số; bấm vào dòng là xuống khối có số gốc để đối chiếu.", "Nếu AI không trả lời, màn ghi «Đang hiện câu máy ghép — …» và số liệu vẫn đủ."],
        },
        {
          viDu: ["Dự án HV · Điện gió Hướng Việt (dữ liệu test) hôm nay: chậm 86 ngày so với Tiến độ mục tiêu (03/08/2027), chậm 44 ngày so với Baseline (14/09/2027). Chênh nhau 42 ngày là do Baseline đã ký muộn hơn Tiến độ mục tiêu — không phải chậm thi công.", "Cũng ở dự án này: 323 công việc, hoàn thành thực tế 4,6% (chỉ tính 73 việc nối tới mốc COD) và 14,5% (toàn bộ việc); 21 việc găng tới COD."],
        },
        {
          luuY: ["Chậm luôn đọc bằng NGÀY và phải nói so với hệ nào; phần trăm chỉ nói đã làm được bao nhiêu, không dùng để nói nhanh hay chậm."],
        },
      ],
    },
    {
      ten: "② Tiến độ",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Khi dòng đầu báo chậm, hai khối này trả lời «chậm vì đâu»: S-Curve cho thấy hình dáng cả dự án, bảng đường găng chỉ ra hạng mục nào kéo ngày COD."],
        },
        {
          bang: [
            ["Khối", "Đọc thế nào"],
            ["S-Curve — bốn đường", "Bốn đường: Mục tiêu của Chủ đầu tư · Baseline · Thực tế · Dự báo. Chỉ tính các việc nối tới mốc COD; việc không nối bị nêu riêng dưới biểu đồ để người lập tiến độ nối hoặc xác nhận."],
            ["Hạng mục đường găng", "Mỗi dòng là một hạng mục găng, cột cuối là số ngày hạng mục TỰ làm COD chậm so với Baseline — nếu riêng hạng mục đó làm đúng Baseline thì COD sớm lên bấy nhiêu ngày."],
          ],
        },
        {
          viDu: ["HV hôm nay: COD dự báo 28/10/2027, chậm 86 ngày so với Tiến độ mục tiêu = 42 ngày do Baseline ký muộn hơn + 44 ngày do thực hiện chậm so với Baseline.", "Hạng mục 6.1 Hợp đồng cung cấp turbine tự làm COD chậm 41 ngày; 7.6 Vận chuyển và lắp đặt turbine 20 ngày «toàn bộ do thời tiết»; các dòng còn lại 0 ngày vì chậm do việc phía trước đẩy sang.", "Có 170 việc kế hoạch xong trước COD nhưng không nối quan hệ tới mốc COD (ví dụ 1.1.1 Khảo sát phục vụ FS/thiết kế cơ sở) — bốn đường không tính các việc này."],
        },
        {
          luuY: ["Các hạng mục KHÔNG cộng dồn với nhau: 41 + 20 + 20 không bằng 44. Mỗi số chỉ nói phần do riêng hạng mục đó gây ra.", "Khối chưa có dữ liệu sẽ ghi «Chưa lấy được dữ liệu» kèm nút mở sang Agent Tiến độ — đó là chưa lấy được, không phải bằng 0."],
        },
      ],
    },
    {
      ten: "③ Tiền, tuần, hồ sơ, việc tắc",
      khoi: [
        {
          doan: ["Bốn khối này lấy số nguyên văn từ agent chủ: Hợp đồng (tiền), Tiến độ (so tuần), Pháp lý (hồ sơ thiếu), Công việc (việc quá hạn). Main chỉ cộng khi đủ số."],
        },
        {
          bang: [
            ["Khối", "Đọc thế nào"],
            ["Tiền — hợp đồng BQL ký", "Chỉ hợp đồng BQL ký với nhà thầu; hợp đồng thầu phụ bị bỏ ra. «chưa có số» khác 0 — ô chưa đủ số hợp đồng thì ghi «x/y hợp đồng có số — không cộng thiếu»."],
            ["Tuần này khác tuần trước", "So hai tuần liên tiếp: tiến độ thực tế lũy kế, COD dự báo, đầu việc mới lên đường găng… Ô nào chưa đủ dữ liệu hai tuần thì ghi lý do chứ không đoán."],
            ["Hồ sơ pháp lý đang thiếu", "Đếm «hồ sơ cần có» và «đang thiếu»; hồ sơ đã thành issue chỉ hiện một dòng mờ kèm mã issue, không có nút."],
            ["Đang tắc ở bàn ai", "Đếm việc quá hạn trong sổ việc agent Công việc, kèm người phụ trách và số ngày quá hạn; thêm dòng đề xuất / quy trình và phiếu giá đang chờ."],
          ],
        },
        {
          viDu: ["HV hôm nay: giá trị hợp đồng 192.000.000.000 đ; đã nghiệm thu 9.944.513.278 đ; nhưng «Đã thanh toán» ghi «chưa có số — 0/2 hợp đồng có số». Nghĩa là 2 hợp đồng (NT-03-HV-HD02 và NT-04-HV-HD03) chưa khai số thanh toán, không được hiểu là chưa thanh toán đồng nào.", "Hồ sơ pháp lý: 85 hồ sơ cần có, 66 đang thiếu, trong đó 18 đã thành issue. Việc tắc: 21 việc quá hạn."],
        },
        {
          luuY: ["Khối bị mờ bằng chữ «Ẩn — …» nghĩa là anh/chị không thuộc dự án này nên không được xem tiền / hồ sơ — không phải lỗi.", "Số hiện cũ vài phút là bình thường (nhớ 10 phút); cần mới thì bấm «↻ Lấy số mới» ở đầu trang."],
        },
      ],
    },
    {
      ten: "④ Giao việc / Nhắc",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Thấy một hồ sơ thiếu hoặc một việc quá hạn mà cần ai đó làm ngay: bấm nút cạnh dòng đó thay vì ghi tay. Việc được tạo ở agent Công việc, đủ tên, mô tả và dự án."],
        },
        {
          bam: [
            "Ở khối «Hồ sơ pháp lý đang thiếu» bấm «Giao việc» cạnh hồ sơ; ở khối «Đang tắc ở bàn ai» bấm «Nhắc» cạnh việc quá hạn.",
            "Khung giao việc mở ra với tên việc và mô tả điền sẵn (xem hướng dẫn «Giao việc» của khung đó).",
            "Chọn người nhận, chọn hạn rồi bấm «Giao việc» trong khung.",
          ],
        },
        {
          ketQua: ["Dòng báo xanh «✓ Đã giao cho … — việc … ở agent Công việc». Người nhận thấy việc ở agent Công việc."],
        },
        {
          viDu: ["Hồ sơ HV-08-02 Hợp đồng tư vấn giám sát thi công đang thiếu, quá hạn 79 ngày: bấm «Giao việc», tên việc điền sẵn «Hoàn thiện hồ sơ HV-08-02 — Hợp đồng tư vấn giám sát thi công», mô tả ghi cơ quan giữ hồ sơ và số ngày quá hạn."],
        },
        {
          luuY: ["Dòng đã có issue (chữ mờ, có mã ISS-…) không có nút — xử lý ở màn Cảnh báo để không giao trùng.", "Người xem thấy nút mờ: không có quyền ghi."],
        },
      ],
    },
    {
      ten: "⑤ Chỗ nói khác nhau",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Có lúc hai agent nói trái nhau cùng một việc, ví dụ agent Công việc ghi việc đã xong nhưng hồ sơ pháp lý vẫn thiếu, hoặc tiến độ báo 100% nhưng hợp đồng chưa nghiệm thu. Khối này nêu những chỗ đó. Main không sửa số và không phân xử."],
        },
        {
          bam: [
            "Mở màn, máy tự hỏi bốn agent (Công việc, Pháp lý, Hợp đồng, Tiến độ) — tối đa 20 mã WBS mỗi loại, việc găng trước.",
            "Mỗi chỗ lệch hiện hai bên và nút «Nguồn» để xem từng bên trả lời gì.",
            "Muốn AI giải thích nên tin bên nào thì bấm «🤖 Giải thích» (đã có lời thì nút thành «🤖 Giải thích lại»).",
            "Bấm «Soát lại» để hỏi lại.",
          ],
        },
        {
          ai: ["🤖 AI đọc nội dung hai bên và viết một đoạn giải thích vì sao lệch, kèm ước chi phí nếu có.", "AI không được sửa số của agent nào, không được kết luận thay người; người đọc nguồn hai bên rồi quyết.", "Nút chỉ bấm được khi có quyền ghi; mất kết nối AI thì bỏ qua, hai bên nguồn vẫn đủ để đọc."],
        },
        {
          viDu: ["Ca không lệch: «0 chỗ khác nhau» kèm số mã đã soát ở hai cặp: việc xong ở agent Công việc ↔ hồ sơ pháp lý, và tiến độ 100% ↔ nghiệm thu hợp đồng. Mã bên kia không tra được được liệt kê riêng — không phải mâu thuẫn, cũng chưa phải sạch."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Khối ghi «Chưa lấy được dữ liệu»", "Agent chủ chưa trả lời (đang tắt hoặc chưa mở công cụ). Dùng nút mở sang agent đó, hoặc đợi rồi bấm «↻ Lấy số mới». Không phải bằng 0."],
            ["Dòng đầu cảnh báo dự án đang chọn không có trong dàn", "Dự án chọn ở thanh trên chưa có số ở Main. Chọn dự án khác hoặc vào Cài đặt → 📁 Quản lý dự án kiểm tra."],
            ["Số không đổi dù agent kia đã sửa", "Màn nhớ số 10 phút. Bấm «↻ Lấy số mới»."],
            ["Bốn dòng tóm tắt không có 🤖", "AI chưa trả lời kịp, tắt, hoặc dòng AI viết bị máy soát loại — đang hiện dòng máy ghép, số vẫn đúng; mở lại màn sau ít phút."],
            ["Tôi không thấy khối Tiền / Hồ sơ pháp lý", "Anh/chị không thuộc dự án này nên chỉ thấy dòng «Ẩn — …». Nhờ quản trị thêm vào dự án."],
          ],
        },
      ],
    },
  ],
  canCu: "PLAN-MAIN-AGENT (màn Bảng điều hành); luật 35, 36 (nhanh / chậm tính bằng ngày, ghi rõ so với hệ nào); phân vai Code ↔ AI chốt 06/09/2026.",
};
