// Hướng dẫn bản 2 (tab) — Báo cáo tuần, nút «🤖 AI đánh giá» (t1). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/phong/BaoCaoTuanPhong.tsx (khối t1: Nhận định chung, Chỉ số đơn vị, Cách tính các chỉ số, ChuAi) · lib/bao-cao-tuan/tinh.ts (Điểm công việc, % trễ, Năng suất, Vùng)
// · lib/bao-cao-tuan/viet.ts (AI viết lời, lưới kiểm) · lib/bao-cao-tuan/do-kho.ts (AI chấm độ khó) · lib/cau-hinh/mac-dinh.ts (ngưỡng mặc định 20 · 8 · 25).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tuần — nút «🤖 AI đánh giá»: nhận định chung và chỉ số từng đơn vị",
  ai: "Mọi người có quyền xem sổ cái đều đọc được. Mục «🤖 Độ khó từng việc do AI chấm ›» ở chân bảng chỉ là nút bấm với Ban lãnh đạo; với người khác nó chỉ là dòng chữ.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: [
            "Đây là góc nhìn đầu tiên của Báo cáo tuần: một đoạn «Nhận định chung» và một bảng «Chỉ số đơn vị» cho các đơn vị có người thật làm việc (phòng, ban điều hành) cùng Ban lãnh đạo ở dạng tập thể.",
            "Mỗi con số là MÁY tính từ sổ cái; lời nhận xét là 🤖 AI viết dựa trên bảng số đó, rồi máy kiểm lại.",
          ],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Chỉ đếm số việc thì không công bằng: 10 việc dễ khác hẳn 3 việc khó. Vì vậy mỗi việc có «độ khó» (1, 2, 4, 8, 13 điểm) và đơn vị được so bằng điểm chia cho số người.",
            "Lãnh đạo cần nhìn một dòng là biết đơn vị đang «quá tải», «cân bằng» hay «dư sức», và có đang trễ nhiều không, để điều người hay nhắc việc.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của tab này"],
            ["Trước", "Việc được giao, làm, báo xong trong sổ cái; AI chấm độ khó việc mới", "Cung cấp số và độ khó"],
            ["Tab này", "Đọc nhận định, soát chỉ số đơn vị", "Biết đơn vị nào cần chú ý"],
            ["Sau", "Bấm vào dòng đơn vị để xem việc; sang tab «Cần BLĐ ra quyết định» để giao việc, nhắc", "Hành động"],
          ],
        },
        {
          tieuDe: "④ Tab có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["«🤖 Nhận định chung»", "Tóm tắt tuần: dòng đầu do máy ghép, các dòng sau do AI viết, chữ gạch chân cam bấm được", "① Nhận định chung"],
            ["«Chỉ số đơn vị» (bảng 6 cột: Đơn vị · Người · Điểm công việc · % trễ · Năng suất · Vùng) và dòng «🤖» nhận xét dưới mỗi đơn vị", "So đơn vị với nhau", "② Chỉ số đơn vị"],
            ["Nút «Cách tính các chỉ số ▾»", "Mở giải thích 5 bước, kèm phép tính bằng số thật của một đơn vị", "③ Cách tính"],
            ["Chân bảng: chú thích màu, câu «N việc AI chưa kịp chấm độ khó …», «🤖 Độ khó từng việc do AI chấm ›»", "Giải thích hình vẽ, mở biểu đồ độ khó (Ban lãnh đạo)", "③ Cách tính"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc, bấm chữ gạch chân hoặc dòng đơn vị để xem việc; Ban lãnh đạo sửa độ khó", "Người quyết hành động"],
            ["MÁY", "Dòng đầu «Tuần N … có X việc hoàn thành, Y việc mới và Z việc đang mở, trong đó W việc đã quá hạn»; mọi cột trong bảng chỉ số; tên Vùng", "Cùng dữ liệu cùng số"],
            ["🤖 AI", "🤖 Các dòng nhận định sau dòng đầu; dòng nhận xét dưới mỗi đơn vị", "🤖 Chỉ dùng số máy cho; máy kiểm, số lạ thì cảnh báo"],
            ["🤖 AI", "🤖 Chấm độ khó từng việc (nền của cột Điểm công việc)", "🤖 Có thể lệch; Ban lãnh đạo sửa thì người thắng"],
          ],
          ai: [
            "🤖 AI nhận bảng số máy đã tính, tên vùng, ngưỡng và danh sách việc nghẽn. AI viết nhận xét bộ máy, không khen chê, không nhận xét cá nhân.",
            "🤖 AI KHÔNG đổi số, không thêm số ngoài bảng. Số lạ hoặc tên người trong lời AI bị máy ghi cảnh báo và gỡ tên.",
            "Người kiểm: bấm chữ gạch chân cam để xem đúng việc ở cột phải; rê chuột lên ô số để xem phép tính.",
            "Mất kết nối AI: dòng nhận xét hiện «🤖 —», dòng đầu của máy và cả bảng số vẫn đầy đủ.",
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          bang: [
            ["Bước", "Ai làm", "Việc gì · kết quả đi đâu"],
            ["1", "🤖 AI", "🤖 Chấm độ khó từng việc khi việc vào sổ (nền, 2 phút một lượt)"],
            ["2", "MÁY", "Cộng điểm, chia số người, tính % trễ, Năng suất, xếp Vùng"],
            ["3", "🤖 AI", "🤖 Viết nhận định chung và nhận xét từng đơn vị từ bảng số"],
            ["4", "MÁY", "Kiểm lưới: liên kết sai bỏ, số lạ và tên người thì cảnh báo"],
            ["5", "NGƯỜI", "Đọc, đối chiếu việc ở cột phải, quyết nhắc hay giao việc; Ban lãnh đạo sửa độ khó nếu AI chấm lệch"],
          ],
        },
      ],
    },
    {
      ten: "① Nhận định chung",
      khoi: [
        {
          tieuDe: "Đọc thế nào",
          doan: [
            "Dòng đầu do MÁY ghép: «Tuần N khép lại với X việc hoàn thành, Y việc mới và Z việc đang mở, trong đó W việc đã quá hạn.» (tuần chưa hết thì ghi «tính tới dd/mm/yyyy có …»). Bốn con số đều bấm được: cột phải hiện đúng các việc đó.",
            "Các dòng sau do 🤖 AI viết. Chữ gạch chân cam là liên kết: bấm để xem việc hoặc đơn vị tương ứng ở cột phải.",
          ],
          bam: [
            "Bấm «W việc đã quá hạn» ở dòng đầu: cột phải liệt kê việc quá hạn toàn công ty, chia «Quá hạn» và «Trong hạn».",
            "Đọc dòng AI nhắc tới một đơn vị, bấm tên đơn vị gạch chân: cột phải hiện việc của đơn vị đó.",
            "Mở một việc, đối chiếu với câu AI viết. Câu nào không khớp với việc thật là AI diễn đạt chưa đúng — báo Ban lãnh đạo để bấm «Viết lại» hoặc bỏ qua.",
          ],
          viDu: ["Dòng AI viết «Phòng Kỹ thuật có việc quá hạn tập trung ở nhóm hồ sơ pháp lý» (tình huống minh hoạ): bấm tên phòng gạch chân, cột phải hiện việc của phòng chia ba nhóm. Nếu nhóm «Quá hạn» đúng toàn việc hồ sơ pháp lý thì câu AI đúng."],
          luuY: ["Nhận định chỉ tả tình trạng bộ máy. Đây không phải đánh giá thi đua; không dùng để kết luận cá nhân."],
        },
      ],
    },
    {
      ten: "② Chỉ số đơn vị",
      khoi: [
        {
          tieuDe: "Sáu cột của bảng",
          bang: [
            ["Cột", "Trả lời câu hỏi", "Cách tính (máy)"],
            ["Đơn vị", "Của ai?", "Mỗi dòng một đơn vị có nhân sự thật; Ban lãnh đạo tính tập thể"],
            ["Người", "Đơn vị có bao nhiêu người?", "Số tài khoản của đơn vị, kể cả người kiêm nhiệm"],
            ["Điểm công việc", "Mỗi người đang gánh nặng đến đâu?", "Cộng điểm khó các việc đang làm, chia số người. Thanh dài = gánh nhiều. Mặc định: trên 20 là Quá tải · từ 8 đến 20 là Cân bằng · dưới 8 là Dư sức"],
            ["% trễ", "Bao nhiêu phần khối lượng đang làm đã quá hạn?", "Điểm khó các việc quá hạn chia điểm khó mọi việc đang làm. Mặc định từ 25% trở lên là trễ nhiều. Đây là TỈ LỆ KHỐI LƯỢNG, không phải số ngày chậm"],
            ["Năng suất", "Tuần này mỗi người khép lại bao nhiêu?", "Điểm khó các việc xong trong tuần chia số người; mỗi chấm khoảng 1 điểm, tối đa 12 chấm. Chỉ để xem thêm"],
            ["Vùng", "Ghép Điểm công việc và % trễ", "6 vùng, ví dụ «Quá tải, trễ nhiều». Chỉ tả tình trạng"],
          ],
          luuY: ["Ngưỡng đổi được ở Cài đặt, Báo cáo tuần (AI). Hộp chú thích khi rê chuột và «Cách tính các chỉ số» luôn hiện đúng ngưỡng đang dùng."],
        },
        {
          tieuDe: "Bấm vào đâu thì ra gì",
          bang: [
            ["Bấm", "Cột phải hiện"],
            ["Dòng đơn vị (tên, hoặc dòng «🤖» nhận xét)", "Mọi việc của đơn vị chia ba nhóm: «Quá hạn» · «Đang làm, trong hạn» · «Xong tuần N»"],
            ["Vòng tròn ở cột % trễ", "Chỉ các việc quá hạn của đơn vị (chỉ bấm được khi có việc quá hạn)"],
            ["Dãy chấm ở cột Năng suất", "Chỉ các việc xong trong tuần của đơn vị (chỉ bấm được khi có việc xong)"],
          ],
          viDu: [
            "Tình huống minh hoạ bằng ngưỡng mặc định: một phòng 5 người đang làm 6 việc: 2 việc khó (8 + 8), 2 việc vừa (4 + 4), 2 việc dễ (2 + 2) = 28 điểm. Điểm công việc = 28 chia 5 = 5,6 điểm/người, dưới 8 nên là «Dư sức».",
            "Trong 6 việc đó có 1 việc khó (8 điểm) đã quá hạn: % trễ = 8 chia 28 = 29%, từ 25% trở lên nên là «trễ nhiều». Vùng của phòng này là «Dư sức, trễ nhiều»: người không quá tải nhưng việc quan trọng vẫn chậm, cần hỏi nguyên nhân chứ không phải thêm người.",
          ],
        },
        {
          tieuDe: "Rê chuột",
          doan: ["Rê chuột lên tiêu đề cột hoặc lên hình ở từng ô để xem câu hỏi con số trả lời, cách tính và phép tính bằng số thật của đơn vị đó. Đơn vị quá ít dữ kiện hiện «—» hoặc vùng «Chưa đủ dữ liệu»; Ban lãnh đạo hiện vùng «Tập thể»."],
        },
      ],
    },
    {
      ten: "③ Cách tính",
      khoi: [
        {
          tieuDe: "Nút «Cách tính các chỉ số ▾»",
          bam: [
            "Bấm «Cách tính các chỉ số ▾» ở đầu khối «Chỉ số đơn vị»: mở năm bước giải thích. Bấm lần nữa («▴») để đóng.",
            "Mỗi bước kèm một ví dụ bằng số thật của đơn vị bạn đang chọn (chưa chọn: đơn vị có Điểm công việc cao nhất).",
          ],
          bang: [
            ["Bước", "Nội dung"],
            ["1 · Điểm khó từng việc", "🤖 AI chấm mỗi việc một mức: rất dễ 1 · dễ 2 · vừa 4 · khó 8 · rất khó 13, lấy tiêu chí nặng nhất trong ba tiêu chí: phạm vi ảnh hưởng, bên ngoài tham gia (nhà thầu, cơ quan nhà nước, Bộ), giá trị tiền và rủi ro"],
            ["2 · Điểm công việc", "Cộng điểm khó việc đang làm, chia số người"],
            ["3 · % trễ", "Điểm khó việc quá hạn chia điểm khó mọi việc đang làm"],
            ["4 · Năng suất", "Điểm khó việc xong trong tuần chia số người"],
            ["5 · Vùng", "Ghép bước 2 và bước 3"],
          ],
          viDu: ["Bạn là trưởng phòng, muốn biết vì sao phòng mình ghi «Quá tải»: bấm dòng phòng mình trước, rồi mở «Cách tính các chỉ số ▾». Bước 2 sẽ hiện đúng số việc, tổng điểm và số người của phòng bạn, nên đối chiếu được ngay với danh sách việc ở cột phải."],
        },
        {
          tieuDe: "Chân bảng",
          ds: [
            "Dòng chú thích: thanh dài là gánh nhiều; vòng tròn có phần tô bằng % trễ, màu xanh qua vàng (ngưỡng) tới đỏ (gấp đôi ngưỡng); mỗi chấm khoảng 1 điểm việc làm ra trên mỗi người.",
            "Nếu có câu «N việc AI chưa kịp chấm độ khó, tạm tính 2 điểm.»: AI chưa chấm hết việc mới, số tạm tính, sẽ tự hết sau vài lượt chấm nền.",
            "«🤖 Độ khó từng việc do AI chấm ›»: Ban lãnh đạo bấm mở biểu đồ độ khó ở cột phải (xem hướng dẫn «Độ khó từng việc»); người khác chỉ thấy dòng chữ, không bấm được.",
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
            ["Đơn vị hiện «—» ở Điểm công việc, % trễ hoặc Năng suất", "Đơn vị chưa có người hoặc chưa có việc để tính"],
            ["Vùng ghi «Chưa đủ dữ liệu»", "Đơn vị không có việc nào trong kỳ, nên không xếp vùng"],
            ["Dòng nhận xét hiện «🤖 —»", "AI chưa viết xong hoặc lỗi. Ban lãnh đạo bấm «Viết lại»"],
            ["Bấm chữ gạch chân mà không có gì", "Việc đã xoá khỏi sổ cái theo hạn lưu; cột phải ghi «không còn trong sổ cái»"],
            ["Thấy % trễ lớn nhưng chỉ có 1 việc trễ", "% trễ tính theo điểm khó chứ không theo số việc; một việc rất khó trễ kéo % lên nhiều"],
            ["Muốn đổi ngưỡng Quá tải hay trễ nhiều", "Quản trị đổi ở Cài đặt, Báo cáo tuần (AI), rồi Ban lãnh đạo bấm «Viết lại»"],
          ],
        },
      ],
    },
  ],
  canCu: "Quy ước chấm điểm khó: rất dễ 1, dễ 2, vừa 4, khó 8, rất khó 13 (Mr. Đại chốt 30/09/2026) · cách A: Điểm công việc và % trễ ghép thành Vùng (Mr. Đại chốt 30/09/2026) · luật 19.",
};
