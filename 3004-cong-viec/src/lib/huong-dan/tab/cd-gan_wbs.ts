// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Gắn việc vào WBS (CÓ AI). Viết 20/10/2026 (nhóm B3). Nhãn ô chép từ lib/cau-hinh/bieu-mau.ts (nhóm gan_wbs).
// Đối chiếu code 20/10 — cả 4 ô đều được đọc: «bat», «che_do», «nguong_tu_duyet» ở lib/gan-wbs/gan-wbs.ts (dòng 152, 133 · lib/gan-wbs/thuan.ts:68), «cua_so_giao_ngay» ở lib/cay-viec/dung-man.ts:149 và lib/cay-viec/issue/chay.ts:79.
// Chỗ AI thật: lib/gan-wbs/gan-wbs.ts:305 (hàm gọi AI trong ganWbsNen, chạy nền 5 phút một lần, lỗi thì nghỉ 30 phút; bản AI = Cài đặt › AI › bản AI mặc định); lời dặn ở ganMotDuAn (lô 40 việc, bảng mã + tên WBS).
// Đã sửa 20/10: nút «Duyệt N/M việc chờ duyệt chắc từ X%» ở màn Cây việc & đường găng đọc đúng ô ngưỡng ở mục này (api/cay-viec/gan-wbs → duyetCaLo).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Gắn việc vào WBS",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Ai đăng nhập cũng xem được. Người DUYỆT mã (bấm Duyệt ở màn Cây việc & đường găng) cần quyền «Duyệt gắn WBS» ở mục «Vai trò và quyền», hoặc là quản trị viên.",
  laGi: [
    "WBS là cây đầu việc của một dự án, do agent Tiến độ giữ: mỗi đầu việc có một mã và một tên (ví dụ «7.2.3 Thi công san nền»). Việc trong sổ cái công việc của công ty được viết bằng lời thường nên chưa biết mình thuộc đầu việc nào của cây. «Gắn việc vào WBS» là gán từng việc vào đúng một đầu việc của cây để màn Cây việc & đường găng biết việc nào đang làm cho đầu việc nào, đầu việc nào chưa có ai làm.",
    "Việc gắn do 🤖 AI đề xuất, không phải máy tính. Mục này chỉ chỉnh bốn thứ: có bật không, ai duyệt đề xuất của AI, ngưỡng độ chắc để AI tự duyệt, và cửa sổ ngày để coi việc găng là «chưa ai giao».",
  ],
  vaoSao: [
    "Gắn tay hàng trăm việc là không thể. AI đọc tên việc và đề xuất mã trong vài phút; người chỉ cần duyệt hoặc sửa chỗ sai.",
    "Gắn sai thì đường găng và số việc «chưa ai giao» sai theo, nên mục này cho bạn chọn mức tin AI: người duyệt từng việc hay để AI tự duyệt những đề xuất đủ chắc.",
  ],
  vongLam: [
    "Bước trước: dự án có cây WBS ở agent Tiến độ (cột «Mã bên Tiến độ» ở mục «Sơ đồ tổ chức dự án» có mã). Việc được tạo trong sổ cái và có ô «Dự án» khớp dự án đó.",
    "Mục này: cứ 5 phút máy xét các dự án có cây WBS, lấy việc đang mở hoặc đã xong chưa được gắn, nhờ 🤖 AI đề xuất mã kèm lý do và độ chắc (từ 0 đến 1). Tùy chế độ, đề xuất nằm chờ người duyệt hoặc có hiệu lực ngay.",
    "Bước sau: ở màn Cây việc & đường găng, việc đã gắn treo lên cây theo mã; việc chờ duyệt hiện ở nhóm «🤖 Duyệt gán mã công việc»; việc găng chưa ai giao được đếm đỏ và có thể soạn giao hàng loạt.",
  ],
  cacKhoi: [
    ["Công tắc «Bật gắn việc vào WBS»", "Bật thì máy tự gắn nền; tắt thì dừng hẳn", "① Bật và chế độ duyệt"],
    ["Ô chọn «Ai duyệt mã WBS AI đề xuất»: «Người duyệt (mặc định)» · «AI tự duyệt»", "Chọn đề xuất của AI chờ người hay có hiệu lực ngay", "① Bật và chế độ duyệt"],
    ["Ô «Ngưỡng độ chắc (0–1): AI tự duyệt và nút «Duyệt cả lô»» (mặc định 0,7)", "AI tự duyệt (khi chọn chế độ đó) và nút «Duyệt N/M việc chờ duyệt chắc từ …%» ở Cây việc", "② Ngưỡng độ chắc"],
    ["Ô «Cửa sổ giao việc găng (số ngày trước ngày bắt đầu)» (mặc định 7)", "Khoảng ngày để coi việc găng là chưa ai giao", "③ Cửa sổ giao việc găng"],
  ],
  nguoi: "Quản trị chỉnh bốn ô, bấm «Lưu». Người có quyền «Duyệt gắn WBS» duyệt hoặc sửa mã ở màn Cây việc & đường găng. Người làm việc với đường găng đọc kết quả.",
  may: "Chạy nền mỗi 5 phút: chọn dự án và việc cần gắn, đưa bảng mã WBS cho AI, kiểm mọi mã AI trả có thật nằm trong cây, lưu đề xuất, tự duyệt nếu đúng chế độ và đủ ngưỡng, đếm việc găng chưa ai giao theo cửa sổ ngày.",
  aiLam: "🤖 Đọc tên việc (và kết quả cần có) rồi đề xuất mã WBS kèm lý do và độ chắc. Việc không thuộc đầu việc nào (họp nội bộ, hành chính…) thì trả «không thuộc đầu việc nào».",
  quyTrinhAI: [
    "Máy lấy cây WBS của dự án từ agent Tiến độ (chỉ mã và tên đầu việc) và các việc chưa gắn của dự án, chia lô 40 việc.",
    "Việc có mã ghi sẵn trong tên chỉ là GỢI Ý: AI vẫn đối chiếu nội dung rồi mới nhận.",
    "🤖 AI trả cho từng việc: mã WBS (hoặc không có), lý do, độ chắc. Ưu tiên đầu việc lá khớp đúng nội dung.",
    "Máy kiểm: mã AI trả mà không có trong cây thì KHÔNG lưu bừa, ghi chờ người gắn. Mã hợp lệ thì lưu đề xuất.",
    "Chế độ «Người duyệt»: đề xuất nằm chờ. Chế độ «AI tự duyệt»: đề xuất có độ chắc từ ngưỡng trở lên có hiệu lực ngay, còn lại chờ người.",
    "Người duyệt hoặc đổi mã ở màn Cây việc & đường găng. Người sửa thì NGƯỜI THẮNG: AI không gắn đè lên.",
  ],
  buoc: [
    {
      ten: "① Bật và chế độ duyệt",
      khoi: [
        { doan: ["Hai ô đầu quyết định máy có tự gắn không và đề xuất của AI có hiệu lực ngay hay không."] },
        {
          bang: [
            ["Ô", "Mặc định", "Tác động"],
            ["«Bật gắn việc vào WBS»", "Bật", "Tắt thì không có lượt gắn nền nào; việc đã gắn vẫn giữ"],
            ["«Ai duyệt mã WBS AI đề xuất»", "«Người duyệt (mặc định)»", "Đề xuất nằm chờ ở màn Cây việc & đường găng, người có quyền «Duyệt gắn WBS» bấm duyệt"],
            ["", "«AI tự duyệt»", "Đề xuất có hiệu lực ngay nếu độ chắc từ ngưỡng ở tab ②; người vẫn sửa được bất cứ lúc nào"],
          ],
        },
        { bam: ["Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Gắn việc vào WBS».", "Gạt công tắc «Bật gắn việc vào WBS» và chọn «Ai duyệt mã WBS AI đề xuất».", "Bấm «Lưu»."] },
        {
          viDu: [
            "Công ty vừa bật tính năng, chưa tin AI: để «Người duyệt (mặc định)». Mỗi sáng người có quyền «Duyệt gắn WBS» mở Cây việc & đường găng, nhóm «🤖 Duyệt gán mã công việc», duyệt hoặc đổi mã từng đề xuất.",
            "Sau vài tuần thấy AI đúng gần hết: đổi sang «AI tự duyệt» và đặt ngưỡng 0,8 ở tab ②. Việc nào AI chắc từ 0,8 trở lên vào cây ngay; việc chắc dưới 0,8 vẫn chờ người.",
            "Muốn tạm dừng để người gắn tay hoàn toàn: gạt tắt «Bật gắn việc vào WBS».",
          ],
        },
        {
          ai: [
            "AI nhận: bảng mã và tên các đầu việc của cây WBS (không gửi cây chi tiết) và, với mỗi việc, mã việc, tên việc, kết quả cần có, gợi ý nếu tên có ghi mã.",
            "AI làm: đề xuất mã WBS, lý do (một hai câu) và độ chắc 0 đến 1 cho từng việc. Việc không thuộc đầu việc nào thì trả không có mã.",
            "AI KHÔNG làm: không tạo mã mới ngoài cây, không đụng việc đã được người gắn, không đổi tên hay hạn của việc.",
            "Thời gian: chạy nền, mỗi lượt có thể vài phút. Chờ được lâu mà AI không trả lời thì máy nghỉ 30 phút rồi thử lại.",
            "Người kiểm: mỗi đề xuất ghi lý do (bắt đầu bằng 🤖) và độ chắc ở màn Cây việc & đường găng. Phạm vi quyền duyệt tính theo đơn vị chủ trì việc. Chế độ người duyệt thì không có đề xuất nào có hiệu lực khi chưa có người bấm.",
            "Mất kết nối AI: màn Cây việc báo «🤖 AI chưa chạy được» kèm gợi ý xem Cài đặt › Kết nối › AI; bạn vẫn gắn tay bằng ô chọn mã.",
          ],
        },
        {
          luuY: [
            "Tắt công tắc không xóa các việc đã gắn.",
            "Mã WBS ghi sẵn trong tên việc không bao giờ được máy tự gắn thẳng: báo cáo đánh số riêng, từng gặp mã trùng mà khác nghĩa. AI luôn đối chiếu nội dung.",
          ],
        },
      ],
    },
    {
      ten: "② Ngưỡng độ chắc",
      khoi: [
        { doan: ["Mỗi đề xuất của AI có «độ chắc» từ 0 đến 1 (AI tự chấm). Ô ngưỡng dùng ở hai nơi: việc AI tự duyệt (khi chế độ là «AI tự duyệt») và nút «Duyệt N/M việc chờ duyệt chắc từ …%» ở màn Cây việc & đường găng."] },
        {
          bang: [
            ["Độ chắc AI ghi", "Nghĩa (theo hướng dẫn cho AI)"],
            ["Từ 0,7 trở lên", "Hợp lý nhưng có thể nhầm sang dòng lân cận"],
            ["Dưới 0,7", "Nghi: nên người xem"],
          ],
        },
        { bam: ["Gõ số từ 0 đến 1 vào ô «Ngưỡng độ chắc (0–1): AI tự duyệt và nút «Duyệt cả lô»» (bước nhảy 0,05; dùng dấu phẩy: 0,7).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Ngưỡng 0,7 (mặc định), chế độ «AI tự duyệt»: đề xuất độ chắc 0,85 có hiệu lực ngay; đề xuất 0,6 chờ người duyệt.",
            "Nâng ngưỡng lên 0,9: chỉ những đề xuất AI rất chắc mới tự vào cây; còn lại nhiều việc phải chờ người.",
            "Đề xuất không ghi độ chắc (AI không trả) luôn chờ người dù chế độ nào.",
          ],
        },
        {
          luuY: [
            "Số nằm ngoài 0 đến 1 bị từ chối: «Ngưỡng độ chắc phải từ 0 đến 1».",
            "Nút «Duyệt N/M việc chờ duyệt chắc từ 70%» ở màn Cây việc & đường găng đọc đúng mốc ở ô này (con số 70% chỉ là giá trị mặc định).",
          ],
        },
      ],
    },
    {
      ten: "③ Cửa sổ giao việc găng",
      khoi: [
        { doan: ["Đường găng là chuỗi đầu việc quyết định ngày hoàn thành của dự án. Việc găng nào ngày bắt đầu theo Baseline sắp tới mà CHƯA ai được giao thì phải báo đỏ. Nhưng việc còn xa mà đã báo đỏ thì chỉ gây nhiễu. Ô «Cửa sổ giao việc găng (số ngày trước ngày bắt đầu)» chọn «sắp tới» là bao nhiêu ngày."] },
        {
          tieuDe: "Cách tính",
          ds: [
            "Chỉ đầu việc LÁ trên đường găng mới xét.",
            "Việc có ngày bắt đầu theo Baseline trong N ngày tới (hoặc đã qua) và chưa ai được giao: tính là «chưa ai giao», đếm đỏ ở thẻ, đưa vào nút soạn việc hàng loạt và sinh issue.",
            "Việc xa hơn ghi «chưa tới lúc giao» (vẫn giao sớm tay được, không bị đếm đỏ).",
            "Điền 0 thì chỉ xét khi đã đến ngày bắt đầu. Cho phép 0 đến 365.",
          ],
        },
        {
          viDu: [
            "Giả sử hôm nay là 21/10/2026 và cửa sổ là 7 ngày (mặc định). Đầu việc găng có ngày bắt đầu Baseline 25/10/2026 mà chưa ai nhận: tính là chưa ai giao, báo đỏ. Đầu việc găng bắt đầu 15/11/2026: chưa báo đỏ, ghi «chưa tới lúc giao».",
            "Công ty cần chuẩn bị nhân sự trước 1 tháng cho việc thi công lớn: đổi ô thành 30 để báo đỏ sớm hơn.",
          ],
        },
        {
          luuY: [
            "Cửa sổ chỉ ảnh hưởng cách đếm và nhắc, không đổi dữ liệu việc hay mã đã gắn.",
            "Số phải nguyên từ 0 đến 365, sai thì «Lưu» báo «Cửa sổ giao việc găng phải là số ngày từ 0 đến 365».",
          ],
        },
      ],
    },
  ],
  viDuLuu: ["Đổi «Ai duyệt mã WBS AI đề xuất» từ «Người duyệt (mặc định)» sang «AI tự duyệt» rồi bấm «Lưu» → nhật ký ghi «Ai duyệt mã WBS AI đề xuất: nguoi_duyet → ai_tu_duyet» (phiên bản mới, có hiệu lực ngay)."],
  vuong: [
    ["Bật rồi mà không việc nào được gắn", "Dự án chưa có «Mã bên Tiến độ» (agent Tiến độ chưa có cây WBS cho dự án, xem mục «Sơ đồ tổ chức dự án»), hoặc việc chưa có ô «Dự án» khớp, hoặc AI đang nghỉ 30 phút sau lần lỗi."],
    ["Màn Cây việc báo «🤖 AI chưa chạy được»", "Kết nối AI trên máy chủ trục trặc. Xem Cài đặt › Kết nối › AI. Việc gắn tay vẫn làm được."],
    ["Đổi ngưỡng mà đề xuất cũ không đổi", "Ngưỡng chỉ áp cho đề xuất tạo sau khi lưu; đề xuất đang chờ vẫn chờ người duyệt."],
    ["Việc thuộc dự án này lại không hiện trên cây", "Đề xuất còn chờ duyệt thì CHƯA treo lên cây; mở nhóm «🤖 Duyệt gán mã công việc» để duyệt."],
    ["Nút «Duyệt …/… việc chờ duyệt chắc từ …%» hiện số khác ngưỡng tôi đặt", "Nút theo ô ngưỡng đã LƯU; đổi ngưỡng xong bấm «Lưu», rồi mở lại màn Cây việc."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «gan_wbs» trong cài đặt; cách AI đề xuất mã và cách duyệt ở phần Gắn việc vào cây WBS và màn Cây việc & đường găng.",
});
