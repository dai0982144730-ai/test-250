// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Báo cáo tuần (AI). Viết 20/10/2026 (nhóm B3). Nhãn ô chép từ lib/cau-hinh/bieu-mau.ts (nhóm bao_cao_tuan).
// Đối chiếu code 20/10 — cả 10 ô đều được đọc: bat · bản AI (lib/bao-cao-tuan/viet.ts:333-334, app/api/bao-cao-tuan/viet/route.ts:19); trường chấm độ khó + bat (lib/bao-cao-tuan/do-kho.ts:110-112);
// don_vi_danh_gia, nguong_qua_tai, nguong_can_bang, nguong_tre, tre_muc_1, tre_muc_2 (lib/bao-cao-tuan/tinh.ts:136-142, 171, 257, 301); gio_viet_muon (viet.ts:343).
// Chỗ AI thật: lib/bao-cao-tuan/nen.ts:12 (viết báo cáo), do-kho.ts:113 (chấm độ khó), can-quyet-ai.ts:48 (chọn dòng cần Ban lãnh đạo quyết).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Báo cáo tuần (AI)",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Ai đăng nhập cũng xem được.",
  laGi: [
    "Menu «Báo cáo tuần» là bản đọc tình hình cả công ty trong một tuần, do 🤖 AI viết lời nhận định còn mọi con số do máy tính. Mục này chỉnh cách máy tính và cách AI viết: có bật không, dùng bản AI nào, đánh giá những đơn vị nào, thế nào là «quá tải», «trễ nhiều», nợ quá hạn nặng đến đâu, và đến mấy giờ thì viết dù cấp trên cùng chưa nộp.",
    "Phần lớn là các ngưỡng của máy. Chỉ hai ô («Model viết báo cáo», «Model chấm độ khó từng việc») chọn bản AI cho hai việc AI làm.",
  ],
  vaoSao: [
    "Mỗi công ty có tiêu chuẩn riêng về thế nào là một phòng đang gánh nặng. Ngưỡng khai ở đây, không viết cứng, để Ban lãnh đạo chỉnh khi cơ cấu đổi.",
    "Giữ AI chỉ diễn đạt: số do máy tính theo ngưỡng cố định, cùng dữ liệu thì cùng kết quả; AI không được ước số.",
  ],
  vongLam: [
    "Bước trước: việc nằm trong sổ cái; các đơn vị nộp báo cáo tuần ở «Báo cáo»; 🤖 AI chấm độ khó (điểm 1, 2, 4, 8 hoặc 13) cho từng việc mới vào sổ.",
    "Mục này: máy dùng các ngưỡng để xếp vùng tải của từng đơn vị, tính nợ quá hạn và chọn việc cần Ban lãnh đạo quyết; 🤖 AI viết phần nhận định từ bảng số đó khi cấp 1 đã nộp, hoặc đến giờ viết muộn nhất.",
    "Bước sau: Ban lãnh đạo đọc ở menu «Báo cáo tuần», giao việc hoặc nhắc ngay trên dòng.",
  ],
  cacKhoi: [
    ["Công tắc «Bật báo cáo tuần do AI viết»", "Tắt thì xem được bản cũ, máy không viết bản mới và không chấm độ khó việc mới", "① Bật và chọn bản AI"],
    ["Ô chọn «Model viết báo cáo» · «Model chấm độ khó từng việc»", "Bản AI cho hai việc; ô trống nghĩa là theo mục AI", "① Bật và chọn bản AI"],
    ["Ô chọn nhiều «Đơn vị được đánh giá»", "Những đơn vị có phần nhận xét riêng", "② Đơn vị được đánh giá"],
    ["«Quá tải khi Điểm công việc lớn hơn (điểm/người)» · «Cân bằng khi Điểm công việc từ (điểm/người)»", "Hai mốc chia vùng tải", "③ Vùng tải"],
    ["«Trễ nhiều khi % trễ từ (%)»", "Mốc coi một đơn vị là trễ nhiều", "④ Nợ quá hạn"],
    ["«Nợ quá hạn: trễ tới (ngày) thì hệ số ×1» · «… hệ số ×2, hơn nữa ×3»", "Hai mốc ngày chia hệ số nợ", "④ Nợ quá hạn"],
    ["«Cấp 1 chưa nộp: thứ Hai tuần sau tới giờ này vẫn viết»", "Giờ viết muộn nhất", "⑤ Giờ viết muộn nhất"],
  ],
  nguoi: "Quản trị chỉnh ngưỡng và chọn bản AI, bấm «Lưu». Ban lãnh đạo đọc báo cáo tuần; Ban lãnh đạo và quản trị bấm «Viết lại» khi cần.",
  may: "Tính điểm việc, tải mỗi người, % trễ, nợ quá hạn, vùng của từng đơn vị, chọn ứng viên cần quyết, xét lịch viết, kiểm mọi liên kết trong chữ AI viết.",
  aiLam: "🤖 Viết phần nhận định chung, nhận xét từng đơn vị, câu «vì sao nghẽn» ở điểm nóng · 🤖 chấm độ khó từng việc · 🤖 chọn dòng kiến nghị cần Ban lãnh đạo quyết trong ứng viên máy đưa.",
  quyTrinhAI: [
    "Máy tính đủ bảng số của tuần theo các ngưỡng ở mục này.",
    "Khi cấp 1 (Ban Tổng giám đốc) đã nộp báo cáo tuần, hoặc đến giờ viết muộn nhất: 🤖 AI nhận bảng số và viết lời nhận định, không được dùng số ngoài bảng. Máy kiểm lại, liên kết sai thì bỏ.",
    "Việc mới vào sổ: 🤖 AI chấm độ khó (1, 2, 4, 8, 13) chạy nền; Ban lãnh đạo sửa điểm thì lựa chọn của người thắng.",
    "Máy chọn ứng viên dòng cần Ban lãnh đạo quyết; 🤖 AI chọn tối đa vài dòng trong ứng viên đó và viết lời.",
    "Người đọc, giao việc hoặc nhắc ngay trên dòng.",
  ],
  buoc: [
    {
      ten: "① Bật và chọn bản AI",
      khoi: [
        {
          bang: [
            ["Ô", "Mặc định", "Tác động"],
            ["«Bật báo cáo tuần do AI viết»", "Bật", "Tắt thì không viết bản mới và cũng không chấm độ khó việc mới; menu vẫn xem bản cũ"],
            ["«Model viết báo cáo»", "bản AI tên «fable»", "Dùng cho lượt viết báo cáo mỗi tuần; nên chọn bản mạnh. Bỏ trống thì theo mục Cài đặt › AI"],
            ["«Model chấm độ khó từng việc»", "Trống (theo Cài đặt › AI)", "Chạy nền mỗi khi có việc mới vào sổ"],
          ],
        },
        { bam: ["Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Báo cáo tuần (AI)».", "Gạt công tắc, chọn bản AI trong ô chọn (chọn là áp dụng).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Nghi ngờ lời nhận định viết chưa hay: quản trị thử đổi «Model viết báo cáo» sang bản AI khác rồi nhờ Ban lãnh đạo bấm «Viết lại» ở menu Báo cáo tuần để so hai bản.",
            "Muốn tạm ngừng khi chuyển đổi hệ thống: gạt tắt công tắc. Ban lãnh đạo vẫn đọc được các tuần đã viết.",
          ],
        },
        {
          ai: [
            "AI nhận (viết báo cáo): bảng số của tuần do máy tính, tóm tắt việc và đơn vị. AI nhận (chấm độ khó): tên và nội dung việc.",
            "AI làm: viết chữ nhận định bộ máy (không khen chê cá nhân), chấm độ khó, chọn dòng cần quyết.",
            "AI KHÔNG làm: không tự tính hay ước số liệu, không giao việc, không sửa sổ cái.",
            "Thời gian: viết báo cáo cỡ một phút trở lên; chấm độ khó chạy nền theo từng lượt nhỏ. AI lỗi thì nghỉ rồi thử lại; không làm mất bảng số.",
            "Người kiểm: số hiển thị là của máy, đối chiếu được với danh sách việc; Ban lãnh đạo sửa điểm độ khó thì người thắng.",
          ],
        },
        { luuY: ["Ô chọn bản AI nằm sau các ô khác trong biểu mẫu, đừng nhầm với ô «Model mặc định» của mục AI: ô ở đây chỉ áp cho hai việc này."] },
      ],
    },
    {
      ten: "② Đơn vị được đánh giá",
      khoi: [
        { doan: ["Ô «Đơn vị được đánh giá» liệt kê những đơn vị mà máy tính tải và AI nhận xét riêng. Đơn vị phải có nhân sự thật (số tài khoản chính là số người). Đơn vị khác chỉ được tính số, AI không nhận xét. Ban lãnh đạo luôn được thêm vào cuối, tính như tập thể."] },
        {
          tieuDe: "Mặc định (7 đơn vị)",
          bang: [
            ["Đơn vị"],
            ["Phòng Đầu tư và Pháp chế"],
            ["Phòng Tài chính Kế toán"],
            ["Phòng Hành chính Tổng hợp"],
            ["Phòng Cơ điện"],
            ["Phòng Kinh tế và Vận hành"],
            ["BQLDA Quảng Trị"],
            ["BQLDA Lào"],
          ],
        },
        { bam: ["Ở ô «Đơn vị được đánh giá» bấm ô chọn «+ …», chọn đơn vị để thêm (chọn là áp dụng).", "Bấm dấu × trên thẻ để bỏ một đơn vị.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Công ty giao cho SCI E&C đủ người thật làm việc trong ứng dụng: quản trị thêm SCI E&C vào ô. Tuần sau, bảng đánh giá có thêm dòng của SCI E&C, có nhận xét riêng.",
            "Bỏ Phòng Cơ điện khỏi ô vì phòng chưa dùng ứng dụng: báo cáo không còn dòng đó, tránh con số «0 người» gây hiểu nhầm.",
          ],
        },
        { luuY: ["Đơn vị không còn trong cây đơn vị (đã tắt) sẽ bị bỏ qua khi tính. Thêm đơn vị chưa có tài khoản nào thì tải mỗi người là chưa tính được và vùng ghi «Chưa đủ dữ liệu»."] },
      ],
    },
    {
      ten: "③ Vùng tải",
      khoi: [
        { doan: ["Mỗi việc đang mở có «điểm công việc» theo độ khó (1, 2, 4, 8 hoặc 13). Máy cộng điểm các việc đang mở của một đơn vị, chia cho số người của đơn vị: được «điểm công việc mỗi người». Hai ô mốc chia thành ba vùng."] },
        {
          bang: [
            ["Vùng", "Điều kiện", "Mặc định"],
            ["Quá tải", "Điểm mỗi người LỚN HƠN ô «Quá tải khi Điểm công việc lớn hơn (điểm/người)»", "20"],
            ["Cân bằng", "Từ ô «Cân bằng khi Điểm công việc từ (điểm/người)» trở lên, không quá tải", "8"],
            ["Dư sức", "Dưới mốc cân bằng", "—"],
          ],
        },
        { bam: ["Gõ hai số vào hai ô (quá tải từ 1 đến 500, cân bằng từ 0 đến 500).", "Bấm «Lưu». Mốc quá tải phải lớn hơn mốc cân bằng."] },
        {
          viDu: [
            "Giả sử một phòng có 4 người, các việc đang mở cộng lại 100 điểm. Mỗi người 25 điểm, lớn hơn 20: vùng «Quá tải». Nếu cộng lại chỉ 40 điểm thì mỗi người 10 điểm, từ 8 trở lên và không quá 20: vùng «Cân bằng».",
            "Công ty thấy phòng nào cũng bị gắn «Quá tải»: nâng mốc quá tải từ 20 lên 30 và lưu. Các tuần viết sau đó (hoặc tuần được bấm «Viết lại») dùng mốc mới.",
          ],
        },
        { luuY: ["Đơn vị chưa có việc nào hoặc chưa có nhân sự ghi «Chưa đủ dữ liệu», không xếp vùng. Ban lãnh đạo là tập thể nên không tính điểm mỗi người."] },
      ],
    },
    {
      ten: "④ Nợ quá hạn",
      khoi: [
        { doan: ["Việc quá hạn là việc đang mở mà hạn kết thúc của nó đã qua. Số ngày quá hạn đo so với hạn kết thúc của chính việc đó trong sổ cái, KHÔNG phải so với Tiến độ mục tiêu hay Baseline. Mức nặng của nợ chia ba theo số ngày quá hạn, và một ô riêng quyết định thế nào là «trễ nhiều»."] },
        {
          bang: [
            ["Ô", "Mặc định", "Nghĩa"],
            ["«Nợ quá hạn: trễ tới (ngày) thì hệ số ×1»", "7", "Việc quá hạn từ 1 đến 7 ngày tính nợ = điểm việc × 1"],
            ["«Nợ quá hạn: trễ tới (ngày) thì hệ số ×2, hơn nữa ×3»", "30", "Quá hạn hơn 7 đến 30 ngày × 2; hơn 30 ngày × 3"],
            ["«Trễ nhiều khi % trễ từ (%)»", "25", "% trễ = điểm việc quá hạn ÷ điểm việc đang làm của đơn vị. Từ 25% trở lên là «trễ nhiều», dưới đó là «giữ nhịp»"],
          ],
        },
        {
          viDu: [
            "Việc 8 điểm quá hạn 5 ngày: nợ 8. Quá hạn 10 ngày: nợ 16. Quá hạn 40 ngày: nợ 24. Nợ của đơn vị là tổng nợ các việc quá hạn của đơn vị; việc nợ lớn xếp lên «điểm nóng».",
            "Đơn vị có 100 điểm việc đang làm, trong đó 30 điểm quá hạn: % trễ 30%, từ 25% trở lên nên báo cáo ghi vùng kèm «trễ nhiều» (ví dụ «Quá tải, trễ nhiều»).",
            "Ngoài ra, việc quá hạn hơn mốc hệ số ×2 (30 ngày theo mặc định) và từ 8 điểm trở lên được máy đưa vào danh sách ứng viên cần Ban lãnh đạo quyết.",
          ],
        },
        {
          luuY: [
            "Lưu báo lỗi nếu mốc hệ số ×2 không lớn hơn mốc ×1 hoặc nhỏ hơn 2 ngày: «Mốc trễ ×2 phải lớn hơn mốc trễ ×1». Mốc % trễ phải từ 1 đến 100.",
            "Việc có tên chứa chữ «test» hoặc «thử» không được tính vào điểm đơn vị, điểm nóng, dự án.",
          ],
        },
      ],
    },
    {
      ten: "⑤ Giờ viết muộn nhất",
      khoi: [
        { doan: ["Bình thường AI chỉ viết báo cáo tuần sau khi cấp 1 (Ban Tổng giám đốc) đã nộp báo cáo tuần. Nhưng nếu Ban đó chậm nộp thì Ban lãnh đạo không có báo cáo để đọc. Ô «Cấp 1 chưa nộp: thứ Hai tuần sau tới giờ này vẫn viết» đặt giờ chốt: tới giờ đó vào thứ Hai tuần sau mà cấp 1 vẫn chưa nộp, máy viết luôn và ghi rõ một dòng «cấp 1 chưa nộp»."] },
        { bam: ["Gõ giờ dạng HH:MM (mặc định 12:00).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Tuần 12/10/2026 – 18/10/2026 (7 ngày). Sáng thứ Hai 19/10/2026 Ban Tổng giám đốc chưa nộp. Đến 12:00 ngày 19/10/2026 máy viết báo cáo tuần của tuần vừa qua, ghi «cấp 1 chưa nộp». Nếu quản trị đổi sang 09:00 thì máy viết từ 09:00.",
          ],
        },
        { luuY: ["Giờ là giờ Việt Nam, đúng dạng HH:MM (sai thì «Lưu» báo lỗi). Nếu cấp 1 nộp trước giờ này thì máy viết ngay khi cấp 1 nộp, không chờ giờ này."] },
      ],
    },
  ],
  viDuLuu: ["Đổi mốc quá tải từ 20 thành 30 và bấm «Lưu» → nhật ký ghi «Quá tải khi Điểm công việc lớn hơn (điểm/người): 20 → 30» (phiên bản mới, có hiệu lực ngay)."],
  vuong: [
    ["Lưu báo «Ngưỡng Quá tải phải lớn hơn ngưỡng Cân bằng»", "Hai mốc ngược. Đặt mốc quá tải lớn hơn mốc cân bằng."],
    ["Lưu báo «Mốc trễ ×2 phải lớn hơn mốc trễ ×1»", "Hai mốc ngày đặt sai thứ tự."],
    ["Báo cáo tuần không có tuần mới", "Công tắc «Bật báo cáo tuần do AI viết» đang tắt, hoặc cấp 1 chưa nộp và chưa tới giờ viết muộn nhất, hoặc AI lỗi và đang nghỉ chờ thử lại."],
    ["Đổi ngưỡng mà tuần cũ vẫn thế", "Số của tuần đã viết được chốt lúc viết. Ban lãnh đạo bấm «Viết lại» để viết theo ngưỡng mới."],
    ["Đơn vị không thấy dòng nhận xét", "Đơn vị chưa nằm trong ô «Đơn vị được đánh giá» hoặc chưa có tài khoản nào."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «bao_cao_tuan» trong cài đặt; cách tính vùng tải, nợ quá hạn và lịch viết ở phần Báo cáo tuần; chốt cách A ngày 30/09/2026 của Mr. Đại cho ghép vùng với trễ nhiều.",
});
