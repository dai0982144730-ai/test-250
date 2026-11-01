// ============================================================
// NHÓM G — MAIN AGENT (7 tab). FILE THUẦN (luật 10): không fs, không mạng.
//
// NGUỒN NỘI DUNG — không ai tự nghĩ ra bài:
//   · D:\SCI-AI-AGENT\BAI-TEST-NGUOI-DUNG.md — "NHÓM G · MAIN AGENT (16 bài)",
//     giữ nguyên mã G-01…G-16 để tra ngược được sang bảng tick tay.
//   · G-17 trở đi là bài ĐO TẬN NƠI trên bản chạy thật cổng 3010 ngày 07/09,
//     cho những thứ thêm sau khi bảng kia đã chốt (nút Chạy/Dừng agent trong
//     Danh bạ, cách nhận ra đang chạy dữ liệu thật hay dữ liệu thử…).
//
// ⛔ VÌ SAO PHẢI VIẾT LẠI CẢ BỘ: thư mục kiem-thu/ được chép nguyên từ bộ
//    Agent Tiến độ sang 4 app mà không sửa ruột — bốn bản giống hệt nhau tới
//    từng mã băm. Người test mở màn này ra sẽ đi chấm "Kho hồ sơ", "Cây thư
//    mục", "Thả một báo cáo ngày"… những màn MAIN KHÔNG HỀ CÓ. Tệ hơn cả
//    không có màn test.
//
// ⭐ BẢN CHẤT CON MAIN, mọi bài dưới đây phải soi đúng chỗ này:
//    Main KHÔNG giữ dữ liệu nghiệp vụ. Nó đi hỏi 4 con kia rồi tổng hợp.
//    Nên THIẾU MÀN LÀ ĐÚNG THIẾT KẾ (G-02), và số trên màn phải truy được về
//    một lượt gọi trong Nhật ký — không truy được thì đó là bịa.
// ============================================================

import type { TabTest } from "./kich-ban-chung";

export const TAB_MAIN: TabTest[] = [
  // ────────────────────────────────────────────────────────────
  {
    ma: "NHAN",
    ten: "Nhận diện & thiếu màn là đúng",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Mở cổng 3010, nhìn thanh bên và menu trái. Tab này soi đúng một điều: Main không giữ dữ liệu nghiệp vụ nên KHÔNG có cây việc, không có phiếu giá, không có kho văn bản — thiếu mấy màn đó là đúng thiết kế, không phải lỗi.",
    bai: [
      {
        ma: "G-01",
        ten: "Mở được cổng 3010 và nhận ra đúng con nào",
        goc: "thuan",
        buoc: ["Mở http://127.0.0.1:3010 (đừng dùng localhost — Node phân giải ra IPv6 và bị từ chối).", "Đăng nhập dainc@scigroup.vn / mật khẩu của anh.", "Nhìn khối trên cùng thanh bên trái."],
        mongDoi: "Vào được. Thanh bên ghi “Main Agent” và dòng nhỏ “Hỏi 4 con kia rồi tổng hợp”. Không được ghi tên agent khác.",
      },
      {
        ma: "G-02",
        ten: "★ Menu trái đúng ba nhóm — và THIẾU màn nghiệp vụ là đúng",
        goc: "thuan",
        buoc: [
          "Đọc hết menu trái từ trên xuống.",
          "Đếm nhóm và đếm mục trong từng nhóm.",
          "Cố ý đi tìm xem có mục nào tên “Cây việc”, “Đường găng”, “Phiếu giá”, “Soát hợp đồng”, “Văn bản”, “Hồ sơ dự án”, “Báo cáo ngày” không.",
        ],
        mongDoi:
          "Đúng bốn khối (gọn 26/09): ĐIỀU HÀNH (Việc của tôi · Bảng điều hành · Báo cáo — một mục, hai tab Sáng · Tháng) · CHUNG — LÕI 5 AGENT (Issue · Skill AI của tôi, có chip LÕI) · SANG AGENT KHÁC (4 link + Agent quan sát ↗ — nhật ký & sức khoẻ agent xem ở đó) · CÀI ĐẶT (Cài đặt Main Agent). KHÔNG còn nhóm Điều khiển cả hệ (Khai một lần đã gỡ · Ai được gọi ai ở Cài đặt → 🔌 · Nhật ký & sức khoẻ agent chuyển sang Agent quan sát). KHÔNG có cây việc, không có phiếu giá, không có kho văn bản, không có báo cáo ngày — đây là bài đáng giá nhất của cả bộ, thiếu mấy màn đó mới là ĐÚNG.",
      },
      {
        ma: "G-17",
        ten: "Ô chọn dự án và tuần báo cáo có mặt trên mọi màn",
        goc: "thuan",
        buoc: ["Nhìn thanh trên cùng ở ba màn khác nhau.", "Bấm vào ô chọn dự án."],
        mongDoi:
          "Mọi màn đều có ô chọn dự án (đang là “Điện gió Hướng Việt (HV — dữ liệu test)”) và ô “Tuần báo cáo: 2026-Wxx (dd/mm/yyyy)”. Bấm vào ô dự án thì bung danh sách dự án, không phải ô chết.",
      },
      {
        ma: "G-42",
        ten: "★ Trang đáp xuống sau khi đăng nhập có đúng là của Main không",
        goc: "sai",
        buoc: [
          "Đăng xuất rồi đăng nhập lại.",
          "Nhìn kỹ trang vừa đáp xuống (địa chỉ 127.0.0.1:3010/ — không nằm trong menu trái).",
          "So nội dung trang đó với danh sách màn ở G-02.",
        ],
        mongDoi:
          "Trang đáp xuống phải là màn của Main. ⚠ ĐO 07/09: nó đang là màn “Tổng quan dự án” kế thừa nguyên của Agent Tiến độ — S-Curve bốn đường, bảng hạng mục đường găng, mốc quan trọng, KPI %TT/%KH. Đúng những thứ G-02 nói Main KHÔNG được có, mà lại là trang đầu tiên người dùng nhìn thấy. Chấm Không đạt và ghi lại.",
      },
      {
        ma: "G-18",
        ten: "Hai nút Test và Giới thiệu ở thanh trên cùng",
        goc: "thuan",
        buoc: ["Nhìn góc trên bên phải, cạnh tên người đăng nhập.", "Bấm Test.", "Quay lại, bấm Giới thiệu."],
        mongDoi:
          "Có nút Test (mở đúng màn này) và nút Giới thiệu. ⚠ ĐO 07/09: màn Giới thiệu vẫn mang tiêu đề “Agent tiến độ — giới thiệu” — nội dung kế thừa chưa sửa cho Main. Chấm Không đạt và ghi lại.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "SANG",
    ten: "Báo cáo sáng & luật động",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Báo cáo → tab Sáng — màn riêng của Main, bốn agent kia không có. Nó hỏi các con đang bật rồi dựng bản báo cáo cho sáng hôm sau. Phần “Nhắn cho Main Agent” là luật động: lệnh nhắn hôm nay CHỈ áp cho hôm nay, muốn dài hơn phải nói rõ.",
    bai: [
      {
        ma: "G-03",
        ten: "★ Dựng lại — ba phần, mỗi dòng có nguồn",
        goc: "thuan",
        buoc: ["Mở Báo cáo → tab Sáng.", "Đọc dòng “Sẽ hỏi … agent đang bật” ở đầu màn.", "Bấm Dựng lại, chờ tới khi xong."],
        mongDoi:
          "Ra bản báo cáo ba phần 🔴 🟡 ✅. Mỗi dòng kèm nguồn bấm mở được. Con nào chưa hỏi được thì ghi RÕ TÊN con đó và lý do — không lặng lẽ bỏ qua, không ghi 0 thay cho thiếu số.",
      },
      {
        ma: "G-04",
        ten: "Luật “tuần này” — hạn đến hết Chủ nhật",
        goc: "thuan",
        buoc: ["Ở ô Nhắn cho Main Agent, gõ: tuần này theo dõi sát nhà thầu TS", "Bấm Nhắn cho Main Agent."],
        mongDoi: "Luật hiện ra trong danh sách luật động, kèm hạn đến hết Chủ nhật tuần này.",
      },
      {
        ma: "G-05",
        ten: "★ Luật “sáng mai” — hạn 1 ngày",
        goc: "thuan",
        buoc: ["Gõ: sáng mai báo kỹ về HP1", "Bấm Nhắn cho Main Agent."],
        mongDoi:
          "Luật mới, hạn 1 ngày. Đây là luật quan trọng nhất của màn: lệnh nhắn hôm nay chỉ áp hôm nay, không được biến thành luật vĩnh viễn.",
      },
      {
        ma: "G-06",
        ten: "Luật “từ nay” — không hạn",
        goc: "thuan",
        buoc: ["Gõ: từ nay bỏ mục nhân lực", "Bấm Nhắn cho Main Agent."],
        mongDoi: "Luật mới, ghi rõ KHÔNG có hạn.",
      },
      {
        ma: "G-07",
        ten: "Xoá hết luật — trống là bình thường, không phải hỏng",
        goc: "bien",
        buoc: ["Bấm Xoá ở từng dòng trong ba luật vừa thêm."],
        mongDoi:
          "Xoá được hết. Màn ghi “Đang không có luật nào — báo cáo sáng chạy theo khung mặc định. Đây là trạng thái bình thường, không phải hỏng.” Không được để bảng trắng không giải thích.",
      },
      {
        ma: "G-19",
        ten: "Telegram chưa khai — nói rõ, và nói rõ đó không phải lỗi",
        goc: "bien",
        buoc: ["Nhìn dải 📮 ở đầu Báo cáo → tab Sáng.", "Bấm thử nút Gửi Telegram ngay."],
        mongDoi:
          "Dải ghi rõ hai biến phải khai (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) và câu “Đây không phải lỗi: báo cáo vẫn được dựng và lưu, chỉ chưa tự nhắn đi được”. Nút gửi hiện mờ kèm giải thích, không bấm rồi im lặng thất bại.",
      },
      {
        ma: "G-20",
        ten: "Kịch bản định kỳ — bấm chạy tay được để nhìn nó chạy thật",
        goc: "thuan",
        buoc: ["Mở Cài đặt → 🔔 Cảnh báo & ngưỡng, kéo xuống khối Kịch bản định kỳ.", "Đếm số nhịp.", "Bấm Chạy ngay ở nhịp “21:00 — dựng báo cáo sáng”."],
        mongDoi:
          "Bốn nhịp theo giờ (21:00 dựng · 07:00 gửi · Thứ Hai 14:00 nhắc BC tuần · Ngày 1 hằng tháng 08:00 nháp BC tháng), mỗi nhịp ghi nguồn và lần tự chạy gần nhất. Bấm Chạy ngay thì nó chạy thật và cập nhật lại dòng đó.",
      },
      {
        ma: "G-21",
        ten: "Mở lại bản báo cáo các ngày trước bằng ô ngày",
        goc: "thuan",
        buoc: ["Ở Báo cáo → tab Sáng, đổi ô ngày sang một ngày hôm trước đã có bản.", "Xem màn điện thoại ở tab ① và tab ③."],
        mongDoi: "Đổi ngày thì màn tải đúng bản của ngày đó (số dòng, đã gửi hay chưa); ngày chưa có bản thì ghi «Chưa có bản báo cáo của ngày này». Màn không còn mục «Lịch sử báo cáo».",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "NGANG",
    ten: "Hỏi vắt ngang các ban — qua trợ lý chat",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Mr. Đại chốt 25/09: BỎ màn riêng, câu hỏi vắt ngang hỏi thẳng trợ lý chat (web hoặc Telegram). Trợ lý nói trước sẽ hỏi ban nào, đi hỏi thật qua cổng, rồi trả lời bằng lời — mỗi ý ghi nguồn agent. Cái đáng test là nó dám nói “agent X chưa có số liệu” thay vì bịa.",
    bai: [
      {
        ma: "G-08",
        ten: "★ Nói trước sẽ hỏi ban nào, rồi mới trả lời",
        goc: "thuan",
        buoc: ["Mở trợ lý chat (nút tròn góc dưới, hoặc Ctrl+K).", "Gõ: vì sao HV chậm?", "Enter."],
        mongDoi:
          "Câu trả lời mở đầu bằng một dòng “Mình hỏi: ① Tiến độ … ② Pháp lý … ③ Base …”. Dưới tin có các chip công cụ đã gọi (tiendo.* · phaply.* · base.*). Nhận ra “HV” là dự án Điện gió Hướng Việt dù đang mở dự án khác.",
      },
      {
        ma: "G-09",
        ten: "★ Câu không agent nào trả lời được — nói thẳng",
        goc: "sai",
        buoc: ["Gõ: trời hôm nay thế nào"],
        mongDoi:
          "Trả lời thẳng là không có dữ liệu trong hệ (hoặc gợi ý bật 🌐 tìm web) — TUYỆT ĐỐI không đi hỏi bừa cả bốn agent, không bịa số.",
      },
      {
        ma: "G-22",
        ten: "Một agent tắt — vẫn trả lời, nói rõ thiếu phần nào",
        goc: "bien",
        buoc: ["Tắt Agent Hợp đồng (cổng 3012).", "Hỏi: tình hình HV, có gì cần tôi quyết không?"],
        mongDoi:
          "Vẫn trả lời phần tiến độ / pháp lý / Base. Phần hợp đồng ghi rõ “Agent hợp đồng chưa có số liệu (không nối được…)” — không lặng lẽ trả lời như thể đủ.",
      },
      {
        ma: "G-23",
        ten: "Dự án gọi bằng tên thay vì mã",
        goc: "thuan",
        buoc: ["Hỏi: hồ sơ nào đang chặn thi công ở Nậm Săm 3A?"],
        mongDoi:
          "Trợ lý hỏi Agent pháp lý đúng dự án N3A (xem nhật ký hỏi–đáp ở Agent quan sát: tham số ma_du_an = N3A). Gọi tên sai/không có thì trợ lý liệt kê dự án đang có để chọn, không đoán.",
      },
      {
        ma: "G-24",
        ten: "Mỗi con số truy về một lượt gọi",
        goc: "thuan",
        buoc: ["Lấy câu trả lời của G-08.", "Mở Agent quan sát, lọc các lượt hỏi–đáp vừa rồi."],
        mongDoi:
          "Mỗi con số trong câu trả lời có dòng nguồn “(nguồn: Agent … · công cụ)” và tìm được đúng lượt gọi trong sổ. Con số nào không truy về được một lượt gọi thì đó là bịa — ghi Không đạt ngay.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "THANG",
    ten: "Báo cáo tháng",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Màn riêng của Main: gộp cả 3 dự án vào một file, 6 mục · 11 bảng. Đây là chỗ dễ bịa số nhất trong cả hệ, nên bài test soi đúng chỗ đó — ô không dẫn được nguồn phải là “—” kèm lý do, không bao giờ là 0.",
    bai: [
      {
        ma: "G-12",
        ten: "★ Dựng bản nháp — đếm ô có số liệu",
        goc: "thuan",
        buoc: ["Mở Báo cáo → tab Tháng.", "Chọn tháng cần dựng.", "Bấm Dựng bản nháp, chờ khoảng một phút.", "Đọc dòng đếm ngay dưới nút."],
        mongDoi:
          "Dòng đếm ghi “Mục: 6/6 · Bảng: 11/11 · Ô có số liệu: … · chưa có: …”. Bảng 5 có 14 dòng mã WBS kèm khối lượng luỹ kế. Ô chưa hỏi được ghi “—” kèm lý do; KHÔNG ô nào là 0.",
      },
      {
        ma: "G-13",
        ten: "★★ Soạn nhận xét — mô hình chỉ diễn giải số đã có",
        goc: "thuan",
        buoc: ["Sau khi có bản nháp, bấm 🤖 Soạn nhận xét, chờ vài phút.", "Đọc cột Kiến nghị của Bảng 10.", "Tìm một dòng chưa có số nào và xem cột Kiến nghị của nó."],
        mongDoi:
          "Câu trong cột Kiến nghị bắt đầu bằng 🤖 và bám đúng số của chính dòng đó. Dòng chưa có số nào thì cột Kiến nghị vẫn để trống — mô hình KHÔNG được nghĩ ra số.",
      },
      {
        ma: "G-14",
        ten: "★ Rê chuột vào ô 🤖 — nó dựa trên ô nào",
        goc: "thuan",
        buoc: ["Rê chuột vào một ô 🤖 vừa sinh.", "Rê chuột vào một ô đang ghi “—”."],
        mongDoi:
          "Ô 🤖 hiện dòng nguồn nói rõ nó dựa trên NHỮNG Ô NÀO của chính dòng đó. Ô “—” hiện nó định lấy từ agent nào và vì sao chưa lấy được.",
      },
      {
        ma: "G-25",
        ten: "Bảng chưa hỏi được vẫn hiện đủ cột",
        goc: "bien",
        buoc: ["Tìm bảng đang không có dòng dữ liệu nào (đo 07/09: Bảng 8 — Hợp đồng & thanh toán)."],
        mongDoi:
          "Bảng vẫn hiện đủ cột kèm câu ⚠ nói rõ hỏi agent nào, công cụ gì, trả về lý do gì. KHÔNG được giấu bảng đi, cũng không được điền 0 cho đủ.",
      },
      {
        ma: "G-26",
        ten: "Số ngày ảnh hưởng lấy cái nặng nhất, không cộng dồn",
        goc: "thuan",
        buoc: ["Đọc dòng tổng kết dưới Bảng 10.", "So với các dòng trong bảng."],
        mongDoi:
          "Ghi rõ “lấy theo vấn đề NẶNG NHẤT, KHÔNG cộng dồn các dòng” kèm lý do (các vấn đề chặn song song cùng một mốc). Nếu thấy nó cộng tổng lại thì ghi Không đạt.",
      },
      {
        ma: "G-27",
        ten: "Tải file — DOCX, Markdown, phụ lục nguồn",
        goc: "thuan",
        buoc: ["Bấm Tải DOCX.", "Bấm Tải Markdown.", "Bấm Tải phụ lục nguồn."],
        mongDoi:
          "Cả ba tải về được, mở lên đúng nội dung đang thấy trên màn. Phụ lục nguồn liệt kê được các lượt gọi đã sinh ra số trong báo cáo.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "ISS",
    ten: "Issue gom từ bốn agent",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Main không sở hữu dữ liệu nghiệp vụ nên KHÔNG có tab máy sinh — nó gom issue của bốn con rồi xếp lại thành 8 nhóm chủ đề + 📁 Khác. Chỗ đáng soi: nó có cưỡng lại được cám dỗ chấm điểm không.",
    bai: [
      {
        ma: "G-10",
        ten: "Không có tab máy sinh — có tab Phân loại lại",
        goc: "thuan",
        buoc: ["Mở màn Cảnh báo.", "Đọc hết hàng tab trên cùng."],
        mongDoi:
          "Có tab ⭐ Cần anh xem, 8 nhóm chủ đề (COD · Đường găng · Hợp đồng·phiếu giá · Thiết kế · Mặt bằng · Hồ sơ pháp lý · Nhà thầu & nhân lực · Thiết bị & vật tư dài hạn) + 📁 Khác, và tab 🔁 Phân loại lại. KHÔNG có tab máy sinh — đúng thiết kế.",
      },
      {
        ma: "G-11",
        ten: "★ Cần anh xem — có lý do, KHÔNG có điểm số",
        goc: "thuan",
        buoc: ["Mở tab ⭐ Cần anh xem.", "Đọc từng thẻ.", "Đi tìm xem có con số kiểu “87/100” hay thứ hạng bằng số ở đâu không."],
        mongDoi:
          "Mỗi việc kèm một câu 🤖 lý do vì sao cần xem. KHÔNG có điểm số, không có xếp hạng bằng số. Số THẬT trên thẻ (số ngày ảnh hưởng, tiền) là số agent chủ đã tính và có nguồn kèm.",
      },
      {
        ma: "G-28",
        ten: "Ô thiếu số ghi “—”, không ghi 0",
        goc: "bien",
        buoc: ["Tìm một thẻ có dòng “Số ngày ảnh hưởng: —” hoặc “Tiền ảnh hưởng: —”.", "Đọc câu giải thích dưới thẻ."],
        mongDoi:
          "Ghi “—” kèm câu nói rõ agent chủ chưa trả về con số có nguồn, và Main không ước số. Thấy số 0 ở chỗ đáng lẽ phải có số là lỗi — ghi ngay.",
      },
      {
        ma: "G-29",
        ten: "★ Không có nút đóng issue tuỳ tiện",
        goc: "quyen",
        buoc: ["Soi khắp màn Cảnh báo và mọi thẻ xem có nút nào tên “Đóng issue” không.", "Đọc dòng Điều kiện đóng trên một thẻ bất kỳ."],
        mongDoi:
          "KHÔNG có nút đóng issue. Mỗi thẻ ghi rõ điều kiện đóng và việc đóng thuộc về agent chủ của thẻ đó.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "HE",
    ten: "Điều khiển cả hệ",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Hai khối Main giữ hộ cả hệ, cùng ở Cài đặt → 🔌 Kết nối: Danh bạ agent (có nút Chạy/Dừng từng agent) · Ai được gọi ai ngay dưới (26/09 — màn Khai một lần đã gỡ vì 0 lần lưu). Luật xuyên suốt: SỐ AGENT KHÔNG GẮN CỨNG TRONG CODE — thêm bớt một con là sửa cấu hình, không sửa code.",
    bai: [
      {
        ma: "G-15",
        ten: "Khai một lần — dùng chung ĐÃ GỠ 26/09: đường cũ không 404",
        goc: "thuan",
        buoc: ["Gõ thẳng vào thanh địa chỉ: 127.0.0.1:3010/cau-hinh-chung", "Làm lại với /ma-tran-goi, /quan-sat, /bao-cao-sang, /bao-cao-thang."],
        mongDoi:
          "Không trang nào ra 404. /cau-hinh-chung và /ma-tran-goi về Cài đặt → 🔌 Kết nối; /quan-sat và /nhat-ky hiện một dòng dẫn sang Agent quan sát; /bao-cao-sang và /bao-cao-thang về Báo cáo đúng tab. Menu trái không còn mục Khai một lần, Ai được gọi ai, Quan sát các agent.",
      },
      {
        ma: "G-16",
        ten: "★ Ai được gọi ai — bảng vuông co giãn theo danh bạ",
        goc: "thuan",
        buoc: ["Mở Cài đặt → 🔌 Kết nối, kéo xuống khối Ai được gọi ai.", "Đếm số hàng và số cột.", "So với số agent đang bật ở Danh bạ agent ngay trên.", "Nhìn một ô chưa có lượt gọi nào."],
        mongDoi:
          "Bảng vuông đúng bằng số agent trong Danh bạ (đo 07/09: 5×5). Ô có lượt hiện số thật kèm số lỗi và giờ gần nhất; ô chưa có ghi “chưa có lượt nào”, KHÔNG ghi 0. Đường chéo ghi “chính nó — không tự gọi”.",
      },
      {
        ma: "G-31",
        ten: "Ma trận có hiệu lực thật, không phải bảng trang trí",
        goc: "quyen",
        buoc: ["Tắt một ô (cấm một chiều gọi) rồi lưu.", "Bấm nút “thử” ở đúng ô vừa cấm."],
        mongDoi: "Lời gọi bị từ chối kèm lý do nói rõ bị cấm ở ma trận — không phải lỗi mạng, không phải im lặng.",
      },
      {
        ma: "G-32",
        ten: "★ Danh bạ agent — nút Chạy / Dừng từng agent",
        goc: "thuan",
        buoc: [
          "Mở Cài đặt Main Agent → 🔌 Kết nối → Danh bạ agent.",
          "Nhìn cột CHẠY APP ở cuối mỗi dòng.",
          "Bấm Dừng ở dòng Agent Hợp đồng, chờ vài giây.",
          "Bấm Chạy lại chính dòng đó, chờ 30–60 giây cho lần biên dịch đầu.",
        ],
        mongDoi:
          "Con đang chạy hiện “đang chạy · <số cổng>” kèm nút Dừng; con chưa chạy hiện “chưa chạy” kèm nút Chạy. Bấm Dừng thì cổng đó tắt thật (mở 127.0.0.1:3012 không vào được nữa), bấm Chạy thì nó sống lại. Mỗi lần bấm có một dòng nói kết quả bằng tiếng Việt.",
      },
      {
        ma: "G-33",
        ten: "Hai chữ “bật” tách rời — ô tick Bật khác nút Chạy",
        goc: "quyen",
        buoc: [
          "Đọc hộp giải thích “Hai chữ bật khác nhau, đừng lẫn” ở đầu bảng Danh bạ.",
          "Sửa cột Địa chỉ của một dòng thành một tên miền (ví dụ https://base.scigroup.vn), Lưu danh bạ.",
          "Nhìn lại cột CHẠY APP của chính dòng đó.",
        ],
        mongDoi:
          "Ô tick Bật (“kể từ giờ hỏi con này”) vẫn dùng được bình thường. Cột CHẠY APP chuyển sang “không bật hộ được” kèm lý do rê chuột đọc được — vì Main không được phép khởi động tiến trình trên máy người khác. Nhớ sửa địa chỉ về http://127.0.0.1:<cổng> và Lưu lại sau khi test.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  {
    ma: "LOIC",
    ten: "Bốn màn lõi dùng chung",
    nhom: "NHÓM G · MAIN AGENT",
    dan: "Ba màn có chip LÕI trong menu: Việc của tôi · Issue · Skill AI của tôi (nhật ký hỏi nhau nay ở Agent quan sát). Cùng một bộ code chạy ở cả 5 agent, nên bài ở đây soi chỗ Main KHÁC: nó bày toàn cảnh chứ không lọc theo một nghiệp vụ nào.",
    bai: [
      {
        ma: "G-34",
        ten: "Việc của tôi — Base lỗi vẫn không trắng trang",
        goc: "bien",
        buoc: ["Mở Việc của tôi.", "Đọc dải báo lỗi (nếu có) ở đầu bảng."],
        mongDoi:
          "Trang vẫn mở được. Chưa nhập khoá Base thì hiện dải nói rõ thiếu khoá nào và vào đâu để nhập — bằng tiếng Việt, không phải chữ Anh, không trắng trang.",
      },
      {
        ma: "G-35",
        ten: "Việc AI soạn chờ giao — phải bấm Giao ngay mới thành việc",
        goc: "quyen",
        buoc: ["Ở bảng CÔNG VIỆC TÔI GIAO, tìm các dòng ✎ “AI soạn…”.", "Nhìn hai nút trên mỗi dòng."],
        mongDoi:
          "Mỗi dòng ghi rõ AI soạn từ thẻ nào, và có đúng hai nút Giao ngay / Bỏ. AI không tự giao việc cho ai — người bấm mới thành việc.",
      },
      {
        ma: "G-36",
        ten: "Skill chỉ chạy khi gọi đích danh",
        goc: "quyen",
        buoc: ["Mở Skill AI của tôi, đếm số skill.", "Mở khung chat, hỏi một câu bình thường không gõ lệnh nào."],
        mongDoi:
          "Bảng skill ghi rõ phạm vi từng skill (riêng agent này / chung — 5 agent). Hỏi không gõ /tên-skill thì KHÔNG skill nào chiếm câu hỏi.",
      },
      {
        ma: "G-37",
        ten: "Skill hệ thống không xoá được",
        goc: "quyen",
        buoc: ["Tìm một skill có nhãn “hệ thống — không xoá được”.", "Xem hàng nút của dòng đó."],
        mongDoi: "Dòng đó KHÔNG có nút Xoá, chỉ có Chạy / Xem / tải .skill. Skill do người tự nạp thì vẫn xoá được.",
      },
      {
        ma: "G-38",
        ten: "Cài đặt Main Agent — từ điển ngữ cảnh và 8 tab",
        goc: "thuan",
        buoc: ["Mở Cài đặt Main Agent.", "Nhìn ô trên cùng.", "Đếm số tab."],
        mongDoi:
          "Trên cùng là ô “Sơ đồ tổ chức và dự án — từ điển ngữ cảnh dùng chung” kèm nhãn ghi đang có bao nhiêu ký tự. Dưới là đúng 8 tab, từ 1 · Kết nối Base tới 8 · Tài khoản của tôi.",
      },
    ],
  },
];
