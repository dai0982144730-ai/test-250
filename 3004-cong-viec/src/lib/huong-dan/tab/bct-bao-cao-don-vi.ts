// Hướng dẫn bản 2 (tab) — Báo cáo tuần, khung «Báo cáo tuần N · <đơn vị>» ở cột phải (mở khi bấm chấm nộp trên trục thời gian). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/phong/BaoCaoTuanPhong.tsx (Phai kieu bc: khoi-bc, nút «Xem file báo cáo», nút «Mọi việc của …», nhóm «Việc lọc ra từ báo cáo này», cuaBc) · moXemTep (khung xem tệp có khoanh cam).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tuần — báo cáo đã nộp của một đơn vị",
  ai: "Mọi người có quyền xem sổ cái đều mở được. Việc nằm trong khung thì thao tác theo quyền của bạn (Xong việc, Gia hạn, Hủy việc… chỉ hiện nếu bạn có quyền; không có quyền thì không thấy nút). Báo cáo của đơn vị thuộc mẫu mật (ví dụ chương tài chính) có thể bị cắt phần mật với người không có tên trong danh sách được xem.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Khung này là gì?",
          doan: ["Khi bấm một chấm nộp (hoặc một tên trong danh sách nộp cùng lúc) ở khối «Thời điểm gửi báo cáo», cột phải hiện báo cáo tuần của đúng đơn vị đó: nộp lúc nào, đúng hạn hay trễ bao lâu, gửi mấy lần, nút mở tệp gốc và các việc máy lọc ra từ báo cáo này."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Ban lãnh đạo thấy ai nộp muộn và muộn bao nhiêu; tính bằng giờ và ngày chứ không phải cảm nhận.",
            "Từ báo cáo gốc đến các việc nó sinh ra nằm trong một khung: mở được bản gốc để đối chiếu, thấy ngay việc nào đã vào sổ cái.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của khung này"],
            ["Trước", "Đơn vị nộp báo cáo ở «Báo cáo»; việc trong báo cáo đã duyệt vào sổ cái", "Nguồn của khung"],
            ["Khung này", "Soát giờ nộp, mở bản gốc, xem việc đã vào sổ", "Đối chiếu"],
            ["Sau", "Nhắc đơn vị, giao việc bổ sung ở tab «Cần BLĐ ra quyết định» hoặc Sơ đồ tổ chức", "Hành động"],
          ],
        },
        {
          tieuDe: "④ Khung có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Tiêu đề «Báo cáo tuần N · <đơn vị>»", "Biết đang xem đơn vị nào", "① Đọc khung"],
            ["Dòng «Nộp hh:mm dd/mm/yyyy · hạn hh:mm dd/mm/yyyy · trước hạn …/sau hạn …»", "Nộp đúng hạn hay trễ", "① Đọc khung"],
            ["Nút «Xem file báo cáo» và «Mọi việc của <đơn vị>»", "Mở bản gốc; xem mọi việc của đơn vị", "① Đọc khung"],
            ["Nhóm «Việc lọc ra từ báo cáo này»", "Các việc đã vào sổ từ báo cáo", "② Việc lọc ra"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Bấm chấm, đọc giờ nộp, mở bản gốc, mở việc", "Người kết luận"],
            ["MÁY", "Tính giờ nộp, hạn của cấp, số giờ trước hoặc sau hạn; lọc việc có nguồn là báo cáo tuần N của đơn vị; khoanh cam đúng dòng ở bản gốc", "Cùng dữ liệu cùng kết quả"],
            ["🤖 AI", "Khung này không có chữ do AI viết. (AI chỉ tham gia lúc đơn vị nộp, ở khung «Duyệt vào kế hoạch» của Gửi báo cáo.)", "—"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Khung này không dùng AI. Người bấm và đọc, máy hiện giờ nộp, mở bản gốc và liệt kê việc."],
        },
      ],
    },
    {
      ten: "① Đọc khung",
      khoi: [
        {
          bam: [
            "Đọc dòng giờ nộp: «Nộp hh:mm dd/mm/yyyy · hạn hh:mm dd/mm/yyyy». Sau đó là «trước hạn <thời gian>» màu xanh hoặc «sau hạn <thời gian>» màu đỏ; nếu đơn vị gửi nhiều lần có thêm «gửi N lần».",
            "Bấm «Xem file báo cáo»: mở khung xem tệp báo cáo ngay trong ứng dụng, khung cam là các dòng máy đã lọc ra việc.",
            "Bấm «Mọi việc của <đơn vị>»: cột phải chuyển sang mọi việc của đơn vị, chia «Quá hạn», «Đang làm, trong hạn», «Xong tuần N».",
          ],
          viDu: [
            "Theo hạn mặc định, cấp phòng nộp trước 10:00 thứ Sáu. Nếu dòng ghi «sau hạn 2 ngày 23 giờ», phòng đó nộp lúc 09:00 sáng thứ Hai tuần sau. Thời gian ghi theo ngày và giờ, không dùng phần trăm.",
            "Muốn kiểm xem báo cáo có đúng như AI tóm tắt ở tab «🤖 AI đánh giá»: bấm «Xem file báo cáo», đọc các dòng cam rồi đối chiếu với việc ở nhóm bên dưới.",
          ],
          luuY: ["Đơn vị chưa nộp thì khung này không có dòng giờ nộp và hai nút; chỉ còn tiêu đề và nhóm «Việc lọc ra từ báo cáo này» với 0 việc. Muốn xem việc của đơn vị chưa nộp, bấm tên đơn vị ở dòng «chưa nộp:» trên trục."],
        },
      ],
    },
    {
      ten: "② Việc lọc ra",
      khoi: [
        {
          doan: ["Nhóm «Việc lọc ra từ báo cáo này» (kèm số việc) liệt kê các việc có nguồn là báo cáo tuần N của đơn vị. Mỗi việc là một dòng việc giống Sơ đồ tổ chức: bấm để mở, rồi dùng các nút Xong việc, Gia hạn, Hủy việc, bình luận theo quyền của bạn."],
          viDu: ["Phòng Hành chính nộp báo cáo tuần có ba việc kế hoạch. Mở khung này, nhóm ghi «3»; bấm từng việc để xem hạn và người giữ. Nếu thấy thiếu một việc có trong bản gốc, kiểm lại bước «Duyệt vào kế hoạch» lúc nộp: có thể đơn vị đã bấm «Bỏ» việc đó (tình huống minh hoạ)."],
          luuY: ["Việc đã xoá khỏi sổ cái theo hạn lưu sẽ ghi «không còn trong sổ cái (đã xoá theo hạn lưu)». Nhóm không có việc thì ghi «Không có việc nào.»"],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Bấm «Xem file báo cáo» không khoanh cam dòng nào", "Bản xem nhanh không tìm thấy đúng dòng; khung ghi rõ và gợi ý mở bản Word"],
            ["Đơn vị nói đã nộp nhưng chấm vẫn chưa thấy", "Báo cáo có thể mới là bản nháp ở «Báo cáo». Hỏi đơn vị đã bấm Gửi chưa"],
            ["Nhóm việc ghi 0 dù báo cáo có kế hoạch", "Việc chưa được duyệt vào sổ cái lúc nộp, hoặc báo cáo không theo mẫu có bảng việc"],
            ["Không thấy nút Xong việc, Gia hạn", "Bạn chưa có quyền tương ứng; nút ẩn hẳn"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 02/10/2026: trục thời điểm gửi báo cáo, bấm chấm mở báo cáo của đơn vị ở cột phải · luật 31, luật 35 (thời gian tính bằng ngày và giờ) · bảo mật báo cáo tài chính (chương mật chỉ người có tên được xem).",
};
