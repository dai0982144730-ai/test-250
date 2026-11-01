// Hướng dẫn bản 2 (tab) — Báo cáo → tab «Báo cáo tháng». Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tháng",
  ai: "Mọi tài khoản xem được. «Làm lại báo cáo», «🤖 Soạn nhận xét» và ba ô «Đơn vị lập · Nơi nhận · Người ký» cần quyền ghi (PM, Admin, Người dùng); Người xem thấy mờ. Người ngoài dự án thấy ô có thông tin hợp đồng bị lọc, và nút soạn nhận xét có thể mờ kèm lý do.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Báo cáo tháng là gì?",
          doan: [
            "Bản nháp báo cáo tháng của cả Ban QLDA, gộp mọi dự án có dữ liệu vào một văn bản: 6 mục, 11 bảng (tổng quan các dự án · tiến độ chi tiết từng dự án · pháp lý và GPMB · hợp đồng, thanh toán và nguồn lực · vấn đề nổi bật và kiến nghị · kế hoạch tháng tới). Ngày 1 hằng tháng 08:00 máy tự dựng bản nháp; người xem, làm lại, thêm nhận xét rồi tải về Word.",
            "Main không tự tính số. Mọi ô lấy từ bốn agent kèm nguồn; ô nào chưa có số thì ghi rõ chưa có, không điền 0.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Cuối tháng không phải gom tay số từ bốn phần mềm vào Word.", "Mỗi lần làm lại, màn so với bản dựng trước để biết báo cáo đổi ra sao.", "Ghi rõ bản dựng lúc nào; dựng trước khi hết kỳ thì tô vàng vì số chưa đủ tháng."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Màn này", "Bước sau"],
            ["Các agent chốt số cuối tháng; ngày 1 máy dựng nháp", "Làm lại, soạn nhận xét, kiểm số, khai đầu báo cáo", "Xuất Excel gửi lãnh đạo; vấn đề lớn chuyển sang Issue, Việc của tôi"],
          ],
        },
        {
          tieuDe: "Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng nút: ô «Tháng», năm, «Làm lại báo cáo», «🤖 Soạn nhận xét»", "Chọn kỳ và dựng", "① Chọn kỳ và làm lại"],
            ["Dòng kỳ / dựng lúc / 🤖 soạn lúc / số dự án, mục, bảng, ô có số liệu", "Biết bản đang xem là bản nào, đủ chưa", "① Chọn kỳ và làm lại"],
            ["Khung «So với bản dựng lúc …»", "Báo cáo đổi ra sao sau khi làm lại", "① Chọn kỳ và làm lại"],
            ["Ba ô «Đơn vị lập» · «Nơi nhận» · «Người ký»", "Khai đầu báo cáo", "③ Đầu báo cáo và đọc bảng"],
            ["«⬇ Xuất Excel» (hàng ghim trên cùng) · «Tải Markdown» · «Tải phụ lục nguồn»", "Đưa ra ngoài", "④ Tải về"],
            ["«Đầu báo cáo» (Bảng 1 · 2) và sáu mục I–VI", "Đọc nội dung", "③ Đầu báo cáo và đọc bảng"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Chọn kỳ, bấm làm lại, khai ba ô đầu, đọc và sửa nhận xét, tải về", "Hỏi bốn agent, điền 11 bảng, đếm ô có số / chưa có, so hai bản dựng, tự dựng nháp ngày 1 hằng tháng 08:00, lọc theo quyền xem", "🤖 Viết các đoạn nhận xét cuối mỗi mục (nút «🤖 Soạn nhận xét», và tự chạy trong «Làm lại báo cáo»)"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: ["Máy hỏi các agent và điền số trước. Phần AI chỉ chạy SAU khi có số.", "🤖 AI đọc các bảng đã điền rồi viết nhận xét ngắn cho từng mục; AI không được thêm số ngoài bảng.", "Người đọc nhận xét, đối chiếu bảng rồi mới tải gửi; nhận xét sai thì bấm soạn lại."],
        },
      ],
    },
    {
      ten: "① Chọn kỳ và làm lại",
      khoi: [
        {
          bam: [
            "Chọn «Tháng» và gõ năm: màn tự mở bản đã dựng của kỳ đó (chưa có thì báo chưa có bản nháp).",
            "Bấm «Làm lại báo cáo» để hỏi lại mọi agent và soạn lại phần 🤖; bản cũ được giữ để so.",
            "Đọc dòng kỳ: «Kỳ: … (khoảng ngày)», «Dựng lúc …», «🤖 soạn lúc … / chưa soạn», số dự án, Mục n/6, Bảng n/11, ô có số liệu / chưa có.",
          ],
        },
        {
          ketQua: ["Làm lại xong, khung «So với bản dựng lúc …» nói ô có số, ô chưa có, số dự án đổi từ bao nhiêu sang bao nhiêu (mũi tên), kèm bảng nào đổi số dòng. Không đổi gì thì ghi «Không bảng nào đổi số ô có số liệu hay số dòng». Khối «Agent chưa hỏi được» liệt kê agent không trả lời kèm lý do."],
        },
        {
          viDu: ["Kỳ tháng 09/2026 (01/09/2026 – 30/09/2026, 30 ngày): bản dựng lúc 15/10/2026, hiện 9 dự án và ẩn 7 dự án chưa có dữ liệu; 6 mục, 11 bảng; phần 🤖 chưa soạn lần nào."],
        },
        {
          luuY: ["«Làm lại báo cáo» ghi đè bản đang lưu và gọi AI — chỉ bấm khi cần số mới.", "Bản dựng trước ngày hết kỳ có dòng vàng «số chưa đủ tháng»."],
        },
      ],
    },
    {
      ten: "② Soạn nhận xét",
      khoi: [
        {
          tieuDe: "Vì sao / khi nào",
          doan: ["Sau khi số đã đủ và đúng, bấm «🤖 Soạn nhận xét» để AI viết lại các đoạn nhận xét mà không hỏi lại agent. Dùng khi muốn viết lại nhận xét cho hay hơn mà số không đổi."],
        },
        {
          bam: ["Bấm «🤖 Soạn nhận xét». Nút mờ nếu chưa có số («Làm lại báo cáo trước đã»), nếu là Người xem, hoặc nếu anh/chị chưa được thấy hết dữ liệu của dự án (lý do hiện trong lời rê chuột).", "Đợi xong, đọc đoạn nghiêng đầu mỗi mục."],
        },
        {
          ai: ["🤖 AI nhận: các bảng đã điền của kỳ. AI làm: viết đoạn nhận xét ngắn cho từng mục.", "AI KHÔNG được thêm số, ngày hay tên ngoài bảng; số trong nhận xét phải có trong bảng.", "Người đối chiếu bảng; thấy sai bấm soạn lại. Mất AI thì báo cáo vẫn đủ số, chỉ thiếu nhận xét."],
        },
        {
          viDu: ["Mục I nhận xét có thể ghi COD dự báo của dự án nặng nhất chậm bao nhiêu ngày so với Tiến độ mục tiêu — số đó phải trùng Bảng 1 của chính báo cáo."],
        },
      ],
    },
    {
      ten: "③ Đầu báo cáo và đọc bảng",
      khoi: [
        {
          bam: [
            "Gõ «Đơn vị lập» (ví dụ «Ban Quản lý dự án …»), «Nơi nhận» («Ban lãnh đạo Công ty …»), «Người ký» («Giám đốc Ban — họ tên»). Rời ô là lưu; lần làm lại sau tự điền vào Bảng 1 · 2.",
            "Đọc «Đầu báo cáo» (Bảng 1 · 2) rồi sáu mục I–VI; mỗi mục có đoạn nhận xét in nghiêng (nếu đã soạn) và các bảng.",
            "Bảng nhiều dự án bày theo HÀNG tên dự án.",
            "Một số mục có thêm khối chuỗi điểm theo tháng (tối đa 6 tháng), ghi «lùi» hoặc «sớm» bao nhiêu ngày so với điểm đầu.",
          ],
        },
        {
          luuY: ["Ô ghi chưa có số là chưa có số, không phải 0.", "Người ngoài dự án thấy các ô hợp đồng bị lọc."],
        },
      ],
    },
    {
      ten: "④ Tải về",
      khoi: [
        {
          bam: ["Bấm «⬇ Xuất Excel» ở hàng ghim trên cùng để lấy file Excel gửi lãnh đạo (theo mẫu báo cáo hợp nhất của công ty). Chọn dự án ở nút bên trái nó thì file chỉ gồm dự án đó.", "«Tải Markdown» lấy bản chữ thô.", "«Tải phụ lục nguồn» lấy bảng nguồn từng số (dùng khi cần chứng minh một số)."],
        },
        {
          luuY: ["Ba nút chỉ hiện khi đã có bản dựng thật (không phải khung rỗng)."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Mục n/6 hoặc Bảng n/11 màu vàng", "Báo cáo chưa đủ khung; bấm «Làm lại báo cáo»."],
            ["Nút «🤖 Soạn nhận xét» mờ", "Chưa có số, hoặc Người xem, hoặc anh/chị chưa thấy hết dữ liệu dự án. Rê chuột đọc lý do."],
            ["Dòng vàng «dựng trước khi hết kỳ»", "Số chưa đủ tháng — làm lại sau khi hết kỳ."],
            ["«Agent chưa hỏi được»", "Agent đó đang tắt; bật lại rồi «Làm lại báo cáo»."],
            ["Không đổi được ba ô đầu", "Cần quyền ghi."],
          ],
        },
      ],
    },
  ],
  canCu: "PLAN-MAIN-AGENT mục 2 (6 mục · 11 bảng) và mục 7 (ngày 1 hằng tháng); KE-HOACH/22 (làm lại báo cáo, so hai bản); luật 31 (khoảng ngày kèm số ngày).",
};
