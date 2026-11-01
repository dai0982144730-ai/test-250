// Hướng dẫn bản 2 (tab) — thẻ một việc đang mở (dùng chung Sơ đồ tổ chức · Dự án · Việc của tôi). Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (DongViec, DongCuaAi) · components/phong/TheViecNhung.tsx · components/phong/viec.ts (chuyenViec, tình trạng)
// · lib/so-cai/dich-vu.ts (coTheSua, phamViGiao) · lib/types.ts (nhãn quyền). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Thẻ một việc — đọc việc và các nút làm việc",
  ai: "Mọi người đăng nhập đều mở và đọc được thẻ. Mỗi nút chỉ hiện khi bạn có quyền làm việc đó; người không có quyền sẽ không thấy nút (không mờ, ẩn hẳn).",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Thẻ việc là gì?",
          doan: [
            "Bấm tên một việc ở cột phải (Sơ đồ tổ chức, Dự án) hoặc trong danh sách «Việc của tôi» thì việc bung ra thành một thẻ ngay tại chỗ, không chuyển trang. Thẻ cho bạn thấy việc này của ai, ai phối hợp, từ đâu ra, hạn bao lâu, xong thì phải có gì, và cho bạn làm việc: báo xong, gia hạn, mời phối hợp, hủy, mở lại, sửa, bình luận.",
            "Một việc chỉ có MỘT nơi sống duy nhất (sổ cái công việc), nên thẻ ở ba màn là một: sửa ở đâu thì các màn khác cùng thấy.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Người giao và người làm cùng nhìn một thẻ, khỏi hỏi qua lại «việc đó thế nào rồi».",
            "Mỗi thay đổi (xong, gia hạn, hủy, mở lại) đều để lại vết và gửi chuông cho người liên quan.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Việc được giao (dấu «＋», khung «Giao việc», thẻ đề xuất) hoặc được máy lọc ra từ báo cáo tuần", "Nút «＋» ở Sơ đồ tổ chức, Việc của tôi, Báo cáo tuần"],
            ["Bước này", "Người làm theo dõi, báo xong; người giao điều chỉnh", "Thẻ việc"],
            ["Sau", "Việc xong rời danh sách đang làm sang khối «Việc làm xong»; chuông báo người giao", "Chuông, khối «Việc làm xong»"],
          ],
        },
        {
          tieuDe: "Thẻ có những phần nào (từ trên xuống)?",
          bang: [
            ["Phần", "Nghĩa", "Xem tab"],
            ["Dòng tên việc, chữ bên phải, dấu «!» đỏ, cây bút ✎", "Tên, tình trạng, việc nằm trên đường găng, nút sửa", "① Đọc thẻ"],
            ["Dòng «Việc của … · … phối hợp · … được giao bởi …»", "Ai chủ trì, ai phối hợp, từ đâu ra", "① Đọc thẻ"],
            ["Thanh ngày", "Bắt đầu, số ngày, hạn", "① Đọc thẻ"],
            ["«Kết quả cần có», «% hoàn thành (theo báo cáo)», «Ghi chú (theo báo cáo)»", "Việc xong thì có gì", "① Đọc thẻ"],
            ["Ô «Giao cho…»", "Giao lại cho một nhân viên", "② Nút làm việc"],
            ["Hàng nút «Xong việc», «Gia hạn», «＋ Phối hợp», «Hủy việc», «Mở lại»", "Làm việc với việc này", "② Nút làm việc"],
            ["Khối ý kiến cuối thẻ", "Bình luận, tệp kèm", "③ Bình luận"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Mở thẻ, bấm các nút, viết bình luận", "Người quyết mọi thay đổi"],
            ["MÁY", "Tính tình trạng («quá hạn N ngày», «còn N ngày»), dựng thanh ngày, kiểm quyền từng nút, gửi chuông, lưu vết", "Cùng dữ liệu thì cùng kết quả"],
            ["🤖 AI", "🤖 Gắn «lãnh đạo phối hợp» cho việc chưa có; 🤖 xếp giai đoạn (ở menu «Dự án»); 🤖 lọc việc từ lời văn báo cáo tuần", "🤖 Chỉ là đề xuất. Người sửa thì người thắng, AI không làm lại"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          bam: [
            "🤖 AI chạy nền, định kỳ, không cần ai bấm: đọc báo cáo tuần để tìm việc, gắn lãnh đạo phối hợp, xếp giai đoạn. Kết quả vào thẻ dưới dạng đề xuất kèm lý do.",
            "NGƯỜI: bạn mở thẻ và đọc. Dòng bắt đầu bằng 🤖 là do AI viết.",
            "NGƯỜI: bạn đổi nếu sai (ô lãnh đạo phối hợp trong cây bút ✎, ô «🤖 Giai đoạn:»).",
            "MÁY: lưu thay đổi của bạn. Giai đoạn do người sửa thì AI không xếp lại; việc đã có lãnh đạo phối hợp thì AI không gắn thêm.",
          ],
        },
      ],
    },
    {
      ten: "① Đọc thẻ",
      khoi: [
        {
          tieuDe: "Đọc từng dòng",
          bang: [
            ["Phần", "Nghĩa"],
            ["Dấu đỏ «!» trước tên", "Việc chưa xong nằm trên ĐƯỜNG GĂNG: trễ việc này là lùi ngày hoàn thành mục tiêu của dự án. Dữ liệu lấy từ agent Tiến độ nên có thể hiện chậm hơn danh sách"],
            ["Chữ bên phải tên", "«quá hạn N ngày» · «đến hạn hôm nay» · «còn N ngày» (từ 1 đến 3 ngày là sắp đến hạn) · «việc thường xuyên» (không có hạn) · «Xong ngày dd/mm/yyyy» (việc đã xong)"],
            ["Dòng «Việc của …»", "Bộ phận chủ trì; sau dấu · là bên phối hợp. Nếu việc do máy lọc ra từ báo cáo thì có nút tên báo cáo (tuần N · đơn vị lập) bấm để mở bản gốc, dòng được khoanh cam. Cuối dòng «được giao bởi …» cho biết ai giao"],
            ["Thanh ngày", "Ngày bắt đầu, số ngày, ngày kết thúc, đoạn đã trôi qua. Việc thường xuyên ghi «từ … · việc thường xuyên, không có hạn». Ngày kết thúc trước ngày bắt đầu thì thẻ chỉ ghi khoảng ngày để bạn thấy lỗi"],
            ["«Kết quả cần có»", "Việc xong thì phải có cái gì"],
            ["«% hoàn thành (theo báo cáo)» và «Ghi chú (theo báo cáo)»", "Chỉ có ở việc sinh từ chương tiến độ chi tiết thiết kế trong báo cáo tuần"],
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A mở thẻ việc «Hoàn thiện hồ sơ nghiệm thu móng». Dòng đầu ghi «Việc của Phòng Kỹ thuật · Phòng Hợp đồng phối hợp · được giao bởi anh B». Bên phải tên ghi «quá hạn 3 ngày» màu đỏ; trước tên có dấu «!» đỏ. Chị hiểu: việc này trễ và đang cản ngày hoàn thành dự án, cần gọi người làm ngay.",
            "Chị thấy trong dòng đầu có nút «tuần N · Phòng Kỹ thuật»: bấm vào, hộp báo cáo gốc mở ra giữa màn hình với dòng đã sinh việc này được khoanh cam (xem hướng dẫn «Hộp báo cáo gốc»).",
          ],
        },
      ],
    },
    {
      ten: "② Nút làm việc",
      khoi: [
        {
          tieuDe: "Ai thấy nút nào",
          bang: [
            ["Nút", "Ai thấy", "Hướng dẫn riêng"],
            ["«Xong việc»", "Người (hoặc bộ phận) đang được giao phần việc chưa xong, kể cả bên phối hợp", "«Báo xong việc»"],
            ["«Gia hạn»", "Người có quyền «Gia hạn, thêm/đổi người, hủy việc» đối với việc này (người giao, trưởng đơn vị chủ trì, lãnh đạo… tuỳ phạm vi Quản trị đặt); bên phối hợp thì không", "«Gia hạn, phối hợp, hủy, mở lại»"],
            ["«＋ Phối hợp»", "Người sửa được việc, hoặc trưởng đơn vị cấp trên của bên chủ trì", "«Gia hạn, phối hợp, hủy, mở lại»"],
            ["«Hủy việc»", "Như «Gia hạn»", "«Gia hạn, phối hợp, hủy, mở lại»"],
            ["Trưởng đơn vị chủ trì", "Việc do MÁY sinh (lọc từ báo cáo) hoặc người giao không còn: sửa, hủy, mở lại được. Việc do người khác giao: chỉ «Gia hạn» phần việc của đơn vị mình, không sửa tên, không hủy", "«Gia hạn, phối hợp, hủy, mở lại»"],
            ["«Mở lại»", "Chỉ với việc ĐÃ XONG: người giao và lãnh đạo", "«Gia hạn, phối hợp, hủy, mở lại»"],
            ["Ô «Giao cho…»", "Trưởng đơn vị khi việc giao cả đơn vị; hoặc người nhận có người để giao chuyển tiếp (lãnh đạo còn thấy thêm nhóm «Hỗ trợ Ban lãnh đạo» do Quản trị khai ở Cài đặt)", "«Gia hạn, phối hợp, hủy, mở lại»"],
            ["Cây bút ✎ cạnh tên việc", "Người có quyền «Sửa việc»", "«Sửa việc»"],
          ],
          luuY: ["Người không có quyền sẽ không thấy nút (không mờ). Nếu bạn không thấy nút mình cần, nhờ Quản trị kiểm quyền ở Cài đặt, Vai trò và quyền."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Anh B là nhân viên Phòng Kỹ thuật được giao việc. Trong thẻ anh chỉ thấy «Xong việc» và khối bình luận. Chị A là trưởng phòng (người giao) thì thấy thêm «Gia hạn», «＋ Phối hợp», «Hủy việc» và cây bút ✎ nếu được cấp quyền «Sửa việc». Cùng một việc, hai người thấy hai bộ nút khác nhau.",
          ],
        },
      ],
    },
    {
      ten: "③ Bình luận",
      khoi: [
        {
          tieuDe: "Cuối thẻ",
          doan: ["Khối ý kiến nằm cuối thẻ: tệp kèm khi giao việc, tệp kèm khi báo xong, danh sách ý kiến và (nếu bạn được phép) ô viết. Cách viết, gõ @ và gửi xem hướng dẫn «Bình luận trong việc»."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Anh B hỏi trong thẻ «Bản vẽ này đã duyệt chưa?», gõ «@» và vài chữ tên chị A, chọn tên, bấm «Gửi». Chị A có chuông ngay và trả lời trong cùng thẻ."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Mở thẻ mà không thấy nút nào", "Bạn không phải người làm, không có quyền sửa việc này. Bạn vẫn đọc và bình luận được nếu thuộc diện liên quan."],
            ["Chỉ mở được MỘT thẻ một lúc", "Đúng thiết kế: mở thẻ khác thì thẻ cũ thu lại."],
            ["Dấu «!» đỏ chưa hiện", "Dữ liệu đường găng lấy từ agent Tiến độ nên chậm hơn danh sách; hoặc dự án chưa có cây WBS."],
            ["Thẻ báo không tìm thấy việc (mở từ link chuông)", "Việc đã bị hủy hoặc đã xong quá thời hạn lưu. Hỏi người giao."],
          ],
        },
      ],
    },
  ],
  canCu: "Quyền «Giao việc», «Sửa» (gia hạn, thêm/đổi người, hủy việc), «Sửa việc» (cây bút), «Tag tên» khai ở Cài đặt, Vai trò và quyền · luật 17 riêng 3004 (nút không có quyền thì ẨN) · luật 31 (khoảng ngày kèm số ngày) · luật 35, 36.",
};
