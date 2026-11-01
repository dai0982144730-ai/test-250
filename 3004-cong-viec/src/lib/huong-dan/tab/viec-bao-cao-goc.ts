// Hướng dẫn bản 2 (tab) — hộp báo cáo gốc giữa màn hình (khoanh cam dòng sinh ra việc). Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (HopBaoCaoGoc, DongCuaAi) · components/dinh-kem/khoanh.ts (khoanh dòng). Hộp này cũng được màn «Báo cáo» dùng lại
// (bước xem việc đã lọc ra, bước sửa lỗi) — phần đó có hướng dẫn riêng của màn đó.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Hộp báo cáo gốc — mở bản báo cáo đã sinh ra việc, dòng liên quan được khoanh cam",
  ai: "Mọi người mở được thẻ việc đều mở được hộp này. Hộp chỉ để đọc, không sửa được gì.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Hộp này là gì?",
          doan: [
            "Nhiều việc trong hệ thống không do ai gõ giao, mà do máy lọc ra từ báo cáo tuần của đơn vị. Trong thẻ việc, dòng «Việc của … · lọc ra từ hệ thống báo cáo» có một nút mang tên báo cáo (ví dụ «tuần N · tên đơn vị»). Bấm nút này, hộp mở giữa màn hình, hiện bản xem nhanh của báo cáo và KHOANH CAM đúng dòng đã sinh ra việc.",
            "Bấm ra ngoài hộp, bấm «✕ Đóng», hoặc nhấn Esc để đóng.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Việc do máy lọc có thể hiểu sai. Mở bản gốc, nhìn dòng được khoanh là biết ngay máy đọc đúng hay sai. Căn cứ nào cũng phải dẫn nguồn bấm được.",
            "Người giao việc kiểm được việc có thật sự do đơn vị cam kết không, trước khi nhắc người làm.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Đơn vị nộp báo cáo tuần; máy (và AI với phần lời văn) lọc ra việc, vào sổ cái", "Menu «Báo cáo»"],
            ["Bước này", "Người giao mở thẻ việc, bấm tên báo cáo để đối chiếu", "Hộp báo cáo gốc"],
            ["Sau", "Việc đúng thì để nguyên; sai thì sửa bằng cây bút ✎ hoặc hủy", "Thẻ việc"],
          ],
        },
        {
          tieuDe: "Hộp có những phần nào?",
          bang: [
            ["Phần", "Nghĩa"],
            ["Dòng tiêu đề: tên báo cáo và câu «khung cam là dòng máy lọc ra việc này»", "Cho biết bạn đang xem báo cáo nào"],
            ["Nút «✕ Đóng»", "Đóng hộp"],
            ["Thân hộp", "Bản xem nhanh của báo cáo, dòng liên quan được khoanh cam và cuộn tới"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Mở hộp, đọc, đối chiếu, đóng", "Người kết luận việc có đúng không"],
            ["MÁY", "Dựng bản xem nhanh từ báo cáo đã nộp, tìm và khoanh cam dòng trùng tên việc; việc trong các bảng của báo cáo do máy tách", "Cùng báo cáo thì cùng kết quả"],
            ["🤖 AI", "🤖 Với phần lời văn nằm NGOÀI các bảng, AI đọc để tìm thêm việc (người nộp tích chọn thì việc mới vào sổ)", "🤖 Có thể sót hoặc hiểu sai; vì vậy hộp này để bạn đối chiếu"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "NGƯỜI: đơn vị nộp báo cáo tuần.",
            "MÁY: tách các việc trong bảng; 🤖 AI: đọc lời văn tìm thêm việc ngoài bảng và đề xuất.",
            "NGƯỜI: người nộp tích chọn việc nào vào sổ cái.",
            "NGƯỜI: người giao mở hộp báo cáo gốc đối chiếu; MÁY khoanh cam dòng liên quan.",
          ],
        },
      ],
    },
    {
      ten: "① Đối chiếu",
      khoi: [
        {
          bam: [
            "Mở thẻ việc có dòng «lọc ra từ hệ thống báo cáo …».",
            "Bấm nút tên báo cáo (chữ có dạng «tuần N · tên đơn vị»).",
            "Đọc dòng khoanh cam; kéo lên xuống nếu muốn đọc cả đoạn quanh nó.",
            "Bấm ra ngoài hộp, «✕ Đóng» hoặc nhấn Esc.",
          ],
          luuY: ["Nếu hộp ghi «không tìm thấy đúng dòng trong bản xem nhanh — mở bản Word để xem», nghĩa là máy không khoanh được. Khi đó mở bản Word của báo cáo (nút «Tải bản Word» ở khối báo cáo tuần của ô trên Sơ đồ tổ chức) để tìm tay."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Chị A thấy việc «Xin gia hạn giấy phép khai thác» lọc từ báo cáo tuần của một đơn vị nhưng không nhớ ai cam kết. Chị bấm tên báo cáo, hộp mở ra, một dòng trong báo cáo được khoanh cam đúng chữ đó. Chị yên tâm việc có thật và nhắn người làm."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Hộp ghi «Đang mở báo cáo…» mãi", "Báo cáo lớn hoặc máy chủ chậm. Đợi vài giây; nếu vẫn không ra, đóng rồi bấm lại."],
            ["Không có dòng nào khoanh cam", "Máy không tìm thấy chữ khớp (tên việc đã được sửa). Mở bản Word."],
            ["Thẻ việc không có nút tên báo cáo", "Việc do người giao tay, không lọc từ báo cáo."],
          ],
        },
      ],
    },
  ],
  canCu: "Luật 12 (câu AI nêu căn cứ phải dẫn nguồn bấm được, mở tại chỗ) · chốt 02/10/2026 (việc lọc từ báo cáo phải ghi rõ ai giao) · khoanh cam dòng tài liệu gốc.",
};
