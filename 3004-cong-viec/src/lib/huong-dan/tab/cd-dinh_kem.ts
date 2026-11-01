// Hướng dẫn bản 2 (tab) — Cài đặt › 🧩 Riêng của agent › Tệp đính kèm việc. Viết 20/10/2026 (nhóm B3). Nhãn ô chép từ lib/cau-hinh/bieu-mau.ts (nhóm dinh_kem) và components/dinh-kem/DinhKem.tsx (DungLuongDinhKem).
// Đối chiếu code 20/10 — cả 6 ô đều được đọc: ba công tắc + dung lượng + số tệp ở lib/dinh-kem/kho.ts:38,42,66,68; «luu_thang» ở lib/dinh-kem/kho.ts:99-123 (dọn tệp VÀ xóa việc đã xong/hủy), lib/so-cai/hen-gio.ts:129-134 (dọn mỗi ngày sau giờ nhắc),
// lib/bao-cao-tuan/viet.ts:68 (báo cáo tuần chỉ xét việc xong trong hạn lưu), app/api/so-cai/da-xong/route.ts:20 (màn xem việc đã xong).
import type { HuongDanTab } from "../kieu";
import { huongDanMucCaiDat } from "../khuon-cai-dat";

export const HD: HuongDanTab = huongDanMucCaiDat({
  tieuDe: "Tệp đính kèm việc",
  tab: "🧩 Riêng của agent",
  ai: "Người có quyền «cau_hinh.sua» hoặc quản trị viên; người khác chỉ sửa nếu mục «Phân quyền cài đặt» cho phép nhóm này. Ai đăng nhập cũng xem được. Khung số liệu dung lượng ở đầu mục ai mở mục này cũng thấy.",
  laGi: [
    "Khi giao việc, báo xong việc hay bình luận trong một việc, người dùng có thể kẹp kèm tệp (ảnh, bảng tính, bản vẽ, biên bản…). Mục này chỉnh luật cho việc kẹp tệp: kẹp được ở chỗ nào, mỗi tệp nặng tối đa bao nhiêu, mỗi lần kẹp được bao nhiêu tệp, và lưu bao lâu.",
    "Tệp đính kèm được cất trong kho riêng, tách khỏi mục Thư mục tài liệu. Trợ lý AI không đọc được tệp đính kèm.",
  ],
  vaoSao: [
    "Kho tệp đầy thì máy chủ chậm và sao lưu nặng. Giới hạn dung lượng và thời hạn lưu giữ cho kho gọn.",
    "Có chỗ không nên cho kẹp tệp (ví dụ bình luận nhanh) thì tắt riêng chỗ đó, không ảnh hưởng chỗ khác.",
    "Thời hạn lưu còn quyết định cả việc đã xong bị dọn lúc nào, nên ô này ảnh hưởng nhiều hơn tên của nó (xem tab ③).",
  ],
  vongLam: [
    "Bước trước: người giao việc mở khung giao việc, hoặc người phụ trách mở khung báo xong, hoặc ai đó viết bình luận trong thẻ việc.",
    "Mục này: máy kiểm công tắc của đúng chỗ đó (giao việc, báo xong, bình luận), dung lượng từng tệp và số tệp mỗi lần kẹp. Đạt thì lưu vào kho riêng.",
    "Bước sau: người nhận mở tệp ở thẻ việc hoặc ở tin chuông; mỗi ngày máy dọn tệp quá hạn lưu và tệp tải lên mà không gắn vào việc nào.",
  ],
  cacKhoi: [
    ["Khung thông tin ở đầu mục: «Kho file đính kèm đang dùng …»", "Dung lượng đang dùng, số tệp, số tệp đã xóa do hết hạn, chỗ trống của ổ đĩa máy chủ", "① Đọc khung dung lượng"],
    ["Ba công tắc: «Kẹp file khi giao việc» · «Kẹp file khi báo xong việc» · «Kẹp file khi bình luận»", "Bật tắt việc kẹp tệp ở từng chỗ", "② Kẹp ở đâu"],
    ["Hai ô số: «Dung lượng tối đa mỗi file (MB)» · «Số file tối đa mỗi lần kẹp»", "Giới hạn một tệp và một lần kẹp", "② Kẹp ở đâu"],
    ["Ô số «Thời hạn lưu file và việc đã xong (tháng)»", "Hạn lưu tệp và hạn dọn việc đã xong", "③ Thời hạn lưu"],
  ],
  nguoi: "Quản trị chỉnh công tắc, giới hạn và thời hạn, bấm «Lưu». Người dùng kẹp tệp khi giao việc, báo xong, bình luận.",
  may: "Từ chối tệp nặng quá giới hạn, từ chối khi kẹp quá số tệp cho phép, từ chối khi chỗ kẹp đang tắt; mỗi ngày dọn tệp quá hạn lưu và tệp mồ côi; xóa việc đã xong quá hạn lưu.",
  aiLam: "— Mục này không dùng AI.",
  quyTrinhAI: null,
  buoc: [
    {
      ten: "① Đọc khung dung lượng",
      khoi: [
        { doan: ["Ngay đầu mục có một khung nhỏ cho biết kho tệp đang thế nào, ví dụ «Kho file đính kèm đang dùng … · N file · M file đã xóa do hết hạn lưu · ổ đĩa máy chủ còn trống …». Khi chỗ trống dưới 30 GB, con số chuyển sang màu đỏ để bạn biết sắp đầy."] },
        { luuY: ["Khung này chỉ để xem, không phải ô nhập. Khung chỉ hiện khi máy tính được dung lượng; nếu không hiện, kho chưa đọc được, không ảnh hưởng việc kẹp tệp."] },
        { viDu: ["Quản trị thấy ổ đĩa chỉ còn dưới 30 GB, số đỏ. Hai cách: giảm «Thời hạn lưu file và việc đã xong (tháng)» để máy dọn sớm hơn, hoặc giảm «Dung lượng tối đa mỗi file (MB)» để tệp mới nhẹ hơn."] },
      ],
    },
    {
      ten: "② Kẹp ở đâu",
      khoi: [
        { doan: ["Ba công tắc quyết định ba chỗ kẹp tệp. Hai ô số đặt giới hạn chung cho cả ba chỗ. Công tắc tắt thì nút kẹp tệp ở chỗ đó không còn."] },
        {
          bang: [
            ["Ô", "Mặc định", "Giới hạn cho phép khi lưu"],
            ["«Kẹp file khi giao việc»", "Bật", "—"],
            ["«Kẹp file khi báo xong việc» (người giao nhận tin ở chuông kèm tệp để xem hoặc tải về)", "Bật", "—"],
            ["«Kẹp file khi bình luận»", "Bật", "—"],
            ["«Dung lượng tối đa mỗi file (MB)»", "50", "Số nguyên từ 1 đến 200"],
            ["«Số file tối đa mỗi lần kẹp»", "20", "Số nguyên từ 1 đến 50"],
          ],
        },
        { bam: ["Mở Cài đặt › tab «🧩 Riêng của agent» › mục «Tệp đính kèm việc».", "Gạt công tắc ở chỗ muốn bật hoặc tắt; gõ số vào hai ô số.", "Bấm «Lưu»."] },
        {
          viDu: [
            "Công ty muốn người phụ trách bắt buộc đưa bằng chứng khi báo xong nhưng không muốn bình luận bị kẹp tệp tràn lan: giữ «Kẹp file khi báo xong việc» bật và tắt «Kẹp file khi bình luận». Từ nay chỉ khung giao việc và báo xong có nút kẹp.",
            "Nhiều người gửi bản vẽ nặng bị báo «File … vượt 50 MB». Quản trị đổi «Dung lượng tối đa mỗi file (MB)» lên 100 và lưu. Lần kẹp sau, tệp 80 MB qua được.",
            "Một người kẹp 25 ảnh một lần bị từ chối vì quá 20 tệp. Quản trị nâng «Số file tối đa mỗi lần kẹp» lên 30 hoặc nhắc người đó kẹp làm hai lần.",
          ],
        },
        {
          luuY: [
            "Ngưỡng dung lượng và số tệp áp cho tệp kẹp SAU khi lưu; tệp đã kẹp trước đó giữ nguyên.",
            "Tắt một chỗ kẹp thì không kẹp thêm được ở chỗ đó nữa.",
            "Số ngoài giới hạn: «Lưu» báo «Dung lượng tối đa mỗi file phải từ 1 đến 200 MB» (hoặc câu tương ứng) và không ghi gì.",
          ],
        },
      ],
    },
    {
      ten: "③ Thời hạn lưu",
      khoi: [
        { doan: ["Ô «Thời hạn lưu file và việc đã xong (tháng)» (mặc định 6) làm HAI việc khác nhau, nên đặt cẩn thận."] },
        {
          bang: [
            ["Việc", "Máy làm gì khi quá thời hạn"],
            ["Tệp đính kèm", "Xóa NỘI DUNG tệp nhưng giữ tên và ghi «đã xóa do hết hạn lưu»; tính từ ngày kẹp. Tệp tải lên mà không gắn vào việc nào quá 1 ngày cũng bị dọn."],
            ["Việc đã xong hoặc đã hủy", "XÓA HẲN việc khỏi hệ thống (cùng tệp kèm, bình luận, nhắc hạn, chuông của việc), tính từ ngày xong. Sổ Lịch sử vẫn giữ. Việc xong mà còn việc đang mở đợi nó (mốc phụ thuộc) thì chưa xóa."],
          ],
        },
        {
          bam: ["Gõ số tháng (số nguyên từ 1 đến 120) vào ô.", "Bấm «Lưu». Máy dọn mỗi ngày một lần, sau giờ nhắc đã đặt ở mục «Hạn việc, quá hạn, nhắc việc»."],
        },
        {
          viDu: [
            "Ô là 6 tháng: việc báo xong ngày 15/03/2026 bị xóa hẳn ở lần dọn đầu tiên sau khoảng 15/09/2026. Tệp kẹp trong việc cũng hết hạn cùng lúc (hoặc sớm hơn nếu kẹp sớm hơn).",
            "Báo cáo tuần chỉ tính các việc xong trong thời hạn lưu này, nên giảm ô xuống 3 là báo cáo tuần chỉ còn thấy việc xong trong khoảng 3 tháng gần nhất.",
            "Công ty cần tra việc đã xong cách đây một năm: đặt 12 tháng trước khi đến hạn dọn, vì việc đã xóa không lấy lại được trong ứng dụng (chỉ còn trong sổ Lịch sử).",
          ],
        },
        {
          luuY: [
            "Giảm số tháng làm các việc đã xong cũ bị xóa ở lần dọn kế tiếp. Hãy cân nhắc trước khi lưu.",
            "Tăng số tháng không khôi phục lại những gì đã xóa.",
            "Màn «Việc đã xong» của người dùng cũng chỉ hiện việc trong thời hạn lưu này.",
          ],
        },
      ],
    },
  ],
  viDuLuu: ["Đổi «Dung lượng tối đa mỗi file (MB)» từ 50 thành 100 và bấm «Lưu» → nhật ký ghi «Dung lượng tối đa mỗi file (MB): 50 → 100» (phiên bản mới, có hiệu lực ngay)."],
  vuong: [
    ["Người dùng báo «Kẹp file khi … đang tắt trong Cài đặt»", "Công tắc của chỗ đó đang tắt. Bật lại và lưu nếu muốn cho kẹp."],
    ["Báo «File … vượt N MB»", "Tệp nặng hơn giới hạn. Nén tệp, hoặc nâng «Dung lượng tối đa mỗi file (MB)» (tối đa 200)."],
    ["Báo «Mỗi lần kẹp tối đa N file»", "Quá số tệp một lần. Kẹp làm nhiều lần hoặc nâng «Số file tối đa mỗi lần kẹp» (tối đa 50)."],
    ["Mở tệp cũ thấy «đã xóa do hết hạn lưu»", "Quá thời hạn lưu. Tên tệp còn nhưng nội dung đã bị xóa."],
    ["Một việc đã xong biến mất", "Quá «Thời hạn lưu file và việc đã xong (tháng)». Sổ Lịch sử vẫn ghi lại."],
    ["Trợ lý AI không đọc được tệp đính kèm", "Đúng thiết kế: kho riêng, tách khỏi Thư mục tài liệu."],
    ["Không thấy nút «Lưu»", "Bạn chỉ có quyền xem; nhờ quản trị cấp quyền ở «Phân quyền cài đặt»."],
  ],
  canCu: "Nhóm «dinh_kem» trong cài đặt; cách kiểm và lưu tệp đính kèm, vòng dọn hằng ngày sau giờ nhắc (tệp hết hạn và việc đã xong quá hạn lưu) ở phần sổ cái công việc.",
});
