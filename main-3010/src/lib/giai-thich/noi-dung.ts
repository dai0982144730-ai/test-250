// ============================================================
// TỪ ĐIỂN GIẢI THÍCH — nội dung hướng dẫn cho từng CHỮ trên màn.
// Mr. Đại chốt cách viết 08/09: khuôn 4 PHẦN, dành cho người LẦN ĐẦU dùng —
// mục đích "giúp người dùng sử dụng được phần mềm và hiểu ý nghĩa từng thứ,
// tránh đoán mò dựa vào chữ thể hiện trên ứng dụng":
//   laGi    — đây là gì (giải nghĩa cả từ chuyên môn: COD, S-Curve, WBS…)
//   tuDau   — số/chữ ở đây máy lấy từ đâu (để người dùng tin số)
//   cachDoc — nhìn thế nào là tốt, thế nào là xấu
//   nenLam  — bấm gì tiếp, sang màn nào
// File THUẦN (luật 10) — client import trực tiếp. Khoá = ĐÚNG chữ trên màn.
// ============================================================

export interface MucGiaiThich {
  laGi: string;
  tuDau: string;
  cachDoc: string;
  nenLam: string;
}

export const TU_DIEN_GIAI_THICH: Record<string, MucGiaiThich> = {
  // ────────── MENU TRÁI ──────────
  "Việc của tôi": {
    laGi: "Việc của chính bạn ở agent Công việc (nơi công ty giao và theo dõi việc), xem ngay trong Main — cộng việc AI soạn sẵn chờ bạn duyệt giao.",
    tuDau: "Danh sách đọc thẳng sổ việc của agent Công việc mỗi lần mở màn, mọi dự án. Ba nút cùng định nghĩa với ba nút lọc bên đó.",
    cachDoc: "Việc tôi giao = việc bạn giao tay · Việc tôi nhận = việc giao đích danh bạn · Việc cần phối hợp = phần phối hợp chưa xong của bạn. Hạn đỏ kèm «quá hạn N ngày» là đã trễ.",
    nenLam: "Bấm một việc để mở nó ở agent Công việc (báo xong, bình luận làm ở đó). Có việc AI soạn sẵn thì chọn người nhận rồi bấm Gửi, không cần thì bấm Bỏ.",
  },
  "🤖 Việc AI soạn chờ duyệt": {
    laGi: "Việc trợ lý AI của Main soạn sẵn (từ issue hoặc từ câu bạn nói trong chat) — CHƯA giao cho ai, chờ bạn duyệt.",
    tuDau: "Tên và mô tả do AI viết (có dấu 🤖). Người nhận, hạn, dự án do bạn chọn.",
    cachDoc: "Mỗi dòng một việc: chọn người hoặc đơn vị nhận ở agent Công việc, sửa hạn nếu cần. Nút Gửi mờ khi chưa chọn người nhận hoặc dự án.",
    nenLam: "Bấm Gửi là thành việc thật ở agent Công việc, đứng tên bạn là người duyệt và giao. Việc không cần thì bấm Bỏ.",
  },
  "Tổng quan": {
    laGi: "Bức tranh chung của cả dự án trên một màn: tiến độ %, ngày về đích, cảnh báo, mốc quan trọng — dành cho lúc cần nắm nhanh tình hình.",
    tuDau: "Mọi số trên màn đều máy tính từ báo cáo tuần/ngày nhà thầu nộp, không ai gõ tay.",
    cachDoc: "Nhìn 3 hộp trên cùng trước: % đã làm (chỉ nói khối lượng), COD dự báo chậm/sớm bao nhiêu NGÀY so với Tiến độ mục tiêu và so với Baseline, bao nhiêu cảnh báo đỏ. Ba số đó tốt thì dự án đang ổn.",
    nenLam: "Thấy số nào xấu thì bấm thẳng vào khối tương ứng bên dưới để xem nguyên nhân, không cần đi tìm.",
  },
  "Hồ sơ dự án": {
    laGi: "Cây thư mục hồ sơ của dự án trên kho chung (văn bản, bản vẽ, biên bản…) — xem và mở file gốc ngay trong app, không phải mở Drive tìm.",
    tuDau: "Đọc thẳng từ kho lưu trữ chung của Ban, đúng cấu trúc thư mục đã thống nhất.",
    cachDoc: "Thư mục xếp theo loại hồ sơ. File nào cũng mở được bản gốc để đọc nguyên văn.",
    nenLam: "Cần tìm một văn bản: vào đúng nhánh thư mục theo loại, hoặc dùng ô tìm kiếm nếu nhớ tên.",
  },
  "Nhà thầu": {
    laGi: "Danh sách các nhà thầu trên dự án và phần việc từng nhà đang giữ.",
    tuDau: "Gom từ bảng tiến độ: dòng việc nào gắn nhà thầu nào thì tính cho nhà đó.",
    cachDoc: "Mỗi nhà thầu thấy được: giữ bao nhiêu hạng mục, tiến độ chung ra sao, có dính cảnh báo không.",
    nenLam: "Trước khi họp với một nhà thầu, mở trang của họ để nắm sẵn con số — họp có căn cứ, không cãi chay.",
  },
  "Hình ảnh": {
    laGi: "Kho ảnh hiện trường, gom theo từng hạng mục WBS — nhìn bằng mắt một hạng mục ngoài thực địa đang đến đâu.",
    tuDau: "Ảnh nhà thầu và cán bộ hiện trường tải lên kèm báo cáo, máy xếp vào đúng hạng mục.",
    cachDoc: "So ảnh các đợt của cùng một hạng mục để thấy chuyển biến thật — ảnh không «vẽ» được như số.",
    nenLam: "Nghi ngờ một hạng mục báo % đẹp bất thường: mở ảnh hạng mục đó đối chứng.",
  },
  "Skill AI của tôi": {
    laGi: "Những câu lệnh AI bạn hay dùng, lưu thành nút bấm — ví dụ «phân tích các việc chậm tuần này» — khỏi phải gõ lại mỗi lần.",
    tuDau: "Do chính bạn tạo và lưu; mỗi người một bộ riêng.",
    cachDoc: "Kết quả AI trả về luôn gắn 🤖 và dẫn nguồn số liệu để kiểm chứng được.",
    nenLam: "Câu hỏi nào bạn thấy mình gõ đến lần thứ hai thì lưu thành skill luôn.",
  },
  "Cài đặt": {
    laGi: "Nơi khai MỘT LẦN các con số và quy tắc phần mềm dùng: ngưỡng cảnh báo, nguồn dữ liệu, danh sách người dùng.",
    tuDau: "Giá trị ở đây là thứ máy đọc thật khi tính toán — sửa là đổi thật kết quả, không phải trang trí.",
    cachDoc: "Mỗi lần sửa đều có vết: ai sửa, lúc nào, từ số nào sang số nào — xem lại được.",
    nenLam: "Chỉ sửa khi hiểu con số đó dùng vào đâu; sửa xong xem lại màn liên quan để thấy tác dụng.",
  },

  // ────────── BA HỘP KPI ĐẦU TRANG TỔNG QUAN ──────────
  "Tiến độ": {
    laGi: "Hai con số quan trọng nhất: %TT (số to) là khối lượng ĐÃ LÀM thực tế; %KH (số nhỏ sau dấu /) là mức LẼ RA phải đạt theo Baseline — cả hai tại NGÀY CẮT dữ liệu (ngày báo cáo mới nhất).",
    tuDau: "Cùng một phép tính với S-Curve: CHỈ TÍNH VIỆC NỐI TỚI MỐC COD, trọng số theo thời lượng từng việc (% dòng nhóm trên Gantt là «toàn bộ việc» — tập rộng hơn nên số khác). %TT = BC tuần mới nhất + BC ngày sau đó; %KH = đường Baseline tại ngày cắt.",
    cachDoc: "Hai số % chỉ nói KHỐI LƯỢNG đã làm — không dùng để nói nhanh chậm (luật 35). Nhanh chậm xem hai thẻ COD bên cạnh, tính bằng ngày.",
    nenLam: "Muốn biết hạng mục nào kéo lùi COD thì xem khối «Hạng mục đường găng» bên dưới.",
  },

  // ────────── BỐN KHỐI DƯỚI TRANG TỔNG QUAN ──────────
  "S-Curve — bốn đường": {
    laGi: "Đồ thị hình chữ S quen thuộc của dân dự án: cộng dồn % hoàn thành theo thời gian. Có 4 đường: Tiến độ mục tiêu · Baseline (kế hoạch duyệt) · Thực tế · Dự báo (nét đứt — nếu giữ đà hiện tại).",
    tuDau: "Ba đường đầu từ kế hoạch và báo cáo tuần; đường Dự báo máy kéo dài từ tốc độ thực tế gần đây.",
    cachDoc: "Hai đường cho thấy hình dáng khối lượng theo thời gian. Mức chậm đọc bằng NGÀY: rê chuột lên đường Dự báo — «= ±N ngày» so với đường Mục tiêu; điểm đường Dự báo chạm 100% chính là ngày COD dự tính.",
    nenLam: "Chỉ cần liếc hình dáng: hai đường bám sát nhau là ổn; hở rộng dần là phải hành động.",
  },
  "Hạng mục đường găng — tự làm COD chậm bao nhiêu ngày": {
    laGi: "Các hạng mục còn việc nằm trên ĐƯỜNG GĂNG tới mốc COD. Dòng trên bảng tách số ngày COD chậm so với Tiến độ mục tiêu thành hai phần: phần do Baseline đã ký muộn hơn Mục tiêu và phần do thực hiện chậm so với Baseline.",
    tuDau: "Máy chạy lại đúng bộ dự báo ra COD: giả sử các việc của RIÊNG hạng mục này làm đúng Baseline (bắt đầu khi việc trước cho phép, đúng thời lượng Baseline) thì COD dự báo sớm lên bao nhiêu ngày — chỉ phần do chính hạng mục gây ra, không tính trễ nhận từ việc phía trước. Phần do thời tiết (mưa, gió cẩu lắp) ghi riêng.",
    cachDoc: "Bảng sắp chậm NHIỀU NHẤT LÊN ĐẦU. «0 ngày — chậm do việc phía trước đẩy sang» = hạng mục không tự làm chậm, chỉ nhận trễ. Không cộng dồn giữa các hạng mục: các chuỗi chạy song song.",
    nenLam: "Họp điều độ thì đi từ dòng 1 xuống. Bấm tên hạng mục để xem chi tiết và ảnh hiện trường.",
  },

  // ────────── CÁC KHỐI Ở CÁC TRANG KHÁC (phủ toàn app 08/09) ──────────
  "Tuần của tôi": {
    laGi: "Tóm tắt tuần làm việc của riêng bạn: việc đến hạn, việc được giao mới, việc bạn đang giữ còn dở.",
    tuDau: "Lọc từ bảng tiến độ chung và sổ giao việc theo tên đăng nhập của bạn.",
    cachDoc: "Nhóm theo ngày đến hạn — nhóm trên cùng gấp nhất.",
    nenLam: "Xử theo thứ tự từ trên xuống; việc nào xong thì cập nhật để khỏi bị nhắc lại.",
  },
  "Việc cần làm chưa xong, nhóm theo ngày đến hạn — VIEC-CUA-TOI-v2.0 mục 4.5": {
    laGi: "Danh sách việc của bạn còn dở, xếp nhóm theo hạn: quá hạn → hôm nay → tuần này → xa hơn.",
    tuDau: "Máy lọc từ bảng tiến độ và sổ giao việc, đối chiếu hạn với ngày hôm nay.",
    cachDoc: "Nhóm «quá hạn» là nợ — càng để lâu càng khó gỡ; việc găng có đánh dấu riêng.",
    nenLam: "Dọn nhóm quá hạn trước; việc không còn đúng thực tế thì báo lại người giao.",
  },
  "Người dùng & phân quyền": {
    laGi: "Danh sách tài khoản được vào app này và vai trò từng người (xem / sửa / quản trị).",
    tuDau: "Sổ người dùng CỤC BỘ của app — đăng nhập chung cả hệ chỉ chứng minh bạn là ai, còn QUYỀN do sổ này cấp.",
    cachDoc: "Người chưa có trong sổ thì dù đăng nhập được hệ vẫn không vào được app này.",
    nenLam: "Thêm người mới thì cấp vai trò thấp nhất đủ dùng; người nghỉ thì khoá.",
  },
  "🤖 Kết nối AI": {
    laGi: "Chọn cách phần mềm chạy các phân tích AI: qua gói Claude đã đăng nhập trên máy, hoặc qua khoá API.",
    tuDau: "Cấu hình lưu tại máy chủ; khoá API không hiện lại sau khi lưu.",
    cachDoc: "Trạng thái «đã nối» = các nút AI trong app chạy được; chưa nối thì các nút đó sẽ báo thiếu kết nối.",
    nenLam: "Chỉ người quản trị thiết lập; đổi xong bấm thử một nút AI để kiểm.",
  },
  "Skill đang có": {
    laGi: "Danh sách các skill (câu lệnh AI đóng gói) bạn đã lưu — mỗi cái một nút chạy.",
    tuDau: "Do bạn tạo hoặc nạp từ file .skill; mỗi người một bộ riêng.",
    cachDoc: "Tên + mô tả cho biết skill làm gì; bấm là chạy với dữ liệu dự án đang mở.",
    nenLam: "Skill lỗi thời thì sửa hoặc xoá — giữ danh sách gọn để tìm nhanh.",
  },
  "Nạp skill từ file .skill": {
    laGi: "Nạp skill từ file .skill/.zip do người khác chia sẻ — cách nhân bản kinh nghiệm giữa các thành viên.",
    tuDau: "File phải có SKILL.md khai tên + mô tả; tối đa 20 MB; cùng tên thì ghi đè.",
    cachDoc: "Nạp xong skill hiện ngay trong «Skill đang có».",
    nenLam: "Chỉ nạp file từ người trong Ban; nạp xong chạy thử một lần để kiểm.",
  },
  "Tự soạn / nhờ AI viết": {
    laGi: "Tạo skill mới: tự gõ câu lệnh, hoặc dán ý tưởng thô rồi nhờ AI sắp lại thành skill chuẩn.",
    tuDau: "AI chỉ SOẠN GIÚP — bản cuối bạn xem rồi mới lưu, không tự lưu.",
    cachDoc: "Skill tốt = nói rõ muốn phân tích gì, phạm vi nào, kết quả trình bày ra sao.",
    nenLam: "Câu hỏi nào bạn gõ đến lần thứ hai thì đóng thành skill luôn.",
  },
  "📍 Toạ độ công trường — mỗi dự án một toạ độ, để lấy dự báo thời tiết": {
    laGi: "Toạ độ (kinh độ, vĩ độ) của công trường — mọi dự báo thời tiết và gió trong app lấy theo điểm này.",
    tuDau: "Khai một lần cho mỗi dự án.",
    cachDoc: "Toạ độ sai thì dự báo là của chỗ khác — cẩn thận dấu phẩy, dấu chấm.",
    nenLam: "Lấy toạ độ từ Google Maps của đúng vị trí công trường rồi dán vào.",
  },

  // ────────── RIÊNG AGENT MAIN ──────────
  "Cảnh báo": {
    laGi: "Màn cảnh báo (issue) của Main — nhìn được thẻ của CẢ 5 agent trong hệ, nhưng chỉ xử được thẻ của chính Main.",
    tuDau: "Gom từ sổ issue 5 agent con qua cổng MCP + sổ riêng của Main. Lọc theo chủ đề (chip) · agent · mức độ quan trọng.",
    cachDoc: "Thẻ DX- là đề xuất chờ Main Duyệt/Bác. Thẻ của agent khác chỉ xem — xử thì sang đúng agent đó.",
    nenLam: "Duyệt/Bác các thẻ DX-; thẻ của Main xong thì Ẩn, sai thì Xoá kèm lý do.",
  },
  "Bảng điều hành": {
    laGi: "Màn chính của Main: mỗi dự án một khối tóm tắt — tiến độ, COD, issue — gom từ các agent con.",
    tuDau: "Hỏi agent tiến độ và các con khác qua cổng MCP; khối nào chưa lấy được thì nói thẳng «Chưa lấy được».",
    cachDoc: "Câu chữ trong khối là code ghép từ số thật; chỗ nào có 🤖 mới là lời AI.",
    nenLam: "Bấm một dự án để xem chi tiết; muốn thêm/bớt dự án thì vào Cài đặt Main.",
  },
  "Báo cáo": {
    laGi: "Hai loại báo cáo Main soạn cho lãnh đạo, mỗi loại một tab: SÁNG — bản tin đầu ngày (đêm qua có gì, hôm nay để mắt gì); THÁNG — bản nháp báo cáo tháng của BQLDA.",
    tuDau: "Máy gom số từ các agent con qua cổng MCP; phần lời AI soạn có gắn 🤖, người duyệt rồi mới gửi.",
    cachDoc: "Tab Sáng: đọc mục cần để mắt trước; luật động (vd «tuần này theo dõi sát nhà thầu TS») và nhịp định kỳ xem · thêm · xoá ngay trong tab này. Tab Tháng: soát số trước, lời sau.",
    nenLam: "Số sai thì sửa ở agent nguồn, không sửa tay trong báo cáo. Duyệt rồi gửi.",
  },
  "Ai được gọi ai": {
    laGi: "Ma trận quyền gọi giữa các agent: con nào được hỏi con nào. Nằm ở Cài đặt → 🔌 Kết nối, ngay dưới Danh bạ agent.",
    tuDau: "Khai ở đây; cổng MCP của Main tra bảng này trước mỗi lời gọi, gọi ngoài ma trận bị từ chối.",
    cachDoc: "Hàng = agent gọi, cột = agent được hỏi. Ô chỉ ghi cho/cấm — số lượt gọi thật xem ở Agent quan sát.",
    nenLam: "Mở thêm quyền khi có nhu cầu thật, đừng mở sẵn tất.",
  },
  "Agent tiến độ": {
    laGi: "Đường sang app agent tiến độ (mở tab mới) — theo dõi tiến độ thi công, S-Curve, cảnh báo.",
    tuDau: "Liên kết trong nhóm «Sang agent khác».",
    cachDoc: "Đăng nhập chung cả hệ — sang app kia không phải đăng nhập lại.",
    nenLam: "Việc thuộc tiến độ thì sang đó xử, Main chỉ nhìn tổng.",
  },
  "Agent Hợp đồng": {
    laGi: "Đường sang app agent Hợp đồng (mở tab mới) — soát dự thảo, phiếu giá, nghiệm thu.",
    tuDau: "Liên kết trong nhóm «Sang agent khác».",
    cachDoc: "Đăng nhập chung cả hệ — sang app kia không phải đăng nhập lại.",
    nenLam: "Việc thuộc hợp đồng thì sang đó xử.",
  },
  "Agent pháp lý": {
    laGi: "Đường sang app agent Pháp lý (mở tab mới) — hồ sơ cần có, lịch hạn, văn bản.",
    tuDau: "Liên kết trong nhóm «Sang agent khác».",
    cachDoc: "Đăng nhập chung cả hệ — sang app kia không phải đăng nhập lại.",
    nenLam: "Việc thuộc pháp lý thì sang đó xử.",
  },
  "Agent Công việc": {
    laGi: "Đường sang agent Công việc (mở tab mới) — sổ việc của công ty (từ báo cáo tuần và giao tay), cây việc và đường găng từng dự án.",
    tuDau: "Liên kết trong nhóm «Sang agent khác».",
    cachDoc: "Đăng nhập chung cả hệ — sang app kia không phải đăng nhập lại.",
    nenLam: "Việc thuộc giao việc của agent Công việc thì sang đó xử.",
  },
  // 26/09 (Mr. Đại chốt): thay màn "Nhật ký & sức khoẻ agent" đã bỏ
  "Agent quan sát": {
    laGi: "Đường sang Agent quan sát (mở tab mới) — nơi DUY NHẤT xem nhật ký các agent hỏi nhau và sức khoẻ từng agent.",
    tuDau: "Địa chỉ lấy từ Danh bạ agent (Cài đặt → 🔌 Kết nối), không gắn cứng.",
    cachDoc: "Agent quan sát chỉ ĐỌC: đọc sổ hỏi–đáp và sổ gác của các agent qua cổng MCP, không sửa gì.",
    nenLam: "Số liệu liên agent có gì lạ thì sang đó kiểm hai máy đã trao đổi gì.",
  },
  "Cài đặt Main Agent": {
    laGi: "Khai một lần cho Main: danh sách dự án trên Bảng điều hành, nhịp chạy, kết nối các agent, người dùng.",
    tuDau: "Giá trị máy đọc thật. Từ điển ngữ cảnh: phần dự án và sơ đồ tổ chức máy tự ghép, chỉ gõ hai ô A (công ty thành viên) và D (chỗ bổ sung) ở tab Quản lý dự án.",
    cachDoc: "Mỗi lần sửa có ghi vết.",
    nenLam: "Thêm dự án mới vào bảng ở tab đầu tiên.",
  },
  "Bản báo cáo của ngày": {
    laGi: "Bản tin sáng của ngày đang xem — đã soạn xong, chờ duyệt hoặc đã gửi.",
    tuDau: "Máy gom + AI soạn (có 🤖); trạng thái ghi ngay trên đầu.",
    cachDoc: "Chưa duyệt thì chưa ai nhận được — đừng tưởng đã gửi.",
    nenLam: "Đọc, sửa nếu cần, duyệt để gửi.",
  },
  "Bản nháp báo cáo tháng của BQLDA": {
    laGi: "Bản nháp báo cáo tháng đang soạn — máy gom số, AI viết lời, chờ người duyệt.",
    tuDau: "Số từ các agent con; lời 🤖 là AI.",
    cachDoc: "Số sai thì về agent nguồn sửa, không sửa tay ở đây.",
    nenLam: "Duyệt xong mới xuất gửi.",
  },
  "Kịch bản định kỳ": {
    laGi: "Các việc Main tự chạy theo lịch: soạn báo cáo sáng, kiểm sức khoẻ các con…",
    tuDau: "Nhịp khai ở Cài đặt; mỗi lần chạy ghi sổ.",
    cachDoc: "Lần chạy gần nhất lâu không nhảy = máy đang không chạy.",
    nenLam: "Thường không phải đụng.",
  },
  "Chữ sẽ gửi qua Telegram": {
    laGi: "Xem trước ĐÚNG đoạn chữ sẽ gửi vào nhóm Telegram — cái người nhận đọc được.",
    tuDau: "Sinh từ bản báo cáo đã duyệt.",
    cachDoc: "Đọc bằng mắt lần cuối trước khi gửi — gửi rồi không rút lại được.",
    nenLam: "Ưng thì bấm gửi.",
  },

  // ────────── VIẾT NỐT 09/09 (lệnh Mr. Đại — phủ các khối còn thiếu) ──────────
  "Kho Google Drive": {
    laGi: "Trạng thái kết nối tới kho hồ sơ chung trên Google Drive của cả hệ.",
    tuDau: "Máy kiểm tra kết nối thật với tài khoản đã khai.",
    cachDoc: "«Đã nối» = các màn đọc hồ sơ đang chạy qua kết nối này; đứt thì màn hồ sơ sẽ trống.",
    nenLam: "Chỉ người quản trị đụng; thấy màn hồ sơ trống thì vào đây kiểm trước.",
  },
  "Xếp lại ngay": {
    laGi: "Cho AI xếp lại chủ đề issue ngay bây giờ, không chờ lượt đêm 02:30. Lượt đêm tự chạy mỗi ngày, chỉ xếp issue mới hoặc chưa có chủ đề.",
    tuDau: "Đầu vào là issue thật gom từ các agent; phần xếp chủ đề là 🤖 AI làm.",
    cachDoc: "Chủ đề AI xếp có thể sai — số và nguồn trên thẻ vẫn là của agent chủ.",
    nenLam: "Chỉ bấm khi vừa có đợt issue mới về và cần lọc theo chủ đề ngay; bình thường để lượt đêm làm.",
  },
  "Đầu báo cáo": {
    laGi: "Phần mở đầu của báo cáo tháng (bảng 1 · 2): thông tin chung và các con số tổng — khung cố định theo mẫu công ty.",
    tuDau: "Số gom từ các agent con; khung theo mẫu báo cáo tháng BQLDA đã chốt.",
    cachDoc: "Soát số ở đây trước — số sai thì các phần sau sai theo.",
    nenLam: "Số sai thì về agent nguồn sửa rồi tạo lại nháp, không sửa tay trong báo cáo.",
  },
  "⚠️ Chưa hỏi được": {
    laGi: "Danh sách các agent/câu mà lượt gom vừa rồi KHÔNG lấy được số — máy khai thẳng thay vì hiện số 0 giả.",
    tuDau: "Máy ghi khi cuộc gọi sang agent con lỗi hoặc quá hạn chờ.",
    cachDoc: "Số liệu màn này đang THIẾU phần đó — đọc các ô tổng phải nhớ trừ hao.",
    nenLam: "Mở app agent bị lỗi kiểm nó còn chạy không, rồi bấm gom lại.",
  },
  "Luật động": {
    laGi: "Lời dặn ngắn cho báo cáo sáng, ví dụ «tuần này theo dõi sát nhà thầu TS» hay «từ nay báo kỹ về Nậm săm 3A». Mọi luật xem và xoá được ngay đây, không có luật ẩn.",
    tuDau: "Câu bạn gõ (hoặc nhắn Main qua Telegram) được máy đọc bằng code, không dùng AI. Luật «tập trung / báo kỹ» khớp cả tên dự án; luật «bỏ» chỉ xét tiêu đề việc.",
    cachDoc: "Phạm vi «Một ngày» · «Tuần này» · «Không hạn» cho biết luật sống bao lâu; hết hạn thì tự rụng. «0 đang bật» là bình thường, không phải hỏng.",
    nenLam: "Bấm «Mở» để thêm hoặc xoá luật. Luật «bỏ …» loại việc khỏi báo cáo; «tập trung …» đẩy việc đó lên đầu.",
  },
  "Thư viện khối": {
    laGi: "21 khối có sẵn để ghép báo cáo sáng, chia ba tab: Tổng quát (Chủ tịch) · Ra quyết định (Giám đốc điều hành) · Đi sâu dự án (Giám đốc BQL dự án).",
    tuDau: "Số trong mỗi khối do code tính từ bốn agent (Tiến độ, Hợp đồng, Pháp lý, Công việc); chỉ khối kiểu «chữ 🤖» mang câu do AI viết.",
    cachDoc: "«1/5» trên tab = số khối đã có trong báo cáo / số khối của kệ. Rê chuột vào một khối để đọc «Để làm gì · Lấy ở đâu · Công thức».",
    nenLam: "Bấm «＋» hoặc kéo khối sang cột giữa để thêm; bấm tên khối để xem riêng khối đó trên màn điện thoại.",
  },
  "Báo cáo sáng của người này": {
    laGi: "Các khối sẽ gửi cho người này lúc 07:00, theo đúng thứ tự từ trên xuống. «Bộ mặc định» là bộ có sẵn của mẫu; «bộ riêng» là bộ đã chỉnh tay.",
    tuDau: "Lưu ngay mỗi thao tác, không có nút xác nhận.",
    cachDoc: "Kéo «⋮⋮» đổi thứ tự; «✕» bỏ khối; «Toàn công ty / Dự án tôi chọn» đổi phạm vi; số dòng giới hạn mỗi khối in bao nhiêu dòng.",
    nenLam: "Muốn quay lại như ban đầu thì bấm «Về bộ mặc định».",
  },
  "Màn hình điện thoại giả lập": {
    laGi: "Tin Telegram người này sẽ nhận, vẽ lại như trên điện thoại: chữ đậm, bảng đơn cách, emoji 🔴🟡🟢 và ảnh biểu đồ.",
    tuDau: "Cùng một hàm dựng với lúc gửi thật, nên thấy gì ở đây là Telegram nhận đúng như vậy.",
    cachDoc: "Telegram tối đa 4.096 ký tự mỗi tin; ảnh gửi thành một album. Bảng không tô màu được; màu chỉ bằng emoji.",
    nenLam: "Dùng hai nút trên thanh «Main Agent» để chuyển giữa cả báo cáo và riêng khối đang chọn.",
  },
  "Nút Cả báo cáo": {
    laGi: "Cho màn điện thoại hiện TOÀN BỘ báo cáo của người này, đúng như sẽ gửi.",
    tuDau: "Ghép từ mọi khối trong cột giữa.",
    cachDoc: "Nếu đang chọn một khối có trong báo cáo thì màn tự cuộn tới khối đó và nháy viền.",
    nenLam: "Bấm «Khối …» để quay lại xem riêng khối đã chọn.",
  },
  "Nút Khối đã chọn": {
    laGi: "Cho màn điện thoại chỉ hiện RIÊNG khối bạn vừa bấm tên (kể cả khối chưa có trong báo cáo, để xem thử trước khi thêm).",
    tuDau: "Dựng bằng cùng hàm với bản gửi thật, chỉ với một khối.",
    cachDoc: "Nút mờ nghĩa là chưa chọn khối nào.",
    nenLam: "Bấm tên một khối ở thư viện hoặc danh sách giữa; bấm «Cả báo cáo» để xem tất cả.",
  },
  "Nút Dựng lại": {
    laGi: "Hỏi lại các agent và dựng bản báo cáo của ngày đang chọn.",
    tuDau: "Máy hỏi bốn agent; AI viết câu hỏi quyết và câu tóm tắt (thường chưa tới 15 giây phần AI).",
    cachDoc: "Nút đếm giây khi đang dựng (thường 90–110 giây); đừng bấm lần hai.",
    nenLam: "Chỉ cần khi vừa sửa số ở agent khác; bình thường 06:30 máy tự dựng.",
  },
  "Nút Gửi": {
    laGi: "Mở menu gửi báo cáo sáng qua Telegram: gửi cho người chưa nhận, hoặc gửi lại cho cả người đã nhận.",
    tuDau: "Danh sách người nhận lấy ở tab ② Người nhận.",
    cachDoc: "Bấm một mục trong menu là chạy và đóng menu luôn, không có nút xác nhận.",
    nenLam: "Bình thường 07:00 máy tự gửi; chỉ cần khi vừa dựng lại bản sau khi sửa số.",
  },
  "Nút Gửi cho người chưa nhận": {
    laGi: "Gửi bản của ngày cho những người CHƯA nhận hôm nay, mỗi người theo mẫu của họ.",
    tuDau: "Danh sách người nhận lấy ở tab ② Người nhận.",
    cachDoc: "Người đã nhận bị bỏ qua để không gửi trùng lên lãnh đạo.",
    nenLam: "Muốn gửi lại cả người đã nhận thì dùng «Gửi lại cho cả N người» trong menu «Gửi».",
  },
  "Nút Gửi lại": {
    laGi: "Gửi lại bản của ngày cho CẢ người đã nhận (dùng sau khi dựng lại bản vì sửa số).",
    tuDau: "Cùng danh sách người nhận như «Gửi cho người chưa nhận».",
    cachDoc: "Nút mờ khi hôm nay chưa ai nhận bản.",
    nenLam: "Dựng lại trước, đọc bản mới trên màn điện thoại, rồi mới gửi lại.",
  },
  "Người nhận báo cáo sáng": {
    laGi: "Danh sách người sẽ nhận báo cáo sáng và mẫu của từng người (Tổng quát · Điều hành · Dự án · Không nhận).",
    tuDau: "Người lấy từ Cài đặt → Người dùng; Telegram do mỗi người tự nối.",
    cachDoc: "Chọn mẫu là lưu ngay. Người chưa nối Telegram vẫn chọn mẫu trước được, họ nhận từ khi nối.",
    nenLam: "«Xem · sửa khối» chỉnh bộ khối riêng; «Gửi thử cho tôi» gửi bản của người đó về Telegram của chính bạn.",
  },
  "Xem mẫu": {
    laGi: "Xem trước bộ khối mặc định của một mẫu (Tổng quát · Điều hành · Dự án), trước khi giao mẫu đó cho ai.",
    tuDau: "Dựng bằng cùng hàm với lúc gửi, trên số hôm nay.",
    cachDoc: "Mẫu «Dự án» xem như đã chọn mọi dự án; người thật chỉ thấy dự án được chọn cho họ.",
    nenLam: "Chọn mẫu cho từng người ở bảng bên dưới.",
  },

  // ────────── PHỤ ĐỀ 09/09 (làm tiếp — phủ các subtitle) ──────────
  ".skill/.zip — một thư mục gốc chứa SKILL.md (khai name: + description:), tối đa 20 MB. Cùng tên = ghi đè.": {
    laGi: "Điều kiện file skill hợp lệ khi nạp: một thư mục gốc, bên trong có file SKILL.md khai tên (name:) và mô tả (description:), gói lại thành .skill hoặc .zip dưới 20 MB.",
    tuDau: "Chuẩn đóng gói skill của hệ — máy kiểm khi nạp, thiếu khai báo thì báo ngay.",
    cachDoc: "Nạp skill trùng TÊN với skill đang có là GHI ĐÈ bản cũ — không hỏi lại.",
    nenLam: "Muốn giữ bản cũ thì đổi name: trong SKILL.md trước khi nạp.",
  },
  "Chọn cách hệ thống chạy phân tích AI (dự báo + cảnh báo) — gói Claude Pro/Max qua CLI hoặc API mô hình khác": {
    laGi: "Chọn nguồn AI cho các việc phân tích tự động: dùng gói Claude Pro/Max sẵn có của công ty (chạy qua CLI, không tốn thêm tiền theo lượt) hoặc điền khoá API của một mô hình khác.",
    tuDau: "Khai một lần ở đây; mọi bước AI của app này dùng chung lựa chọn đó.",
    cachDoc: "Chưa chọn gì thì các nút 🤖 sẽ báo «chưa kết nối AI» — không phải lỗi.",
    nenLam: "Có gói Claude thì chọn đường CLI cho rẻ; khoá API điền vào là lưu kín, không hiện lại.",
  },
  "Dán nội dung là xong — thiếu khai báo thì bấm nhờ AI sắp lại thành skill chuẩn, xem rồi mới lưu.": {
    laGi: "Cách nạp skill không cần đóng gói file: dán thẳng nội dung hướng dẫn vào ô, thiếu phần khai báo thì nhờ 🤖 AI sắp lại đúng khuôn skill.",
    tuDau: "Nội dung do bạn dán; phần AI sắp lại có hiện cho xem trước.",
    cachDoc: "Bản AI sắp CHƯA lưu ngay — bạn đọc lại rồi bấm lưu mới ăn.",
    nenLam: "Viết mẹo nghiệp vụ hay dùng thành skill ở đây để trợ lý AI làm theo nếp của bạn.",
  },
  "MỘT tài khoản duy nhất — hệ tự dựng cây SCI-AI-AGENT theo bản chốt CAU-TRUC-KHO-DU-LIEU": {
    laGi: "Cả 5 agent dùng chung MỘT tài khoản Google Drive; nối xong hệ tự dựng đúng cây thư mục SCI-AI-AGENT theo bản chốt cấu trúc kho.",
    tuDau: "Chốt thiết kế CAU-TRUC-KHO-DU-LIEU — một kho, mỗi agent một nhánh.",
    cachDoc: "Không phải mỗi app khai một tài khoản riêng — nối ở một chỗ là đủ cho cả hệ.",
    nenLam: "Chỉ người quản trị nối; đừng đổi tài khoản giữa chừng kẻo cây kho lệch đôi.",
  },
  "Tài khoản đăng nhập hệ thống + ma trận quyền theo loại tài khoản": {
    laGi: "Danh sách tài khoản đăng nhập của cả hệ và vai trò từng người — nơi thêm người, đổi vai trò.",
    tuDau: "Bản chốt phân quyền Section 9.1; đăng nhập dùng chung một khoá cho cả 5 app (SSO).",
    cachDoc: "Một người một dòng; quyền của họ tra theo bảng ma trận vai trò bên cạnh.",
    nenLam: "Thêm người mới hay đổi vai trò làm tại đây — có hiệu lực cho cả 5 app luôn.",
  },
  "Agent tắt hoặc chưa trả lời — ghi rõ ở đây, báo cáo VẪN GỬI (luật cứng 5)": {
    laGi: "Luật cứng số 5 của báo cáo sáng: một agent con tắt hay không trả lời thì báo cáo VẪN GỬI ĐÚNG GIỜ, phần thiếu ghi rõ tên agent thiếu — không hoãn, không bịa số bù.",
    tuDau: "Chốt của chủ dự án — báo cáo trễ còn tệ hơn báo cáo thiếu có khai.",
    cachDoc: "Người nhận đọc phần này để biết số sáng nay khuyết mảng nào.",
    nenLam: "Thấy agent nào hay nằm trong danh sách thiếu thì kiểm máy chạy app đó.",
  },
  "Bảng 1 · 2": {
    laGi: "Hai bảng mở đầu của mẫu báo cáo tháng: bảng 1 — đơn vị lập, nơi nhận, tên báo cáo, phạm vi; bảng 2 — kỳ báo cáo, từ ngày đến ngày, người lập, người ký.",
    tuDau: "Khung theo mẫu báo cáo tháng BQLDA đã chốt; máy tự điền từ dữ liệu kỳ.",
    cachDoc: "Đây là phần hành chính — soát cho đúng kỳ và đúng phạm vi dự án trước khi đọc phần số.",
    nenLam: "Ô nào còn «—» (người ký, nơi nhận) thì bổ sung ở phần khai chung.",
  },
  "Gộp cả 3 dự án vào một file (chốt Mr. Đại 30/08) · 6 mục · 11 bảng": {
    laGi: "Khuôn của bản nháp báo cáo tháng: CẢ 3 DỰ ÁN gộp vào MỘT file (chốt 30/08), thân bài đúng 6 mục với 11 bảng — tháng nào cũng cùng khuôn ấy.",
    tuDau: "Mẫu chốt của BQLDA; số trong bảng gom từ các agent con, mỗi ô truy được nguồn.",
    cachDoc: "Cùng khuôn mọi tháng nên so tháng này với tháng trước là so được ngay từng ô.",
    nenLam: "Đọc nháp theo đúng thứ tự 6 mục; sửa số thì về agent nguồn, sửa lời thì sửa tại nháp.",
  },
  "PLAN-MAIN-AGENT mục 7 · chạy tay được để nhìn thấy nó chạy thật": {
    laGi: "Các kịch bản Main tự chạy theo lịch (gom báo cáo sáng, nhắc kỳ…) — và kịch bản nào cũng có nút CHẠY TAY để bạn bấm xem nó chạy thật, không phải tin suông.",
    tuDau: "Khai theo PLAN-MAIN-AGENT mục 7; mỗi lần chạy có ghi vết.",
    cachDoc: "Cột lần chạy gần nhất cho biết kịch bản có đang sống không.",
    nenLam: "Mới cài đặt xong thì bấm chạy tay một lượt xem kết quả trước khi phó mặc cho lịch.",
  },
  "Đúng từng ký tự — xem trước được, không có gì ẩn": {
    laGi: "Cam kết của ô xem trước Telegram: chữ hiện ở đây là ĐÚNG TỪNG KÝ TỰ chữ sẽ đến nhóm — không có phần nào máy thêm bớt sau lưng bạn.",
    tuDau: "Code ghép chữ từ bản báo cáo đã duyệt rồi in nguyên ra đây.",
    cachDoc: "Duyệt bằng mắt ô này là đủ — không cần đoán «gửi đi nó có khác không».",
    nenLam: "Đọc lần cuối rồi hẵng gửi; gửi vào nhóm rồi là không rút lại được.",
  },
  // ────────── NÚT CHUNG Ở THANH TRÊN + MENU TÊN NGƯỜI (03/10 — Mr. Đại: mọi agent đều có Giải thích/Góp ý, Help vào menu tên người) ──────────
  "Giải thích": {
    laGi: "Nút bật/tắt chế độ giải thích. Bật lên rồi rê chuột (hoặc chạm trên điện thoại) vào chữ nào có viền chấm là hiện hộp chú giải đúng chữ đó — giống hộp bạn đang đọc.",
    tuDau: "Lời giải do người soạn phần mềm viết sẵn trong từ điển giải thích của app — không phải máy đoán lúc bạn bấm.",
    cachDoc: "Nút viền cam, chữ «đang bật» là chế độ đang chạy. Chữ có viền chấm xung quanh là chữ có lời giải.",
    nenLam: "Gặp chữ lạ thì bật lên, rê vào chữ đó; đọc xong bấm lần nữa để tắt cho đỡ rối mắt.",
  },
  "Góp ý": {
    laGi: "Lối vào trang Góp ý: nơi báo chỗ bất tiện, số liệu khó hiểu, lỗi, hoặc ý tưởng cho phần mềm tốt hơn — kèm ảnh chụp màn hình nếu có.",
    tuDau: "Mỗi góp ý được ghi vào sổ góp ý riêng của app này (thư mục data/gop-y). Mọi người đăng nhập đều đọc được.",
    cachDoc: "Mỗi góp ý có trạng thái: Mới → Đã tiếp nhận → Đã sửa, hoặc Không làm. Người quản trị trả lời ngay dưới góp ý.",
    nenLam: "Thấy gì chưa ổn là bấm vào đây, viết tên ngắn gọn và mô tả; dán ảnh bằng Ctrl+V. Hệ thống tự ghi kèm màn bạn đang mở.",
  },
  "Góp ý, phản ánh": {
    laGi: "Trang gửi và xem góp ý của mọi người dùng app này.",
    tuDau: "Sổ góp ý riêng của app (data/gop-y); ảnh dán vào được lưu cùng.",
    cachDoc: "Bộ lọc trạng thái phía trên danh sách đếm số góp ý theo từng trạng thái. Bấm một dòng để mở nội dung, ảnh và câu trả lời.",
    nenLam: "Viết góp ý ở khung trên cùng. Người quản trị (PM/Admin) chọn trạng thái là lưu ngay; người gửi xoá được góp ý của mình khi còn «Mới».",
  },
  "Tuần hiện tại": {
    laGi: "Ô cho biết hôm nay đang ở tuần nào: số tuần theo chuẩn ISO (thứ Hai đến Chủ nhật) và khoảng ngày của tuần đó. Cùng cách ghi ô tuần của agent Công việc.",
    tuDau: "Máy tính từ ngày hôm nay (giờ Việt Nam). Rê chuột vào ô để xem báo cáo tuần gần nhất của dự án đang mở và số liệu lấy đến ngày nào.",
    cachDoc: "Chỉ để xem, không bấm để đổi tuần. Tuần số liệu báo cáo có thể cũ hơn tuần hiện tại — khi đó nhà thầu chưa nộp báo cáo của tuần này.",
    nenLam: "Muốn biết số liệu đến ngày nào thì rê chuột vào ô, đừng suy từ số tuần.",
  },
  "Menu tên người": {
    laGi: "Menu của tài khoản đang đăng nhập: đổi giao diện 3D/2D, Skill AI của tôi, Agent quan sát, Cài đặt, Giới thiệu, đổi mật khẩu và đăng xuất — mỗi thứ chỉ nằm ở đây, không rải ra nơi khác.",
    tuDau: "Tên và email lấy từ sổ tài khoản của app. Mục nào tài khoản chưa đủ quyền (Skill AI, Cài đặt) hiện mờ kèm lý do khi rê chuột.",
    cachDoc: "Mục mờ nghĩa là có tồn tại nhưng tài khoản chưa được dùng — không phải lỗi.",
    nenLam: "Bấm tên mình ở góc trên bên phải để mở. Bấm ra ngoài hoặc nhấn Esc để đóng.",
  },
  "Giao diện 3D/2D": {
    laGi: "Hai bộ giao diện của app: 3D là bộ mới đang được tinh chỉnh dần, 2D là bộ cũ giữ nguyên để đối chiếu.",
    tuDau: "Lựa chọn được nhớ trên trình duyệt này (cookie), mặc định là 3D.",
    cachDoc: "Nút viền cam là bộ đang dùng. Hai bộ chỉ khác cách trình bày, số liệu giống hệt nhau.",
    nenLam: "Bấm nút kia để đổi ngay, không phải tải lại trang.",
  },
  "Giới thiệu": {
    laGi: "Bài giới thiệu phần mềm: làm gì, theo trình tự nào, từng màn dùng khi nào. Là tài liệu nguyên lý, không phải hướng dẫn bấm nút.",
    tuDau: "Do người soạn phần mềm viết, đi cùng bản đang chạy.",
    cachDoc: "Đọc theo mục lục bên trái, mỗi mục độc lập.",
    nenLam: "Người mới nên đọc một lần trước khi dùng; quên chỗ nào thì quay lại đúng mục đó.",
  },
  "Test": {
    laGi: "Kịch bản test: danh sách việc để tự kiểm tra hệ thống chạy đúng, chia theo chủ đề.",
    tuDau: "Nội dung kịch bản có sẵn trong app, chia theo chủ đề.",
    cachDoc: "Làm theo từng bước; kết quả khác mong đợi là vấn đề cần báo (qua nút Góp ý).",
    nenLam: "Dùng khi nghiệm thu một phần mới hoặc khi nghi ngờ số liệu.",
  },
  "Nối Telegram": {
    laGi: "Nối tài khoản của bạn với bot Telegram để hỏi trợ lý Main ngay trên điện thoại.",
    tuDau: "Nối bằng hộp thoại mở ra khi bấm mục này — làm theo từng bước trong hộp.",
    cachDoc: "Nối xong thì hỏi bot trên điện thoại như hỏi trợ lý Main trong app.",
    nenLam: "Vào mục này khi lần đầu dùng Telegram hoặc muốn nối lại.",
  },
  "Đổi mật khẩu": {
    laGi: "Đổi mật khẩu đăng nhập của chính tài khoản bạn.",
    tuDau: "Chỉ đổi được mật khẩu của chính tài khoản đang đăng nhập.",
    cachDoc: "Nếu mật khẩu mới chưa hợp lệ, hộp báo lý do bằng tiếng Việt ngay trong hộp.",
    nenLam: "Đổi ngay khi lần đầu đăng nhập bằng mật khẩu do quản trị cấp.",
  },
  "Đăng xuất": {
    laGi: "Thoát khỏi tài khoản trên trình duyệt này.",
    tuDau: "Xoá phiên đăng nhập của bạn; không xoá dữ liệu nào.",
    cachDoc: "Sau khi đăng xuất, mọi trang đều đưa về màn đăng nhập.",
    nenLam: "Nhớ đăng xuất khi dùng máy dùng chung.",
  },

  // ────────── BẢNG ĐIỀU HÀNH — các khối còn thiếu (bổ sung 03/10) ──────────
  "Chỗ hai agent nói khác nhau": {
    laGi: "Những chỗ hai agent con ghi nhận hai điều không khớp nhau về cùng một mã hạng mục (mã WBS trong bảng kế hoạch). Có hai loại: agent Công việc báo việc mang mã đó đã XONG mà Pháp lý nói hồ sơ của mã còn thiếu; hoặc Tiến độ ghi 100% mà Hợp đồng chưa có biên bản nghiệm thu. Main chỉ nêu ra kèm nguồn hai bên, không phân xử, không sửa số.",
    tuDau: "Khi mở màn, Main tự hỏi agent Công việc (việc theo mã WBS), Pháp lý (hồ sơ theo mã WBS), Hợp đồng (nghiệm thu theo mã WBS) và Tiến độ (đường găng, danh sách đầu việc); mỗi loại kiểm tối đa 20 mã, mã trên đường găng hỏi trước. Mỗi chỗ khác nhau là MỘT câu do code ghép từ số các agent trả — mã luôn kèm tên việc, tên hồ sơ lấy từ chính các agent; nhớ 10 phút, mọi lượt hỏi có vết trong sổ hỏi–đáp. Nút «Nguồn» mở câu trả lời của từng bên kèm tên sổ, mã nguồn. Nút 🤖 Giải thích thì AI đọc hai bên rồi viết vài câu, bạn bấm mới chạy.",
    cachDoc: "«0 chỗ khác nhau» là tốt. Chữ «găng» đỏ nghĩa là hạng mục nằm trên đường găng (chuỗi việc quyết định ngày về đích) nên nặng hơn. Dòng «Bên kia chưa tra được» là chưa kiểm được, không phải sạch cũng không phải mâu thuẫn.",
    nenLam: "Đọc câu của dòng đó; cần xem số liệu gốc thì bấm «Nguồn», muốn gợi ý nên tin bên nào thì bấm 🤖 Giải thích. Rồi hỏi người phụ trách của một trong hai bên. Bấm Soát lại để hỏi lại thật các agent.",
  },
  "Hồ sơ pháp lý đang thiếu": {
    laGi: "Danh sách hồ sơ pháp lý mà dự án bắt buộc phải có nhưng chưa có. Hàng đầu cho biết tổng số hồ sơ cần có và số đang thiếu; bên dưới là tối đa 5 hồ sơ, mỗi dòng ghi mã hồ sơ, tên, cơ quan đang giữ và số ngày quá hạn nếu có.",
    tuDau: "Agent pháp lý trả lời qua công cụ phaply.ho_so_thieu (Main gửi mã ngắn của dự án). Main không tự tính. Hồ sơ nào đã nằm trong một issue đang mở thì dòng chỉ còn mã issue, do code dò mã hồ sơ trong issue.",
    cachDoc: "Số «đang thiếu» bằng 0 là tốt, lớn hơn 0 hiện đỏ. «Quá hạn … ngày» đỏ là hồ sơ đã trễ hạn nộp hoặc nhận. Chưa tách được «chưa nộp» với «đã nộp chờ kết quả» vì Agent pháp lý chưa trả trạng thái nộp.",
    nenLam: "Bấm Giao việc ở dòng cần lo: form giao việc mở ra điền sẵn tên và lý do. Dòng mờ có mã issue thì bấm mã đó sang màn Cảnh báo. Cần xem đủ danh sách thì mở Agent pháp lý.",
  },
  "Tiền — hợp đồng BQL ký": {
    laGi: "Toàn cảnh tiền của các hợp đồng do Ban quản lý dự án (BQL) trực tiếp ký với nhà thầu. Bảy ô: Giá trị hợp đồng · Đã thanh toán · Đã nghiệm thu · Đã thi công chưa nghiệm thu · Phạt đang treo · Tạm ứng chưa thu hồi · Bảo lãnh sắp hết. Hợp đồng thầu phụ không bày ở đây.",
    tuDau: "Agent hợp đồng: Main hỏi danh sách hợp đồng bằng hopdong.gia_tri_luy_ke, rồi hỏi từng hợp đồng bằng hopdong.toan_canh (tối đa 10 hợp đồng). Main chỉ CỘNG khi mọi hợp đồng đều có số cùng đơn vị; thiếu một hợp đồng thì không cộng thiếu.",
    cachDoc: "«Chưa có số» không phải bằng 0, nghĩa là Agent hợp đồng chưa có hoặc chưa trả số đó, lý do ghi ngay dưới ô. Cả khối không tô màu vì chưa có ngưỡng đỏ/xanh nào được định nghĩa cho tiền.",
    nenLam: "Muốn xem số từng hợp đồng thì bấm «Mở Toàn cảnh ở Agent hợp đồng». Dòng nhỏ bên dưới liệt kê từng hợp đồng đã cộng vào tổng: mã, số hiệu, nhà thầu.",
  },
  "Tuần này khác tuần trước": {
    laGi: "So hai báo cáo tuần mới nhất của dự án, từng thước đo một: Tiến độ thực tế lũy kế (kèm số việc xong, số việc bắt đầu) · COD dự báo (COD là ngày đưa dự án vào vận hành thương mại) · Đầu việc mới lên đường găng · Cảnh báo (mới bao nhiêu, hết bao nhiêu) · TH kế hoạch tuần đã ký. Mỗi dòng ghi tuần trước → tuần này và mức đổi.",
    tuDau: "Agent tiến độ tính và trả qua công cụ tiendo.so_tuan; Main chỉ bày lại. Cần ít nhất 2 báo cáo tuần đã nạp, chưa đủ thì khối nói thẳng là chưa có số.",
    cachDoc: "Xanh là tốt lên (tiến độ tăng, COD sớm hơn, cảnh báo giảm), đỏ là xấu đi, xám là không đổi hoặc chưa tính được. Dấu «—» là Agent tiến độ chưa tính được, không phải bằng 0.",
    nenLam: "COD dự báo lùi (đỏ) thì xuống khối Hạng mục đường găng xem việc nào kéo lùi. Muốn xem đầy đủ thì mở màn Tuần trước ở Agent tiến độ.",
  },
  "Đang tắc ở bàn ai": {
    laGi: "Những việc đang đứng yên vì chờ một người hay một bộ phận xử lý. Gồm ba loại: việc quá hạn bên agent Công việc (hiện tối đa 6 dòng gồm tên việc, người phụ trách, số ngày quá hạn) · đề xuất/quy trình đang tắc · phiếu giá hợp đồng đang chờ duyệt.",
    tuDau: "Ba công cụ: base.viec_qua_han và base.quy_trinh_dang_tac (Agent Công việc), hopdong.phieu_gia_dang_cho (Agent hợp đồng). Main chỉ nêu lại, không tự tính. Việc đã nằm trong một issue đang mở thì dòng chỉ còn mã issue, do code dò tên việc.",
    cachDoc: "Số «việc quá hạn» bằng 0 là tốt, lớn hơn 0 hiện đỏ. «Chưa giao ai» nghĩa là việc không có người phụ trách. Dòng Đề xuất/quy trình hay Phiếu giá báo «không có dữ liệu» thường nghĩa là không có gì tắc.",
    nenLam: "Bấm Nhắc ở dòng việc: form giao việc mở ra điền sẵn tên việc và số ngày quá hạn để bạn giao người xử lý. Dòng mờ có mã issue thì bấm mã đó sang màn Cảnh báo.",
  },
  // ────────── NÚT SÁNG / TỐI (03/10 — như agent Pháp lý) ──────────
  "Sáng / tối": {
    laGi: "Nút ◐ đổi giao diện sáng ↔ tối cho cả trang. Mặc định là tối.",
    tuDau: "Lựa chọn được nhớ trên trình duyệt này; máy khác hoặc trình duyệt khác giữ lựa chọn riêng.",
    cachDoc: "Chỉ đổi màu nền và chữ, số liệu giữ nguyên. Khung chat trợ lý luôn tối; ở giao diện 3D thanh trên và menu trái cũng giữ tối.",
    nenLam: "Làm việc ngoài trời, nhiều ánh sáng hoặc cần in/chụp màn hình gửi đi thì chuyển sang sáng.",
  },
  // ────────── TRANG GÓP Ý (kiểm tra chéo 03/10, lỗi #7: nút mới chưa có Giải thích) ──────────
  "Lọc góp ý theo trạng thái": {
    laGi: "Hàng nút lọc danh sách góp ý: Tất cả · Mới · Đã tiếp nhận · Đã sửa · Không làm; số bên cạnh là bao nhiêu góp ý ở trạng thái đó.",
    tuDau: "Đếm từ sổ góp ý của chính agent này (mỗi agent một sổ riêng).",
    cachDoc: "Bấm một nút là lọc ngay; bấm Tất cả để xem lại toàn bộ.",
    nenLam: "Muốn biết góp ý của mình đã được sửa chưa thì lọc Đã sửa.",
  },
  "Dán ảnh chụp màn hình": {
    laGi: "Ô đính kèm ảnh cho góp ý: dán bằng Ctrl+V ở bất kỳ đâu trong khung, hoặc bấm để chọn tệp.",
    tuDau: "Ảnh lưu cùng góp ý trong sổ của agent này; chỉ nhận PNG, JPG, WEBP, GIF, tối đa 6 ảnh, mỗi ảnh 8 MB.",
    cachDoc: "Ảnh đã kèm hiện thành ô nhỏ bên dưới; bấm × trên ô để bỏ.",
    nenLam: "Chụp đúng chỗ thấy lỗi kèm cả thanh trên để người sửa biết màn nào.",
  },
  "Gửi góp ý": {
    laGi: "Nút gửi góp ý vào sổ của agent này.",
    tuDau: "Máy ghi tên người gửi, màn đang mở và giờ gửi; góp ý mới có trạng thái Mới.",
    cachDoc: "Nút mờ khi chưa có tên góp ý.",
    nenLam: "Viết tên ngắn gọn để sau còn tìm lại; mô tả rõ đang làm gì thì thấy gì.",
  },
  "Một góp ý": {
    laGi: "Một dòng trong danh sách góp ý: mã · tên · người gửi · trạng thái.",
    tuDau: "Lấy từ sổ góp ý của agent này.",
    cachDoc: "Bấm vào dòng để mở xem mô tả, ảnh và câu trả lời của quản trị.",
    nenLam: "Thấy góp ý trùng của người khác thì không cần gửi lại.",
  },
  "Trạng thái góp ý": {
    laGi: "Ô chọn trạng thái của góp ý: Mới · Đã tiếp nhận · Đã sửa · Không làm. Chỉ PM / Quản trị thấy ô này.",
    tuDau: "Quản trị chọn; người gửi mở trang Góp ý là thấy trạng thái mới (chưa có chuông báo).",
    cachDoc: "Chọn là lưu ngay, không cần bấm thêm.",
    nenLam: "Không làm thì nên viết thêm câu trả lời vì sao.",
  },
  "Gửi trả lời góp ý": {
    laGi: "Nút lưu câu trả lời của quản trị cho người góp ý.",
    tuDau: "Câu trả lời lưu cùng góp ý, kèm tên người trả lời và giờ trả lời.",
    cachDoc: "Chỉ hiện khi ô trả lời đã có thay đổi chưa lưu.",
    nenLam: "Trả lời ngắn: đã sửa ở đâu hoặc vì sao chưa làm.",
  },
  "Xoá góp ý": {
    laGi: "Nút xoá hẳn một góp ý cùng ảnh đính kèm.",
    tuDau: "Người gửi xoá được góp ý của mình khi còn Mới; quản trị xoá được mọi góp ý.",
    cachDoc: "Xoá rồi không khôi phục được.",
    nenLam: "Gửi nhầm thì xoá; góp ý đã xử lý thì để lại làm vết, đừng xoá.",
  },
};
