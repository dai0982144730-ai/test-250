// Hướng dẫn bản 2 (tab) — khung phải «Việc trong sổ» (chi tiết một việc + ô Mã WBS) của màn Cây việc & đường găng. Viết 20/10/2026 (nhóm A3).
// Căn cứ code: components/cay-viec/PhaiCayViec.tsx (KhungViec: bảng, «Kết quả cần có», «Phần việc», ô Mã WBS, nút «Duyệt», ô «✎ Đổi sang mã khác…»)
// · CayGiaiDoan.tsx (nhanTrangThai, chuDoChac, DongViec). AI gán mã: lib/gan-wbs/gan-wbs.ts:305. Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Chi tiết một việc và mã WBS",
  ai: "Xem: mọi người xem được màn. Nút «Duyệt» và ô «✎ Đổi sang mã khác…» cần quyền «Duyệt gắn WBS» (và việc phải nằm trong phạm vi quyền của bạn); người không có quyền sẽ không thấy hai điều khiển đó. Muốn sửa nội dung, hạn, người làm của việc thì làm ở Sơ đồ tổ chức, không làm ở đây.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: [
            "Bấm một dòng việc trên cây (hoặc trong danh sách chờ duyệt) thì cột phải mở «Việc trong sổ» của việc đó: ai giao, thời gian, kết quả cần có, các phần việc, và quan trọng nhất là ô «Mã WBS» — việc này đang được gắn vào đầu việc nào của tiến độ, ai gắn, chắc đến đâu.",
            "Đây là nơi duy nhất ở màn Cây việc để duyệt hoặc đổi mã WBS của MỘT việc.",
          ],
        },
        {
          tieuDe: "② Vì sao phải có?",
          ds: [
            "AI đề xuất mã dựa vào tên việc nên có thể nhầm; người cần xem căn cứ rồi mới quyết.",
            "Mã sai thì việc treo nhầm đầu việc: đầu việc găng này trông như đã có người nhận trong khi thật ra việc đó thuộc chỗ khác.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Việc gì", "Vai trò của khung này"],
            ["Trước", "AI đề xuất mã (nền hoặc khi bấm «🤖 Gán mã WBS vào công việc»)", "Cho ra đề xuất cần duyệt"],
            ["Khung này", "Đọc căn cứ → Duyệt hoặc Đổi mã", "Màn bạn đang xem"],
            ["Sau", "Việc treo đúng đầu việc; thẻ «Việc của dự án» tăng; Issue «Quá hạn ≥ N ngày» bắt đầu theo dõi việc này", "Cây việc & Issue"],
          ],
        },
        {
          tieuDe: "④ Khung có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Đầu khung: «Việc trong sổ · CV-…», tên việc, nhãn trạng thái", "Biết đang xem việc nào, tình trạng ra sao", "① Đọc việc"],
            ["Bảng: Trạng thái · Thời gian · Dự án · Người giao", "Thông tin chính", "① Đọc việc"],
            ["«Kết quả cần có» và «Phần việc»", "Việc xong thì có gì, ai làm phần nào", "① Đọc việc"],
            ["Ô «Mã WBS» với «Duyệt» và «✎ Đổi sang mã khác…»", "Duyệt hoặc đổi mã", "② Duyệt hoặc đổi mã"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc căn cứ · bấm «Duyệt» · chọn mã khác · chọn «Không thuộc đầu việc nào»", "Người thắng AI"],
            ["MÁY", "Đọc việc từ sổ cái · tính quá hạn, nằm im · kiểm quyền duyệt · ghi lại ai duyệt, lúc nào · treo việc lên cây khi mã đã duyệt", "Chính xác như đã lưu"],
            ["🤖 AI", "🤖 Đã đề xuất mã, độ chắc và câu căn cứ (hiện ở khung này, không chạy khi bạn mở khung)", "🤖 Có thể sai; dưới 70% ghi «nghi»"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bam: [
            "🤖 AI đã đề xuất mã từ trước (chạy nền hoặc do người bấm «🤖 Gán mã WBS vào công việc»).",
            "Người mở việc, đọc mã, độ chắc và câu căn cứ.",
            "Người chọn: «Duyệt» (giữ mã AI), hoặc «✎ Đổi sang mã khác…», hoặc «Không thuộc đầu việc nào».",
            "Máy ghi kết luận; việc treo lên cây. Từ đây AI không gắn đè lên mã này.",
          ],
          ai: ["Mở khung này không gọi AI. Bạn chỉ đang xem kết quả AI đã đề xuất trước đó."],
        },
      ],
    },
    {
      ten: "① Đọc việc",
      khoi: [
        {
          tieuDe: "Nhãn trạng thái dưới tên việc",
          bang: [
            ["Nhãn", "Nghĩa"],
            ["chưa giao ai", "Việc chưa có người chủ trì"],
            ["đã xong", "Việc đã hoàn thành"],
            ["quá hạn N ngày", "Đã qua hạn N ngày"],
            ["nằm im N ngày", "Việc chưa có động tĩnh N ngày; từ 7 ngày trở lên chữ đỏ"],
          ],
        },
        {
          tieuDe: "Bảng và các khối",
          bang: [
            ["Dòng", "Nghĩa"],
            ["Trạng thái", "đang mở · hoàn thành · đã đóng"],
            ["Thời gian", "«việc luôn mở» hoặc khoảng ngày kèm số ngày (khuôn «N ngày · dd/mm/yyyy – dd/mm/yyyy»)"],
            ["Dự án", "Dự án của việc"],
            ["Người giao", "Tên người giao; ghi «từ báo cáo / tài liệu» nếu việc do máy lọc từ báo cáo"],
            ["Kết quả cần có", "Thứ phải nộp hoặc đạt khi xong việc"],
            ["Phần việc", "Mỗi người một dòng: tên, «chủ trì» hoặc «phối hợp», «đã xong» hoặc «đang làm»"],
          ],
          luuY: ["Việc không nằm trong danh sách đang hiện (đã đóng hoặc ngoài dự án) thì ô Mã WBS ghi «Việc này không nằm trong danh sách đang hiện»."],
          viDu: ["Tình huống minh hoạ: bạn bấm một việc có nhãn «nằm im 9 ngày». Khung ghi Trạng thái «đang mở», Thời gian là khoảng ngày kèm số ngày, Người giao là tên người, và dưới «Phần việc» có một dòng người nhận ghi «chủ trì · đang làm». Từ đó bạn biết đúng ai đang giữ việc để nhắc."],
        },
      ],
    },
    {
      ten: "② Duyệt hoặc đổi mã",
      khoi: [
        {
          tieuDe: "Ô «Mã WBS»",
          bang: [
            ["Dòng trong ô", "Nghĩa"],
            ["Mã và tên đầu việc (kèm ● chờ duyệt)", "Việc đang gắn vào đầu việc nào; chấm vàng nghĩa là còn chờ duyệt. Nếu chưa xét ghi «chưa xét — 🤖 AI đọc ở lượt gán tới»"],
            ["«🤖 AI đề xuất» · «🤖 AI đề xuất — đã duyệt» · «người gắn»", "Mã đến từ đâu"],
            ["«nghi · chắc N%» · «chắc N%» · «chưa đo độ chắc»", "AI tự chấm; dưới 70% là nghi"],
            ["Câu căn cứ nhỏ bên dưới", "Vì sao AI chọn mã này"],
            ["«Xem đầu việc <mã> <tên>»", "Nhảy sang khung đầu việc"],
          ],
          bam: [
            "Đọc mã, độ chắc và căn cứ.",
            "Nếu đúng: bấm «Duyệt» (chỉ hiện khi còn chờ duyệt).",
            "Nếu sai: mở ô «✎ Đổi sang mã khác…» và chọn đầu việc đúng; hoặc chọn «Không thuộc đầu việc nào» nếu việc này không thuộc cây.",
          ],
          ketQua: ["Chọn xong là áp dụng ngay, không có nút xác nhận; bên dưới ghi «Đã duyệt mã WBS cho CV-…» hoặc «Đã đổi mã WBS cho CV-…». Việc treo lên cây, cây đọc lại."],
          luuY: ["Người gắn tay luôn thắng AI: mã bạn chọn thì về sau AI không đè lại. Đổi nhầm thì chọn lại ngay."],
          viDu: [
            "Tình huống minh hoạ: việc «Báo cáo kiểm tra cốt nền khu B» được AI đề xuất gắn vào «7.2.3 Thi công san nền», chắc 58%, ghi «nghi». Căn cứ AI: tên việc có chữ nền. Bạn biết việc này thuộc đợt nghiệm thu móng nên chọn mã móng ở ô «✎ Đổi sang mã khác…». Bên dưới hiện «Đã đổi mã WBS cho CV-…».",
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
            ["Không có nút «Duyệt» và ô đổi mã", "Bạn thiếu quyền «Duyệt gắn WBS», hoặc việc nằm ngoài phạm vi quyền của bạn — nút ẩn."],
            ["Không có nút «Duyệt» nhưng có ô đổi mã", "Việc đã duyệt rồi hoặc do người gắn; nút «Duyệt» chỉ hiện khi còn chờ duyệt."],
            ["Ô Mã WBS ghi «chưa xét»", "AI chưa đọc việc này; chờ lượt chạy nền hoặc bấm «🤖 Gán mã WBS vào công việc», hoặc tự chọn mã tay."],
            ["Muốn sửa hạn hay người làm", "Làm ở Sơ đồ tổ chức (cây bút ✎ trên việc), không làm ở đây."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt của Mr. Đại 03/10/2026 (mọi chỗ bấm ở cột trái mở nội dung ở cột phải; một cú chọn là áp dụng) · phân vai AI của dự án: AI chỉ đề xuất, người duyệt mới có hiệu lực · luật 17 riêng 3004 (nút không quyền thì ẨN).",
};
