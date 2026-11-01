// Hướng dẫn bản 2 (tab) — Trợ lý chat AI của Main (khung nổi / neo / cửa sổ riêng). Viết 20/10/2026 theo mẫu Nghiệm thu + luật chữ AI (Mr. Đại).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Trợ lý chat",
  ai: "PM, Admin, Người dùng. Người xem không dùng được trợ lý (cửa «Ghi · nạp · sửa · duyệt · trợ lý AI» trong bảng quyền): ô nhập và nút kẹp tệp hiện mờ. Việc có ghi dữ liệu chỉ chạy khi người bấm «✅ Làm».",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Trợ lý chat là gì?",
          doan: [
            "Một khung chat để anh/chị hỏi bằng tiếng Việt thường, ví dụ «Dự án này chậm mấy ngày, vì sao». Trợ lý là AI: nó tự chọn hỏi agent nào (Tiến độ, Hợp đồng, Pháp lý, Công việc, Nghiệm thu), đọc kết quả và viết câu trả lời có dẫn nguồn. Trợ lý Main KHÔNG giữ số liệu riêng: mọi con số nó nói đều do agent chủ trả lời.",
            "Tin nhắn Telegram và khung này đều đi vào cùng một trợ lý.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: ["Hỏi một câu thay vì mở bốn phần mềm rồi ghép số.", "Câu hỏi vắt ngang nhiều bên («hồ sơ nào đang chặn thi công») chỉ trợ lý làm được vì nó tự đi hỏi nhiều agent.", "Mọi lượt hỏi agent có vết trong sổ hỏi–đáp (xem ở Agent quan sát) nên kiểm lại được."],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc",
          bang: [
            ["Bước trước", "Trợ lý chat", "Bước sau"],
            ["Cần một câu trả lời hoặc một việc hơi nhiều bước", "Hỏi → trợ lý hỏi agent → trả lời", "Trả lời đủ thì xong; cần ghi dữ liệu (giao việc…) thì bấm «✅ Làm»; cần giấy tờ thì xuất tệp"],
          ],
        },
        {
          tieuDe: "Các phần của khung",
          bang: [
            ["Phần", "Để làm gì", "Xem tab"],
            ["Cột trái (khung rộng) hoặc nút ☰: lịch sử phiên, «Cuộc trò chuyện mới»", "Mỗi chủ đề một phiên", "② Phiên và cách đặt khung"],
            ["Thanh trên của khung: neo trái / nổi / neo phải, mở cửa sổ riêng, «Thu gọn», «Đóng»", "Đặt khung", "② Phiên và cách đặt khung"],
            ["Ô «Nhắn cho trợ lý…», nút 📎, nút tìm internet, nút tự thao tác, nút gửi", "Hỏi", "① Hỏi trợ lý"],
            ["Khung «⏸ Chờ bạn bấm» với «✅ Làm» · «❌ Bỏ»", "Duyệt việc ghi", "③ Việc ghi cần bấm"],
            ["Dải 11 định dạng và các nút xuất", "Xuất kết quả thành tệp", "④ Xuất kết quả"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · AI",
          bang: [
            ["Người", "Máy", "🤖 AI"],
            ["Hỏi, bấm «✅ Làm» hoặc «❌ Bỏ», chọn định dạng xuất, kẹp tệp", "Chạy các công cụ hỏi agent, cắt gọn kết quả dài theo cấu trúc, ghi sổ hỏi–đáp, kiểm quyền, chạy việc ghi sau khi người bấm", "🤖 Hiểu câu hỏi, chọn công cụ, đọc kết quả, viết câu trả lời và đề nghị việc ghi; 🤖 soạn nội dung tệp xuất theo yêu cầu"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          ds: [
            "Người hỏi → 🤖 AI chọn công cụ → máy đi hỏi agent và trả kết quả → 🤖 AI viết câu trả lời (tối đa vài vòng hỏi).",
            "Nếu cần GHI dữ liệu thì AI chỉ ĐỀ NGHỊ; khung «⏸ Chờ bạn bấm» hiện mô tả việc; người bấm «✅ Làm» máy mới chạy, «❌ Bỏ» là thôi.",
            "Trợ lý không bao giờ tự sửa dữ liệu của agent khác; các việc của Agent Tiến độ (ghi % hoàn thành, chốt Baseline, chạy phân tích…) trợ lý chỉ chỉ đường sang đó.",
          ],
        },
      ],
    },
    {
      ten: "① Hỏi trợ lý",
      khoi: [
        {
          bam: [
            "Mở khung bằng nút trợ lý nổi.",
            "Gõ vào ô «Nhắn cho trợ lý…» rồi bấm gửi (Enter).",
            "Tuỳ chọn: 📎 kẹp tệp cho trợ lý đọc (pdf, xlsx, docx, txt, md, json, pptx); nút quả địa cầu «Tìm trên internet» (mặc định TẮT — bật thì trợ lý được ra ngoài tra giá vật tư, quy định mới, thông số thiết bị và kèm địa chỉ trang); nút con trỏ «Tự thao tác giao diện» (bật thì trợ lý tự mở trang, cuộn, điền ô và bấm nút thay bạn; không dùng được ở cửa sổ riêng).",
            "Chip chọn mô hình và vòng tròn ngữ cảnh: chọn một phát là áp dụng; vòng vàng từ 60%, đỏ từ 85% — nên mở phiên mới. Số % chỉ là ước.",
          ],
        },
        {
          ai: ["🤖 AI nhận: câu hỏi, lịch sử phiên, tệp kẹp, và danh sách công cụ hỏi agent. AI làm: chọn công cụ, đọc kết quả, viết trả lời kèm nguồn.", "AI KHÔNG được bịa số ngoài kết quả công cụ; thiếu số thì phải nói «chưa có số liệu». Nếu công cụ báo lỗi, AI nói thẳng agent nào chưa trả lời.", "Người kiểm bằng nguồn trong câu trả lời và sổ hỏi–đáp ở Agent quan sát. Mất kết nối AI thì khung báo lỗi và anh/chị mở thẳng màn tương ứng."],
        },
        {
          viDu: ["Hỏi «Dự án HV chậm mấy ngày, vì sao»: trợ lý hỏi Agent Tiến độ rồi trả lời kiểu «chậm 86 ngày so với Tiến độ mục tiêu · chậm 44 ngày so với Baseline» kèm hạng mục găng 6.1 Hợp đồng cung cấp turbine tự làm COD chậm 41 ngày — đúng các số Bảng điều hành đang hiện."],
        },
        {
          luuY: ["Bật «Tìm trên internet» thì nội dung ngoài có thể lẫn vào câu trả lời; số liệu dự án luôn lấy từ agent, không từ internet.", "Câu hỏi mơ hồ (không nói dự án nào) thì trợ lý dùng dự án đang chọn ở thanh trên."],
        },
      ],
    },
    {
      ten: "② Phiên và cách đặt khung",
      khoi: [
        {
          bam: [
            "«Cuộc trò chuyện mới»: dọn màn hình; phiên chỉ được tạo khi gửi tin đầu tiên, nên không để phiên rỗng.",
            "Cột trái liệt kê phiên theo ngày; bấm một phiên để mở lại; nút tuỳ chọn phiên để đổi tên hoặc xoá (xoá có bước «Xác nhận xóa phiên»). Kéo cạnh cột để chỉnh độ rộng; nháy đúp để về mặc định.",
            "Thanh trên của khung: chọn vị trí «Neo cột trái (chia đôi màn hình)», «Khung nổi tự do (kéo thả được)», «Neo cột phải» — khi neo, nội dung app bị đẩy sang bên kia chứ không bị che.",
            "Mở thành cửa sổ riêng để kéo sang màn hình khác; muốn quay lại bấm «Đưa trợ lý về lại trong ứng dụng». «Thu gọn» về khung nhỏ góc phải dưới; «Đóng» để tắt.",
          ],
        },
        {
          luuY: ["Phiên «Telegram» chứa các câu hỏi anh/chị nhắn qua bot Telegram.", "Khung hẹp dưới 560 điểm ảnh thì cột trái ẩn, thành ngăn kéo mở bằng ☰."],
        },
      ],
    },
    {
      ten: "③ Việc ghi cần bấm",
      khoi: [
        {
          doan: ["Khi anh/chị nhờ một việc có ghi dữ liệu (ví dụ soạn việc giao), trợ lý không tự làm mà hiện khung «⏸ Chờ bạn bấm:» kèm mô tả việc sẽ làm."],
        },
        {
          bam: ["Đọc mô tả việc.", "Bấm «✅ Làm» để máy chạy thật (nút đổi thành «Đang làm…»), hoặc «❌ Bỏ» để thôi."],
        },
        {
          ai: ["🤖 AI soạn mô tả và các tham số của việc (ví dụ tên việc, người nhận gợi ý), rồi chờ.", "AI không được chạy việc ghi khi chưa có cú bấm «✅ Làm».", "Người kiểm mô tả, sửa bằng cách nhắn lại cho trợ lý hoặc «❌ Bỏ». Trước khi soạn việc giao, hệ còn hỏi các agent có ai soạn trùng chưa."],
        },
        {
          viDu: ["Tình huống: nhờ trợ lý soạn việc giao cho hồ sơ HV-08-02 Hợp đồng tư vấn giám sát thi công: khung hiện việc sẽ tạo ở agent Công việc; bấm «✅ Làm» thì việc xuất hiện ở sổ của người nhận."],
        },
      ],
    },
    {
      ten: "④ Xuất kết quả",
      khoi: [
        {
          doan: ["Dưới ô nhập có dải 11 định dạng: HTML, DOCX, XLSX, PDF, PPTX, MD, SVG, MMD, DOT, KML, DXF. Chọn một định dạng thì câu hỏi kế tiếp trợ lý sinh thẳng tệp đó (bấm lại để bỏ chọn). Không chọn thì trợ lý vẫn tự nhận ý định từ câu hỏi. Rê chuột lên nút để đọc công dụng. Dưới mỗi câu trả lời cũng có các nút xuất lại câu đó (MD, HTML, DOCX, XLSX khi có bảng, DXF)."],
        },
        {
          bam: ["Bấm một định dạng trên dải, hỏi như thường.", "Tệp hiện thành nút tải ngay trong khung chat."],
        },
        {
          ai: ["🤖 AI soạn nội dung tệp theo yêu cầu (báo cáo, bảng, sơ đồ, slide…) từ số liệu đã hỏi được.", "AI không thêm số ngoài kết quả công cụ.", "Người mở tệp kiểm lại trước khi gửi đi."],
        },
        {
          viDu: ["Chọn XLSX rồi hỏi «bảng khối lượng thi công tuần này»: tệp Excel có bảng số trong câu trả lời, tải về dùng ngay."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Ô nhập và nút kẹp tệp mờ", "Anh/chị là Người xem — loại này không dùng trợ lý."],
            ["Trợ lý nói «chưa lấy được» số", "Agent chủ chưa trả lời. Bật agent đó rồi hỏi lại."],
            ["Trợ lý trả lời lâu", "Đang hỏi nhiều agent hoặc AI đang bận; đợi hoặc hỏi ngắn hơn."],
            ["Hết hạn mức AI", "Máy tự chuyển tài khoản kia; hết cả hai thì dùng Tài khoản Claude cá nhân (menu tên người)."],
            ["Nút tự thao tác mờ", "Đang ở cửa sổ riêng; mở trợ lý trong app để dùng."],
          ],
        },
      ],
    },
  ],
  canCu: "PLAN-MAIN-AGENT mục 4 (trợ lý tự đi hỏi các agent); chốt Mr. Đại 25/09/2026 (việc ghi chờ người bấm), 04/10/2026 (Người xem không dùng trợ lý).",
};
