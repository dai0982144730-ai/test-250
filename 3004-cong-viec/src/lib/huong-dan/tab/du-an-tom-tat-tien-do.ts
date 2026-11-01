// Hướng dẫn bản 2 (tab) — bảng «Tóm tắt tiến độ dự án» ở menu Dự án (nạp bằng Excel, vẽ Gantt rút gọn). Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/TomTatTienDo.tsx · components/phong/DuAnPhong.tsx (icon ba gạch / dấu «!» đỏ) · app/api/phong/tom-tat-tien-do/route.ts (giới hạn tệp 8 MB)
// · lib/tom-tat-tien-do/luu.ts (ai nạp được) và thuan.ts (cột, lời nhắc, 3000 dòng). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Tóm tắt tiến độ dự án — bảng Gantt rút gọn (lấy từ agent Tiến độ, hoặc nạp bằng Excel)",
  ai: "Mọi người đăng nhập đều xem và bấm «Tải file». Nút «Nạp tiến độ» chỉ hiện với người của Ban quản lý dự án đó (với dự án SCI đầu tư là đơn vị đầu tiên khai ở Cài đặt, Dự án; với dự án loại khác là đơn vị gắn với dự án). Ban lãnh đạo và Quản trị không có quyền nạp: không phải người của Ban thì nút ẩn.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Bảng này là gì?",
          doan: [
            "«Tóm tắt tiến độ dự án» là bảng Gantt rút gọn để NHÌN BẰNG MẮT toàn dự án một lượt: bên trái là danh sách việc theo mã WBS (cấp 1, cấp 2…), bên phải là các thanh ngày trên trục thời gian. Bảng vẽ từ một tệp Excel sáu cột do Ban quản lý dự án nạp: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc.",
            "Bảng có HAI kiểu. ① Dự án đã có Baseline được duyệt bên agent Tiến độ: bảng LẤY THẲNG từ agent Tiến độ — chính là Gantt Baseline bên đó ở nút «C3», có thêm thực hiện, dự báo, ba vạch COD; nút «Nạp tiến độ» ẩn (xem tab ③). ② Dự án chưa có Baseline bên agent Tiến độ: bảng NHÁP nạp bằng Excel như dưới đây.",
            "Bảng nháp nạp tay KHÔNG nối với sổ cái công việc, không nối với «Cây việc & đường găng» hay agent Tiến độ, và không vẽ quan hệ giữa các việc. Số và ngày chỉ đúng như tệp được nạp. Vì vậy không dùng thanh màu của bảng nháp để kết luận chậm hay nhanh so với Baseline hay Tiến độ mục tiêu.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Có ngay một bức tranh tiến độ cho dự án mà chưa có cây WBS bên agent Tiến độ.",
            "Ban quản lý dự án tự cập nhật bằng Excel quen thuộc: tải bảng hiện có về, sửa tay, nạp lại.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Ban QLDA lập bảng tiến độ bằng Excel", "Ngoài hệ thống"],
            ["Bước này", "Nạp tệp, xem Gantt rút gọn", "Bảng «Tóm tắt tiến độ dự án»"],
            ["Sau", "Mọi người trong công ty xem; lãnh đạo dùng để họp và so lại với Cây việc & đường găng khi dự án có cây", "Menu Dự án"],
          ],
        },
        {
          tieuDe: "Cách mở bảng",
          bang: [
            ["Dấu trên ô dự án", "Nghĩa", "Bấm thì"],
            ["Icon ba gạch (dưới icon lịch cây việc)", "Dự án đã nạp bảng", "Mở bảng, thay cây ở khu bên trái"],
            ["Dấu «!» đỏ (dưới icon lịch)", "Dự án đang có việc nhưng chưa nạp bảng", "Mở màn trống, hướng dẫn «Tải file» rồi «Nạp tiến độ»"],
            ["Không có dấu", "Dự án chưa có việc nào đang mở", "Không mở được"],
          ],
        },
        {
          tieuDe: "Bảng có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Hàng nút trên: «← Quay lại», tên dự án, «C2» «C3» «Full», «−» «+», «Nạp tiến độ», «Tải file», nút toàn màn hình", "Điều khiển bảng", "① Nút điều khiển"],
            ["Dòng chú giải màu cấp và «Bản nháp · … dòng · tệp «…» · … nạp …»", "Cho biết bảng từ tệp nào, ai nạp, ngày nào", "② Đọc bảng"],
            ["Bảng trái: WBS · Công việc · Đơn vị · KL · (Bắt đầu · Kết thúc)", "Danh sách việc", "② Đọc bảng"],
            ["Đồ hoạ: tháng, tuần, thanh, vạch «Hôm nay»", "Xem thời gian", "② Đọc bảng"],
            ["Hộp rê chuột trên dòng", "Chi tiết một dòng", "② Đọc bảng"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Ban QLDA: chuẩn bị và nạp tệp Excel. Mọi người: xem, thu bung, phóng thu, tải về", "Số liệu do người nạp chịu trách nhiệm"],
            ["MÁY", "Đọc tệp, bỏ qua hàng sai, nhắc lỗi, lưu bảng, vẽ Gantt, tính còn bao nhiêu ngày", "Cùng tệp thì cùng bảng"],
            ["🤖 AI", "Màn này không dùng AI", "Máy đọc Excel theo luật cố định, không đoán"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Bảng không dùng AI. Người nạp tệp, máy đọc và vẽ, người xem đọc và quyết."],
        },
      ],
    },
    {
      ten: "① Nút điều khiển",
      khoi: [
        {
          bang: [
            ["Nút", "Làm gì", "Ai bấm được"],
            ["«← Quay lại»", "Về cây dự án", "Mọi người"],
            ["«C2» · «C3» · «Full»", "Chỉ bung tới cấp WBS 2, cấp 3 hoặc toàn bộ. Nút chỉ hiện khi dự án có cấp sâu hơn", "Mọi người"],
            ["«−» · «+»", "Thu nhỏ hoặc phóng to trục ngày (mờ khi tới giới hạn)", "Mọi người"],
            ["«Nạp tiến độ»", "Chọn tệp .xlsx hoặc .xls (tối đa 8 MB, đọc tối đa 3.000 dòng đầu). Nạp lại thì THAY toàn bộ bảng đang có", "Chỉ người của Ban QLDA dự án"],
            ["«Tải file»", "Tải bảng đang hiện về dạng Excel đúng khuôn nạp; dự án chưa có bảng thì tải tệp mẫu chỉ có hàng tiêu đề", "Mọi người"],
            ["Nút toàn màn hình", "Đồ hoạ tràn sang cả khu việc bên phải; bấm lại để thu về", "Mọi người"],
          ],
          luuY: ["Nạp tệp mới là thay bảng cũ, không có nút hoàn tác. Muốn giữ bản cũ, bấm «Tải file» về trước."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Ban QLDA của một dự án lần đầu làm bảng: người phụ trách bấm dấu «!» đỏ trên ô dự án, bấm «Tải file» lấy tệp mẫu, điền sáu cột (ô WBS để kiểu Chữ để «1.10» không bị đổi thành «1.1», ngày gõ dạng dd/mm/yyyy), lưu .xlsx rồi bấm «Nạp tiến độ» chọn tệp. Máy nhắc những hàng bỏ qua (nếu có) ở khung nhắc phía trên bảng.",
            "Tháng sau cập nhật: bấm «Tải file» tải bảng hiện có, sửa ngày trong Excel, nạp lại.",
          ],
        },
      ],
    },
    {
      ten: "② Đọc bảng",
      khoi: [
        {
          tieuDe: "Bảng trái và đồ hoạ",
          ds: [
            "Dòng cha có tam giác «▼»/«▶» để thu hoặc bung các dòng bên dưới. Hai cột «Bắt đầu» «Kết thúc» mặc định đóng; bấm mũi tên nhỏ cạnh chữ «KL» (bảng lấy từ agent Tiến độ: cạnh chữ «% TH») để mở.",
            "Màu thanh: cấp 1 – 2 cam, cấp 3 trở xuống xám. Việc một ngày vẽ hình thoi (mốc). Dòng nhóm dày bằng việc lá, có thêm tam giác chúc xuống ở hai đầu.",
            "Tiêu đề hai tầng: tháng ở trên, tuần ở dưới; vạch dọc «Hôm nay». Vạch dọc kẻ theo TUẦN chỉ hiện khi phóng đủ lớn (bấm «+»); thu nhỏ thì chỉ còn vạch tháng cho đỡ chi chít.",
            "Rê chuột lên một dòng: hộp chi tiết gồm mã và tên việc, khối lượng, khoảng ngày kèm số ngày (hoặc «Mốc · ngày»), và còn bao nhiêu ngày tới ngày kết thúc.",
            "Kéo vạch giữa bảng và đồ hoạ để chia lại bề rộng; bấm đúp để trả về. Máy nhớ bề rộng theo máy của bạn.",
          ],
          luuY: [
            "Nếu tệp không có dòng nào ghi ngày bắt đầu hoặc kết thúc, màn ghi chưa vẽ được đồ hoạ; bảng trái vẫn xem được.",
            "«Còn N ngày nữa kết thúc» và «Đã qua ngày kết thúc ghi trong tệp nạp N ngày» ghi rõ chỉ so với ngày trong tệp được nạp, chưa so với Tiến độ mục tiêu hay Baseline.",
          ],
        },
        {
          tieuDe: "Ví dụ",
          viDu: [
            "Chị A bấm «C2» để chỉ xem hai cấp đầu của WBS: bảng gọn lại còn các hạng mục lớn. Chị rê chuột lên dòng một hạng mục, hộp hiện khoảng ngày kèm số ngày và còn bao nhiêu ngày tới ngày kết thúc theo tệp. Muốn xem sâu một hạng mục, chị bấm tam giác «▶» của nó.",
          ],
        },
      ],
    },
    {
      ten: "③ Bảng lấy từ agent Tiến độ",
      khoi: [
        {
          tieuDe: "Khi nào bảng tự lấy từ agent Tiến độ?",
          ds: [
            "Khi dự án có «Mã bên Tiến độ» (Cài đặt, Dự án) và bên agent Tiến độ đã DUYỆT Baseline. Có Tiến độ mục tiêu thì hàng nút có thêm «Tiến độ mục tiêu» (bên trái «Tải file»): mở bảng là ẩn thanh cam, bấm nút mới hiện, bấm lại thì ẩn.",
            "Bảng = Gantt bên agent Tiến độ khi bấm «C3»: giai đoạn (cấp 1 bên đó), hạng mục (cấp 2), việc (cấp 3). Ở đây cấp 1 là TÊN DỰ ÁN nên mọi dòng bên đó lùi xuống một cấp; cột WBS vẫn ghi đúng mã bên agent Tiến độ.",
            "Nút «Nạp tiến độ» ẩn. «Tải file» tải bảng đang hiện về Excel (sáu cột như bản nháp).",
            "Số cập nhật theo báo cáo bên agent Tiến độ; máy nhớ 2 phút rồi hỏi lại.",
          ],
        },
        {
          tieuDe: "Đọc thanh",
          bang: [
            ["Ký hiệu", "Nghĩa"],
            ["Thanh cam (trên)", "Tiến độ mục tiêu — chỉ hiện khi bấm nút «Tiến độ mục tiêu»"],
            ["Thanh xanh lá", "Baseline; VIỀN ĐỎ mảnh khi việc nằm trên đường găng (tên việc giữ màu chữ thường)"],
            ["Hình vuông xoay 45° (hình thoi) xanh lá", "Mốc (việc 0 ngày); viền đỏ nếu găng; hình thoi trắng cùng cỡ = mốc đã đạt, tại ngày đạt thực tế; hình thoi rỗng viền trắng = mốc chưa đạt, tại ngày dự báo"],
            ["Hình thoi đặc cam", "Mốc của Tiến độ mục tiêu — chỉ hiện khi bấm nút «Tiến độ mục tiêu»"],
            ["Thanh xanh lá, hai đầu tam giác chúc xuống", "Dòng nhóm, bên dưới còn việc con — từ ngày bắt đầu thật (hoặc Baseline) tới ngày xong muộn nhất"],
            ["Nét trắng mảnh trùng tim thanh", "Đã thực hiện, tới ngày báo cáo (việc xong thì tới ngày xong)"],
            ["Nét xám mảnh", "Chưa có báo cáo — từ ngày báo cáo cuối tới hôm nay; những ngày này không coi là đã làm"],
            ["Nét trắng đứt", "Dự báo phần còn lại, tính từ hôm nay khi báo cáo cuối đã cũ; đỏ khi găng ở lượt dự báo"],
            ["Vạch vàng · cam · xanh lá · trắng đứt", "Hôm nay · COD mục tiêu (ẩn / hiện cùng nút «Tiến độ mục tiêu») · COD Baseline · COD dự báo (ngày ghi ở dòng chú giải)"],
          ],
        },
        {
          tieuDe: "Cột «% TH» và hộp rê chuột",
          ds: [
            "Bảng lấy từ agent Tiến độ chỉ có ba cột: WBS · Công việc · «% TH» (không còn cột Đơn vị). «% TH» ghi % thực hiện thực tế, cột hẹp vừa «100%». Màu: trắng «—» = chưa làm · xanh = đang làm hoặc đã xong · vàng = vượt BOQ hoặc vượt khối lượng thiết kế.",
            "Rê chuột lên tên việc: dòng «% thực tế» ghi rõ số làm nên %, ví dụ «42,8 m² / 100 m² = 42,8%» — 42,8 m² là tổng khối lượng thực hiện, 100 m² là khối lượng thiết kế. Dòng nhóm và việc theo tiền chỉ ghi %.",
            "Rê chuột lên tên việc (bảng bên trái; rê trên đồ hoạ thì không hiện): hộp giống hộp chi tiết Gantt bên agent Tiến độ — % thực tế, Mục tiêu, Baseline, Thực tế, Dự báo xong, khối lượng, và hai câu nhanh / chậm bằng NGÀY ghi rõ so với Tiến độ mục tiêu và so với Baseline.",
          ],
          luuY: ["Mọi số, ngày và câu nhanh / chậm do agent Tiến độ tính; bảng này chỉ vẽ lại, không tính thêm."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Không thấy nút «Nạp tiến độ»", "Bạn không thuộc Ban QLDA của dự án này. Nhờ người của Ban nạp."],
            ["Báo «Chỉ nhận tệp Excel» hoặc «Tệp lớn quá 8 MB»", "Lưu lại dạng .xlsx và giảm dung lượng."],
            ["Báo «Tệp không có dòng nào đọc được»", "Trang tính ĐẦU cần sáu cột: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc. Tải tệp mẫu về điền lại."],
            ["Máy nhắc «Bỏ qua N hàng»", "Ô WBS phải dạng 1.2.3 và có tên công việc."],
            ["Máy nhắc «WBS bị trùng»", "Ô WBS để kiểu Chữ; nếu không, Excel đổi «1.10» thành «1.1»."],
            ["Máy nhắc «Ngày không đọc được»", "Gõ ngày theo dạng ngày/tháng/năm, ví dụ 22/05/2027."],
            ["Thanh không hiện ở một dòng", "Dòng thiếu ngày bắt đầu và ngày kết thúc."],
            ["Dự án có tiến độ bên agent Tiến độ mà vẫn hiện bảng nháp", "Baseline bên đó chưa duyệt, ô «Mã bên Tiến độ» ở Cài đặt còn trống, hoặc agent Tiến độ đang tắt (màn báo dòng «Chưa hỏi được agent Tiến độ»)."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt 26/10/2026 (bảng lấy từ agent Tiến độ khi có Baseline duyệt — DE-XUAT-TOM-TAT-TIEN-DO-DONG-BO-26-10.md) · Chốt 13/10/2026 (bảng nháp nạp bằng Excel, không nối hệ agent; ai cũng tải được nhưng chỉ người của Ban QLDA nạp được) · luật 18 (màu cấp WBS do Mr. Đại định nghĩa) · luật 31 (khoảng ngày kèm số ngày) · luật 35, 36 (nhanh / chậm tính bằng ngày và ghi so với hệ nào).",
};
