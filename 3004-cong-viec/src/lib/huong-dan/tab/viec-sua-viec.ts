// Hướng dẫn bản 2 (tab) — khung sửa việc mở bằng cây bút ✎ trong thẻ việc. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (FormSuaViec, ô lãnh đạo phối hợp, NhomPhoiHop) · lib/so-cai/lanh-dao-phoi-hop.ts (AI gắn lãnh đạo, chạy nền 5 phút một lượt, 12 việc mỗi lượt)
// · lib/types.ts (nhãn quyền «Sửa việc»). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Sửa việc — khung mở bằng cây bút ✎ cạnh tên việc",
  ai: "Chỉ người có quyền «Sửa việc» (phạm vi do Quản trị đặt: việc mình giao, đơn vị mình chủ trì, cả đơn vị cấp dưới, hoặc toàn bộ) mới thấy cây bút ✎. Người đứng phối hợp không bao giờ được sửa. Người không có quyền sẽ không thấy cây bút.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Khung này là gì?",
          doan: [
            "Cây bút ✎ nằm ngay sau tên việc. Bấm vào thì thẻ việc mở ra (nếu đang đóng) và hiện một biểu mẫu sửa toàn bộ việc: tên việc, kết quả cần có, ngày bắt đầu, hạn, người chủ trì, lãnh đạo phối hợp, các bên phối hợp.",
            "Khác với «Gia hạn» (chỉ đổi hạn) và «＋ Phối hợp» (chỉ thêm một bên), khung này sửa mọi thứ cùng lúc rồi lưu một lần.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Việc do máy lọc từ báo cáo hoặc người giao vội thường có tên chưa rõ, thiếu kết quả cần có, hoặc sai người chủ trì.",
            "Đổi người chủ trì chính là giao lại việc, nên danh sách người chọn cùng một kiểu trình bày với ô «Giao cho» khi giao việc.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Việc đã vào sổ cái (người giao, hoặc máy lọc ra từ báo cáo tuần)", "Sơ đồ tổ chức, Dự án, Việc của tôi"],
            ["Bước này", "Người có quyền chỉnh lại cho đúng", "Khung sửa việc"],
            ["Sau", "Việc đã sửa hiện ở mọi màn; người chủ trì mới (nếu đổi) thấy việc ở «Việc tôi nhận»", "Mọi màn"],
          ],
        },
        {
          tieuDe: "Khung có những ô nào?",
          bang: [
            ["Ô", "Để làm gì", "Xem tab"],
            ["«Tên việc», «Kết quả cần có»", "Nội dung", "① Sửa nội dung"],
            ["«Bắt đầu», «Hạn» và dòng khoảng ngày", "Thời gian", "① Sửa nội dung"],
            ["«Chủ trì»", "Đổi người chủ trì", "② Người liên quan"],
            ["«Lãnh đạo phối hợp»", "Mỗi việc một lãnh đạo", "② Người liên quan"],
            ["«Phối hợp» (các thẻ tên kèm ✕ và ô «＋ thêm phối hợp…»)", "Các bên phối hợp", "② Người liên quan"],
            ["Nút «Lưu», «Bỏ»", "Chốt hoặc thôi", "③ Lưu"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Sửa các ô, bấm «Lưu»", "Người quyết"],
            ["MÁY", "Kiểm tên không trống, ngày bắt đầu không sau hạn, tính khoảng ngày, kiểm quyền và phạm vi, ghi vết", "Cùng dữ liệu thì cùng kết quả"],
            ["🤖 AI", "🤖 Điền sẵn ô «Lãnh đạo phối hợp»: AI đọc tên việc, đơn vị chủ trì, dự án và phân công của Ban lãnh đạo rồi chọn MỘT lãnh đạo", "🤖 Có thể chọn chưa đúng; máy kiểm mã lãnh đạo có thật, bịa thì bỏ. Bạn đổi ở ô là xong"],
          ],
          ai: [
            "🤖 AI chạy nền, vài phút một lượt, mỗi lượt xét một lô việc đang mở chưa có lãnh đạo phối hợp (cả việc cũ). AI lỗi thì nghỉ 30 phút. AI không gắn khi việc đã có lãnh đạo phối hợp, lãnh đạo đó đang chủ trì, hoặc chưa ghi phân công lãnh đạo nào.",
            "🤖 Gắn lùi cho việc cũ không gửi chuông «được thêm phối hợp» để khỏi dồn tin; lãnh đạo thấy ở nút «Việc cần phối hợp».",
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "🤖 AI gắn một lãnh đạo phối hợp cho việc (nền, tự động).",
            "NGƯỜI: bạn bấm cây bút ✎ và thấy lãnh đạo AI đã chọn trong ô «Lãnh đạo phối hợp».",
            "NGƯỜI: giữ nguyên hoặc chọn lãnh đạo khác, hoặc «— Không có —».",
            "MÁY: lưu. Việc đã có lãnh đạo phối hợp thì AI không gắn thêm.",
          ],
        },
      ],
    },
    {
      ten: "① Sửa nội dung",
      khoi: [
        {
          bang: [
            ["Ô", "Cách dùng"],
            ["«Tên việc»", "Ô chữ nhiều dòng, đã có tên hiện tại. Không để trống (trống thì «Lưu» mờ và ghi «Chưa có tên việc»)"],
            ["«Kết quả cần có»", "Việc xong thì phải có cái gì. Gợi ý trong ô: «Ví dụ: tờ trình gửi TGĐ». Để trống là xoá kết quả cần có"],
            ["«Bắt đầu» và «Hạn»", "Ô ngày dạng dd/mm/yyyy. Dưới hai ô hiện khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy» và chữ «hạn đã qua» nếu hạn trước hôm nay. Bắt đầu sau hạn thì «Lưu» mờ và ghi «Ngày bắt đầu sau hạn»"],
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Máy lọc từ báo cáo tuần ra việc tên «Hồ sơ». Chị A bấm ✎, sửa thành «Hoàn thiện hồ sơ xin cấp phép xây dựng đợt 2», thêm kết quả cần có «Bộ hồ sơ nộp Sở có dấu nhận», sửa hạn. Dưới hai ô ngày hiện khoảng ngày kèm số ngày để chị khỏi đếm.",
          ],
        },
      ],
    },
    {
      ten: "② Người liên quan",
      khoi: [
        {
          tieuDe: "Chủ trì, lãnh đạo phối hợp, phối hợp",
          bang: [
            ["Ô", "Cách dùng", "Lưu ý"],
            ["«Chủ trì»", "Chọn người khác trong danh sách xếp theo đơn vị; dòng đầu là người đang chủ trì, ghi «(đang chủ trì)»", "Chỉ hiện khi việc còn phần chủ trì chưa xong. Đổi chủ trì là giao lại việc cho người đó"],
            ["«Lãnh đạo phối hợp»", "Chọn MỘT lãnh đạo, hoặc «— Không có —»", "Chọn là thay lãnh đạo cũ trong khung, bấm «Lưu» mới ghi. Ô này chỉ hiện khi sơ đồ có đơn vị lãnh đạo"],
            ["«Phối hợp»", "Mỗi bên là một thẻ tên, bấm ✕ để bỏ. Ô «＋ thêm phối hợp…» để thêm", "Chọn trong danh sách là thêm vào khung, chưa lưu cho tới khi bấm «Lưu». Bên đã có trong việc không hiện lại"],
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Việc giao nhầm cho anh B nhưng đúng ra chị C làm. Chị A mở ✎, ở «Chủ trì» chọn chị C, xoá phòng Pháp lý khỏi «Phối hợp» bằng ✕, thêm phòng Hợp đồng ở «＋ thêm phối hợp…». Tới đây chưa có gì thay đổi thật; chỉ khi bấm «Lưu» mọi thứ mới ghi.",
          ],
        },
      ],
    },
    {
      ten: "③ Lưu",
      khoi: [
        {
          bam: [
            "Soát lại các ô. Câu mờ bên cạnh nút «Lưu» cho biết còn thiếu gì.",
            "Bấm «Lưu». Nếu muốn thôi, bấm «Bỏ»: khung đóng, việc giữ nguyên.",
          ],
          ketQua: ["Dòng báo «Đã sửa việc …». Thẻ tải lại với nội dung mới; danh sách ở màn cũng tải lại."],
          luuY: ["Máy chủ kiểm lại quyền và phạm vi: chủ trì chỉ chọn trong phạm vi bạn giao được. Nếu bị từ chối, một dòng báo lỗi nêu lý do hiện ngay bên dưới khung."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Chị A sửa xong tên và hạn nhưng quên điền tên việc (xoá trắng). Nút «Lưu» mờ, câu bên cạnh ghi «Chưa có tên việc». Chị gõ lại tên, nút sáng, chị bấm «Lưu». Thẻ tải lại với tên và hạn mới, dòng báo «Đã sửa việc …»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy cây bút ✎", "Bạn không có quyền «Sửa việc» với việc này, hoặc bạn chỉ đứng phối hợp."],
            ["Không có ô «Chủ trì»", "Việc không còn phần chủ trì đang làm (đã xong)."],
            ["Không có ô «Lãnh đạo phối hợp»", "Sơ đồ chưa có đơn vị lãnh đạo."],
            ["«Lưu» mờ", "Tên trống hoặc ngày bắt đầu sau hạn."],
            ["Chỉ muốn đổi hạn", "Dùng «Gia hạn» cho nhanh."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Sửa việc» (cây bút) khai ở Cài đặt, Vai trò và quyền · chốt 29/09/2026 (cây bút, phối hợp không được sửa) · chốt 03/10/2026 (mỗi việc một lãnh đạo phối hợp, AI gắn thẳng, sửa được) · chốt 10/10/2026 (đổi chủ trì là giao lại việc) · luật 31.",
};
