// Hướng dẫn bản 2 (tab) — màn Báo cáo tuần (bản đọc tình hình tuần do AI viết), phần CHUNG của cả màn. Viết lại 20/10/2026 (nhóm A2).
// Chi tiết từng tab nằm ở ba hướng dẫn riêng: bct-tab-ai · bct-tab-quyet · bct-tab-so-lieu; các khung mở ở cột phải: bct-giao-viec · bct-do-kho · bct-bao-cao-don-vi.
// Căn cứ code: components/phong/BaoCaoTuanPhong.tsx (ba nút tab t1/t2/t3, khối đầu màn, cột phải) · lib/bao-cao-tuan/viet.ts (AI viết lời, code tính số)
// · do-kho.ts (AI chấm độ khó, chạy nền) · can-quyet-ai.ts · app/api/bao-cao-tuan/route.ts (quyền: mọi người xem; Ban lãnh đạo + Quản trị bấm viết lại, nhắc)
// · lib/cau-hinh/mac-dinh.ts (bao_cao_tuan: gio_viet_muon 12:00, ngưỡng 20 · 8 · 25). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tuần — tình hình cả công ty trong một tuần",
  ai: "Mọi người có quyền xem sổ cái đều đọc được. Nút «Viết ngay» và «Viết lại» chỉ hiện với Ban lãnh đạo và Quản trị. Nút «Nhắc» cũng chỉ hiện với hai nhóm này; nút «Giao việc» hiện theo quyền giao việc của bạn tới đúng đơn vị chủ trì của dòng đó. Biểu đồ độ khó từng việc chỉ Ban lãnh đạo thấy (Quản trị không thuộc nhóm này nên không thấy). Người không có quyền sẽ không thấy các nút trên.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Màn này là gì?",
          doan: [
            "«Báo cáo tuần» là bản đọc tình hình của cả công ty trong MỘT tuần, viết sẵn để lãnh đạo không phải mở từng báo cáo của từng phòng. Mọi con số do MÁY tính từ sổ cái công việc; phần lời nhận xét do 🤖 AI viết dựa trên đúng các con số đó.",
            "Đừng nhầm với menu «Báo cáo»: Gửi báo cáo là nơi các đơn vị NỘP báo cáo tuần của mình (tệp Word). Màn này là bản TỔNG HỢP rút ra từ sổ cái việc và những báo cáo đã nộp.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "Họp giao ban cần biết ngay: tuần qua xong gì, việc nào quá hạn, đơn vị nào đang gánh nặng, có gì cần Ban lãnh đạo quyết.",
            "Số liệu không phụ thuộc cảm nhận: cùng dữ liệu thì cùng con số. AI chỉ diễn đạt bằng lời, giọng không khen không chê, chỉ nhận xét bộ máy chứ không nhận xét cá nhân.",
            "Từ mỗi dòng có nút giao việc hoặc nhắc ngay, không phải sang màn khác.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của màn Báo cáo tuần"],
            ["1 · Giao việc, làm việc", "Việc nằm trong sổ cái (Sơ đồ tổ chức, Việc của tôi)", "Cung cấp số liệu"],
            ["2 · Nộp báo cáo tuần", "Các đơn vị nộp ở «Báo cáo»; cấp trên cùng là Ban Tổng giám đốc", "Khi Ban Tổng giám đốc nộp, AI bắt đầu viết"],
            ["3 · AI viết", "Chạy nền; muộn nhất 12:00 thứ Hai tuần sau dù cấp 1 chưa nộp", "Bạn đọc ở màn này"],
            ["4 · Giao ban", "Lãnh đạo xem, chọn việc để nhắc hoặc giao thêm", "Nút «Giao việc», «Nhắc» ngay trên dòng"],
          ],
        },
        {
          tieuDe: "④ Màn có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem hướng dẫn"],
            ["Đầu màn: «Báo cáo tuần N», khoảng ngày, dòng nhỏ «🤖 AI viết hh:mm …», nút «Viết lại»", "Biết báo cáo của tuần nào, AI viết khi nào, số chốt tới ngày nào", "Tab ① Đọc đầu màn (bên dưới)"],
            ["Ba nút: «🤖 AI đánh giá» · «Cần BLĐ ra quyết định» · «Số liệu tuần qua»", "Chọn góc nhìn", "Mỗi nút một hướng dẫn riêng (đổi nút thì nút Hướng dẫn tự đổi theo)"],
            ["Cột phải: danh sách việc, form giao việc, báo cáo đã nộp của đơn vị, biểu đồ độ khó", "Mỗi lần bấm một con số hay một đơn vị ở bên trái, chi tiết hiện ở đây", "Tab ② Ba góc nhìn và cột phải (bên dưới)"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc · bấm vào số để xem việc · «Giao việc», «Nhắc» (Ban lãnh đạo, Quản trị) · Ban lãnh đạo sửa điểm độ khó · bấm «Viết ngay» hoặc «Viết lại»", "Người quyết giao hay nhắc"],
            ["MÁY", "Tính MỌI con số: số việc xong, mới, đang mở, quá hạn; Điểm công việc, % trễ, Năng suất, Vùng của từng đơn vị; xếp điểm nóng; đọc dòng kiến nghị và Form 0 trong báo cáo; vẽ thanh, vòng tròn, trục thời gian nộp báo cáo", "Cùng dữ liệu thì luôn ra cùng số. Rê chuột lên ô số để xem phép tính"],
            ["🤖 AI", "🤖 Viết phần «Nhận định chung», dòng nhận xét dưới mỗi đơn vị, câu «vì sao nghẽn» ở mỗi điểm nóng", "🤖 Chỉ được dùng số máy đưa vào. Máy kiểm lại: liên kết sai thì bỏ, số lạ hoặc tên người thì ghi cảnh báo và gỡ tên"],
            ["🤖 AI", "🤖 Chấm ĐỘ KHÓ từng việc (1, 2, 4, 8, 13 điểm) kèm lý do — nền của Điểm công việc", "🤖 Có thể chấm lệch; Ban lãnh đạo sửa thì lựa chọn của người thắng và AI không chấm lại"],
            ["🤖 AI", "🤖 Đọc những dòng kiến nghị mà luật máy chưa chắc đã có việc tương ứng chưa", "🤖 Chỉ chọn trong ứng viên máy đưa; ngoài danh sách coi như không khớp"],
          ],
          ai: [
            "🤖 AI chạy NỀN: viết báo cáo thì hệ thống xét mỗi 5 phút, chấm độ khó mỗi 2 phút (mỗi lượt tối đa 25 việc chưa có điểm). AI lỗi thì nghỉ 30 phút rồi thử lại.",
            "Đang viết thì màn tự hỏi lại mỗi 10 giây; viết xong tự hiện, thường mất vài phút.",
            "🤖 AI KHÔNG tạo việc, không đổi hạn, không xoá. Việc chỉ phát sinh khi bạn bấm «Giao việc».",
            "Mất kết nối AI: màn báo «AI chưa viết được báo cáo tuần N: …» kèm lý do, hệ thống tự thử lại sau 30 phút. Trong lúc chờ có thể xem số liệu cùng kỳ ở Sơ đồ tổ chức.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "NGƯỜI", "Các đơn vị nộp báo cáo tuần ở «Báo cáo»; Ban Tổng giám đốc nộp cuối"],
            ["2", "MÁY", "Tính toàn bộ số liệu từ sổ cái; đọc các dòng kiến nghị trong báo cáo đã nộp"],
            ["3", "🤖 AI", "🤖 Chấm độ khó việc mới (nền), rồi viết lời nhận định từ bảng số"],
            ["4", "MÁY", "Kiểm lại lời AI: bỏ liên kết sai, cảnh báo số lạ, gỡ tên người; lưu bản báo cáo"],
            ["5", "NGƯỜI", "Đọc, bấm liên kết gạch chân để đối chiếu với việc thật; Ban lãnh đạo giao việc, nhắc, sửa độ khó"],
          ],
          viDu: ["Thứ Hai họp giao ban: mở menu «Báo cáo tuần», màn mở bản mới nhất đã viết xong. Trưởng phòng đọc tab «🤖 AI đánh giá» để biết đơn vị mình đang ở vùng nào, Tổng giám đốc sang tab «Cần BLĐ ra quyết định» để giao việc cho những kiến nghị chưa có người làm."],
        },
        {
          tieuDe: "Thứ tự xem gợi ý",
          bam: [
            "Đọc dòng đầu của «Nhận định chung»: tuần xong bao nhiêu việc, mới bao nhiêu, đang mở bao nhiêu, quá hạn bao nhiêu.",
            "Xem bảng «Chỉ số đơn vị»: đơn vị nào ở vùng «Quá tải» hoặc «trễ nhiều» thì bấm vào xem việc.",
            "Sang «Cần BLĐ ra quyết định»: giao việc cho dòng kiến nghị còn chưa có việc.",
            "Cuối cùng xem «Số liệu tuần qua» để biết đơn vị nào đã nộp báo cáo, đơn vị nào chưa.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc đầu màn",
      khoi: [
        {
          tieuDe: "Chọn tuần",
          doan: ["Ô chọn tuần nằm ở thanh trên cạnh nút Giải thích (Báo cáo tuần và Sơ đồ tổ chức dùng chung). Mỗi tuần có một bản; đổi tuần là đổi bản."],
          viDu: ["Họp giao ban thứ Hai muốn so với tuần trước: đổi ô chọn tuần sang tuần liền trước, đọc lại «Nhận định chung», rồi quay về tuần mới nhất."],
        },
        {
          tieuDe: "Khi chưa có báo cáo",
          ds: [
            "Màn ghi «Tuần này chưa có báo cáo. 🤖 AI tự viết khi Ban TGĐ nộp báo cáo tuần, hoặc tới 12:00 thứ Hai tuần sau.»",
            "Ban lãnh đạo, Quản trị thấy thêm nút «Viết ngay» để không phải chờ. Người khác không thấy nút này.",
            "Dòng «🤖 AI đang viết báo cáo tuần N (bắt đầu hh:mm dd/mm/yyyy) — trang tự cập nhật khi xong.» nghĩa là đang chạy, không cần bấm gì.",
            "Dòng «🤖 AI chưa viết được báo cáo tuần N: …» kèm lý do nghĩa là lần viết vừa rồi lỗi; hệ thống tự thử lại sau 30 phút.",
          ],
          viDu: ["Sáng thứ Hai, Ban Tổng giám đốc chưa nộp báo cáo tuần, Tổng giám đốc cần đọc gấp: vào Báo cáo tuần, thấy «Tuần này chưa có báo cáo», bấm «Viết ngay». Ghi chú ở đầu màn sẽ là «cấp 1 chưa nộp» để người đọc biết bản này viết khi Ban Tổng giám đốc chưa nộp."],
        },
        {
          tieuDe: "Dòng nhỏ ở đầu màn",
          doan: ["Dòng nhỏ có dạng «🤖 AI viết hh:mm dd/mm/yyyy · tên bản AI dùng · sau khi Ban TGĐ nộp báo cáo tuần» hoặc «… cấp 1 chưa nộp». Thêm «số chốt tới dd/mm/yyyy» khi tuần chưa kết thúc: số liệu mới tính tới ngày đó, chưa phải số cuối tuần."],
          luuY: ["Bấm «Viết lại» để AI viết lại từ số liệu mới nhất; chỉ nên bấm khi dữ liệu đã đổi đáng kể. Trong lúc viết lại, nút này ẩn đi."],
        },
      ],
    },
    {
      ten: "② Ba góc nhìn và cột phải",
      khoi: [
        {
          tieuDe: "Ba nút ở đầu màn",
          bang: [
            ["Nút", "Trả lời câu hỏi", "Ai viết nội dung"],
            ["«🤖 AI đánh giá»", "Tuần này tình hình chung ra sao, đơn vị nào đang gánh nặng hay trễ?", "Máy tính số, 🤖 AI viết lời"],
            ["«Cần BLĐ ra quyết định»", "Báo cáo của các đơn vị đang xin Ban lãnh đạo quyết gì, đã có người làm chưa? Việc nào đang nghẽn nhất?", "Máy đọc và xếp, 🤖 AI chỉ đọc chỗ máy chưa chắc và viết câu «vì sao nghẽn»"],
            ["«Số liệu tuần qua»", "Tuần qua xong bao nhiêu, mới bao nhiêu, đơn vị nào đã nộp báo cáo lúc mấy giờ?", "Toàn bộ do máy tính"],
          ],
          luuY: ["Mỗi nút có một hướng dẫn riêng: bấm nút nào thì nút «? Hướng dẫn» ở thanh trên chuyển sang hướng dẫn của nút đó."],
        },
        {
          tieuDe: "Cột phải hiện gì",
          ds: [
            "Mặc định khi mở: «Điểm nóng tuần N» — các việc nghẽn nhất.",
            "Bấm một con số hay một đơn vị ở bên trái: cột phải đổi thành danh sách việc tương ứng, chia nhóm (ví dụ Quá hạn / Đang làm, trong hạn / Xong).",
            "Bấm một chấm nộp báo cáo: hiện báo cáo của đơn vị đó (xem hướng dẫn «Báo cáo đã nộp của một đơn vị»).",
            "Bấm «Giao việc» ở một dòng: hiện form giao việc (xem hướng dẫn «Giao việc từ Báo cáo tuần»).",
            "Ban lãnh đạo bấm «🤖 Độ khó từng việc do AI chấm ›»: cột phải hiện biểu đồ độ khó (xem hướng dẫn «Độ khó từng việc»).",
          ],
          viDu: ["Trưởng phòng thấy phòng mình ghi «Quá tải, trễ nhiều»: bấm dòng phòng mình ở bảng «Chỉ số đơn vị», cột phải liệt kê việc chia ba nhóm. Mở từng việc ở nhóm «Quá hạn» để báo xong, gia hạn hoặc nhắn người giữ việc."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Màn ghi «Tuần này chưa có báo cáo»", "Ban Tổng giám đốc chưa nộp báo cáo tuần và chưa tới 12:00 thứ Hai. Ban lãnh đạo hoặc Quản trị bấm «Viết ngay»."],
            ["Ghi «AI chưa viết được báo cáo tuần N: …»", "Kết nối AI lỗi hoặc hết hạn mức. Nhờ Quản trị kiểm tra kết nối AI; hệ thống tự thử lại sau 30 phút."],
            ["Số liệu lệch với Sơ đồ tổ chức", "Báo cáo chốt số tới ngày ghi ở đầu màn (dòng «số chốt tới …»). Bấm «Viết lại» để lấy số mới nhất."],
            ["Một đơn vị hiện «—» ở Điểm công việc", "Đơn vị chưa có người hoặc chưa có việc để tính."],
            ["Thấy «chưa kịp chấm độ khó, tạm tính 2 điểm»", "AI chưa chấm hết lô việc mới. Mỗi 2 phút chấm tối đa 25 việc, sẽ tự hết."],
            ["Không thấy nút «Giao việc» ở một dòng", "Đơn vị chủ trì của dòng đó ngoài phạm vi quyền «Giao việc» của bạn. Nút ẩn hẳn, không mờ."],
            ["Không thấy nút «Nhắc» hay mục độ khó", "«Nhắc» chỉ Ban lãnh đạo và Quản trị thấy; mục độ khó chỉ Ban lãnh đạo thấy."],
          ],
        },
      ],
    },
  ],
  canCu: "Quy ước chấm điểm khó: rất dễ 1, dễ 2, vừa 4, khó 8, rất khó 13 (Mr. Đại chốt 30/09/2026) · ngưỡng mặc định: quá tải trên 20 điểm/người, cân bằng từ 8, trễ nhiều từ 25% (khai ở Cài đặt, Báo cáo tuần) · luật 19 (🤖 đứng trước mọi nội dung do AI sinh ra) · luật 31 (khoảng ngày kèm số ngày).",
};
