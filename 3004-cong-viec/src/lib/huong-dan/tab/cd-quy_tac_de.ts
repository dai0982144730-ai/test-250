// Hướng dẫn bản 2 (tab) — Cài đặt › Quy tắc đè, việc thiếu hạn. Viết 20/10/2026. Nhãn chép từ components/cai-dat/nhom.tsx (NhomQuyTacDe) và lib/cau-hinh/bieu-mau.ts.
// Đối chiếu code 20/10: cả 7 ô đều có chỗ đọc (lib/so-cai/quy-tac-de.ts, dich-vu.ts, ap-dung-lai.ts).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Quy tắc đè, việc thiếu hạn",
  tab: "🔔 Cảnh báo & ngưỡng",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép. Nút «Áp dụng lại ngay» chỉ hiện với người có quyền sửa mọi nhóm cài đặt.",
  laGi: [
    "Cùng một việc có thể nằm trong nhiều báo cáo: Ban điều hành báo một kiểu, phòng chuyên môn báo một kiểu khác. Sổ cái chỉ giữ MỘT bản làm chuẩn, các bản kia gọi là «bị đè». Mục này quyết định bản nào thắng.",
    "Mục này cũng quyết định việc không ghi ngày kết thúc thì xử lý ra sao (chặn gửi hay coi là việc luôn mở).",
  ],
  vaoSao: [
    "Nếu không có quy tắc, mỗi báo cáo gửi lên sẽ thêm một dòng trùng và công ty không biết việc đang ở trạng thái nào. Quy tắc chung giúp cả công ty cùng một đáp số: cùng đầu vào luôn ra cùng một kết quả.",
    "Chọn quy tắc là chọn triết lý quản lý: tin cấp trên hơn (cấp trước) hay tin báo cáo mới nhất hơn (ngày trước).",
  ],
  vongLam: [
    "Bước trước: đơn vị gửi báo cáo (menu Báo cáo); kiểm tra trước khi gửi báo «việc trùng việc trong sổ cái».",
    "Mục này: khi báo cáo vào sổ, máy so các bản của cùng một việc theo quy tắc, chọn bản chuẩn, ghi các bản còn lại là «bị đè».",
    "Bước sau: người gửi bản bị đè nhận tin «Bản của bạn cho việc … không được dùng» (nếu bật), việc chuẩn hiện ở Sơ đồ tổ chức, Việc của tôi.",
  ],
  cacKhoi: [
    ["Thứ tự ưu tiên khi việc trùng", "Chọn một trong 4 cách phân thắng thua.", "Thứ tự ưu tiên"],
    ["«Ngày sau» tính theo", "So ngày theo kỳ báo cáo hay theo ngày bấm gửi.", "Thứ tự ưu tiên"],
    ["Công tắc (4 công tắc)", "Đã xong, việc không ngày, báo người gửi, áp dụng lại.", "Công tắc"],
    ["Ngưỡng gợi ý «có vẻ trùng»", "Thanh trượt 30% đến 100%.", "Gợi ý trùng"],
  ],
  nguoi: "Quản trị chọn quy tắc và bấm «Lưu». Người gửi báo cáo xác nhận khi máy gợi ý «có vẻ trùng».",
  may: "So bản báo cáo theo quy tắc đã chọn, giữ bản thắng, ghi lý do thua cấp hay thua ngày, tính lại các việc đang mở khi đổi quy tắc (nếu bật).",
  aiLam: "— Mục này không dùng AI. Gợi ý «có vẻ trùng» là máy so độ giống của tên việc, dự án, hạng mục; thắng thua cũng là máy tính theo quy tắc.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Thứ tự ưu tiên",
      khoi: [
        { doan: ["Đây là lựa chọn quan trọng nhất của mục. Hai chữ cần hiểu: «cấp» (cấp đơn vị: cấp 1 Ban Tổng giám đốc … cấp 4 Ban điều hành, cấp càng cao càng gần lãnh đạo) và «ngày» (xem ô «Ngày sau» tính theo)."] },
        {
          tieuDe: "Bốn cách",
          bang: [
            ["Cách", "Cách phân thắng thua"],
            ["Cấp trước, cùng cấp thì so ngày (mặc định)", "Cấp cao đè cấp thấp kể cả khi cấp thấp gửi sau."],
            ["Ngày trước, cùng ngày thì so cấp", "Báo cáo mới hơn thắng; cùng kỳ thì cấp cao thắng."],
            ["Chỉ theo cấp", "Cùng cấp thì giữ bản đến trước."],
            ["Chỉ theo ngày", "Bản mới nhất luôn thắng, không xét cấp."],
          ],
        },
        {
          tieuDe: "Ô «Ngày sau» tính theo",
          doan: ["Hai nút: «Kỳ báo cáo» (so ngày kết thúc của kỳ báo cáo) và «Ngày bấm gửi» (so lúc người dùng bấm gửi). Chọn «Kỳ báo cáo» thì báo cáo nộp muộn của kỳ cũ không đè báo cáo kỳ mới."],
        },
        { bam: ["Mở Cài đặt → tab «🔔 Cảnh báo & ngưỡng» → mục «Quy tắc đè, việc thiếu hạn».", "Bấm vào một trong bốn thẻ ở «Thứ tự ưu tiên khi việc trùng» (thẻ chọn có viền cam).", "Chọn «Kỳ báo cáo» hoặc «Ngày bấm gửi».", "Bấm «Lưu»."] },
        {
          viDu: [
            "Việc «Lắp trụ turbine số 5» có hai bản. Bản A do Ban điều hành (cấp 4) gửi ngày 14/10/2026 ghi hạn 30/10/2026. Bản B do Phòng Đầu tư và Pháp chế (cấp 2) gửi ngày 12/10/2026 ghi hạn 05/11/2026.",
            "Mặc định «Cấp trước»: cấp 2 cao hơn cấp 4 nên bản B thắng dù gửi sớm hơn; hạn chuẩn là 05/11/2026, bản A ghi «bị đè» và người gửi bản A nhận tin kèm lý do «thua cấp».",
            "Đổi sang «Chỉ theo ngày»: bản A mới hơn nên thắng, hạn chuẩn là 30/10/2026 (thua ngày là bản B).",
          ],
        },
        { luuY: ["Đổi quy tắc chỉ áp cho báo cáo gửi từ nay, trừ khi bật công tắc «Áp dụng lại cho việc đang mở khi đổi cài đặt» (xem tab «② Công tắc»)."] },
      ],
    },
    {
      ten: "② Công tắc",
      khoi: [
        { doan: ["Bốn công tắc bật tắt từng hành vi riêng. Công tắc bật là nền màu cam."] },
        {
          bang: [
            ["Công tắc", "Mặc định", "Bật thì"],
            ["«Đã xong» luôn được ghi nhận", "Bật", "Người phụ trách hoặc đơn vị thực hiện báo xong thì việc đóng, không xét cấp."],
            ["Việc không có ngày thì luôn mở", "Tắt", "Tắt: việc thiếu ngày kết thúc bị chặn gửi, yêu cầu sửa. Bật: nhận việc không ngày và coi là luôn mở (không có hạn, không bị nhắc quá hạn)."],
            ["Báo cho người gửi khi bản của họ không được dùng", "Bật", "Gửi tin kèm lý do: thua cấp hay thua ngày."],
            ["Áp dụng lại cho việc đang mở khi đổi cài đặt", "Tắt", "Đổi quy tắc là tính lại các việc đang mở (có xem trước trước khi lưu). Tắt: chỉ áp cho báo cáo từ nay."],
          ],
        },
        { bam: ["Bấm vào công tắc để bật hoặc tắt.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Bạn đang chuẩn bị tuần mới và muốn mọi việc đều có hạn: giữ «Việc không có ngày thì luôn mở» ở trạng thái tắt. Một đơn vị gửi báo cáo có dòng việc «Rà soát hồ sơ nghiệm thu» chưa ghi ngày kết thúc → bị chặn, kiểm tra trước khi gửi yêu cầu điền ngày.",
            "Muốn cho phép việc dài hạn không hạn: bật công tắc đó; dòng việc trên vào sổ cái là «luôn mở».",
          ],
        },
        { luuY: ["Công tắc «Áp dụng lại…» bật mà bạn đổi thứ tự ưu tiên hoặc «Ngày sau» hoặc «Đã xong» thì Lưu sẽ tính lại mọi việc đang mở — xem tab «③ Xem trước và áp dụng lại»."] },
      ],
    },
    {
      ten: "③ Xem trước và áp dụng lại",
      khoi: [
        { doan: ["Đổi quy tắc có thể làm nhiều việc đang mở đổi bản chuẩn hoặc đổi hạn. Vì vậy máy cho xem danh sách TRƯỚC khi bạn lưu, để khỏi bất ngờ."] },
        {
          tieuDe: "Xem trước ngay trên biểu mẫu",
          bam: [
            "Bật công tắc «Áp dụng lại cho việc đang mở khi đổi cài đặt».",
            "Đổi «Thứ tự ưu tiên», «Ngày sau» hoặc «Đã xong».",
            "Một khung vàng hiện lên: «Đang tính các việc đang mở sẽ đổi…» rồi «Khi lưu, hệ thống áp dụng lại cho N việc đang mở» kèm bảng Mã việc · Nguồn cũ → mới · Hạn cũ → mới · Lý do.",
            "Thấy ổn thì bấm nút «Lưu và áp dụng lại (N việc)».",
          ],
        },
        {
          tieuDe: "Nút «Áp dụng lại ngay»",
          doan: ["Khi không có thay đổi nháp, nút «Áp dụng lại ngay» (chỉ hiện với người có quyền sửa mọi nhóm cài đặt, và khi không có thay đổi nháp) tính lại mọi việc đang mở theo quy tắc đã lưu. Bấm sẽ mở hộp «Áp dụng lại quy tắc đè cho việc đang mở» có hướng dẫn riêng."],
        },
        {
          viDu: [
            "Bạn đổi từ «Cấp trước» sang «Chỉ theo ngày». Khung vàng báo «áp dụng lại cho 12 việc đang mở», bảng cho thấy việc «Lắp trụ turbine số 5» đổi nguồn từ «Phòng Đầu tư và Pháp chế» sang «Ban điều hành», hạn 05/11/2026 → 30/10/2026 (lý do: bản mới hơn).",
            "Bạn xem thấy hợp lý → «Lưu và áp dụng lại (12 việc)». Mỗi việc đổi được ghi vào lịch sử.",
          ],
        },
        { luuY: ["Nếu xem trước báo lỗi quyền (403) thì vẫn lưu được và hệ thống vẫn áp dụng lại khi lưu."] },
      ],
    },
    {
      ten: "④ Gợi ý trùng",
      khoi: [
        { doan: ["Khi một việc chưa có mã việc, máy so tên việc, dự án, hạng mục với những việc đã có trong sổ cái và gợi ý «có vẻ trùng» nếu giống đủ. Thanh trượt «Ngưỡng gợi ý «có vẻ trùng»» đặt độ giống tối thiểu (từ 30% đến 100%, mặc định 60%)."] },
        { bam: ["Kéo thanh trượt (số % hiện bên phải).", "Bấm «Lưu»."] },
        {
          viDu: [
            "Ngưỡng 60%: «Lắp trụ turbine số 5» và «Lắp đặt trụ turbine số 5 Hướng Việt» đủ giống, máy gợi ý trùng.",
            "Kéo ngưỡng lên 90%: chỉ hai tên gần như y hệt mới bị gợi ý; kéo xuống 40%: gợi ý nhiều hơn, người gửi phải xác nhận nhiều hơn.",
          ],
        },
        { luuY: ["Máy chỉ gợi ý — người gửi luôn là người quyết trùng hay không."] },
      ],
    },
  ],
  viDuLuu: ["Đổi «Thứ tự ưu tiên khi việc trùng» sang «Chỉ theo ngày» và bấm «Lưu» → nhật ký ghi «Thứ tự ưu tiên khi việc trùng: cap_truoc → chi_ngay»."],
  vuong: [
    ["Nút «Lưu» mờ", "Chưa có thay đổi nào, hoặc máy đang tính xem trước (chờ vài giây rồi lưu)."],
    ["Bản của tôi bị đè mà không hiểu vì sao", "Mở tin ở chuông 🔔: có ghi lý do thua cấp hay thua ngày; so với thứ tự ưu tiên đang chọn ở đây."],
    ["Việc cũ không đổi sau khi đổi quy tắc", "Công tắc «Áp dụng lại…» đang tắt: bật lên rồi lưu, hoặc bấm «Áp dụng lại ngay»."],
    ["Báo cáo bị chặn vì thiếu ngày", "Công tắc «Việc không có ngày thì luôn mở» đang tắt: điền ngày kết thúc cho dòng việc, hoặc nhờ quản trị bật công tắc."],
  ],
  canCu: "Nhóm «quy_tac_de» trong cài đặt; thuật toán đè và áp dụng lại trong phần sổ cái của ứng dụng.",
});
