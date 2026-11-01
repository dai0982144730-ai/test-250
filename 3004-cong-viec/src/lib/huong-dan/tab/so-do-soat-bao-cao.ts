// Hướng dẫn bản 2 (tab) — soát báo cáo tuần các đơn vị gửi lên (bấm đường nối) và hộp nhắc nộp, ở Sơ đồ tổ chức. Viết 20/10/2026 theo mẫu agent Nghiệm thu + luật chữ AI.
// Căn cứ code: components/phong/SoDoPhong.tsx (cheDo soat, dong-soat, HopNhac, IC_NHAC) · app/api/phong/nhac-nop/route.ts · lib/phong/so-do.ts (nhacNop). Không ghi số của dự án thật.
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Soát báo cáo các đơn vị gửi lên và nhắc nộp",
  ai: "Mọi người đăng nhập đều soát được. Nút «Nhắc nộp báo cáo» chỉ hiện với người có quyền giao việc tới đơn vị đó (ngoài phạm vi thì nút ẩn). Hạn nộp (tính ra dấu chấm than tự hiện) do Quản trị khai ở Cài đặt, Hạn nộp báo cáo tuần.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "Màn này là gì?",
          doan: [
            "Trên sân sơ đồ, các đường nối đi từ ô cấp trên xuống ô cấp dưới. Bấm một đường nối thì cột phải liệt kê TẤT CẢ đơn vị cấp dưới của ô cha, mỗi đơn vị một dòng kèm chấm màu cho biết đã nộp báo cáo tuần của tuần đang chọn hay chưa. Tiêu đề ghi «báo cáo tuần N gửi lên: a/b đã nộp».",
            "Đơn vị chưa nộp thì bấm vào dòng đó để mở hộp «… chưa nộp báo cáo tuần N» với nút «Nhắc nộp báo cáo». Hộp này cũng mở khi bạn bấm quyển sổ hoặc dấu chấm than của một ô chưa nộp.",
          ],
        },
        {
          tieuDe: "Vì sao cần?",
          ds: [
            "Cấp trên cần biết đủ báo cáo của cấp dưới trước khi tổng hợp.",
            "Nhắc đúng người, đúng lúc, không phải gọi từng người.",
            "Khi đơn vị quá hạn nộp mà chưa nộp, dấu chấm than tự hiện trên ô, không ai phải bấm.",
          ],
        },
        {
          tieuDe: "Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Bước", "Làm gì", "Nơi"],
            ["Trước", "Đơn vị lập và nộp báo cáo tuần", "Menu «Báo cáo»"],
            ["Bước này", "Cấp trên soát ai nộp, ai chưa; nhắc người chưa nộp", "Danh sách soát và hộp nhắc"],
            ["Sau", "Đơn vị nhận tin đỏ ở chuông, nộp; việc từ báo cáo vào sổ cái", "Chuông, Gửi báo cáo, cột việc"],
          ],
        },
        {
          tieuDe: "Màn có những khối nào?",
          bang: [
            ["Khối", "Nghĩa", "Xem tab"],
            ["Tiêu đề cột phải: đường đi, «· báo cáo tuần N gửi lên: a/b đã nộp»", "Ô cha đang soát, số đã nộp", "① Soát"],
            ["Dòng đơn vị: chấm màu, tên, tình trạng", "Xanh: đã nộp (kèm tên tệp). Đỏ: đã nhắc, chờ nộp (kèm giờ). Xám: «chưa nộp — bấm để nhắc»", "① Soát"],
            ["Hộp «… chưa nộp báo cáo tuần N»", "Nhắc nộp", "② Nhắc nộp"],
          ],
        },
        {
          tieuDe: "Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì"],
            ["NGƯỜI", "Chọn đường nối, đọc, bấm dòng, bấm «Nhắc nộp báo cáo» hoặc «Để sau»"],
            ["MÁY", "Đếm đã nộp / tổng, tô màu chấm, tính hạn nộp để tự hiện dấu chấm than, gửi tin đỏ ở chuông cho người của đơn vị (không có tài khoản thì cho cấp trên; nữa thì báo Quản trị), ghi giờ nhắc"],
            ["🤖 AI", "Màn này không dùng AI"],
          ],
        },
        {
          tieuDe: "Quy trình người ↔ AI",
          doan: ["Màn này không dùng AI. Người chọn, máy đếm và gửi tin nhắc."],
        },
      ],
    },
    {
      ten: "① Soát",
      khoi: [
        {
          bam: [
            "Rê chuột vào một đường nối: đường sáng lên và có tín hiệu chạy lên ô cha.",
            "Bấm đường nối. Cột phải hiện danh sách đơn vị cấp dưới.",
            "Đọc chấm màu: xanh đã nộp, đỏ đã nhắc chờ nộp, xám chưa nộp. Trên sân, đường nối cũng tô cùng màu.",
            "Bấm một dòng: đã nộp thì mở báo cáo (có «← Quay lại» để về danh sách), chưa nộp thì mở hộp nhắc.",
          ],
          luuY: ["Ô dự án (loại khác treo dưới đơn vị) không nộp báo cáo nên không có trong danh sách soát."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Chị A bấm đường nối từ ô Ban lãnh đạo xuống các phòng. Tiêu đề ghi số đơn vị đã nộp trên tổng số. Chị thấy một phòng chấm xám «chưa nộp — bấm để nhắc», một phòng chấm đỏ «đã nhắc 09:15 · chờ nộp». Chị chỉ cần nhắc thêm phòng chấm xám."],
        },
      ],
    },
    {
      ten: "② Nhắc nộp",
      khoi: [
        {
          bam: [
            "Bấm dòng đơn vị chưa nộp (hoặc quyển sổ / dấu chấm than của ô).",
            "Đọc hộp: tên đơn vị chưa nộp báo cáo tuần nào, khoảng ngày của tuần (kèm số ngày), và câu nói tin nhắc sẽ gửi cho ai.",
            "Bấm «Nhắc nộp báo cáo». Muốn thôi, bấm «Để sau» hoặc bấm ra ngoài hộp.",
          ],
          ketQua: [
            "Máy gửi tin đỏ ở chuông cho người của đơn vị. Đơn vị chưa có tài khoản thì gửi người của đơn vị cấp trên; nếu cũng không có thì báo Quản trị. Dòng báo: «Đã nhắc N người — tin đỏ ở chuông» hoặc «Đơn vị chưa có tài khoản — đã báo quản trị».",
            "Đã nhắc rồi thì hộp ghi «Đã nhắc lúc hh:mm. Nhắc lần nữa?». Quyển sổ của ô đổi thành dấu chấm than đỏ, ô ghi «Đã nhắc nộp hh:mm».",
          ],
          luuY: ["Nhắc nhiều lần là gửi nhiều tin. Chỉ nhắc lại khi thật sự cần."],
        },
        {
          tieuDe: "Ví dụ",
          viDu: ["Thứ Hai đơn vị chưa nộp. Chị A bấm quyển sổ của ô, hộp hiện «… chưa nộp báo cáo tuần N» kèm khoảng ngày. Chị bấm «Nhắc nộp báo cáo». Người của đơn vị mở chuông, bấm vào tin đỏ là tới menu «Báo cáo»."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Báo lỗi «đã nộp báo cáo tuần N»", "Có người vừa nộp. Tải lại trang."],
            ["Dấu chấm than tự hiện mà chưa ai nhắc", "Đơn vị đã quá hạn nộp (hạn khai ở Cài đặt, Hạn nộp báo cáo tuần). Không cần bấm nhắc, nhưng nhắc vẫn gửi được."],
            ["Tin nhắc không tới đúng người", "Đơn vị chưa có tài khoản nên tin đi lên cấp trên hoặc Quản trị."],
            ["Muốn xem báo cáo đã nộp", "Bấm dòng đã nộp hoặc quyển sổ viền xanh (xem hướng dẫn «Xem báo cáo tuần của một đơn vị»)."],
          ],
        },
      ],
    },
  ],
  canCu: "Chốt 28/09/2026 (soát báo cáo gửi lên khi bấm đường nối; hộp nhắc nộp giữa sân) · chốt 29/09/2026 (quá hạn nộp thì dấu chấm than tự hiện, hạn khai ở Cài đặt) · luật 31 (khoảng ngày kèm số ngày).",
};
