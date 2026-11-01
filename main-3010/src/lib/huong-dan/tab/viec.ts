// Hướng dẫn bản 2 (tab) — màn «Việc của tôi» (MÃ CỐ ĐỊNH viec-cua-toi, dùng chung mọi agent). Khuôn gốc: agent Hợp đồng; bản này đồng bộ cho agent Main 20/10/2026.
// RIÊNG MAIN (Mr. Đại chốt 20/10): nửa TRÁI là BẢNG TỔNG gom gợi ý việc mới của các agent còn lại (lib/chung/viec-cho-duyet-gom.ts: AGENT_CO_CUA = tiendo · hopdong · base · phaply · nghiemthu) cộng nháp của chính Main; có thêm bảng 6 nút lọc agent (3 × 2). Các agent con chỉ có gợi ý của chính nó. Nửa phải giống mọi agent.
// Đối chiếu code: app/viec-cua-toi/page.tsx · components/tabs/viec/ViecView.tsx (NUT_AGENT, coBangTong, tieuDeTrai mặc định «Agent AI đề xuất giao việc») · lib/chung/viec-cong-viec-kieu.ts (6 lựa chọn lọc, NHAN_NGUON_VIEC).
// Chỗ AI thật: màn tự nó không gọi AI; AI soạn nháp nằm ở trợ lý chat (lib/ai/chat-tools.ts, lib/chung/viec-ai-soan.ts) và ở các agent con. Màn chỉ hiện «🤖 AI soạn sẵn» khi nháp do AI soạn.
// Số đo 20/10/2026 (GET /api/viec, cookie quản trị, mọi dự án): 38 nháp chờ duyệt — Pháp lý 16, Tiến độ 15, Hợp đồng 6, Công việc 1 (đều do máy soạn từ issue); «Tự đóng» 27; nửa phải «Việc tôi giao» 7, «Việc tôi nhận» 0, «Việc cần phối hợp» 0; chưa gom được agent nào (chuaDoc rỗng).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Việc của tôi — việc đang chờ anh chị giao và việc anh chị đang cầm",
  ai: "Mọi tài khoản đăng nhập xem được. Người dùng trở lên (PM, Admin, Người dùng) bấm «Giao việc», «Sửa», «Bỏ qua», «Hiện lại». Người xem thấy danh sách nhưng các nút ghi hiện mờ kèm lý do «Người xem chỉ được xem — ghi, nạp, sửa, duyệt cần loại Người dùng trở lên.»",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì?",
          doan: [
            "Một màn chia đôi. NỬA TRÁI («Agent AI đề xuất giao việc») là BẢNG TỔNG của Main: gom các việc mới mà agent Tiến độ, Hợp đồng, Công việc, Pháp lý và Nghiệm thu đã soạn sẵn (5 agent máy đang gom; ở agent Nghiệm thu, «việc soạn sẵn» là các issue đang mở chưa thành việc), cộng nháp của chính Main, đang chờ anh chị chọn người nhận và giao. Ở các agent khác, nửa trái chỉ có gợi ý của chính agent đó. NỬA PHẢI: các việc thật đang có ở agent Công việc liên quan tới anh chị — việc anh chị giao, việc anh chị nhận, việc cần phối hợp.",
            "Hình dung nửa trái là hộp thư «việc đề xuất», nửa phải là bảng việc đang chạy. Việc đi từ trái sang phải khi anh chị bấm «Giao việc».",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Issue chỉ nhắc; việc có người nhận và hạn mới được xử lý. Nửa trái là nơi duyệt từng đề xuất, không để sót.",
            "Anh chị thấy việc mình giao có quá hạn không, việc mình nhận còn bao nhiêu ngày, mà không phải mở agent Công việc.",
            "Việc máy thấy đã hết lý do tồn tại (issue hết vi phạm…) được tự đóng và liệt kê ở «Tự đóng (N)» để kiểm lại.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì"],
            ["Bước trước", "Các agent Tiến độ, Hợp đồng, Công việc, Pháp lý sinh issue rồi soạn sẵn việc (Main gom lại); hoặc anh chị nhờ trợ lý chat của Main «soạn việc giao»"],
            ["Màn này", "Duyệt đề xuất (nửa trái), theo dõi việc (nửa phải)"],
            ["Bước sau", "Việc ở agent Công việc; người nhận làm, báo xong; issue gốc tự đóng khi hết vi phạm"],
          ],
        },
        {
          tieuDe: "Các khối trên màn",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Nửa trái: tiêu đề «Agent AI đề xuất giao việc» · «N việc» · «Nguồn: …»", "Biết có bao nhiêu việc chờ và từ nguồn nào", "① Nửa trái"],
            ["Bảng 6 nút «Tất cả» · «Tiến độ» · «Hợp đồng» · «Công việc» · «Pháp lý» · «Nghiệm thu» (riêng Main)", "Chọn xem nháp của agent nào", "① Nửa trái"],
            ["Hàng «Tải lại» · ô Dự án · ô Lọc", "Tải lại, lọc theo dự án, đổi cách xếp", "① Nửa trái"],
            ["Thẻ việc chờ duyệt (hai thẻ mỗi trang) và nút «Giao việc» · «Sửa» · «Bỏ qua»", "Duyệt từng việc", "① Nửa trái"],
            ["Nút «Tự đóng (N) ▸»", "Xem việc máy tự đóng", "① Nửa trái"],
            ["Nửa phải: 3 nút «Việc tôi giao» · «Việc tôi nhận» · «Việc cần phối hợp» và ô tìm", "Chọn và tìm việc đang chạy", "② Nửa phải"],
            ["Danh sách nhóm theo đơn vị; khối «Việc làm xong: Tuần N và M»", "Xem và mở từng việc", "② Nửa phải"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Chọn người nhận · bấm «Giao việc» · «Sửa» · «Bỏ qua» · mở xem từng việc, báo xong, gia hạn, góp ý ở thẻ việc"],
            ["MÁY", "Gom nháp của các agent, hỏi các agent khác xem có trùng việc không (luật 33), xếp theo hạn, tự đóng việc hết lý do, đọc việc từ agent Công việc, tính «quá hạn N ngày» / «còn N ngày»"],
            ["🤖 AI", "🤖 Màn này không tự gọi AI. Việc nào do AI soạn thì ô trình bày ghi «🤖 AI soạn sẵn — chưa gửi đi đâu cả» (AI chỉ soạn khi anh chị nhờ trợ lý chat của Main hoặc bấm «✎ AI soạn việc giao» ở màn Cảnh báo của agent con); việc do máy soạn ghi «Máy soạn sẵn từ issue»"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ máy ↔ AI",
          bam: [
            "MÁY ở các agent (hoặc 🤖 AI khi người nhờ trợ lý chat) soạn việc → Main gom về nửa trái, chưa gửi đi đâu.",
            "NGƯỜI chọn người nhận, sửa nếu cần, bấm «Giao việc».",
            "Việc sang agent Công việc → hiện ở nửa phải (người giao: bộ lọc «Việc tôi giao»; người nhận: «Việc tôi nhận»).",
            "Người nhận làm và báo xong; MÁY đóng issue gốc khi hết vi phạm.",
          ],
        },
      ],
    },
    {
      ten: "① Nửa trái",
      khoi: [
        {
          tieuDe: "Đọc một thẻ việc chờ duyệt",
          doan: ["Mỗi thẻ là một ô chữ gồm: dòng đầu «Máy soạn sẵn từ issue — chưa gửi đi đâu cả» (hoặc «🤖 AI soạn sẵn — chưa gửi đi đâu cả») rồi Tên việc · Giao cho · Hạn · Thuộc dự án · Kết quả cần có · Nguồn. Dòng Nguồn ghi issue gốc, ngày soạn và kết quả hỏi trùng."],
        },
        {
          tieuDe: "Bấm gì",
          bam: [
            "Hàng 1 (riêng Main): 6 nút xếp 3 × 2 «Tất cả» · «Tiến độ» · «Hợp đồng» · «Công việc» · «Pháp lý» · «Nghiệm thu», mỗi nút kèm số nháp trong ngoặc. Bấm nút agent để chỉ xem nháp của agent đó; bấm lại nút đang chọn là quay về «Tất cả». Hàng này chỉ hiện khi có nháp từ agent khác.",
            "Ô Dự án (ở Main mặc định là «Mọi dự án») và ô Lọc: «Mới soạn trước» · «Gấp nhất trước» · «Việc trên đường găng» · «Việc nghiêm trọng» · «Chưa có người nhận» · «Hạn trong 7 ngày». Chọn là áp dụng ngay.",
            "Chọn người ở ô «Giao cho» dưới thẻ (bấm chọn Ban lãnh đạo hoặc đơn vị; gõ @ để tìm tên người).",
            "Bấm «Giao việc» → Main chuyển về agent gốc để tạo việc thật ở agent Công việc; dòng xanh «✓ Đã giao cho <người> — việc <mã> ở agent Công việc».",
            "Bấm «Sửa» → vùng bên phải đổi thành khung soạn việc có các ô «Giao cho» · «Thuộc dự án» · «Nội dung việc» (kẹp tệp bằng 📎) · «Kết quả cần có» · «Hạn». Bấm «Giao việc» để giao, hoặc ✕ để quay lại danh sách (nháp còn nguyên).",
            "Bấm «Bỏ qua» → Main báo agent gốc ghi nhận người đã bỏ, nên máy không soạn lại việc cho issue này.",
            "Mỗi trang hai thẻ; dùng «← Trước» «Sau →» để chuyển trang. «Tải lại» để lấy danh sách mới.",
            "Bấm «Tự đóng (N) ▸» (chỉ hiện khi có việc máy tự đóng) → nửa trái đổi thành danh sách việc đã tự đóng; mỗi dòng ghi «Máy tự đóng <ngày> · <mã dự án> · 90 ngày sau xoá hẳn · Lý do: …» và nút «Hiện lại» (đưa về chờ duyệt, máy không tự đóng việc đó nữa). Bấm «▾ Quay lại việc chờ duyệt» để về.",
          ],
          ketQua: ["Nút «Giao việc» mờ khi chưa chọn người nhận hoặc hạn đã qua (rê chuột thấy lý do). Thẻ giao xong biến khỏi nửa trái."],
          viDu: [
            "Đo 20/10/2026 — mọi dự án: nửa trái ghi «38 việc», Nguồn: Issue 38; hàng nút «Tất cả (38)» · «Tiến độ (15)» · «Hợp đồng (6)» · «Công việc (1)» · «Pháp lý (16)». Việc đầu: «Làm hồ sơ pháp lý: Hồ sơ đăng ký danh mục công trình, dự án cần thu hồi đất (TT-AI-17)» của dự án Tân Thành, từ issue ISS-PL-0135, hạn 02/12/2026, do máy soạn. Chọn người nhận rồi bấm «Giao việc». «Tự đóng (27) ▸» cho xem 27 việc máy đã đóng.",
            "Chọn ô Lọc «Hạn trong 7 ngày» thì chỉ còn các việc có hạn từ hôm nay tới 7 ngày sau.",
          ],
        },
      ],
    },
    {
      ten: "② Nửa phải",
      khoi: [
        {
          tieuDe: "Ba nút lọc",
          bang: [
            ["Nút", "Hiện việc nào"],
            ["«Việc tôi giao»", "Việc anh chị giao thủ công (không tính việc máy tách từ báo cáo)"],
            ["«Việc tôi nhận»", "Việc anh chị chủ trì, giao đích danh tên anh chị hoặc chức danh lãnh đạo anh chị giữ — không tính việc giao cho cả đơn vị"],
            ["«Việc cần phối hợp»", "Phần phối hợp chưa xong giao đích danh anh chị; trưởng đơn vị thấy cả phần giao cho đơn vị mình"],
          ],
        },
        {
          tieuDe: "Bấm gì",
          bam: [
            "Màn mở ra sẵn ở nút «Việc tôi nhận». Muốn xem việc mình giao thì bấm «Việc tôi giao»; số trong ngoặc là số việc của từng nút.",
            "Gõ vào ô «Tìm mã việc, tên việc, tên người, dự án…» để lọc ngay.",
            "Việc xếp theo nhóm đơn vị; mỗi dòng ghi tên việc và tình trạng bên phải («quá hạn 8 ngày», «còn 4 ngày»). Dấu «!» đầu tên là việc nằm trên đường găng.",
            "Bấm một dòng → thẻ việc của agent Công việc bung ngay tại chỗ (báo xong, gia hạn, ý kiến). Bấm việc khác thì việc đang mở thu lại.",
            "Cuối nhóm, bấm «Việc làm xong: Tuần N và M» để xem việc đã xong trong khoảng đó (chỉ xem).",
          ],
          viDu: [
            "Đo 20/10/2026 — mọi dự án: «Việc tôi giao (7)», «Việc tôi nhận (0)», «Việc cần phối hợp (0)». Ví dụ trong «Việc tôi giao»: CV-2026-0134 «Xử lý issue ISS-2026-40-003: SCI PMC — 1 việc còn mở trong sổ dù 1 mã WBS đã 100% — nhắc đóng việc» — quá hạn 8 ngày (hạn 12/10/2026); CV-2026-0142 «Xử lý issue ISS-2026-41-002: Sắp khởi công nhưng thiếu Thỏa thuận hành lang tuyến… — Đường dây đấu nối (7.2)», dự án Nậm săm 3A — quá hạn 7 ngày.",
          ],
        },
        {
          luuY: [
            "Cuối danh sách có thể ghi «Hiện N/M việc — xem đủ ở agent Công việc.»: màn chỉ đọc một phần, phần còn lại xem ở agent Công việc.",
            "Chữ «quá hạn N ngày» ở nửa phải tính so với HẠN GIAO VIỆC do người giao đặt ở agent Công việc — không phải so với Baseline hay Tiến độ mục tiêu.",
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
            ["Màn ghi «Không đọc được việc từ agent Công việc»", "Agent Công việc đang tắt hoặc chưa thưa; thử «Tải lại» sau ít phút. Nửa trái vẫn dùng được"],
            ["Nửa trái trống «Không có việc soạn sẵn nào đang chờ duyệt»", "Chưa agent nào có việc soạn sẵn, hoặc ô Dự án / ô Lọc / nút agent đang lọc hết; đổi ô Dự án sang «Mọi dự án», bấm «Tất cả»"],
            ["Dòng «Chưa gom được: …»", "Một agent chưa trả lời nên nháp của agent đó chưa hiện; bấm «Tải lại» khi agent bật lại"],
            ["Nháp ghi «chưa hỏi được agent …»", "Lúc soạn, agent đó đang tắt nên chưa chắc không trùng việc; xem kỹ trước khi giao"],
            ["Không thấy đề xuất của agent Nghiệm thu", "Nghiệm thu chỉ đề xuất khi có issue đang mở chưa thành việc (phiếu BQL ký quá hạn, nợ nghiệm thu) ở dự án anh chị có quyền giao; Người xem và tài khoản nhà thầu không thấy. Nút «Nghiệm thu (0)» nghĩa là hiện không có issue nào chờ"],
            ["Thẻ ở nửa trái biến mất", "Có thể đã giao (xem nửa phải), đã bỏ qua, hoặc máy đã tự đóng vì hết lý do — mở «Tự đóng (N) ▸» xem lý do và «Hiện lại» nếu máy đóng nhầm"],
            ["«Giao việc» mờ", "Chưa chọn người nhận, hạn đã qua (bấm «Sửa» chọn hạn mới) hoặc là Người xem"],
            ["Bấm «Giao việc» báo «Không gọi được máy chủ app»", "Máy chủ đang biên dịch lại; thử lại sau vài giây"],
            ["Việc giao xong không thấy ở nửa phải", "Nằm ở «Việc tôi giao»; có thể bị ô tìm hoặc giới hạn «Hiện N/M việc» che"],
            ["Nửa phải ghi «Chưa có việc nào.»", "Màn mở sẵn ở nút «Việc tôi nhận» nên có thể trống; bấm «Việc tôi giao» hoặc «Việc cần phối hợp» để xem nhóm khác"],
          ],
        },
      ],
    },
  ],
  canCu: "LOI-DUNG-CHUNG mục 6b (Việc của tôi, màn của lõi) · CHOT 6g.7 mục 3 (hai nửa) · chốt Mr. Đại 04/10 và 07/10/2026 (bảng tổng ở Main) · chốt 08/10/2026 (việc máy tự đóng) · luật 33 hỏi trùng · luật 31 khoảng ngày.",
};
