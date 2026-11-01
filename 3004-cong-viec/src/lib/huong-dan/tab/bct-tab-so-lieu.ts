// Hướng dẫn bản 2 (tab) — Báo cáo tuần, nút «Số liệu tuần qua» (t3). Viết 20/10/2026 (nhóm A2).
// Căn cứ code: components/phong/BaoCaoTuanPhong.tsx (khối t3: bon-o, hangBd, TrucNop, TEN_CAP, vong) · lib/bao-cao-tuan/tinh.ts (the, don_vi, du_an, nop)
// · lib/cau-hinh/mac-dinh.ts (han_nop_theo_cap: cấp 1 thứ Hai tuần sau 10:00 · cấp 2 thứ Sáu 10:00 · cấp 3 thứ Sáu 08:00 · cấp 4 thứ Năm 17:00).
import type { HuongDanTab } from "../kieu";

export const HD: HuongDanTab = {
  tieuDe: "Báo cáo tuần — nút «Số liệu tuần qua»: bốn ô số, đơn vị, dự án và thời điểm nộp báo cáo",
  ai: "Mọi người có quyền xem sổ cái đều xem được. Tab này chỉ có số do máy tính, không có chữ do AI viết; bấm vào số hay hình thì cột phải hiện danh sách việc, thao tác trên việc theo quyền của bạn.",
  tab: [
    {
      ten: "Tổng quan",
      khoi: [
        {
          tieuDe: "① Tab này là gì?",
          doan: ["Mặt bằng số liệu của tuần: bốn ô số lớn, hai biểu đồ thanh (theo đơn vị và theo dự án) và một khối cho biết từng đơn vị đã nộp báo cáo tuần lúc mấy giờ, đúng hạn hay trễ hạn. Mọi con số do MÁY tính từ sổ cái; không có chữ nhận xét của AI."],
        },
        {
          tieuDe: "② Vì sao cần?",
          ds: [
            "Muốn kiểm nhanh con số mà không phải đọc lời: tuần xong bao nhiêu, mới bao nhiêu, đang mở bao nhiêu, bao nhiêu quá hạn.",
            "Đơn vị nào đang dồn việc, dự án nào đang có nhiều việc trễ.",
            "Ai chưa nộp báo cáo tuần để Ban lãnh đạo nhắc. Báo cáo tuần là nguồn việc chính của sổ cái nên nộp muộn là việc vào sổ cũng muộn.",
          ],
        },
        {
          tieuDe: "③ Nằm ở đâu trong vòng làm việc?",
          bang: [
            ["Chặng", "Làm gì", "Vai trò của tab này"],
            ["Trước", "Việc làm, báo xong trong sổ cái; đơn vị nộp báo cáo tuần ở «Báo cáo»", "Cung cấp số và giờ nộp"],
            ["Tab này", "Nhìn số, bấm vào số để xem việc, xem ai chưa nộp", "Soát tình hình"],
            ["Sau", "Nhắc đơn vị chưa nộp (Sơ đồ tổ chức có biểu tượng sổ để nhắc nộp); nhắc hoặc giao việc ở tab «Cần BLĐ ra quyết định»", "Hành động"],
          ],
        },
        {
          tieuDe: "④ Tab có những khối nào?",
          bang: [
            ["Khối", "Để làm gì", "Xem tab"],
            ["Bốn ô số: «Xong» · «Mới» · «Đang mở» · «Nộp báo cáo»", "Tóm tắt tuần", "① Bốn ô số"],
            ["«Đơn vị»: mỗi đơn vị một thanh bốn màu", "So khối lượng việc giữa các đơn vị", "② Đơn vị và Dự án"],
            ["«Dự án SCI đầu tư»: mỗi dự án một thanh hai màu", "Dự án nào đang có việc quá hạn", "② Đơn vị và Dự án"],
            ["«Thời điểm gửi báo cáo»: mỗi cấp tổ chức một vòng «đã nộp/tổng» và một trục thời gian", "Ai nộp lúc nào, trước hay sau hạn", "③ Thời điểm gửi báo cáo"],
          ],
        },
        {
          tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
          bang: [
            ["Bên", "Làm gì", "Tin được tới đâu"],
            ["NGƯỜI", "Đọc, bấm vào ô số, khúc màu, chấm nộp hay tên đơn vị chưa nộp để xem việc ở cột phải", "Người kết luận"],
            ["MÁY", "Đếm toàn bộ số việc, vẽ thanh và vòng, đặt chấm nộp theo giờ thật, gộp các chấm sát nhau", "Cùng dữ liệu cùng số; rê chuột xem chi tiết"],
            ["🤖 AI", "Không có việc nào ở tab này. (Độ khó của việc do AI chấm nhưng không hiện ở đây.)", "—"],
          ],
        },
        {
          tieuDe: "⑥ Quy trình người ↔ AI",
          doan: ["Tab này không dùng AI để viết. Máy tính số, người bấm vào số để xem việc, và nếu cần hành động thì sang tab «Cần BLĐ ra quyết định» hoặc Sơ đồ tổ chức."],
        },
      ],
    },
    {
      ten: "① Bốn ô số",
      khoi: [
        {
          bang: [
            ["Ô", "Là gì", "Bấm"],
            ["«Xong»", "Việc hoàn thành trong tuần; dòng nhỏ ghi khoảng ngày kèm số ngày, tính tới hôm nay nếu tuần chưa hết", "Mở danh sách việc xong ở cột phải"],
            ["«Mới»", "Việc phát sinh trong tuần, không tính việc đã hủy", "Mở danh sách"],
            ["«Đang mở»", "Tổng việc đang mở, dòng nhỏ «N quá hạn · M%»", "Mở, chia «Quá hạn» và «Trong hạn»"],
            ["«Nộp báo cáo»", "Số đơn vị đã nộp trên tổng số đơn vị (dạng a/b)", "Cuộn xuống khối «Thời điểm gửi báo cáo»"],
          ],
          viDu: ["Họp giao ban hỏi «tuần này còn bao nhiêu việc trễ?»: nhìn ô «Đang mở», dòng nhỏ ghi «N quá hạn». Bấm ô đó, cột phải hiện các việc quá hạn trước, bấm từng việc để xem ai giữ và trễ bao nhiêu ngày so với hạn đã ghi."],
          luuY: ["Phần trăm ở ô «Đang mở» chỉ là tỉ lệ số việc quá hạn trên số việc đang mở, để nhìn nhanh. Mức độ chậm của một việc luôn tính bằng NGÀY."],
        },
      ],
    },
    {
      ten: "② Đơn vị và Dự án",
      khoi: [
        {
          tieuDe: "Khối «Đơn vị»",
          doan: ["Mỗi đơn vị một thanh bốn màu: trong hạn, quá hạn, xong tuần, mới tuần. Chữ cuối dòng ghi «N mở · M trễ · K xong · L mới». Chỉ hiện đơn vị có ít nhất một việc."],
          bam: [
            "Bấm một khúc màu: cột phải hiện đúng nhóm việc đó của đơn vị.",
            "Bấm tên đơn vị: cột phải hiện mọi việc của đơn vị, chia «Quá hạn», «Đang làm, trong hạn», «Xong tuần N».",
          ],
          viDu: ["Thanh của phòng Hành chính có khúc đỏ dài: bấm khúc đỏ, cột phải liệt kê các việc quá hạn của phòng. Mở từng việc để xem hạn và người giữ rồi quyết nhắc hay hỏi (tình huống minh hoạ)."],
        },
        {
          tieuDe: "Khối «Dự án SCI đầu tư»",
          doan: ["Số việc đang mở theo từng dự án, hai màu trong hạn và quá hạn. Dự án chưa có việc nào thì không hiện. Bấm khúc màu hoặc tên dự án để xem việc ở cột phải."],
          viDu: ["Muốn biết dự án điện gió nào đang có việc quá hạn: nhìn dự án có khúc đỏ, bấm vào khúc đỏ để xem việc."],
        },
      ],
    },
    {
      ten: "③ Thời điểm gửi báo cáo",
      khoi: [
        {
          tieuDe: "Đọc khối này",
          bang: [
            ["Phần", "Nghĩa"],
            ["Bốn dòng «Cấp 1 Ban TGĐ» · «Cấp 2 các phòng» · «Cấp 3 công ty con · BQLDA · nhà máy» · «Cấp 4 ban điều hành»", "Mỗi cấp tổ chức có một hạn nộp riêng"],
            ["Vòng tròn «a/b»", "Đã nộp a trên tổng b đơn vị của cấp đó"],
            ["Trục thời gian", "Từ đầu tuần tới 12:00 thứ Hai tuần sau; các mốc ngày ghi bên dưới"],
            ["Vạch đỏ đứng «hạn hh:mm»", "Hạn nộp của cấp (khai ở Cài đặt)"],
            ["Nút tròn trên trục, trong có con số", "Số đơn vị nộp cùng lúc. Xanh: nộp trước hạn; đỏ: nộp sau hạn; nửa xanh nửa đỏ: gộp cả hai"],
            ["Dòng «chưa nộp:» cuối mỗi cấp", "Các đơn vị chưa nộp, bấm tên để xem việc của đơn vị"],
          ],
        },
        {
          tieuDe: "Bấm và rê chuột",
          bam: [
            "Rê chuột lên nút tròn: hiện tên đơn vị và giờ nộp, ghi thêm «(sau hạn)» nếu trễ.",
            "Bấm nút chỉ có MỘT đơn vị: cột phải mở ngay báo cáo của đơn vị đó (xem hướng dẫn «Báo cáo đã nộp của một đơn vị»).",
            "Bấm nút có NHIỀU đơn vị: xổ danh sách tên kèm giờ nộp; bấm một tên là mở và đóng danh sách luôn.",
          ],
          viDu: [
            "Theo hạn mặc định, cấp 2 (các phòng) nộp trước 10:00 thứ Sáu. Phòng nộp 15:00 thứ Năm là nộp trước hạn 19 giờ; phòng nộp 09:00 thứ Hai tuần sau là nộp sau hạn 2 ngày 23 giờ.",
            "Cấp 1 (Ban Tổng giám đốc) hạn mặc định là 10:00 thứ Hai tuần sau. Báo cáo tuần của AI được viết khi Ban Tổng giám đốc nộp, hoặc muộn nhất 12:00 thứ Hai dù chưa nộp.",
          ],
          luuY: ["Hạn từng cấp đổi được ở Cài đặt; khối này luôn vẽ theo hạn đang khai. Các nút nộp sát giờ nhau được gộp thành một nút để khỏi chồng lên nhau, nên số nút có thể ít hơn số đơn vị đã nộp."],
        },
      ],
    },
    {
      ten: "Hay vướng",
      khoi: [
        {
          bang: [
            ["Gặp chuyện", "Vì sao · làm gì"],
            ["Ô «Nộp báo cáo» ghi a/b nhưng trên trục có ít nút hơn a", "Các đơn vị nộp sát giờ nhau được gộp thành một nút; số trong nút là số đơn vị"],
            ["Một đơn vị nói đã nộp nhưng vẫn nằm ở «chưa nộp»", "Có thể báo cáo mới là bản nháp ở «Báo cáo», chưa bấm Gửi. Hỏi đơn vị đó đã bấm Gửi chưa"],
            ["Dự án không hiện trong khối «Dự án SCI đầu tư»", "Dự án chưa có việc nào đang mở nên không hiện"],
            ["Số ở ô «Xong» khác số ở Sơ đồ tổ chức", "Báo cáo chốt số tới ngày ghi ở đầu màn. Ban lãnh đạo bấm «Viết lại» để lấy số mới nhất"],
            ["Bấm vào khúc màu mà cột phải trống", "Khúc đó không có việc; cột phải ghi «Không có việc nào.»"],
          ],
        },
      ],
    },
  ],
  canCu: "Mr. Đại chốt 02/10/2026: nút tròn trên trục gộp các đơn vị nộp sát nhau, bấm nút nhiều đơn vị thì xổ danh sách · hạn nộp theo cấp khai ở Cài đặt (mặc định cấp 1 thứ Hai tuần sau 10:00, cấp 2 thứ Sáu 10:00, cấp 3 thứ Sáu 08:00, cấp 4 thứ Năm 17:00) · luật 31, luật 35.",
};
